import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game-config';
import { sfx } from '../audio/Sfx';
import { MENU_KEYS, MenuInput, inputManager, toggleFullscreen } from '../utils/game';
import { addPixmap } from '../utils/textures';
import { drawnAnimKey } from '../art/DrawnAnim';
import { FIGHTERS } from '../data/fighters';
import { DialogBox } from '../adventure/DialogBox';
import {
  RUSTLE_RATE, GUARDIANS, HERO_FIGHTER, HOUSES, HOUSE_H, HOUSE_W, LLORONA_EVENT_Y, MAP_H, MAP_W, NPCS, PESCADOR_REFUGIO, SIGNS,
  STEP, areaName, buildMap, walkable, type Cell, type Dir, type Guardian, type Npc,
} from '../adventure/World';
import {
  allCalmed, applyOutcome, clearAdventure, fightDifficulty, loadAdventure, newAdventure, saveAdventure,
  type AdventureFight, type AdventureState, type FightOutcome,
} from '../adventure/State';
import { getSettings, setSettings } from '../utils/game';
import {
  buildBridge, buildBubble, buildFlowers, buildHouse, buildShadow, buildSign, buildTallGrass, buildTree, buildWater,
} from '../adventure/OverworldArt';

/** Cada baldosa de 16 px del tileset se pinta al doble: los personajes de 48 px quedan a escala. */
const CELL = 32;
const WALK_FRAMES = 14;
const HERO_FRAMES: Record<Dir, { walk: number; idle: number; flip: boolean }> = {
  down: { walk: 0, idle: 12, flip: false },
  right: { walk: 4, idle: 13, flip: false },
  left: { walk: 4, idle: 13, flip: true },
  up: { walk: 8, idle: 14, flip: false },
};
const NPC_FRAME: Record<Dir, { f: number; flip: boolean }> = {
  down: { f: 0, flip: false }, right: { f: 1, flip: false }, left: { f: 1, flip: true }, up: { f: 2, flip: false },
};
const DIR_KEYS: [Dir, string[]][] = [['up', MENU_KEYS.up], ['down', MENU_KEYS.down], ['left', MENU_KEYS.left], ['right', MENU_KEYS.right]];

const feetX = (cx: number) => cx * CELL + CELL / 2;
const feetY = (cy: number) => cy * CELL + CELL - 3;

interface NpcView { npc: Npc; x: number; y: number; facing: Dir; sprite: Phaser.GameObjects.Sprite; scared: boolean }
interface GuardianView { g: Guardian; x: number; y: number; sprite: Phaser.GameObjects.Sprite }

export class AdventureScene extends Phaser.Scene {
  private st!: AdventureState;
  private map: Cell[][] = [];
  private menu = new MenuInput();
  private dialog!: DialogBox;
  private hero!: Phaser.GameObjects.Sprite;
  private heroShadow!: Phaser.GameObjects.Image;
  private grassFront!: Phaser.GameObjects.Image;
  private npcs: NpcView[] = [];
  private guardians: GuardianView[] = [];
  private waters: { img: Phaser.GameObjects.Image; top: boolean; bottom: boolean }[] = [];
  private tallGrass = new Map<string, Phaser.GameObjects.Image>();
  private moving = false;
  private from = { x: 0, y: 0 };
  private progress = 0;
  private steps = 0;
  private turnDelay = 0;
  private locked = false;
  private frame = 0;
  private area = '';
  private areaLabel!: Phaser.GameObjects.Container;
  private rnd = Math.random;

  constructor() {
    super('AdventureScene');
  }

