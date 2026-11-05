import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, MAX_HP, MAX_METER, ROUNDS_TO_WIN } from '../config/game-config';
import type { Fighter } from '../entities/Fighter';
import { cooldownFraction } from '../combat/CombatRules';
import { text } from '../utils/textures';

type SpecialKey = 'special1' | 'special2';
const SPECIAL_KEYS: SpecialKey[] = ['special1', 'special2'];
const READY_FLASH_FRAMES = 6;

/** Frames que la barra de daño se queda quieta antes de vaciarse (se lee cuánto quitó el golpe). */
export const DRAIN_HOLD = 26;
/** Frames que el trozo recién perdido brilla en blanco. */
export const DRAIN_FLASH = 5;

export interface DrainState { shown: number; hold: number; flash: number }

/**
 * Barra de daño retardada (pura): al perder vida se queda quieta `DRAIN_HOLD` frames y
 * luego se vacía rápido al principio y lento al final; si se recupera vida, la sigue al instante.
 */
export function drainStep(s: DrainState, hp: number): DrainState {
  if (hp >= s.shown) return { shown: hp, hold: 0, flash: 0 };
  let { shown, hold, flash } = s;
  if (flash > 0) flash--;
  if (hold > 0) return { shown, hold: hold - 1, flash };
  shown = Math.max(hp, shown - Math.max(0.35, (shown - hp) * 0.09));
  return { shown, hold: 0, flash };
}

/** Golpe recibido: reinicia la espera (si no estaba ya vaciándose) y enciende el destello. */
export function drainHit(s: DrainState): DrainState {
  return { shown: s.shown, hold: Math.max(s.hold, DRAIN_HOLD), flash: DRAIN_FLASH };
}

/** HUD arcade: barras de vida con daño retardado, energía, retratos, temporizador y rondas. */
export class CombatHUD {
  private gfx: Phaser.GameObjects.Graphics;
  private frameGfx: Phaser.GameObjects.Graphics;
  private timerText: Phaser.GameObjects.BitmapText;
  private nameP1: Phaser.GameObjects.BitmapText;
  private nameP2: Phaser.GameObjects.BitmapText;
  private hintP1: Phaser.GameObjects.BitmapText;
  private hintP2: Phaser.GameObjects.BitmapText;
  private portraits: Phaser.GameObjects.Image[];
  private drain: Record<1 | 2, DrainState> = { 1: { shown: MAX_HP, hold: 0, flash: 0 }, 2: { shown: MAX_HP, hold: 0, flash: 0 } };
  private lastHp = { 1: MAX_HP, 2: MAX_HP };
  private meterPulse = 0;
  /** Enfriamiento visto en el frame anterior y parpadeo pendiente al quedar lista, por jugador y habilidad. */
  private lastCooldown = { 1: { special1: 0, special2: 0 }, 2: { special1: 0, special2: 0 } };
  private readyFlash = { 1: { special1: 0, special2: 0 }, 2: { special1: 0, special2: 0 } };

  private static BAR_W = 140;
  private static BAR_H = 9;
  private static BAR_Y = 11;

