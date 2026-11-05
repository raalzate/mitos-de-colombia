import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game-config';
import { sfx } from '../audio/Sfx';
import type { FighterId } from '../combat/CombatTypes';
import { FIGHTERS } from '../data/fighters';
import { drawnAnimKey } from '../art/DrawnAnim';
import { HORSE_GALLOP_FIRST, HORSE_GALLOP_FRAMES, RIDER_SEAT, buildHorse } from '../adventure/OverworldArt';
import { wrap } from '../adventure/text';
import { MENU_KEYS, MenuInput, inputManager } from '../utils/game';
import { addSheet, text } from '../utils/textures';
import { DEMO } from '../demo/Demo';
import { setupView } from '../utils/view';

/** Lo que el final necesita saber de la partida. */
export interface EndingData {
  /** los mitos en el orden en que Juan los calmó */
  calmed: FighterId[];
  /** dónde rondaba cada uno esa noche («EL LLANO», «LA CIÉNAGA»...) */
  places: Partial<Record<FighterId, string>>;
  stories: number;
  totalStories: number;
  /** la hora en que terminó, ya escrita («9:40 PM») */
  clock: string;
  dog: boolean;
  horse: boolean;
}

/** la loma lejana por donde pasan los mitos y la loma de adelante donde mira la familia */
const RIDGE_Y = 150;
const HILL_Y = 196;
/** alto de los mitos en el desfile, en píxeles */
const MYTH_H = 46;
const SPAWN_MS = 1700;
const WALK_MS = 7600;

const NIGHT = 0x0a1430, DAWN = 0xe07a48, MORNING = 0x8ab8e0;

const lerpColor = (a: number, b: number, t: number) => {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.IntegerToColor(a), Phaser.Display.Color.IntegerToColor(b), 100, t * 100);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

/** «EL LLANO» → «AL LLANO»; «LA CIÉNAGA» → «A LA CIÉNAGA». */
const toPlace = (p: string) => (p.startsWith('EL ') ? `AL ${p.slice(3)}` : `A ${p}`);

/**
 * El final: amanece sobre San Agustín. Los nueve mitos pasan por la loma, uno por uno, de vuelta a su sitio;
 * Juan, la abuela, Firulais y Lucero los ven irse. Luego los créditos, la pólvora y el FIN.
 */
export class EndingScene extends Phaser.Scene {
  private d!: EndingData;
  private sky!: Phaser.GameObjects.Rectangle;
  private skyT = { night: 0 };
  private caption!: Phaser.GameObjects.Container;
  private menu = new MenuInput();
  /** velo oscuro para leer los créditos; se quita para el FIN con el cielo de la mañana */
  private shade: Phaser.GameObjects.Rectangle | null = null;
  private done = false;

  constructor() {
    super('EndingScene');
  }

  create(d: EndingData): void {
    setupView(this);
    this.d = d;
    this.done = false;
    this.menu = new MenuInput();
    sfx.setBattle(false);
    sfx.setTension(0);
    if (!this.textures.exists('av_caballo')) addSheet(this, 'av_caballo', buildHorse('lucero'), 48, 48);
    if (!this.textures.exists('av_caballo_negro')) addSheet(this, 'av_caballo_negro', buildHorse('negro'), 48, 48);
    this.buildLandscape();
    this.caption = this.add.container(0, 0).setDepth(900);
    this.cameras.main.fadeIn(900, 0, 0, 0);
    void this.play();
  }

  override update(): void {
    inputManager.update();
    if (this.done && !DEMO && this.menu.pressed(MENU_KEYS.confirm)) {
      this.done = false;
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(650, () => this.scene.start('MenuScene'));
    }
  }

