import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game-config';
import { sfx } from '../audio/Sfx';
import { MENU_KEYS, MenuInput, inputManager } from '../utils/game';
import { touchActive } from '../ui/TouchControls';
import { portraitKey, text } from '../utils/textures';
import { startWithLoading } from '../ui/Loading';
import { INTRO_PAGES, INTRO_TITLE, type IntroArt } from '../adventure/Stories';
import { markIntroSeen, needsIntro, newAdventure, saveAdventure, type AdventureState } from '../adventure/State';
import { wrap } from '../adventure/text';
import { DEMO } from '../demo/Demo';
import { setupView } from '../utils/view';

/** renglones del texto narrado: letra de 6 px en un ancho de 384 */
const TEXT_WIDTH = 58;
const TEXT_Y = 158;
const ART_H = 150;
/** fotogramas por letra al escribir el texto */
const TYPE_EVERY = 1;

/** ojos rojos de los nueve mitos en la oscuridad: [x, y, separación] */
const EYES: [number, number, number][] = [
  [52, 64, 6], [104, 98, 5], [150, 50, 7], [196, 112, 6], [238, 70, 5], [282, 104, 6], [326, 56, 7], [80, 128, 5], [300, 132, 5],
];

/**
 * El cuento de entrada del modo aventura: «La promesa del abuelo». Páginas de texto pixelado con un cuadro
 * dibujado a mano detrás (pueblo de noche, ojos en el monte, la ronda con el farol, la tumba, el reloj...).
 * Se narra una sola vez por partida nueva (bandera en la partida). ENTER/ESPACIO/toque: sigue; ESC: salta.
 */
export class IntroScene extends Phaser.Scene {
  private st!: AdventureState;
  private menu = new MenuInput();
  private page = -1;
  private shown = 0;
  private full = '';
  private frame = 0;
  private body!: Phaser.GameObjects.BitmapText;
  private art!: Phaser.GameObjects.Container;
  private arrow!: Phaser.GameObjects.Triangle;
  private busy = false;
  private leaving = false;
  private tapped = false;

  constructor() {
    super('IntroScene');
  }