  create(data: { fresh?: boolean; outcome?: FightOutcome }): void {
    this.st = (this.registry.get('adventure') as AdventureState | undefined) ?? (data.fresh ? null : loadAdventure()) ?? newAdventure();
    if (data.fresh) this.st = newAdventure();
    const fight = this.registry.get('adventureFight') as AdventureFight | undefined;
    this.registry.remove('adventureFight');
    if (fight && data.outcome) {
      if (data.outcome === 'lose') clearAdventure();
      this.st = applyOutcome(this.st, fight, data.outcome);
      if (data.outcome === 'win') saveAdventure(this.st);
    }
    this.registry.set('adventure', this.st);
    this.menu = new MenuInput();
    this.moving = false;
    this.locked = false;
    this.npcs = [];
    this.guardians = [];
    this.waters = [];
    this.tallGrass.clear();
    this.area = '';
    sfx.setTension(0);
    sfx.setSoundscape('pueblo');

    this.ensureTextures();
    this.map = buildMap();
    this.buildGround();
    this.buildObjects();
    this.buildActors();

    this.cameras.main.setBounds(0, 0, MAP_W * CELL, MAP_H * CELL).setBackgroundColor('#1e6a28');
    this.cameras.main.startFollow(this.hero, true, 1, 1, 0, 20);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.dialog = new DialogBox(this);
    this.areaLabel = this.add.container(0, 0).setScrollFactor(0).setDepth(4000);

    if (fight && data.outcome) void this.afterFight(fight, data.outcome);
    else if (!this.st.flags.includes('intro')) void this.intro();
    else this.showArea();
  }

  // ---------------------------------------------------------------- recursos

  private ensureTextures(): void {
    const add = (key: string, pm: Parameters<typeof addPixmap>[2]) => { if (!this.textures.exists(key)) addPixmap(this, key, pm); };
    for (const f of [0, 1]) {
      add(`av_tall_${f}`, buildTallGrass(f));
      for (const t of [false, true]) for (const b of [false, true]) add(`av_water_${f}_${+t}${+b}`, buildWater(f, t, b));
    }
    add('av_bridge', buildBridge());
    add('av_flowers', buildFlowers());
    add('av_sign', buildSign());
    add('av_bubble_1', buildBubble('!'));
    add('av_bubble_2', buildBubble('!!'));
    add('av_bubble_3', buildBubble('...'));
    add('av_shadow', buildShadow(26));
    add('av_shadow_big', buildShadow(44));
    if (!this.textures.exists('av_tree')) add('av_tree', buildTree());
    if (!this.textures.exists('av_house')) add('av_house', buildHouse());
  }

  private isPath(x: number, y: number): boolean {
    const c = this.map[y]?.[x];
    return c === '=' || c === 'B';
  }