  constructor(scene: Phaser.Scene, private p1: Fighter, private p2: Fighter, p1Key: string, p2Key: string) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.portraits = [
      scene.add.image(6, 6, p1Key).setOrigin(0, 0).setScrollFactor(0).setDepth(102),
      scene.add.image(GAME_WIDTH - 6, 6, p2Key).setOrigin(1, 0).setScrollFactor(0).setDepth(102).setFlipX(true),
    ];
    // marco de los retratos por encima (bisel dorado), dibujado una vez
    this.frameGfx = scene.add.graphics().setScrollFactor(0).setDepth(103);
    for (const [x, img] of [[6, this.portraits[0]], [GAME_WIDTH - 6 - this.portraits[1].width, this.portraits[1]]] as const) {
      const w = img.width, h = img.height;
      this.frameGfx.lineStyle(1, 0x0c0808, 1).strokeRect(x - 1.5, 4.5, w + 3, h + 3);
      this.frameGfx.lineStyle(1, COLORS.hudBorder, 1).strokeRect(x - 0.5, 5.5, w + 1, h + 1);
      this.frameGfx.fillStyle(0xfff0c0, 1).fillRect(x - 1, 5, 2, 1).fillRect(x - 1, 5, 1, 2);
    }
    this.timerText = text(scene, GAME_WIDTH / 2, 17, '99', 2, 0xf8f0c8).setScrollFactor(0).setDepth(101);
    this.nameP1 = scene.add.bitmapText(34, 24, 'font', p1.stats.name).setOrigin(0, 0).setScrollFactor(0).setDepth(101).setTint(0xf8f0c8);
    this.nameP2 = scene.add.bitmapText(GAME_WIDTH - 34, 24, 'font', p2.stats.name).setOrigin(1, 0).setScrollFactor(0).setDepth(101).setTint(0xf8f0c8);
    this.hintP1 = scene.add.bitmapText(6, 204, 'font_plain', '').setOrigin(0, 0).setScrollFactor(0).setDepth(101).setTint(0xa0c8ff).setAlpha(0.9);
    this.hintP2 = scene.add.bitmapText(GAME_WIDTH - 6, 213, 'font_plain', '').setOrigin(1, 0).setScrollFactor(0).setDepth(101).setTint(0xa0c8ff).setAlpha(0.9);
  }

  setHints(h1: string, h2: string): void {
    this.hintP1.setText(h1);
    this.hintP2.setText(h2);
  }

  update(timeSeconds: number, score: { p1: number; p2: number }, frame: number): void {
    this.timerText.setText(timeSeconds.toString().padStart(2, '0'));
    this.timerText.setTint(timeSeconds <= 10 ? 0xff5040 : 0xf8f0c8);
    this.meterPulse = frame;
    // barra roja retardada
    for (const slot of [1, 2] as const) {
      const f = slot === 1 ? this.p1 : this.p2;
      if (f.hp < this.lastHp[slot]) this.drain[slot] = drainHit(this.drain[slot]);
      this.lastHp[slot] = f.hp;
      this.drain[slot] = drainStep(this.drain[slot], f.hp);
      for (const key of SPECIAL_KEYS) {
        const remaining = f.cooldowns[key];
        const flash = this.readyFlash[slot];
        if (this.lastCooldown[slot][key] > 0 && remaining <= 0) flash[key] = READY_FLASH_FRAMES;
        else if (flash[key] > 0) flash[key]--;
        this.lastCooldown[slot][key] = remaining;
      }
    }
    this.draw(score);
  }

  resetDelayed(): void {
    this.drain = { 1: { shown: MAX_HP, hold: 0, flash: 0 }, 2: { shown: MAX_HP, hold: 0, flash: 0 } };
    this.lastHp = { 1: MAX_HP, 2: MAX_HP };
    for (const slot of [1, 2] as const) {
      for (const key of SPECIAL_KEYS) {
        this.lastCooldown[slot][key] = 0;
        this.readyFlash[slot][key] = 0;
      }
    }
  }

  private draw(score: { p1: number; p2: number }): void {
    const g = this.gfx;
    const W = CombatHUD.BAR_W;
    const H = CombatHUD.BAR_H;
    const Y = CombatHUD.BAR_Y;
    g.clear();
    // Temporizador: marco
    g.fillStyle(COLORS.hudFrame, 1).fillRect(GAME_WIDTH / 2 - 16, 6, 32, 22);
    g.lineStyle(1, COLORS.hudBorder, 1).strokeRect(GAME_WIDTH / 2 - 16 + 0.5, 6.5, 31, 21);
    for (const slot of [1, 2] as const) {
      const f = slot === 1 ? this.p1 : this.p2;
      const x0 = slot === 1 ? 34 : GAME_WIDTH - 34 - W;
      // marco: sombra, borde dorado con bisel y fondo hundido
      g.fillStyle(0x0c0808, 1).fillRect(x0 - 3, Y - 3, W + 6, H + 6);
      g.fillStyle(COLORS.hudFrame, 1).fillRect(x0 - 2, Y - 2, W + 4, H + 4);
      g.lineStyle(1, COLORS.hudBorder, 1).strokeRect(x0 - 1.5, Y - 1.5, W + 3, H + 3);
      g.fillStyle(0xfff0c0, 1).fillRect(slot === 1 ? x0 - 2 : x0 + W + 1, Y - 2, 1, 1);
      g.fillStyle(0x2a0a0e, 1).fillRect(x0, Y, W, H);
      g.fillStyle(0x16050a, 1).fillRect(x0, Y, W, 2);
      // daño retardado: blanco un instante, luego rojo anaranjado que se vacía
      const d = this.drain[slot];
      const dw = Math.round((d.shown / MAX_HP) * W);
      const hw = Math.round((f.hp / MAX_HP) * W);
      const dx = slot === 1 ? x0 + W - dw : x0;
      const hx = slot === 1 ? x0 + W - hw : x0;
      g.fillStyle(d.flash > 0 ? 0xffffff : COLORS.hpDamage, 1).fillRect(dx, Y, dw, H);
      if (d.flash <= 0 && dw > hw) g.fillStyle(0xa83828, 1).fillRect(dx, Y + H - 2, dw, 2);
      // vida en tres bandas (brillo, cuerpo, sombra); con poca vida, roja y latiendo
      const low = f.hp <= 25;
      const beat = low && Math.floor(this.meterPulse / 8) % 2 === 0;
      const [hi, mid, lo] = low ? [beat ? 0xffb0a0 : 0xff7060, COLORS.hpRed, 0x8a1010] : [0xfff8b0, COLORS.hpYellow, 0xc08a18];
      if (hw > 0) {
        g.fillStyle(mid, 1).fillRect(hx, Y, hw, H);
        g.fillStyle(hi, 1).fillRect(hx, Y + 1, hw, 2);
        g.fillStyle(lo, 1).fillRect(hx, Y + H - 2, hw, 2);
        // filo de la barra: una columna clara donde termina la vida
        g.fillStyle(0xffffff, 0.8).fillRect(slot === 1 ? hx : hx + hw - 1, Y, 1, H);
      }
      // marcas cada 10 % para leer la vida de un vistazo
      g.fillStyle(0x000000, 0.28);
      for (let i = 1; i < 10; i++) g.fillRect(x0 + Math.round((W * i) / 10), Y + H - 3, 1, 3);
      // rondas ganadas
      const wins = slot === 1 ? score.p1 : score.p2;
      for (let i = 0; i < ROUNDS_TO_WIN; i++) {
        const cx = slot === 1 ? x0 + W - 6 - i * 10 : x0 + 6 + i * 10;
        g.fillStyle(i < wins ? 0xf8d048 : 0x302028, 1).fillCircle(cx, Y + H + 8, 3);
        g.lineStyle(1, COLORS.hudBorder, 1).strokeCircle(cx, Y + H + 8, 3);
      }
      // energía (abajo)
      const my = 196;
      const mw = 90;
      const mx0 = slot === 1 ? 6 : GAME_WIDTH - 6 - mw;
      g.fillStyle(COLORS.hudFrame, 1).fillRect(mx0 - 1, my - 1, mw + 2, 6);
      const fill = Math.round((f.meter / MAX_METER) * mw);
      const full = f.meter >= MAX_METER;
      const pulse = full && Math.floor(this.meterPulse / 6) % 2 === 0;
      g.fillStyle(pulse ? COLORS.meterFull : full ? 0xf8e048 : COLORS.meterBlue, 1);
      g.fillRect(slot === 1 ? mx0 : mx0 + mw - fill, my, fill, 4);
      g.lineStyle(1, COLORS.hudBorder, 1).strokeRect(mx0 - 0.5, my - 0.5, mw + 1, 5);
      // enfriamiento de habilidades: dos segmentos sobre la barra de energía (y=190, sin tocar las pistas de abajo)
      const cy = 190;
      const ch = 3;
      const cw = Math.floor((mw - 4) / 2);
      SPECIAL_KEYS.forEach((key, i) => {
        const fromLeft = mx0 + i * (cw + 4);
        const cx0 = slot === 1 ? fromLeft : mx0 + mw - cw - i * (cw + 4);
        const frac = cooldownFraction(f.cooldowns[key], f.stats.attacks[key]);
        const ready = frac <= 0;
        const flash = this.readyFlash[slot][key];
        g.fillStyle(COLORS.hudFrame, 1).fillRect(cx0 - 1, cy - 1, cw + 2, ch + 2);
        g.fillStyle(0x302028, 1).fillRect(cx0, cy, cw, ch);
        const filled = ready ? cw : Math.round(cw * (1 - frac));
        const color = flash > 0 && Math.floor(flash / 2) % 2 === 0 ? 0xffffff : ready ? 0xc8e8ff : 0x506880;
        if (filled > 0) g.fillStyle(color, 1).fillRect(slot === 1 ? cx0 : cx0 + cw - filled, cy, filled, ch);
        g.lineStyle(1, ready ? COLORS.hudBorder : 0x706050, 1).strokeRect(cx0 - 0.5, cy - 0.5, cw + 1, ch + 1);
      });
    }
  }

  setVisible(v: boolean): void {
    this.gfx.setVisible(v);
    this.frameGfx.setVisible(v);
    for (const p of this.portraits) p.setVisible(v);
    this.timerText.setVisible(v);
    this.nameP1.setVisible(v);
    this.nameP2.setVisible(v);
    this.hintP1.setVisible(v);
    this.hintP2.setVisible(v);
  }
}