  private buildLandscape(): void {
    this.sky = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, NIGHT).setOrigin(0).setDepth(0);
    // estrellas y luna, que se apagan al amanecer
    const stars = this.add.container(0, 0).setDepth(1).setName('stars');
    for (let i = 0; i < 46; i++) {
      const s = this.add.rectangle((i * 73) % GAME_WIDTH, (i * 37) % 120, 1, 1, 0xf8f0d0).setAlpha(0.4 + ((i * 7) % 6) / 10);
      stars.add(s);
      this.tweens.add({ targets: s, alpha: 0.2, duration: 600 + (i % 5) * 200, yoyo: true, repeat: -1 });
    }
    stars.add(this.add.circle(326, 62, 11, 0xf0f0d0));
    // el sol sale detrás de la loma
    this.add.circle(118, RIDGE_Y + 30, 20, 0xf8c048).setDepth(2).setName('sun');
    this.add.circle(118, RIDGE_Y + 30, 30, 0xf8a040, 0.25).setDepth(2).setName('halo');
    const g = this.add.graphics().setDepth(3);
    const ridge = (y: number, amp: number, seed: number, color: number) => {
      g.fillStyle(color, 1).beginPath().moveTo(0, GAME_HEIGHT);
      for (let x = 0; x <= GAME_WIDTH; x += 6) g.lineTo(x, y - Math.abs(Math.sin(x / 53 + seed) * amp + Math.sin(x / 21 + seed * 2) * amp * 0.35));
      g.lineTo(GAME_WIDTH, GAME_HEIGHT).closePath().fillPath();
    };
    ridge(RIDGE_Y - 18, 22, 2, 0x1a2a40);
    // la loma por donde pasan los mitos: plana arriba para que caminen derecho
    g.fillStyle(0x16281e, 1).fillRect(0, RIDGE_Y, GAME_WIDTH, GAME_HEIGHT - RIDGE_Y);
    for (let x = 0; x < GAME_WIDTH; x += 12) g.fillStyle(0x1e3426, 1).fillCircle(x + 4, RIDGE_Y + 2, 4);
    // las casitas del pueblo con la luz prendida, abajo a lo lejos
    for (let i = 0; i < 9; i++) {
      const x = 196 + i * 20 + (i % 3) * 3, y = RIDGE_Y + 12 + (i % 2) * 5;
      g.fillStyle(0xe8e0d0, 1).fillRect(x, y, 12, 8);
      g.fillStyle(0x8a3a2a, 1).fillTriangle(x - 2, y, x + 14, y, x + 6, y - 6);
      g.fillStyle(0xf8d048, 1).fillRect(x + 4, y + 3, 3, 3);
    }
    // la loma de adelante, donde está la familia
    const near = this.add.graphics().setDepth(20);
    near.fillStyle(0x0c1610, 1).beginPath().moveTo(0, GAME_HEIGHT);
    for (let x = 0; x <= GAME_WIDTH; x += 6) near.lineTo(x, HILL_Y - Math.sin(x / 70 + 1) * 6);
    near.lineTo(GAME_WIDTH, GAME_HEIGHT).closePath().fillPath();
  }

  /** La familia, de espaldas, mirando el amanecer. */
  private buildFamily(): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    const y = HILL_Y + 6;
    if (this.d.horse) out.push(this.add.image(268, y, 'av_caballo', 2).setOrigin(0.5, 1));
    out.push(this.add.sprite(214, y, this.textures.exists('av_abuela') ? 'av_abuela' : 'av_hero', 2).setOrigin(0.5, 1));
    out.push(this.add.sprite(238, y + 1, 'av_hero', 14).setOrigin(0.5, 1));
    if (this.d.dog) out.push(this.add.sprite(252, y + 2, 'av_perro', 2).setOrigin(0.5, 1).setScale(0.75));
    for (const o of out) (o as Phaser.GameObjects.Image).setDepth(21).setAlpha(0);
    return out;
  }

  private async play(): Promise<void> {
    const family = this.buildFamily();
    await this.say('ESA NOCHE, EN SAN AGUSTÍN, LOS ESPANTOS DEJARON DE ASUSTAR...', 2600);
    this.tweens.add({ targets: family, alpha: 1, duration: 1200 });
    // el cielo va aclarando mientras pasan los mitos
    this.tweens.add({ targets: this.skyT, night: 1, duration: SPAWN_MS * this.d.calmed.length + WALK_MS, onUpdate: () => this.paintSky() });
    for (const id of this.d.calmed) {
      this.walkHome(id);
      const place = this.d.places[id];
      void this.say(`${FIGHTERS[id].name} VUELVE ${place ? toPlace(place) : 'A SU MONTE'}.`, SPAWN_MS - 500, id);
      await this.wait(SPAWN_MS);
    }
    await this.wait(WALK_MS - SPAWN_MS);
    sfx.play('victoria');
    this.cameras.main.flash(500, 255, 220, 160);
    await this.say('...Y SAN AGUSTÍN VOLVIÓ A DORMIR EN PAZ.', 3000);
    await this.say('LOS MITOS SON PARTE DE ESTA TIERRA. NO HAY QUE ACABARLOS: HAY QUE RESPETARLOS.', 4200);
    await this.credits();
    await this.theEnd();
  }

  private paintSky(): void {
    const t = this.skyT.night;
    this.sky.setFillStyle(t < 0.6 ? lerpColor(NIGHT, DAWN, t / 0.6) : lerpColor(DAWN, MORNING, (t - 0.6) / 0.4));
    (this.children.getByName('stars') as Phaser.GameObjects.Container).setAlpha(1 - Math.min(1, t * 1.6));
    const sun = this.children.getByName('sun') as Phaser.GameObjects.Arc;
    const halo = this.children.getByName('halo') as Phaser.GameObjects.Arc;
    const y = RIDGE_Y + 30 - t * 84;
    sun.setY(y);
    halo.setY(y).setScale(1 + Math.sin(t * Math.PI) * 0.4);
  }

  /** Un mito pasa caminando por la loma, tranquilo, de vuelta a su sitio. */
  private walkHome(id: FighterId): void {
    const walk = drawnAnimKey(id, 'p1', 'walk');
    const idle = drawnAnimKey(id, 'p1', 'idle');
    const mounted = id === 'sombreron' && this.textures.exists(idle);
    const key = mounted ? idle : this.textures.exists(walk) ? walk : this.textures.exists(idle) ? idle : 'av_hero';
    const sp = this.add.sprite(-40, RIDGE_Y + 2, key, 0).setOrigin(0.5, 1).setDepth(10);
    const k = MYTH_H / sp.frame.height;
    sp.setScale(mounted ? k * 0.85 : k);
    const frames = Math.max(1, this.textures.get(key).frameTotal - 1);
    let horse: Phaser.GameObjects.Image | null = null;
    if (mounted) {
      // el Sombrerón pasa en su caballo negro, como siempre
      horse = this.add.image(-40, RIDGE_Y + 2, 'av_caballo_negro', HORSE_GALLOP_FIRST).setOrigin(0.5, 1).setDepth(9).setScale(1.1);
      sp.setCrop(0, 0, sp.frame.width, RIDER_SEAT.cut);
    }
    let n = 0;
    const tick = this.time.addEvent({
      delay: mounted ? 90 : 120, loop: true, callback: () => {
        n++;
        if (horse) horse.setFrame(HORSE_GALLOP_FIRST + (n % HORSE_GALLOP_FRAMES));
        else if (!mounted) sp.setFrame(n % frames);
      },
    });
    const pos = { x: -40 };
    const place = () => {
      sp.x = pos.x;
      if (horse) {
        const hs = horse.scaleY;
        horse.x = pos.x;
        sp.x = pos.x + (RIDER_SEAT.saddleX - 24) * hs;
        sp.y = RIDGE_Y + 2 - (48 - RIDER_SEAT.seatY) * hs + (sp.frame.height - RIDER_SEAT.cut) * sp.scaleY;
      }
    };
    place();
    sp.setAlpha(0);
    horse?.setAlpha(0);
    this.tweens.add({ targets: [sp, horse].filter(Boolean), alpha: 0.95, duration: 600 });
    this.tweens.add({
      targets: pos, x: GAME_WIDTH + 40, duration: WALK_MS, onUpdate: place,
      onComplete: () => { tick.remove(); sp.destroy(); horse?.destroy(); },
    });
    // al pasar por la mitad se despide: un brillo dorado
    this.time.delayedCall(WALK_MS * 0.5, () => {
      sfx.play('bloom');
      const glow = this.add.circle(sp.x, sp.y - MYTH_H / 2, 6, 0xf8e080, 0.8).setDepth(11);
      this.tweens.add({ targets: glow, scale: 4, alpha: 0, duration: 700, onComplete: () => glow.destroy() });
    });
  }

  /** Letrero arriba, con la cara del mito si es de uno. */
  private async say(str: string, ms: number, face?: FighterId): Promise<void> {
    // un letrero a la vez: el nuevo reemplaza al anterior
    this.tweens.killTweensOf(this.caption);
    this.caption.removeAll(true);
    const faceKey = face && `face_${face}_p1_48`;
    const withFace = !!faceKey && this.textures.exists(faceKey);
    const lines = wrap(str, withFace ? 42 : 50);
    const h = Math.max(withFace ? 30 : 0, lines.length * 11 + 10);
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0806, 0.78).fillRoundedRect(8, 8, GAME_WIDTH - 16, h, 4);
    bg.lineStyle(1, 0xd8b070, 1).strokeRoundedRect(8, 8, GAME_WIDTH - 16, h, 4);
    this.caption.add(bg);
    const cx = withFace ? GAME_WIDTH / 2 + 14 : GAME_WIDTH / 2;
    lines.forEach((l, i) => this.caption.add(text(this, cx, 8 + h / 2 - ((lines.length - 1) * 11) / 2 + i * 11, l, 1, 0xf8f0d8)));
    if (withFace) this.caption.add(this.add.image(24, 8 + h / 2, faceKey).setScale(0.55));
    this.caption.setAlpha(0);
    await this.tween({ targets: this.caption, alpha: 1, duration: 220 });
    await this.wait(ms);
    await this.tween({ targets: this.caption, alpha: 0, duration: 220 });
  }

  /** Los créditos suben despacio sobre el cielo de la mañana. */
  private async credits(): Promise<void> {
    const shade = this.shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05040a, 0).setOrigin(0).setDepth(700);
    await this.tween({ targets: shade, fillAlpha: 0.72, duration: 900 });
    const d = this.d;
    const names = d.calmed.map((id) => FIGHTERS[id].name);
    const rows: [string, number, number][] = [
      ['MITOS DE COLOMBIA', 2, 0xf8d048],
      ['SANGRE DE LEYENDA', 1, 0xf05060],
      ['', 1, 0],
      [`MITOS CALMADOS: ${d.calmed.length} DE ${d.calmed.length}`, 1, 0xf8f0d8],
      [d.stories ? `HISTORIAS ESCUCHADAS: ${d.stories} DE ${d.totalStories}` : '', 1, 0xf8f0d8],
      [`LA NOCHE TERMINÓ A LAS ${d.clock}`, 1, 0xf8f0d8],
      ['', 1, 0],
      ['JUAN MACHETE', 1, 0xf8d048],
      ['LA ABUELA ROSA', 1, 0xe8e0d0],
      [d.dog && d.horse ? 'FIRULAIS Y LUCERO' : d.dog ? 'FIRULAIS' : '', 1, 0xe8e0d0],
      ['', 1, 0],
      ['Y LOS QUE NUNCA SE VAN DEL TODO:', 1, 0xa8a0c8],
      ...[0, 3, 6].map((i) => [names.slice(i, i + 3).join('  ·  '), 1, 0xe8e0d0] as [string, number, number]),
      ['', 1, 0],
      ['DISEÑO, DIRECCIÓN Y ARTE', 1, 0xa8a0c8],
      ['RAÚL ALZATE', 1, 0xf8f0d8],
      ['LEYENDAS Y COSTUMBRES', 1, 0xa8a0c8],
      ['TRADICIÓN ORAL COLOMBIANA', 1, 0xf8f0d8],
      ['SONIDOS', 1, 0xa8a0c8],
      ['OPENGAMEART (CC0)', 1, 0xf8f0d8],
    ];
    const roll = this.add.container(0, GAME_HEIGHT + 10).setDepth(710);
    let y = 0;
    for (const [s, scale, tint] of rows) {
      if (s) roll.add(text(this, GAME_WIDTH / 2, y, s, scale, tint));
      y += scale > 1 ? 24 : 13;
    }
    await this.tween({ targets: roll, y: -y - 10, duration: (y + GAME_HEIGHT) * 34, ease: 'Linear' });
    roll.destroy();
  }

  private async theEnd(): Promise<void> {
    if (this.shade) this.tweens.add({ targets: this.shade, fillAlpha: 0.15, duration: 1200 });
    const fin = text(this, GAME_WIDTH / 2, 88, 'FIN', 4, 0xf8d048).setDepth(800).setAlpha(0).setScale(6);
    sfx.play('ultimate');
    await this.tween({ targets: fin, alpha: 1, scale: 4, duration: 700, ease: 'Back.out' });
    const sub = text(this, GAME_WIDTH / 2, 128, 'GRACIAS POR JUGAR', 1, 0xf8f0d8).setDepth(800).setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, duration: 600 });
    // pólvora, como en las fiestas del pueblo
    const colors = [0xf84848, 0xf8d048, 0x48c8f8, 0x78f848, 0xf878f8, 0xffffff];
    for (let k = 0; k < 9; k++) {
      sfx.play('polvora');
      const x = 40 + Math.random() * (GAME_WIDTH - 80), y = 24 + Math.random() * 50;
      const c = colors[k % colors.length];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const dot = this.add.rectangle(x, y, 2, 2, c).setDepth(790);
        this.tweens.add({ targets: dot, x: x + Math.cos(a) * 36, y: y + Math.sin(a) * 36 + 12, alpha: 0, duration: 1000, ease: 'Cubic.out', onComplete: () => dot.destroy() });
      }
      await this.wait(380);
    }
    if (DEMO) return;
    const hint = text(this, GAME_WIDTH / 2, 196, 'ESPACIO: VOLVER AL MENÚ', 1, 0x9088b0).setDepth(800);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    this.done = true;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, res));
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((res) => this.tweens.add({ ...cfg, onComplete: () => res() }));
  }
}