  /** Suelo de hierba y camino con el tileset Wang de PixelLab (esquinas: camino si lo tocan dos casillas de camino). */
  private buildGround(): void {
    const rt = this.add.renderTexture(0, 0, MAP_W * 16, MAP_H * 16).setOrigin(0).setScale(2).setDepth(-10000);
    const vertex = (vx: number, vy: number) => {
      let n = 0;
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (this.isPath(vx + dx, vy + dy)) n++;
      return n >= 2 ? 1 : 0;
    };
    const hasTiles = this.textures.exists('av_tiles');
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const mask = vertex(x, y) * 8 + vertex(x + 1, y) * 4 + vertex(x, y + 1) * 2 + vertex(x + 1, y + 1);
        if (hasTiles) rt.drawFrame('av_tiles', mask, x * 16, y * 16);
        else rt.fill(mask ? 0xc89060 : 0x58b848, 1, x * 16, y * 16, 16, 16);
        const c = this.map[y][x];
        if (c === 'f') rt.drawFrame('av_flowers', undefined, x * 16, y * 16);
        if (c === 'B') rt.drawFrame('av_bridge', undefined, x * 16, y * 16);
      }
    }
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const c = this.map[y][x];
        if (c === '~') {
          const top = this.map[y - 1]?.[x] !== '~' && this.map[y - 1]?.[x] !== 'B';
          const bottom = this.map[y + 1]?.[x] !== '~' && this.map[y + 1]?.[x] !== 'B';
          const img = this.add.image(x * CELL, y * CELL, `av_water_0_${+top}${+bottom}`).setOrigin(0).setScale(2).setDepth(-9000);
          this.waters.push({ img, top, bottom });
        }
        if (c === '"') {
          const img = this.add.image(x * CELL, y * CELL, 'av_tall_0').setOrigin(0).setScale(2).setDepth(-8000);
          this.tallGrass.set(`${x},${y}`, img);
        }
      }
    }
  }

  private buildObjects(): void {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (this.map[y][x] !== 'T') continue;
        // monte tupido: un árbol por casilla, con algo de desorden
        const jx = ((x * 7 + y * 13) % 5) - 2;
        this.add.image(feetX(x) + jx, feetY(y) + 4, 'av_tree').setOrigin(0.5, 1).setDepth(feetY(y) + 4);
      }
    }
    for (const [hx, hy] of HOUSES) {
      const img = this.add.image(hx * CELL + (HOUSE_W * CELL) / 2, (hy + HOUSE_H) * CELL, 'av_house').setOrigin(0.5, 1);
      img.setScale((HOUSE_W * CELL) / img.width);
      img.setDepth((hy + HOUSE_H) * CELL);
    }
    for (const s of SIGNS) this.add.image(feetX(s.x), feetY(s.y) + 3, 'av_sign').setOrigin(0.5, 1).setScale(2).setDepth(feetY(s.y));
  }

  private buildActors(): void {
    const npcTex = (key: string) => (this.textures.exists(`av_${key}`) ? `av_${key}` : 'av_hero');
    for (const npc of NPCS) {
      let [x, y] = [npc.x, npc.y];
      if (npc.key === 'pescador' && this.st.flags.includes('tono')) [x, y] = PESCADOR_REFUGIO;
      const sprite = this.add.sprite(feetX(x), feetY(y), npcTex(npc.key), 0).setOrigin(0.5, 47 / 48);
      const view: NpcView = { npc, x, y, facing: npc.facing, sprite, scared: false };
      this.faceNpc(view, npc.facing);
      this.npcs.push(view);
    }
    for (const g of GUARDIANS) {
      if (this.st.calmed.includes(g.id)) continue;
      const key = drawnAnimKey(g.id, 'p1', 'idle');
      const sprite = this.add.sprite(feetX(g.x), feetY(g.y) + 2, this.textures.exists(key) ? key : 'av_hero', 0).setOrigin(0.5, 1);
      sprite.setFlipX(g.x > 20);
      this.guardians.push({ g, x: g.x, y: g.y, sprite });
    }
    this.heroShadow = this.add.image(0, 0, 'av_shadow');
    this.hero = this.add.sprite(feetX(this.st.x), feetY(this.st.y), 'av_hero', HERO_FRAMES[this.st.facing].idle).setOrigin(0.5, 47 / 48);
    this.grassFront = this.add.image(0, 0, 'av_tall_0').setOrigin(0.5, 0).setScale(2).setCrop(0, 9, 16, 7).setVisible(false);
    this.setHeroFrame();
    this.placeHero(feetX(this.st.x), feetY(this.st.y));
  }

  // ---------------------------------------------------------------- héroe

  private placeHero(x: number, y: number): void {
    this.hero.setPosition(Math.round(x), Math.round(y)).setDepth(y + 1);
    this.heroShadow.setPosition(Math.round(x), Math.round(y) - 1).setDepth(y);
    const inGrass = this.map[this.st.y]?.[this.st.x] === '"' && (!this.moving || this.progress > 0.5);
    this.grassFront.setVisible(inGrass).setPosition(feetX(this.st.x), this.st.y * CELL).setDepth(y + 2);
  }

  private setHeroFrame(): void {
    const f = HERO_FRAMES[this.st.facing];
    const seq = [1, 2, 3, 0];
    const idx = this.moving ? f.walk + seq[((this.steps % 2) * 2 + (this.progress < 0.5 ? 0 : 1)) % 4] : f.idle;
    this.hero.setFrame(idx).setFlipX(f.flip);
  }

  private blocked(x: number, y: number): boolean {
    if (!walkable(this.map, x, y)) return true;
    if (this.npcs.some((n) => n.x === x && n.y === y)) return true;
    return this.guardians.some((g) => g.x === x && g.y === y);
  }

  private heldDir(): Dir | null {
    for (const [d, codes] of DIR_KEYS) if (codes.some((c) => inputManager.isRawKeyDown(c))) return d;
    return null;
  }

  override update(): void {
    inputManager.update();
    this.frame++;
    if (this.menu.pressed(MENU_KEYS.fullscreen)) toggleFullscreen(this);
    this.animateWorld();
    this.dialog.update(this.menu);
    if (this.dialog.busy || this.locked) return;

    if (this.moving) {
      this.progress += 1 / WALK_FRAMES;
      const [dx, dy] = STEP[this.st.facing];
      const t = Math.min(1, this.progress);
      this.placeHero(feetX(this.from.x) + dx * CELL * t, feetY(this.from.y) + dy * CELL * t);
      this.setHeroFrame();
      if (this.progress >= 1) {
        this.moving = false;
        this.steps++;
        this.setHeroFrame();
        this.arrive();
      }
      return;
    }

    this.idleFear();
    if (this.menu.pressed(MENU_KEYS.confirm)) { void this.interact(); return; }
    if (this.menu.pressed(MENU_KEYS.back)) { void this.pauseMenu(); return; }

    const d = this.heldDir();
    if (!d) { this.turnDelay = 0; return; }
    if (d !== this.st.facing) {
      this.st.facing = d;
      this.turnDelay = 5;
      this.setHeroFrame();
      return;
    }
    if (this.turnDelay > 0) { this.turnDelay--; return; }
    const [dx, dy] = STEP[d];
    if (this.blocked(this.st.x + dx, this.st.y + dy)) {
      if (this.frame % 24 === 0) sfx.play('land');
      return;
    }
    this.from = { x: this.st.x, y: this.st.y };
    this.st.x += dx;
    this.st.y += dy;
    this.moving = true;
    this.progress = 0;
    const tg = this.tallGrass.get(`${this.st.x},${this.st.y}`);
    if (tg) this.tweens.add({ targets: tg, y: tg.y + 2, duration: 80, yoyo: true });
  }

  private animateWorld(): void {
    const f = Math.floor(this.frame / 36) % 2;
    if (this.frame % 36 === 0) for (const w of this.waters) w.img.setTexture(`av_water_${f}_${+w.top}${+w.bottom}`);
    for (const g of this.guardians) {
      // respiración: el mito sube y baja un poco (transformación del fotograma completo)
      g.sprite.setScale(1, 1 + Math.sin(this.frame / 18 + g.x) * 0.02);
      const frames = g.sprite.texture.frameTotal - 1;
      if (frames > 1 && this.frame % 10 === 0) g.sprite.setFrame((Number(g.sprite.frame.name) + 1) % frames);
      g.sprite.setDepth(g.sprite.y);
    }
    for (const n of this.npcs) {
      const sx = n.scared ? (this.frame % 4 < 2 ? 1 : -1) : 0;
      n.sprite.setPosition(feetX(n.x) + sx, feetY(n.y)).setDepth(feetY(n.y));
    }
    for (const n of this.npcs) {
      if (n.npc.key === 'pescador') n.scared = this.st.flags.includes('tono') && !this.st.calmed.includes('llorona');
    }
  }

  /** Cerca de un espanto el héroe tiembla y a ratos suspira «...». */
  private idleFear(): void {
    const near = this.guardians.some((g) => Math.abs(g.x - this.st.x) + Math.abs(g.y - this.st.y) <= 5);
    const base = feetX(this.st.x);
    this.hero.x = near && this.frame % 6 < 3 ? base + 1 : base;
    if (near && this.frame % 240 === 0) void this.bubble(this.hero, 3, 900);
  }

  private faceNpc(n: NpcView, d: Dir): void {
    n.facing = d;
    const f = NPC_FRAME[d];
    if (n.sprite.texture.key === 'av_hero') n.sprite.setFrame(HERO_FRAMES[d].idle).setFlipX(HERO_FRAMES[d].flip).setTint(0xc0a080);
    else n.sprite.setFrame(f.f).setFlipX(f.flip);
  }

  // ---------------------------------------------------------------- sucesos

  private arrive(): void {
    this.showArea();
    const g = this.guardians.find((v) => Math.abs(v.x - this.st.x) + Math.abs(v.y - this.st.y) <= 3);
    if (g && this.ready) { void this.guardianEvent(g); return; }
    if (this.st.y >= LLORONA_EVENT_Y && !this.st.flags.includes('tono') && !this.st.calmed.includes('llorona') && this.ready) {
      void this.tonoEvent();
      return;
    }
    if (this.map[this.st.y][this.st.x] === '"' && this.ready && this.rnd() < RUSTLE_RATE) void this.rustleEvent();
  }

  private showArea(): void {
    const name = areaName(this.st.x, this.st.y);
    if (name === this.area) return;
    this.area = name;
    this.areaLabel.removeAll(true);
    const t = this.add.bitmapText(10, 9, 'font', name).setTint(0xf8f0d8).setScrollFactor(0);
    const g = this.add.graphics().setScrollFactor(0);
    g.fillStyle(0x283048, 0.92).fillRoundedRect(4, 4, t.width + 12, 17, 3);
    g.lineStyle(1, 0xd8b070, 1).strokeRoundedRect(4, 4, t.width + 12, 17, 3);
    this.areaLabel.add([g, t]);
    this.areaLabel.setY(-24).setAlpha(1);
    this.tweens.killTweensOf(this.areaLabel);
    this.tweens.chain({ targets: this.areaLabel, tweens: [{ y: 0, duration: 250 }, { alpha: 0, delay: 1800, duration: 400 }] });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, res));
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((res) => this.tweens.add({ ...cfg, onComplete: () => res() }));
  }

  private async bubble(target: Phaser.GameObjects.Sprite, kind: 1 | 2 | 3, ms = 700): Promise<void> {
    const top = target.y - target.displayHeight * target.originY;
    const b = this.add.image(target.x, top + 4, `av_bubble_${kind}`).setOrigin(0.5, 1).setDepth(4500);
    if (kind !== 3) sfx.play(kind === 2 ? 'sting' : 'select');
    await this.tween({ targets: b, y: top - 2, duration: 120, ease: 'Back.out' });
    await this.wait(ms);
    b.destroy();
  }

  private async shake(target: Phaser.GameObjects.Sprite, times = 6): Promise<void> {
    const x = target.x;
    await this.tween({ targets: target, x: x + 2, duration: 40, yoyo: true, repeat: times });
    target.x = x;
  }

  private get ready(): boolean {
    return this.st.flags.includes('intro');
  }

  private async intro(): Promise<void> {
    this.locked = true;
    await this.wait(500);
    const abuela = this.npcs.find((n) => n.npc.key === 'abuela')!;
    this.faceNpc(abuela, 'down');
    await this.bubble(abuela.sprite, 1);
    await this.dialog.say(['¡JUAN! ¡JUAN MACHETE! ¡QUÉ BUENO QUE BAJÓ DE MEDELLÍN, MIJO!'], { speaker: 'ABUELA ROSA' });
    abuela.scared = true;
    sfx.play('whisper');
    await this.dialog.say([
      'LOS ESPANTOS ANDAN ALBOROTADOS... DE NOCHE SE OYEN SILBIDOS, LLANTOS EN EL RÍO Y PASOS DE UNA SOLA PATA EN EL MONTE.',
      'ANDAN SUELTOS TODOS LOS MITOS: EL SOMBRERÓN Y LA MUELONA EN EL PUEBLO, EL SILBÓN EN EL LLANO, LA LLORONA, EL MOHÁN Y EL HOMBRE CAIMÁN EN EL RÍO...',
      '...LA PATASOLA Y LA MADREMONTE EN EL MONTE Y BACHUÉ EN LA LAGUNA DEL SUR. ¡YA NADIE SE ATREVE A SALIR!',
    ], { speaker: 'ABUELA ROSA', shake: true });
    abuela.scared = false;
    await this.dialog.say(['USTED ES EL CAMPESINO MÁS BERRACO DE ANTIOQUIA. A LOS ESPANTOS SOLO LOS CALMA QUIEN LOS VENCE A PUÑO LIMPIO.'], { speaker: 'ABUELA ROSA' });
    await this.dialog.say(['¡AVE MARÍA, ABUELA! MIEDO SÍ ME DA... PERO UN PAISA NO SE ARRUGA. ¡DEME ESE MACHETE, PUES!'], { speaker: 'JUAN MACHETE' });
    sfx.play('ultimate');
    await this.dialog.say(['¡ESO, MIJO! EN LA HIERBA ALTA TAMBIÉN SALTAN MITOS SALVAJES.', 'PERO OJO: SI LO TUMBAN, SE ACABÓ TODO Y TOCA EMPEZAR DE NUEVO. ¡VAYA CON DIOS!'], { speaker: 'ABUELA ROSA' });
    this.st.flags.push('intro');
    saveAdventure(this.st);
    this.locked = false;
    this.showArea();
  }

  /** Don Toño oye el llanto en el río, tiembla y sale corriendo a la vereda. */
  private async tonoEvent(): Promise<void> {
    this.locked = true;
    const tono = this.npcs.find((n) => n.npc.key === 'pescador')!;
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan((this.hero.x + tono.sprite.x) / 2, (this.hero.y + tono.sprite.y) / 2 + 12, 500, 'Sine.easeInOut');
    sfx.play('distantScream');
    this.cameras.main.shake(300, 0.004);
    await this.dialog.say(['...AAAAAY... MIS HIJOOOOS...'], { speaker: '¿?', shake: true });
    this.faceNpc(tono, 'up');
    await this.bubble(tono.sprite, 2);
    tono.scared = true;
    await this.bubble(this.hero, 2, 400);
    await this.dialog.say(['¡¿OYÓ ESO, DON JUAN?! ¡ES LA LLORONA! ¡ME TIEMBLAN HASTA LAS CHANCLAS!', '¡YO ME VOY PA\' LA VEREDA! ¡USTED VERÁ SI SE ARRIESGA!'], { speaker: 'DON TOÑO', shake: true });
    tono.scared = false;
    // corre hacia la vereda, casilla a casilla
    const path: [number, number][] = [];
    for (let y = tono.y - 1; y >= PESCADOR_REFUGIO[1]; y--) path.push([tono.x, y]);
    path.push(PESCADOR_REFUGIO);
    for (const [x, y] of path) {
      if (this.st.x === x && this.st.y === y) continue;
      this.faceNpc(tono, x > tono.x ? 'right' : x < tono.x ? 'left' : 'up');
      await this.tween({ targets: tono.sprite, x: feetX(x), y: feetY(y), duration: 110 });
      tono.x = x; tono.y = y;
    }
    this.faceNpc(tono, 'down');
    cam.pan(this.hero.x, this.hero.y + 20, 400, 'Sine.easeInOut');
    await this.wait(420);
    cam.startFollow(this.hero, true, 1, 1, 0, 20);
    this.st.flags.push('tono');
    saveAdventure(this.st);
    this.locked = false;
  }

  /** Un espanto ve al héroe: «!», el héroe se asusta, el mito se acerca y empieza la pelea. */
  private async guardianEvent(v: GuardianView): Promise<void> {
    this.locked = true;
    this.st.facing = Math.abs(v.x - this.st.x) > Math.abs(v.y - this.st.y) ? (v.x > this.st.x ? 'right' : 'left') : (v.y > this.st.y ? 'down' : 'up');
    this.setHeroFrame();
    sfx.play(v.g.id === 'silbon' ? 'whistle' : 'scream');
    await this.bubble(v.sprite, 1, 500);
    await Promise.all([this.bubble(this.hero, 2, 600), this.shake(this.hero, 8)]);
    this.cameras.main.shake(250, 0.006);
    await this.dialog.say([v.g.fright], { speaker: 'JUAN MACHETE', shake: true });
    // se acerca hasta quedar al lado
    const walkKey = drawnAnimKey(v.g.id, 'p1', 'walk');
    if (this.textures.exists(walkKey)) v.sprite.setTexture(walkKey, 0);
    v.sprite.setFlipX(this.st.x < v.x);
    while (Math.abs(v.x - this.st.x) + Math.abs(v.y - this.st.y) > 1) {
      const nx = v.x + Math.sign(this.st.x - v.x) * (v.x !== this.st.x ? 1 : 0);
      const ny = v.x === nx ? v.y + Math.sign(this.st.y - v.y) : v.y;
      v.x = nx; v.y = ny;
      await this.tween({ targets: v.sprite, x: feetX(nx), y: feetY(ny) + 2, duration: 220 });
    }
    await this.dialog.say([v.g.taunt], { speaker: FIGHTERS[v.g.id].name });
    await this.startFight(v.g);
  }

  /** De vuelta del combate: ganar calma al espanto y lo suma al equipo; perder reinicia el juego. */
  private async afterFight(fight: AdventureFight, outcome: FightOutcome): Promise<void> {
    this.locked = true;
    await this.wait(400);
    const name = FIGHTERS[fight.id].name;
    if (outcome === 'lose') {
      const g = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1).setScrollFactor(0).setDepth(4900);
      const t1 = this.add.bitmapText(GAME_WIDTH / 2, 80, 'font', 'FIN DEL JUEGO').setScale(2).setOrigin(0.5).setTint(0xd82020).setScrollFactor(0).setDepth(4901);
      sfx.play('ko');
      await this.dialog.say([`${name} TUMBÓ A JUAN MACHETE...`, 'JUAN SE DESPIERTA EN LA VEREDA SIN SABER CUÁNTO TIEMPO PASÓ. TODO VUELVE A EMPEZAR.'], { shake: true });
      await this.tween({ targets: [g, t1], alpha: 0, duration: 800 });
      g.destroy(); t1.destroy();
      this.locked = false;
      void this.intro();
      return;
    }
    sfx.play('ultimate');
    const g = GUARDIANS.find((x) => x.id === fight.id)!;
    await this.dialog.say([g.defeat, `MITOS CALMADOS: ${this.st.calmed.length} DE ${GUARDIANS.length}.${allCalmed(this.st) ? ' ¡VUELVE CON LA ABUELA ROSA!' : ''}`]);
    await this.dialog.say(['¡QUÉ PELEA TAN BERRACA, PUES! ¡SIGAMOS!'], { speaker: 'JUAN MACHETE' });
    this.locked = false;
    this.showArea();
  }

  private async interact(): Promise<void> {
    const [dx, dy] = STEP[this.st.facing];
    const tx = this.st.x + dx, ty = this.st.y + dy;
    const opposite: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
    const npc = this.npcs.find((n) => n.x === tx && n.y === ty);
    if (npc) {
      this.locked = true;
      const before = npc.facing;
      this.faceNpc(npc, opposite[this.st.facing]);
      if (npc.npc.key === 'abuela') await this.talkAbuela(npc);
      else await this.talkTono(npc);
      this.faceNpc(npc, before);
      this.locked = false;
      return;
    }
    const sign = SIGNS.find((s) => s.x === tx && s.y === ty);
    if (sign) {
      this.locked = true;
      await this.dialog.say(sign.lines);
      this.locked = false;
      return;
    }
    const g = this.guardians.find((v) => v.x === tx && v.y === ty);
    if (g) void this.guardianEvent(g);
  }

  private async talkAbuela(n: NpcView): Promise<void> {
    if (allCalmed(this.st)) {
      if (!this.st.flags.includes('fin')) { await this.ending(); return; }
      await this.dialog.say(['¡GRACIAS A USTED LA VEREDA DUERME TRANQUILA, JUAN!'], { speaker: 'ABUELA ROSA' });
      return;
    }
    sfx.play('bloom');
    await this.dialog.say(['TÓMESE ESTE CALDITO DE GALLINA PARA EL SUSTO, MIJO.'], { speaker: 'ABUELA ROSA' });
    const left = GUARDIANS.length - this.st.calmed.length;
    n.scared = true;
    await this.dialog.say([`TODAVÍA QUEDAN ${left} MITOS SUELTOS... ¡ME DA UN MIEDO SALIR AL PATIO!`], { speaker: 'ABUELA ROSA', shake: true });
    n.scared = false;
    saveAdventure(this.st);
  }

  private async talkTono(n: NpcView): Promise<void> {
    if (!this.st.flags.includes('tono')) {
      await this.dialog.say(['AQUÍ PESCANDO BOCACHICOS, MIJO. DICEN QUE DE NOCHE SE OYE LLORAR A UNA MUJER EN EL RÍO... PURO CUENTO, ¿NO?'], { speaker: 'DON TOÑO' });
    } else if (!this.st.calmed.includes('llorona')) {
      await this.bubble(n.sprite, 2, 300);
      await this.dialog.say(['¡NO ME HAGA VOLVER A ESE RÍO! ¡TODAVÍA LA OIGO LLORAR!'], { speaker: 'DON TOÑO', shake: true });
    } else {
      await this.dialog.say(['¿USTED CALMÓ A LA LLORONA, DON JUAN? ¡QUÉ PAISA TAN BERRACO! MAÑANA VUELVO A PESCAR.'], { speaker: 'DON TOÑO' });
    }
  }

  private async ending(): Promise<void> {
    sfx.play('ultimate');
    await this.dialog.say([
      '¡LO LOGRÓ, JUAN! LOS NUEVE MITOS SE CALMARON: YA NO ASUSTAN A NADIE EN EL PUEBLO, EN EL LLANO, EN EL RÍO, EN EL MONTE NI EN LA LAGUNA.',
      'LOS MITOS SON PARTE DE ESTA TIERRA. NO HAY QUE ACABARLOS: HAY QUE RESPETARLOS.',
    ], { speaker: 'ABUELA ROSA' });
    this.st.flags.push('fin');
    saveAdventure(this.st);
    const cam = this.cameras.main;
    const g = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setScrollFactor(0).setDepth(6000);
    await this.tween({ targets: g, fillAlpha: 0.85, duration: 800 });
    const t1 = this.add.bitmapText(GAME_WIDTH / 2, 90, 'font', 'FIN').setScale(3).setOrigin(0.5).setTint(0xf8d048).setScrollFactor(0).setDepth(6001);
    const t2 = this.add.bitmapText(GAME_WIDTH / 2, 130, 'font', 'LA VEREDA VUELVE A DORMIR EN PAZ').setOrigin(0.5).setScrollFactor(0).setDepth(6001);
    await this.wait(3000);
    await this.tween({ targets: [g, t1, t2], alpha: 0, duration: 600 });
    g.destroy(); t1.destroy(); t2.destroy();
    cam.flash(200);
  }

  private async pauseMenu(): Promise<void> {
    this.locked = true;
    const i = await this.dialog.ask('¿QUÉ QUIERES HACER?', ['ESPANTOS', 'GUARDAR', 'SALIR AL MENÚ', 'VOLVER'], { cancel: 3 });
    if (i === 0) {
      const left = GUARDIANS.filter((g) => !this.st.calmed.includes(g.id)).map((g) => FIGHTERS[g.id].name).join(', ');
      await this.dialog.say([`MITOS CALMADOS: ${this.st.calmed.length} DE ${GUARDIANS.length}.`, left ? `FALTAN: ${left}.` : '¡YA NO FALTA NINGUNO!']);
    } else if (i === 1) {
      saveAdventure(this.st);
      sfx.play('confirm');
      await this.dialog.say(['PARTIDA GUARDADA.']);
    } else if (i === 2) {
      saveAdventure(this.st);
      this.registry.remove('adventure');
      this.cameras.main.fadeOut(300);
      await this.wait(320);
      this.scene.start('MenuScene');
      return;
    }
    this.locked = false;
  }

  /** Algo se mueve en la hierba alta: Juan se asusta, pero no sale nada. */
  private async rustleEvent(): Promise<void> {
    this.locked = true;
    const tg = this.tallGrass.get(`${this.st.x},${this.st.y}`);
    sfx.play('whisper');
    if (tg) await this.tween({ targets: tg, x: tg.x + 2, duration: 50, yoyo: true, repeat: 5 });
    await Promise.all([this.bubble(this.hero, 2, 500), this.shake(this.hero, 6)]);
    const lines = ['¿QUIÉN ANDA AHÍ?... ¡SALGA, PUES, QUE NO LE TENGO MIEDO!... BUENO, UN POQUITO.', '¡UY! ALGO SE MOVIÓ EN LA HIERBA... DEBE SER UN CONEJO... ¿CIERTO?'];
    await this.dialog.say([lines[Math.floor(this.rnd() * lines.length)]], { speaker: 'JUAN MACHETE', shake: true });
    this.locked = false;
  }

  /** Juan Machete contra el mito, en el combate de lucha y en el escenario de su leyenda. */
  private async startFight(g: Guardian): Promise<void> {
    this.locked = true;
    const id = g.id;
    const fight: AdventureFight = { id };
    this.registry.set('adventureFight', fight);
    setSettings(this, { ...getSettings(this), mode: 'cpu', p1: HERO_FIGHTER, p2: id, stage: g.stage, difficulty: fightDifficulty(this.st) });
    saveAdventure(this.st);
    sfx.play(id === 'silbon' ? 'whistle' : 'screamer');
    const cam = this.cameras.main;
    for (let i = 0; i < 3; i++) {
      cam.flash(90, 255, 255, 255);
      await this.wait(140);
    }
    // persianas negras como en los juegos de bolsillo
    const bars: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 8; i++) {
      const y = i * (GAME_HEIGHT / 8);
      bars.push(this.add.rectangle(i % 2 ? GAME_WIDTH : 0, y, 0, GAME_HEIGHT / 8, 0x000000).setOrigin(i % 2 ? 1 : 0, 0).setScrollFactor(0).setDepth(7000));
    }
    await this.tween({ targets: bars, width: GAME_WIDTH, duration: 450, ease: 'Cubic.in' });
    this.scene.start('FightScene');
  }
}
