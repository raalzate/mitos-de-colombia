import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, MAX_HP, MAX_METER, ROUNDS_TO_WIN } from '../config/game-config';
import type { Fighter } from '../entities/Fighter';
import { cooldownFraction } from '../combat/CombatRules';
import { text } from '../utils/textures';

type SpecialKey = 'special1' | 'special2';
const SPECIAL_KEYS: SpecialKey[] = ['special1', 'special2'];
const READY_FLASH_FRAMES = 6;

/** HUD arcade: barras de vida con daño retardado, energía, retratos, temporizador y rondas. */
export class CombatHUD {
  private gfx: Phaser.GameObjects.Graphics;
  private timerText: Phaser.GameObjects.BitmapText;
  private nameP1: Phaser.GameObjects.BitmapText;
  private nameP2: Phaser.GameObjects.BitmapText;
  private hintP1: Phaser.GameObjects.BitmapText;
  private hintP2: Phaser.GameObjects.BitmapText;
  private portraits: Phaser.GameObjects.Image[];
  private delayedHp = { 1: MAX_HP, 2: MAX_HP };
  private meterPulse = 0;
  /** Enfriamiento visto en el frame anterior y parpadeo pendiente al quedar lista, por jugador y habilidad. */
  private lastCooldown = { 1: { special1: 0, special2: 0 }, 2: { special1: 0, special2: 0 } };
  private readyFlash = { 1: { special1: 0, special2: 0 }, 2: { special1: 0, special2: 0 } };

  private static BAR_W = 140;
  private static BAR_H = 8;
  private static BAR_Y = 12;

  constructor(scene: Phaser.Scene, private p1: Fighter, private p2: Fighter, p1Key: string, p2Key: string) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.portraits = [
      scene.add.image(6, 6, p1Key).setOrigin(0, 0).setScrollFactor(0).setDepth(101),
      scene.add.image(GAME_WIDTH - 6, 6, p2Key).setOrigin(1, 0).setScrollFactor(0).setDepth(101).setFlipX(true),
    ];
    this.timerText = text(scene, GAME_WIDTH / 2, 17, '99', 2, 0xf8f0c8).setScrollFactor(0).setDepth(101);
    this.nameP1 = scene.add.bitmapText(34, 22, 'font', p1.stats.name).setOrigin(0, 0).setScrollFactor(0).setDepth(101).setTint(0xf8f0c8);
    this.nameP2 = scene.add.bitmapText(GAME_WIDTH - 34, 22, 'font', p2.stats.name).setOrigin(1, 0).setScrollFactor(0).setDepth(101).setTint(0xf8f0c8);
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
      if (this.delayedHp[slot] > f.hp) {
        if (frame % 2 === 0) this.delayedHp[slot] = Math.max(f.hp, this.delayedHp[slot] - 1);
      } else {
        this.delayedHp[slot] = f.hp;
      }
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
    this.delayedHp = { 1: MAX_HP, 2: MAX_HP };
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
      // marco y fondo
      g.fillStyle(COLORS.hudFrame, 1).fillRect(x0 - 2, Y - 2, W + 4, H + 4);
      g.lineStyle(1, COLORS.hudBorder, 1).strokeRect(x0 - 1.5, Y - 1.5, W + 3, H + 3);
      g.fillStyle(0x401010, 1).fillRect(x0, Y, W, H);
      // daño retardado
      const dw = Math.round((this.delayedHp[slot] / MAX_HP) * W);
      const hw = Math.round((f.hp / MAX_HP) * W);
      const dx = slot === 1 ? x0 + W - dw : x0;
      const hx = slot === 1 ? x0 + W - hw : x0;
      g.fillStyle(COLORS.hpDamage, 1).fillRect(dx, Y, dw, H);
      g.fillStyle(f.hp <= 25 ? COLORS.hpRed : COLORS.hpYellow, 1).fillRect(hx, Y, hw, H);
      if (hw > 2) g.fillStyle(0xffffff, 0.35).fillRect(hx, Y, hw, 2);
      // rondas ganadas
      const wins = slot === 1 ? score.p1 : score.p2;
      for (let i = 0; i < ROUNDS_TO_WIN; i++) {
        const cx = slot === 1 ? x0 + W - 6 - i * 10 : x0 + 6 + i * 10;
        g.fillStyle(i < wins ? 0xf8d048 : 0x302028, 1).fillCircle(cx, Y + H + 7, 3);
        g.lineStyle(1, COLORS.hudBorder, 1).strokeCircle(cx, Y + H + 7, 3);
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
    for (const p of this.portraits) p.setVisible(v);
    this.timerText.setVisible(v);
    this.nameP1.setVisible(v);
    this.nameP2.setVisible(v);
    this.hintP1.setVisible(v);
    this.hintP2.setVisible(v);
  }
}