  create(): void {
    setupView(this);
    this.st = newAdventure();
    this.page = -1;
    this.frame = 0;
    this.busy = false;
    this.leaving = false;
    this.tapped = false;
    this.menu = new MenuInput();
    if (!needsIntro(this.st)) { this.finish(); return; }
    // se marca de una vez: si sale a mitad del cuento, la partida ya no lo vuelve a contar
    markIntroSeen(this.st);
    this.registry.set('adventure', this.st);
    saveAdventure(this.st);

    sfx.setSoundscape('menu');
    sfx.setTension(0.2);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05040a, 1).setOrigin(0);
    this.art = this.add.container(0, 0);
    const panel = this.add.graphics();
    panel.fillStyle(0x0a0812, 1).fillRect(0, ART_H, GAME_WIDTH, GAME_HEIGHT - ART_H);
    panel.lineStyle(1, 0x5a4830, 1).lineBetween(8, ART_H + 2, GAME_WIDTH - 8, ART_H + 2);
    this.body = this.add.bitmapText(12, TEXT_Y, 'font_plain', '').setTint(0xf0e6d0);
    this.body.setLineSpacing(4);
    this.arrow = this.add.triangle(GAME_WIDTH - 16, GAME_HEIGHT - 10, 0, 0, 7, 0, 3.5, 4, 0xf8d048).setOrigin(0).setVisible(false);
    const skip = this.add.bitmapText(GAME_WIDTH - 6, 4, 'font_plain', touchActive() ? 'SALTAR >>' : 'ESC: SALTAR').setOrigin(1, 0).setTint(0x8a7c9c).setDepth(10);
    skip.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.tapped = false; this.finish(); });
    this.input.on('pointerdown', () => { this.tapped = true; });

    void this.titleCard();
  }

  /** Título del cuento, y luego la primera página. */
  private async titleCard(): Promise<void> {
    this.busy = true;
    const t1 = text(this, GAME_WIDTH / 2, 70, 'MITOS DE COLOMBIA', 1, 0xf05060).setAlpha(0);
    const t2 = text(this, GAME_WIDTH / 2, 92, INTRO_TITLE, 2, 0xf8d048).setAlpha(0);
    const glow = this.add.circle(GAME_WIDTH / 2, 92, 70, 0xf8b040, 0.08).setAlpha(0);
    this.art.add([glow, t1, t2]);
    sfx.play('whisper');
    await this.tween({ targets: [t1, t2, glow], alpha: 1, duration: 900 });
    await this.wait(1100);
    if (this.leaving) return;
    this.busy = false;
    this.next();
  }

  private next(): void {
    if (this.busy || this.leaving) return;
    this.page++;
    if (this.page >= INTRO_PAGES.length) { this.finish(); return; }
    this.busy = true;
    const p = INTRO_PAGES[this.page];
    sfx.play(this.page === 0 ? 'confirm' : 'select');
    void this.tween({ targets: [this.art, this.body], alpha: 0, duration: 220 }).then(() => {
      if (this.leaving) return;
      this.art.removeAll(true);
      this.drawArt(p.art);
      this.full = wrap(p.text, TEXT_WIDTH).join('\n');
      this.shown = 0;
      this.body.setText('');
      this.body.setAlpha(1);
      return this.tween({ targets: this.art, alpha: 1, duration: 320 });
    }).then(() => { this.busy = false; });
  }

  /** Se acaba el cuento (o se salta): a la vereda, donde espera la abuela Rosa. */
  private finish(): void {
    if (this.leaving) return;
    this.leaving = true;
    if (!this.registry.get('adventure')) this.registry.set('adventure', this.st);
    sfx.setTension(0);
    startWithLoading(this, 'AdventureScene', {}, 'SAN AGUSTÍN');
  }

  override update(): void {
    inputManager.update();
    this.frame++;
    if (this.leaving) return;
    const tap = this.tapped;
    this.tapped = false;
    if (this.menu.pressed(MENU_KEYS.back)) { sfx.play('confirm'); this.finish(); return; }
    // en la demo el cuento pasa solo, con tiempo para leerlo
    const auto = DEMO && this.shown >= this.full.length && this.frame % 150 === 0;
    const go = this.menu.pressed(MENU_KEYS.confirm) || tap || auto;
    if (this.page < 0 || this.busy) return;
    if (this.shown < this.full.length) {
      if (go) this.shown = this.full.length;
      else if (this.frame % TYPE_EVERY === 0) this.shown++;
      this.body.setText(this.full.slice(0, this.shown));
    } else if (go) this.next();
    this.arrow.setVisible(this.shown >= this.full.length && Math.floor(this.frame / 20) % 2 === 0);
  }

  // ---------------------------------------------------------------- cuadros

  private drawArt(kind: IntroArt): void {
    const g = this.add.graphics();
    this.art.add(g);
    this.sky(g, kind === 'tumba' || kind === 'mitos' ? 0x07060e : 0x0c1430);
    switch (kind) {
      case 'pueblo': {
        this.stars(g, 40);
        g.fillStyle(0xe8e0c0, 1).fillCircle(318, 34, 12);
        g.fillStyle(0x0c1430, 1).fillCircle(312, 30, 11);
        this.mountains(g, 0x162038, 70);
        this.mountains(g, 0x0e1626, 96);
        this.town(g);
        break;
      }
      case 'mitos': {
        this.mountains(g, 0x0a0a14, 92);
        this.trees(g, 0x06080c);
        EYES.forEach(([x, y, gap], i) => {
          const e = this.add.graphics();
          e.fillStyle(0xff2020, 1).fillRect(x, y, 2, 2).fillRect(x + gap, y, 2, 2);
          e.fillStyle(0xff4040, 0.25).fillCircle(x + 1, y + 1, 3).fillCircle(x + gap + 1, y + 1, 3);
          e.setAlpha(0);
          this.art.add(e);
          this.tweens.add({ targets: e, alpha: 1, delay: 200 + i * 220, duration: 160, yoyo: true, hold: 900 + i * 60, repeat: -1, repeatDelay: 700 });
        });
        this.time.delayedCall(300, () => sfx.play('whisper'));
        break;
      }
      case 'guardianes': {
        this.stars(g, 20);
        this.mountains(g, 0x14301e, 74);
        this.trees(g, 0x0c2014);
        // el río que baja del monte
        g.fillStyle(0x1c3c68, 1).fillRect(0, 128, GAME_WIDTH, 10);
        g.fillStyle(0x4878b0, 1);
        for (let x = 6; x < GAME_WIDTH; x += 22) g.fillRect(x + (x % 3), 131, 8, 1);
        // el llano, con hierba alta
        g.fillStyle(0x283818, 1).fillRect(0, 138, GAME_WIDTH, ART_H - 138);
        break;
      }
      case 'ronda': {
        this.stars(g, 30);
        this.mountains(g, 0x101a30, 84);
        g.fillStyle(0x1a1408, 1).fillRect(0, 124, GAME_WIDTH, ART_H - 124);
        g.lineStyle(1, 0x3a2c18, 1).lineBetween(0, 132, GAME_WIDTH, 128);
        const walker = this.add.container(-20, 118);
        const light = this.add.circle(10, 0, 26, 0xf8c060, 0.12);
        const core = this.add.circle(10, 0, 3, 0xffe8a0, 1);
        const man = this.add.graphics();
        man.fillStyle(0x020204, 1).fillRect(-3, -14, 7, 16).fillRect(-6, -17, 13, 3).fillRect(-2, -21, 5, 4);
        man.fillRect(-3, 2, 2, 8).fillRect(2, 2, 2, 8);
        man.lineStyle(1, 0x8890a0, 1).lineBetween(-4, -4, -9, 6);
        walker.add([light, man, core]);
        this.art.add(walker);
        this.tweens.add({ targets: walker, x: GAME_WIDTH + 20, duration: 9000 });
        this.tweens.add({ targets: walker, y: 116, duration: 260, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: light, alpha: 0.6, duration: 400, yoyo: true, repeat: -1 });
        break;
      }
      case 'tumba': {
        g.fillStyle(0x10100c, 1).fillRect(0, 120, GAME_WIDTH, ART_H - 120);
        // cruces del cementerio y la tumba nueva al centro
        for (const [x, h] of [[60, 18], [110, 14], [270, 16], [322, 13]] as [number, number][]) {
          g.fillStyle(0x24242a, 1).fillRect(x, 120 - h, 3, h).fillRect(x - 4, 124 - h, 11, 3);
        }
        g.fillStyle(0x2a2016, 1).fillEllipse(GAME_WIDTH / 2, 124, 70, 12);
        g.fillStyle(0xd8d0c0, 1).fillRect(GAME_WIDTH / 2 - 2, 82, 5, 40).fillRect(GAME_WIDTH / 2 - 12, 92, 25, 4);
        // el farol del abuelo, apagado, al pie de la cruz
        g.fillStyle(0x4a3a20, 1).fillRect(GAME_WIDTH / 2 + 18, 112, 7, 9);
        const candle = this.add.circle(GAME_WIDTH / 2 - 22, 114, 2, 0xffc040, 1);
        const halo = this.add.circle(GAME_WIDTH / 2 - 22, 114, 12, 0xffa020, 0.15);
        g.fillStyle(0xe8e0d0, 1).fillRect(GAME_WIDTH / 2 - 23, 116, 3, 6);
        this.art.add([halo, candle]);
        this.tweens.add({ targets: [candle, halo], alpha: 0.3, duration: 120, yoyo: true, repeat: -1, repeatDelay: 300 });
        this.time.delayedCall(900, () => { sfx.play('sting'); this.tweens.add({ targets: [candle, halo], alpha: 0, duration: 600, delay: 100 }); });
        break;
      }
      case 'reloj': {
        const cx = GAME_WIDTH / 2, cy = 74;
        g.fillStyle(0x1a1410, 1).fillCircle(cx, cy, 46);
        g.lineStyle(2, 0xc8a050, 1).strokeCircle(cx, cy, 46);
        g.fillStyle(0xe8dcc0, 1).fillCircle(cx, cy, 42);
        g.fillStyle(0x302418, 1);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.fillRect(cx + Math.sin(a) * 36 - 1, cy - Math.cos(a) * 36 - 1, 3, 3);
        }
        const hour = this.add.rectangle(cx, cy, 3, 24, 0x200c0c).setOrigin(0.5, 1);
        const min = this.add.rectangle(cx, cy, 2, 34, 0xa01818).setOrigin(0.5, 1);
        this.art.add([hour, min, this.add.circle(cx, cy, 3, 0x200c0c)]);
        // dan las doce... y las manecillas vuelven solas a las seis
        this.time.delayedCall(700, () => { sfx.play('sting'); this.cameras.main.shake(200, 0.004); });
        this.tweens.add({ targets: min, angle: -360 * 6, duration: 2600, delay: 900, ease: 'Cubic.inOut' });
        this.tweens.add({ targets: hour, angle: -180, duration: 2600, delay: 900, ease: 'Cubic.inOut' });
        break;
      }
      case 'juan': {
        this.stars(g, 30);
        this.mountains(g, 0x162038, 96);
        this.town(g);
        const key = portraitKey(this, 'juanmachete', 'p1', 96);
        if (this.textures.exists(key)) {
          const face = this.add.image(GAME_WIDTH / 2, 70, key).setOrigin(0.5);
          face.setScale(Math.min(1, 110 / Math.max(face.height, 1)));
          const frame = this.add.graphics();
          frame.lineStyle(2, 0xf8d048, 1).strokeRect(face.x - face.displayWidth / 2 - 3, face.y - face.displayHeight / 2 - 3, face.displayWidth + 6, face.displayHeight + 6);
          this.art.add([frame, face]);
        } else {
          this.hatSilhouette(g, GAME_WIDTH / 2, 120);
        }
        break;
      }
      case 'promesa': {
        this.stars(g, 50);
        this.mountains(g, 0x0e1626, 100);
        const cx = GAME_WIDTH / 2, cy = 70;
        const glow = this.add.circle(cx, cy, 60, 0xf8b040, 0.1);
        const glow2 = this.add.circle(cx, cy, 30, 0xf8c060, 0.2);
        const lamp = this.add.graphics();
        lamp.fillStyle(0x3a2a14, 1).fillRect(cx - 8, cy - 16, 16, 3).fillRect(cx - 7, cy + 12, 14, 3);
        lamp.lineStyle(1, 0x3a2a14, 1).strokeRect(cx - 7, cy - 13, 14, 25).lineBetween(cx, cy - 22, cx, cy - 16);
        lamp.fillStyle(0xffe090, 1).fillRect(cx - 5, cy - 11, 10, 21);
        lamp.fillStyle(0xfff4c0, 1).fillRect(cx - 2, cy - 4, 4, 8);
        this.art.add([glow, glow2, lamp]);
        this.tweens.add({ targets: [glow, glow2], scale: 1.12, alpha: 0.7, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        sfx.play('bloom');
        break;
      }
    }
  }

  /** cielo de noche en bandas, como el resto del juego */
  private sky(g: Phaser.GameObjects.Graphics, top: number): void {
    const bands = 6;
    const c0 = Phaser.Display.Color.IntegerToColor(top);
    for (let i = 0; i < bands; i++) {
      const k = 1 - i * 0.12;
      g.fillStyle(Phaser.Display.Color.GetColor(c0.red * k, c0.green * k, c0.blue * k), 1);
      g.fillRect(0, (i * ART_H) / bands, GAME_WIDTH, ART_H / bands + 1);
    }
  }

  private stars(g: Phaser.GameObjects.Graphics, n: number): void {
    const rnd = new Phaser.Math.RandomDataGenerator(['estrellas']);
    for (let i = 0; i < n; i++) {
      g.fillStyle(0xe8e8ff, rnd.realInRange(0.3, 1));
      g.fillRect(rnd.between(0, GAME_WIDTH), rnd.between(0, 70), 1, 1);
    }
  }

  private mountains(g: Phaser.GameObjects.Graphics, color: number, base: number): void {
    g.fillStyle(color, 1);
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(0, ART_H)];
    for (let x = 0; x <= GAME_WIDTH; x += 24) {
      const h = Math.sin(x * 0.021 + base) * 18 + Math.sin(x * 0.057 + base * 2) * 9;
      pts.push(new Phaser.Math.Vector2(x, base + h));
    }
    pts.push(new Phaser.Math.Vector2(GAME_WIDTH, ART_H));
    g.fillPoints(pts, true);
  }

  private trees(g: Phaser.GameObjects.Graphics, color: number): void {
    g.fillStyle(color, 1);
    for (let x = -6; x < GAME_WIDTH + 10; x += 17) {
      const h = 22 + ((x * 7) % 13);
      g.fillTriangle(x, ART_H, x + 9, ART_H - h - 20, x + 18, ART_H);
    }
  }

  /** el pueblo: casas con ventanas encendidas y la torre de la iglesia */
  private town(g: Phaser.GameObjects.Graphics): void {
    const y = 132;
    g.fillStyle(0x080a12, 1).fillRect(0, y, GAME_WIDTH, ART_H - y);
    for (let i = 0; i < 9; i++) {
      const x = 30 + i * 38, w = 26, h = 14 + (i % 3) * 4;
      g.fillStyle(0x0c0e18, 1).fillRect(x, y - h, w, h);
      g.fillTriangle(x - 3, y - h, x + w / 2, y - h - 9, x + w + 3, y - h);
      g.fillStyle(0xf8c860, i % 2 ? 1 : 0.6).fillRect(x + 5, y - h + 5, 4, 4);
      if (i % 3) g.fillRect(x + 16, y - h + 5, 4, 4);
    }
    // iglesia
    const cx = 190;
    g.fillStyle(0x0c0e18, 1).fillRect(cx - 9, y - 54, 18, 54).fillTriangle(cx - 11, y - 54, cx, y - 72, cx + 11, y - 54);
    g.fillStyle(0xd8d0c0, 1).fillRect(cx - 1, y - 80, 2, 8).fillRect(cx - 3, y - 77, 6, 2);
    g.fillStyle(0xf8c860, 0.8).fillRect(cx - 3, y - 44, 6, 8);
  }

  private hatSilhouette(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x020204, 1);
    g.fillRect(x - 10, y - 50, 20, 50).fillRect(x - 22, y - 58, 44, 5).fillRect(x - 9, y - 70, 18, 12);
    g.lineStyle(2, 0xa0a8b8, 1).lineBetween(x + 12, y - 30, x + 30, y - 6);
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((res) => this.tweens.add({ ...cfg, onComplete: () => res() }));
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, res));
  }
}
