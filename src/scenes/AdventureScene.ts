import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game-config';
import { sfx, type SfxName } from '../audio/Sfx';
import { MENU_KEYS, MenuInput, inputManager, toggleFullscreen } from '../utils/game';
import { addPixmap, addSheet } from '../utils/textures';
import { drawnAnimKey } from '../art/DrawnAnim';
import { FIGHTERS } from '../data/fighters';
import type { FighterId } from '../combat/CombatTypes';
import { DialogBox } from '../adventure/DialogBox';
import {
  BUILDINGS, GUARDIANS, HERO_FIGHTER, LLORONA_EVENT_Y, MAP_H, MAP_W, NPCS, PESCADOR_REFUGIO, PROPS, RUSTLE_RATE, SIGNS, SPIRITS,
  STEP, areaName, buildMap, doorOf, inRect, walkable, type Cell, type Dir, type Guardian, type Npc, type Placed, type Spirit,
} from '../adventure/World';
import {
  allCalmed, applyOutcome, clearAdventure, fightDifficulty, loadAdventure, newAdventure, saveAdventure,
  type AdventureFight, type AdventureState, type FightOutcome,
} from '../adventure/State';
import {
  GLIMPSE_MAX, GLIMPSE_MIN, HEAR_RADIUS, ambushChance, dist, popSpot, relocate, spawnHidden, vanishChance, wander, zoneCells, type Hidden,
} from '../adventure/Hunt';
import { getSettings, setSettings } from '../utils/game';
import {
  buildBridge, buildBubble, buildFlowers, buildShadow, buildSign, buildTallGrass, buildTree, buildWater,
} from '../adventure/OverworldArt';
import {
  BUILDING_FOOTPRINT, BUILDING_NAME, PROP_FOOTPRINT, SPIRIT_FRAMES, buildBuilding, buildClue, buildProp, buildSpirit, buildVillager,
  buildingLights, propLights, type BuildingKind, type PropKind, type SpiritKind, type VillagerKind,
} from '../adventure/TownArt';

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
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Noche cerrada: azul muy oscuro encima de todo, con la luz del farol de Juan, faroles y ventanas recortados. */
const NIGHT_COLOR = 0x040818;
const NIGHT_ALPHA = 0.82;
const LANTERN_R = 92;
const DEPTH_NIGHT = 3000;

export const VILLAGER_KINDS: VillagerKind[] = ['cantinero', 'cura', 'borracho', 'nina', 'arriero', 'vendedora', 'campesina', 'policia', 'cafetero', 'nino'];
export const SPIRIT_KINDS: SpiritKind[] = ['duende', 'pollo', 'mano'];

/** Lo que se oye cuando un mito anda cerca sin dejarse ver */
const MYTH_SOUND: Record<FighterId, SfxName> = {
  silbon: 'whistle', llorona: 'distantScream', patasola: 'land', madremonte: 'creak', mohan: 'wave',
  hombrecaiman: 'mist', bachue: 'mist', sombreron: 'whisper', muelona: 'whisper', juanmachete: 'whisper',
};
const SPIRIT_SCALE: Record<SpiritKind, number> = { duende: 0.72, pollo: 0.8, mano: 1 };
const SPIRIT_SOUND: Record<SpiritKind, SfxName> = { duende: 'duende', pollo: 'polloMaligno', mano: 'manoPeluda' };

const feetX = (cx: number) => cx * CELL + CELL / 2;
const feetY = (cy: number) => cy * CELL + CELL - 3;
const key = (x: number, y: number) => `${x},${y}`;

interface NpcView { npc: Npc; x: number; y: number; home: [number, number]; facing: Dir; sprite: Phaser.GameObjects.Sprite; scared: boolean; talks: number }
interface HiddenView { h: Hidden; g: Guardian }
interface SpiritView { s: Spirit; x: number; y: number; sprite: Phaser.GameObjects.Sprite; shown: boolean; steps: number; cooldown: number; procedural: boolean }
interface Light { x: number; y: number; r: number; flicker: number }

export class AdventureScene extends Phaser.Scene {
  private st!: AdventureState;
  private map: Cell[][] = [];
  private menu = new MenuInput();
  private dialog!: DialogBox;
  private hero!: Phaser.GameObjects.Sprite;
  private heroShadow!: Phaser.GameObjects.Image;
  private grassFront!: Phaser.GameObjects.Image;
  private npcs: NpcView[] = [];
  private hidden: HiddenView[] = [];
  private spirits: SpiritView[] = [];
  private clues = new Map<string, Phaser.GameObjects.Image>();
  private seenClues = new Set<FighterId>();
  private waters: { img: Phaser.GameObjects.Image; top: boolean; bottom: boolean }[] = [];
  private tallGrass = new Map<string, Phaser.GameObjects.Image>();
  private lamps: Light[] = [];
  private night!: Phaser.GameObjects.RenderTexture;
  private eyes!: Phaser.GameObjects.Container;
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
      if (data.outcome !== 'lose') saveAdventure(this.st);
    }
    this.registry.set('adventure', this.st);
    this.menu = new MenuInput();
    this.moving = false;
    this.locked = false;
    this.npcs = [];
    this.hidden = [];
    this.spirits = [];
    this.waters = [];
    this.lamps = [];
    this.tallGrass.clear();
    this.clues.clear();
    this.area = '';
    sfx.setTension(0);
    sfx.setSoundscape('pueblo');

    this.ensureTextures();
    this.map = buildMap();
    this.buildGround();
    this.buildObjects();
    this.buildActors();
    this.buildNight();

    this.cameras.main.setBounds(0, 0, MAP_W * CELL, MAP_H * CELL).setBackgroundColor('#0c2414');
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
    const add = (k: string, pm: Parameters<typeof addPixmap>[2]) => { if (!this.textures.exists(k)) addPixmap(this, k, pm); };
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
    for (const k of Object.keys(BUILDING_FOOTPRINT) as BuildingKind[]) add(`av_b_${k}`, buildBuilding(k));
    for (const k of Object.keys(PROP_FOOTPRINT) as PropKind[]) add(`av_p_${k}`, buildProp(k));
    for (const g of GUARDIANS) for (const f of [0, 1]) add(`av_clue_${g.clue}_${f}`, buildClue(g.clue, f));
    for (const v of VILLAGER_KINDS) if (!this.textures.exists(`av_${v}`)) addSheet(this, `av_${v}`, buildVillager(v), 48, 48);
    for (const s of SPIRIT_KINDS) if (!this.textures.exists(`av_spirit_${s}`)) addSheet(this, `av_spirit_${s}`, buildSpirit(s), 48, 48);
    if (!this.textures.exists('av_light')) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d')!;
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.85)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      this.textures.addCanvas('av_light', c);
    }
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
        if (c === 'c') {
          rt.fill(0x4a3c30, 1, x * 16, y * 16, 16, 16);
          rt.fill(0x5c4a3a, 1, x * 16 + ((x * 5 + y * 3) % 12), y * 16 + ((x * 7 + y) % 12), 3, 2);
        }
        if (c === 'f') rt.drawFrame('av_flowers', undefined, x * 16, y * 16);
        if (c === 'B') rt.drawFrame('av_bridge', undefined, x * 16, y * 16);
      }
    }
    const isWater = (x: number, y: number) => { const c = this.map[y]?.[x]; return c === '~' || c === 'B'; };
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const c = this.map[y][x];
        if (c === '~') {
          const top = !isWater(x, y - 1);
          const bottom = !isWater(x, y + 1);
          const img = this.add.image(x * CELL, y * CELL, `av_water_0_${+top}${+bottom}`).setOrigin(0).setScale(2).setDepth(-9000);
          this.waters.push({ img, top, bottom });
        }
        if (c === '"') {
          const img = this.add.image(x * CELL, y * CELL, 'av_tall_0').setOrigin(0).setScale(2).setDepth(-8000);
          this.tallGrass.set(key(x, y), img);
        }
      }
    }
  }

  /** Luces de un dibujo de 16 px/baldosa puesto a escala 2 con su esquina de abajo-centro en (cx, bottom). */
  private addLights(points: [number, number][], tex: string, cx: number, bottom: number, r: number): void {
    const src = this.textures.get(tex).getSourceImage();
    const left = cx - src.width, top = bottom - src.height * 2;
    for (const [px, py] of points) this.lamps.push({ x: left + px * 2, y: top + py * 2, r, flicker: Math.random() * 10 });
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
    for (const b of BUILDINGS) {
      const [w, h] = BUILDING_FOOTPRINT[b.kind];
      const cx = (b.x + w / 2) * CELL, bottom = (b.y + h) * CELL;
      this.add.image(cx, bottom, `av_b_${b.kind}`).setOrigin(0.5, 1).setScale(2).setDepth(bottom);
      this.addLights(buildingLights(b.kind), `av_b_${b.kind}`, cx, bottom, 30);
    }
    for (const p of PROPS) {
      const [w] = PROP_FOOTPRINT[p.kind];
      const x0 = p.x - Math.floor((w - 1) / 2);
      const cx = (x0 + w / 2) * CELL, bottom = (p.y + 1) * CELL;
      this.add.image(cx, bottom, `av_p_${p.kind}`).setOrigin(0.5, 1).setScale(2).setDepth(bottom - 2);
      this.addLights(propLights(p.kind), `av_p_${p.kind}`, cx, bottom, p.kind === 'farol' ? 70 : 34);
    }
    for (const s of SIGNS) this.add.image(feetX(s.x), feetY(s.y) + 3, 'av_sign').setOrigin(0.5, 1).setScale(2).setDepth(feetY(s.y));
  }

  private buildActors(): void {
    for (const npc of NPCS) {
      let [x, y] = [npc.x, npc.y];
      if (npc.key === 'pescador' && this.st.flags.includes('tono')) [x, y] = PESCADOR_REFUGIO;
      const tex = this.textures.exists(`av_${npc.key}`) ? `av_${npc.key}` : 'av_hero';
      const sprite = this.add.sprite(feetX(x), feetY(y), tex, 0).setOrigin(0.5, 47 / 48);
      const view: NpcView = { npc, x, y, home: [x, y], facing: npc.facing, sprite, scared: false, talks: 0 };
      this.faceNpc(view, npc.facing);
      this.npcs.push(view);
    }
    this.heroShadow = this.add.image(0, 0, 'av_shadow');
    this.hero = this.add.sprite(feetX(this.st.x), feetY(this.st.y), 'av_hero', HERO_FRAMES[this.st.facing].idle).setOrigin(0.5, 47 / 48);
    this.grassFront = this.add.image(0, 0, 'av_tall_0').setOrigin(0.5, 0).setScale(2).setCrop(0, 9, 16, 7).setVisible(false);
    this.setHeroFrame();
    this.placeHero(feetX(this.st.x), feetY(this.st.y));

    // los mitos no se ven: rondan escondidos lejos de Juan
    const left = GUARDIANS.filter((g) => !this.st.calmed.includes(g.id));
    const hs = spawnHidden(this.map, left, this.rnd, this.st);
    this.hidden = hs.map((h, i) => ({ h, g: left[i] }));
    for (const v of this.hidden) {
      v.h.escapes = this.st.escapes[v.g.id] ?? 0;
      for (let i = 0; i < 6; i++) wander(this.map, v.h, v.g, this.rnd, (x, y) => this.occupied(x, y));
      this.syncClues(v);
    }
    for (const s of SPIRITS) {
      const tex = `av_spirit_${s.kind}`;
      const procedural = this.textures.get(tex).getSourceImage() instanceof HTMLCanvasElement;
      const sprite = this.add.sprite(0, 0, tex, 0).setOrigin(0.5, 1).setVisible(false);
      this.spirits.push({ s, x: -1, y: -1, sprite, shown: false, steps: 0, cooldown: 10, procedural });
    }
  }

  private buildNight(): void {
    this.night = this.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0).setScrollFactor(0).setDepth(DEPTH_NIGHT);
    this.eyes = this.add.container(0, 0).setDepth(DEPTH_NIGHT + 1);
  }

  /** Cada fotograma: noche encima y luces recortadas (solo las que caen en pantalla). */
  private drawNight(): void {
    const cam = this.cameras.main;
    const sx = cam.scrollX, sy = cam.scrollY;
    this.night.clear().fill(NIGHT_COLOR, NIGHT_ALPHA);
    // el farol de Juan tiembla un poquito
    const r = LANTERN_R + Math.sin(this.frame / 7) * 2 + (this.frame % 23 === 0 ? -3 : 0);
    const eraseScaled = (x: number, y: number, rr: number) => {
      if (x + rr < sx || y + rr < sy || x - rr > sx + GAME_WIDTH || y - rr > sy + GAME_HEIGHT) return;
      const img = this.make.image({ key: 'av_light', add: false }).setOrigin(0.5).setScale(rr / 64);
      this.night.erase(img, Math.round(x - sx), Math.round(y - sy));
      img.destroy();
    };
    eraseScaled(this.hero.x, this.hero.y - 16, r);
    for (const l of this.lamps) eraseScaled(l.x, l.y, l.r + Math.sin(this.frame / 9 + l.flicker) * 2);
  }

  private occupied(x: number, y: number): boolean {
    if (this.st.x === x && this.st.y === y) return true;
    if (this.npcs.some((n) => n.x === x && n.y === y)) return true;
    return this.hidden.some((v) => v.h.x === x && v.h.y === y);
  }

  /** Las señales que deja cada mito: se pintan en el suelo y solo se ven con el farol. */
  private syncClues(v: HiddenView): void {
    const want = new Set(v.h.trail.map(([x, y]) => `${v.g.id}:${key(x, y)}`));
    for (const [k, img] of this.clues) if (k.startsWith(`${v.g.id}:`) && !want.has(k)) { img.destroy(); this.clues.delete(k); }
    for (const [x, y] of v.h.trail) {
      const k = `${v.g.id}:${key(x, y)}`;
      if (this.clues.has(k)) continue;
      this.clues.set(k, this.add.image(feetX(x), y * CELL + CELL / 2, `av_clue_${v.g.clue}_0`).setScale(2).setDepth(-7000));
    }
  }

  private clearClues(id: FighterId): void {
    for (const [k, img] of this.clues) if (k.startsWith(`${id}:`)) { img.destroy(); this.clues.delete(k); }
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
    return this.spirits.some((s) => s.shown && s.x === x && s.y === y);
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
    this.drawNight();
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
    if (this.frame % 90 === 0) this.wanderNpcs();
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
    const tg = this.tallGrass.get(key(this.st.x, this.st.y));
    if (tg) this.tweens.add({ targets: tg, y: tg.y + 2, duration: 80, yoyo: true });
  }

  private animateWorld(): void {
    const f = Math.floor(this.frame / 36) % 2;
    if (this.frame % 36 === 0) {
      for (const w of this.waters) w.img.setTexture(`av_water_${f}_${+w.top}${+w.bottom}`);
      for (const [k, img] of this.clues) {
        const clue = GUARDIANS.find((g) => k.startsWith(`${g.id}:`))!.clue;
        img.setTexture(`av_clue_${clue}_${f}`);
      }
    }
    for (const n of this.npcs) {
      const sx = n.scared ? (this.frame % 4 < 2 ? 1 : -1) : 0;
      if (!this.tweens.isTweening(n.sprite)) n.sprite.setPosition(feetX(n.x) + sx, feetY(n.y));
      n.sprite.setDepth(n.sprite.y);
    }
    for (const n of this.npcs) {
      if (n.npc.key === 'pescador') n.scared = this.st.flags.includes('tono') && !this.st.calmed.includes('llorona');
    }
    for (const s of this.spirits) {
      if (!s.shown) continue;
      // brinco suave del espíritu (transformación del fotograma completo)
      const k = SPIRIT_SCALE[s.s.kind];
      s.sprite.setScale(k, k * (1 + Math.sin(this.frame / 10) * 0.04)).setDepth(s.sprite.y);
      if (s.procedural && this.frame % 12 === 0) s.sprite.setFrame((Number(s.sprite.frame.name) + 1) % SPIRIT_FRAMES[s.s.kind]);
    }
  }

  /** Cerca de un espanto escondido Juan tiembla y a ratos suspira «...». */
  private idleFear(): void {
    const near = this.hidden.some((v) => dist(v.h.x, v.h.y, this.st.x, this.st.y) <= 5);
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

  /** Los aldeanos inquietos dan un pasito alrededor de su sitio. */
  private wanderNpcs(): void {
    for (const n of this.npcs) {
      const r = n.npc.wander ?? 0;
      if (!r || this.rnd() < 0.5) continue;
      const dirs: Dir[] = ['up', 'down', 'left', 'right'];
      const d = dirs[Math.floor(this.rnd() * 4)];
      const [dx, dy] = STEP[d];
      const nx = n.x + dx, ny = n.y + dy;
      this.faceNpc(n, d);
      if (Math.abs(nx - n.home[0]) + Math.abs(ny - n.home[1]) > r || this.blocked(nx, ny) || this.occupied(nx, ny)) continue;
      n.x = nx; n.y = ny;
      this.tweens.add({ targets: n.sprite, x: feetX(nx), y: feetY(ny), duration: 260 });
    }
  }

  // ---------------------------------------------------------------- sucesos

  private arrive(): void {
    this.showArea();
    if (!this.ready) return;
    const hero = { x: this.st.x, y: this.st.y };

    for (const v of this.hidden) {
      if (v.h.rest > 0) v.h.rest--;
      if (this.rnd() < 0.6) {
        wander(this.map, v.h, v.g, this.rnd, (x, y) => this.occupied(x, y));
        this.syncClues(v);
      }
    }
    // ¿alguno salta de la nada?
    for (const v of this.hidden) {
      if (this.rnd() < ambushChance(dist(v.h.x, v.h.y, hero.x, hero.y), v.h.rest)) { void this.ambush(v); return; }
    }
    // Juan pisa una señal
    for (const v of this.hidden) {
      if (!v.h.trail.some(([x, y]) => x === hero.x && y === hero.y) || this.seenClues.has(v.g.id)) continue;
      this.seenClues.add(v.g.id);
      void this.clueEvent(v);
      return;
    }
    if (this.st.y >= LLORONA_EVENT_Y && this.st.x >= 28 && this.st.x <= 50 && !this.st.flags.includes('tono') && !this.st.calmed.includes('llorona')) {
      void this.tonoEvent();
      return;
    }
    for (const v of this.hidden) {
      const d = dist(v.h.x, v.h.y, hero.x, hero.y);
      if (d >= GLIMPSE_MIN && d <= GLIMPSE_MAX && this.rnd() < 0.07) { void this.glimpse(v); break; }
      if (d <= HEAR_RADIUS && this.rnd() < 0.12) { sfx.play(MYTH_SOUND[v.g.id]); break; }
    }
    if (this.spiritStep()) return;
    if (this.map[this.st.y][this.st.x] === '"' && this.rnd() < RUSTLE_RATE) void this.rustleEvent();
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

  private mythSprite(id: FighterId, x: number, y: number, anim: 'idle' | 'walk' = 'idle'): Phaser.GameObjects.Sprite {
    const k = drawnAnimKey(id, 'p1', anim);
    return this.add.sprite(feetX(x), feetY(y) + 2, this.textures.exists(k) ? k : 'av_hero', 0).setOrigin(0.5, 1).setDepth(feetY(y) + 2);
  }

  /** Ojos rojos que brillan en la oscuridad, por encima de la noche. */
  private eyesAt(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    for (const dx of [-3, 3]) c.add(this.add.rectangle(dx, 0, 2, 2, 0xff2020));
    this.eyes.add(c);
    return c;
  }

  /** Se deja ver un instante a lo lejos y se esfuma. */
  private async glimpse(v: HiddenView): Promise<void> {
    const sp = this.mythSprite(v.g.id, v.h.x, v.h.y).setAlpha(0).setFlipX(v.h.x > this.st.x);
    const eyes = this.eyesAt(sp.x, sp.y - sp.displayHeight * 0.78).setAlpha(0);
    sfx.monster(v.g.id, 'attack');
    await this.tween({ targets: [sp, eyes], alpha: 0.85, duration: 300 });
    await this.wait(500);
    await this.tween({ targets: [sp, eyes], alpha: 0, duration: 400 });
    sp.destroy(); eyes.destroy();
    for (let i = 0; i < 3; i++) wander(this.map, v.h, v.g, this.rnd, (x, y) => this.occupied(x, y));
    this.syncClues(v);
  }

  private async clueEvent(v: HiddenView): Promise<void> {
    this.locked = true;
    await this.bubble(this.hero, 1, 400);
    sfx.play(MYTH_SOUND[v.g.id]);
    await this.dialog.say([v.g.clueText], { speaker: 'JUAN MACHETE' });
    this.locked = false;
  }

  /** El mito sale de la nada al lado de Juan: susto, y pelea... o se esfuma. */
  private async ambush(v: HiddenView): Promise<void> {
    this.locked = true;
    const spot = popSpot(this.map, this.st, STEP[this.st.facing], (x, y) => this.occupied(x, y) && !(x === v.h.x && y === v.h.y));
    if (!spot) { this.locked = false; return; }
    [v.h.x, v.h.y] = spot;
    const sp = this.mythSprite(v.g.id, spot[0], spot[1]).setAlpha(0).setFlipX(spot[0] > this.st.x);
    this.st.facing = spot[0] > this.st.x ? 'right' : spot[0] < this.st.x ? 'left' : spot[1] > this.st.y ? 'down' : 'up';
    this.setHeroFrame();
    sfx.play('screamer');
    this.cameras.main.flash(120, 120, 0, 0);
    this.cameras.main.shake(300, 0.01);
    sfx.monster(v.g.id, 'attack');
    sp.setScale(1.3);
    await this.tween({ targets: sp, alpha: 1, scale: 1, duration: 160, ease: 'Back.out' });
    await Promise.all([this.bubble(this.hero, 2, 600), this.shake(this.hero, 8)]);
    await this.dialog.say([v.g.fright], { speaker: 'JUAN MACHETE', shake: true });

    if (this.rnd() < vanishChance(v.h.escapes)) {
      await this.dialog.say([v.g.flee]);
      await this.vanish(sp);
      this.escaped(v);
      this.locked = false;
      return;
    }
    await this.dialog.say([v.g.taunt], { speaker: FIGHTERS[v.g.id].name });
    await this.startFight(v.g);
  }

  private async vanish(sp: Phaser.GameObjects.Sprite): Promise<void> {
    sfx.play('mist');
    await this.tween({ targets: sp, alpha: 0, scaleX: 0.2, scaleY: 1.4, duration: 380, ease: 'Cubic.in' });
    sp.destroy();
  }

  private escaped(v: HiddenView): void {
    v.h.escapes++;
    this.st.escapes[v.g.id] = v.h.escapes;
    v.h.rest = 12;
    relocate(this.map, v.h, v.g, this.rnd, this.st);
    this.clearClues(v.g.id);
    saveAdventure(this.st);
  }

  // ---------------------------------------------------------------- espíritus: duende, pollo maligno, mano peluda

  /** Devuelve true si algo pasó y la escena quedó ocupada. */
  private spiritStep(): boolean {
    for (const sv of this.spirits) {
      const inZone = inRect(sv.s.zone, this.st.x, this.st.y);
      if (sv.shown) {
        sv.steps++;
        const d = dist(sv.x, sv.y, this.st.x, this.st.y);
        if (d <= 1) { void this.spiritMeet(sv); return true; }
        if (sv.steps > 9 || !inZone) { void this.spiritLeave(sv); continue; }
        if (sv.s.kind === 'pollo') this.spiritMove(sv, true);
        else if (sv.s.kind === 'duende' && this.rnd() < 0.5) this.spiritMove(sv, d < 3);
        continue;
      }
      if (sv.cooldown > 0) { sv.cooldown--; continue; }
      if (!inZone) continue;
      if (sv.s.kind === 'mano') {
        if (this.map[this.st.y][this.st.x] === 'c' && this.rnd() < 0.1) { void this.manoEvent(sv); return true; }
        continue;
      }
      if (this.rnd() < 0.06) this.spiritAppear(sv);
    }
    return false;
  }

  private spiritAppear(sv: SpiritView): void {
    const cells = zoneCells(this.map, sv.s.zone).filter(([x, y]) => {
      const d = dist(x, y, this.st.x, this.st.y);
      return d >= 3 && d <= 4 && !this.occupied(x, y);
    });
    if (!cells.length) return;
    [sv.x, sv.y] = cells[Math.floor(this.rnd() * cells.length)];
    sv.shown = true;
    sv.steps = 0;
    sv.sprite.setPosition(feetX(sv.x), feetY(sv.y) + 2).setAlpha(0).setVisible(true).setFrame(0);
    sv.sprite.setFlipX(sv.x > this.st.x);
    this.tweens.add({ targets: sv.sprite, alpha: 1, duration: 300 });
    sfx.play(SPIRIT_SOUND[sv.s.kind]);
    if (sv.s.kind === 'pollo') this.eyesAt(sv.sprite.x, sv.sprite.y - 30).setData('pollo', true);
  }

  private spiritMove(sv: SpiritView, towards: boolean): void {
    const opts = (Object.keys(STEP) as Dir[]).map((d) => [sv.x + STEP[d][0], sv.y + STEP[d][1]] as [number, number])
      .filter(([x, y]) => walkable(this.map, x, y) && !this.occupied(x, y) && inRect(sv.s.zone, x, y))
      .sort((a, b) => (dist(a[0], a[1], this.st.x, this.st.y) - dist(b[0], b[1], this.st.x, this.st.y)) * (towards ? 1 : -1));
    if (!opts.length) return;
    [sv.x, sv.y] = opts[0];
    sv.sprite.setFlipX(sv.x > this.st.x);
    this.tweens.add({ targets: sv.sprite, x: feetX(sv.x), y: feetY(sv.y) + 2, duration: 200 });
    this.syncPolloEyes(sv);
  }

  private syncPolloEyes(sv: SpiritView): void {
    if (sv.s.kind !== 'pollo') return;
    for (const c of this.eyes.list as Phaser.GameObjects.Container[]) {
      if (c.getData('pollo')) this.tweens.add({ targets: c, x: feetX(sv.x), y: feetY(sv.y) + 2 - 30, duration: 200 });
    }
  }

  private async spiritLeave(sv: SpiritView): Promise<void> {
    sv.shown = false;
    sv.cooldown = 25;
    sv.x = sv.y = -1;
    for (const c of [...this.eyes.list] as Phaser.GameObjects.Container[]) if (c.getData('pollo')) c.destroy();
    await this.tween({ targets: sv.sprite, alpha: 0, duration: 300 });
    sv.sprite.setVisible(false).setAlpha(1);
  }

  private async spiritMeet(sv: SpiritView): Promise<void> {
    this.locked = true;
    sfx.play(SPIRIT_SOUND[sv.s.kind]);
    await Promise.all([this.bubble(this.hero, 2, 500), this.shake(this.hero, 6)]);
    const fright: Record<SpiritKind, string> = {
      duende: '¡UN DUENDE! ¡NO ME VAYA A ESCONDER EL MACHETE, CHIQUITO!',
      pollo: '¡ESE POLLO NEGRO TIENE LOS OJOS ROJOS! ¡ES EL POLLO MALIGNO! ¡PÍO DICE, PERO DE POLLO NO TIENE NADA!',
      mano: '¡AY, AY, AY! ¡UNA MANO PELUDA ME AGARRÓ EL TOBILLO!',
    };
    await this.dialog.say([fright[sv.s.kind]], { speaker: 'JUAN MACHETE', shake: true });
    await this.dialog.say([sv.s.hints[Math.floor(this.rnd() * sv.s.hints.length)]], { speaker: sv.s.name });
    await this.spiritLeave(sv);
    this.locked = false;
  }

  /** En el cementerio la mano peluda sale de la tierra junto a los pies de Juan. */
  private async manoEvent(sv: SpiritView): Promise<void> {
    const spot = popSpot(this.map, this.st, STEP[this.st.facing], (x, y) => this.occupied(x, y));
    if (!spot) return;
    this.locked = true;
    [sv.x, sv.y] = spot;
    sv.shown = true;
    sv.steps = 0;
    sv.sprite.setPosition(feetX(sv.x), feetY(sv.y) + 2).setVisible(true).setAlpha(1).setFrame(0);
    sv.sprite.setCrop(0, 0, 48, 0);
    sfx.play('creak');
    this.cameras.main.shake(200, 0.006);
    for (let h = 8; h <= 48; h += 8) {
      sv.sprite.setCrop(0, 48 - h, 48, h);
      await this.wait(60);
    }
    sv.sprite.setCrop();
    await this.spiritMeet(sv);
  }

  // ---------------------------------------------------------------- historia

  private async intro(): Promise<void> {
    this.locked = true;
    await this.wait(500);
    const abuela = this.npcs.find((n) => n.npc.key === 'abuela')!;
    this.faceNpc(abuela, 'down');
    await this.bubble(abuela.sprite, 1);
    await this.dialog.say(['¡JUAN! ¡JUAN MACHETE! ¡QUÉ BUENO QUE BAJÓ DE MEDELLÍN, MIJO! Y A ESTAS HORAS DE LA NOCHE...'], { speaker: 'ABUELA ROSA' });
    abuela.scared = true;
    sfx.play('whisper');
    await this.dialog.say([
      'LOS ESPANTOS ANDAN ALBOROTADOS... DE NOCHE SE OYEN SILBIDOS, LLANTOS EN EL RÍO Y PASOS DE UNA SOLA PATA EN EL MONTE.',
      'ANDAN SUELTOS TODOS LOS MITOS: EL SOMBRERÓN Y LA MUELONA EN EL PUEBLO, EL SILBÓN EN EL LLANO, LA LLORONA Y EL MOHÁN EN EL RÍO, EL HOMBRE CAIMÁN EN LA CIÉNAGA...',
      '...LA PATASOLA Y LA MADREMONTE EN EL MONTE Y BACHUÉ EN LA LAGUNA DEL SUR. ¡YA NADIE SE ATREVE A SALIR!',
    ], { speaker: 'ABUELA ROSA', shake: true });
    abuela.scared = false;
    await this.dialog.say([
      'PERO OJO, MIJO: A LOS ESPANTOS NO LOS VA A VER ASÍ NO MÁS. SE ESCONDEN, SE MUEVEN Y SALEN DE LA NADA.',
      'BUSQUE LAS SEÑALES QUE DEJAN: HUELLAS, HUESOS, LÁGRIMAS... Y PARE BIEN LA OREJA. PREGÚNTELE A LA GENTE DEL PUEBLO.',
    ], { speaker: 'ABUELA ROSA' });
    await this.dialog.say(['¡AVE MARÍA, ABUELA! MIEDO SÍ ME DA... PERO UN PAISA NO SE ARRUGA. ¡DEME ESE MACHETE Y ESE FAROL, PUES!'], { speaker: 'JUAN MACHETE' });
    sfx.play('ultimate');
    await this.dialog.say(['¡ESO, MIJO! SI LO TUMBAN, SE ACABÓ TODO Y TOCA EMPEZAR DE NUEVO. Y SI EL ESPANTO SE LE VUELA, TOCA IR A BUSCARLO OTRA VEZ. ¡VAYA CON DIOS!'], { speaker: 'ABUELA ROSA' });
    this.st.flags.push('intro');
    saveAdventure(this.st);
    this.locked = false;
    this.showArea();
  }

  /** Don Toño oye el llanto en el río, tiembla y sale corriendo al pueblo. */
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
    await this.dialog.say(['¡¿OYÓ ESO, DON JUAN?! ¡ES LA LLORONA! ¡ME TIEMBLAN HASTA LAS CHANCLAS!', '¡YO ME VOY PA\'L PUEBLO! ¡USTED VERÁ SI SE ARRIESGA!'], { speaker: 'DON TOÑO', shake: true });
    tono.scared = false;
    await this.tween({ targets: tono.sprite, alpha: 0, duration: 400 });
    [tono.x, tono.y] = PESCADOR_REFUGIO;
    tono.home = [...PESCADOR_REFUGIO];
    tono.sprite.setPosition(feetX(tono.x), feetY(tono.y)).setAlpha(1);
    this.faceNpc(tono, 'down');
    cam.pan(this.hero.x, this.hero.y + 20, 400, 'Sine.easeInOut');
    await this.wait(420);
    cam.startFollow(this.hero, true, 1, 1, 0, 20);
    this.st.flags.push('tono');
    saveAdventure(this.st);
    this.locked = false;
  }

  /** De vuelta del combate: ganar calma al espanto; perder reinicia el juego; si se voló, toca buscarlo otra vez. */
  private async afterFight(fight: AdventureFight, outcome: FightOutcome): Promise<void> {
    this.locked = true;
    await this.wait(400);
    const name = FIGHTERS[fight.id].name;
    const g = GUARDIANS.find((x) => x.id === fight.id)!;
    if (outcome === 'lose') {
      const r = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1).setScrollFactor(0).setDepth(4900);
      const t1 = this.add.bitmapText(GAME_WIDTH / 2, 80, 'font', 'FIN DEL JUEGO').setScale(2).setOrigin(0.5).setTint(0xd82020).setScrollFactor(0).setDepth(4901);
      sfx.play('ko');
      await this.dialog.say([`${name} TUMBÓ A JUAN MACHETE...`, 'JUAN SE DESPIERTA EN LA VEREDA SIN SABER CUÁNTO TIEMPO PASÓ. TODO VUELVE A EMPEZAR.'], { shake: true });
      await this.tween({ targets: [r, t1], alpha: 0, duration: 800 });
      r.destroy(); t1.destroy();
      this.locked = false;
      void this.intro();
      return;
    }
    if (outcome === 'fled') {
      sfx.play(MYTH_SOUND[fight.id]);
      const v = this.hidden.find((x) => x.g.id === fight.id);
      if (v) v.h.rest = 12;
      await this.dialog.say([g.flee, `¡${name} SE VOLÓ DE LA PELEA! ANDA ESCONDIDO OTRA VEZ.`]);
      await this.dialog.say(['¡ESPERE Y VERÁ, QUE YO LO ENCUENTRO!'], { speaker: 'JUAN MACHETE' });
      this.locked = false;
      this.showArea();
      return;
    }
    sfx.play('ultimate');
    await this.dialog.say([g.defeat, `MITOS CALMADOS: ${this.st.calmed.length} DE ${GUARDIANS.length}.${allCalmed(this.st) ? ' ¡VUELVE CON LA ABUELA ROSA!' : ''}`]);
    await this.dialog.say(['¡QUÉ PELEA TAN BERRACA, PUES! ¡SIGAMOS!'], { speaker: 'JUAN MACHETE' });
    this.locked = false;
    this.showArea();
  }

  private buildingAt(x: number, y: number): Placed<BuildingKind> | undefined {
    return BUILDINGS.find((b) => {
      const [w, h] = BUILDING_FOOTPRINT[b.kind];
      return x >= b.x && x < b.x + w && y >= b.y && y < b.y + h;
    });
  }

  private async interact(): Promise<void> {
    const [dx, dy] = STEP[this.st.facing];
    const tx = this.st.x + dx, ty = this.st.y + dy;
    const npc = this.npcs.find((n) => n.x === tx && n.y === ty);
    this.locked = true;
    if (npc) {
      const before = npc.facing;
      this.faceNpc(npc, OPPOSITE[this.st.facing]);
      if (npc.npc.key === 'abuela') await this.talkAbuela(npc);
      else if (npc.npc.key === 'pescador') await this.talkTono(npc);
      else if (npc.npc.lines?.length) {
        await this.dialog.say(npc.npc.lines[npc.talks % npc.npc.lines.length], { speaker: npc.npc.name });
        npc.talks++;
      }
      this.faceNpc(npc, before);
      this.locked = false;
      return;
    }
    const sign = SIGNS.find((s) => s.x === tx && s.y === ty);
    if (sign) {
      await this.dialog.say(sign.lines);
      this.locked = false;
      return;
    }
    const sv = this.spirits.find((s) => s.shown && s.x === tx && s.y === ty);
    if (sv) { await this.spiritMeet(sv); return; }
    const b = this.buildingAt(tx, ty);
    if (b && this.st.facing === 'up') {
      const [ddx] = doorOf(b);
      const name = BUILDING_NAME[b.kind];
      const inside = b.kind === 'cantina' ? 'ADENTRO SUENA UNA RANCHERA Y ALGUIEN BRINDA CON AGUARDIENTE.' : b.kind === 'iglesia' || b.kind === 'capilla' ? 'ADENTRO SE OYEN REZOS BAJITO.' : 'NADIE ABRE. A ESTA HORA TODO EL MUNDO TIENE MIEDO DE ABRIR.';
      await this.dialog.say([...(name ? [name + '.'] : []), Math.abs(ddx - tx) <= 1 ? inside : 'UNA PARED DE BAHAREQUE. LA PUERTA ESTÁ MÁS ALLÁ.']);
    }
    this.locked = false;
  }

  private async talkAbuela(n: NpcView): Promise<void> {
    if (allCalmed(this.st)) {
      if (!this.st.flags.includes('fin')) { await this.ending(); return; }
      await this.dialog.say(['¡GRACIAS A USTED EL PUEBLO DUERME TRANQUILO, JUAN!'], { speaker: 'ABUELA ROSA' });
      return;
    }
    sfx.play('bloom');
    await this.dialog.say(['TÓMESE ESTE CALDITO DE GALLINA PARA EL SUSTO, MIJO.'], { speaker: 'ABUELA ROSA' });
    const left = GUARDIANS.length - this.st.calmed.length;
    n.scared = true;
    await this.dialog.say([`TODAVÍA QUEDAN ${left} MITOS SUELTOS... ACUÉRDESE: SIGA LAS SEÑALES Y PARE LA OREJA.`], { speaker: 'ABUELA ROSA', shake: true });
    n.scared = false;
    saveAdventure(this.st);
  }

  private async talkTono(n: NpcView): Promise<void> {
    if (!this.st.flags.includes('tono')) {
      await this.dialog.say(['AQUÍ PESCANDO BOCACHICOS, MIJO. DICEN QUE DE NOCHE SE OYE LLORAR A UNA MUJER EN EL RÍO... PURO CUENTO, ¿NO?'], { speaker: 'DON TOÑO' });
    } else if (!this.st.calmed.includes('llorona')) {
      await this.bubble(n.sprite, 2, 300);
      await this.dialog.say(['¡NO ME HAGA VOLVER A ESE RÍO! ¡TODAVÍA LA OIGO LLORAR POR LA ORILLA!'], { speaker: 'DON TOÑO', shake: true });
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
    const t2 = this.add.bitmapText(GAME_WIDTH / 2, 130, 'font', 'SAN AGUSTÍN VUELVE A DORMIR EN PAZ').setOrigin(0.5).setScrollFactor(0).setDepth(6001);
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
      await this.dialog.say([`MITOS CALMADOS: ${this.st.calmed.length} DE ${GUARDIANS.length}.`, left ? `FALTAN: ${left}. ANDAN ESCONDIDOS: BUSCA SUS SEÑALES.` : '¡YA NO FALTA NINGUNO!']);
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
    const tg = this.tallGrass.get(key(this.st.x, this.st.y));
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
    const fight: AdventureFight = { id, escapes: this.st.escapes[id] ?? 0 };
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
