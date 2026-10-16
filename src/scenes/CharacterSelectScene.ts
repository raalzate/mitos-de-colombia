import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/game-config';
import { FIGHTERS, FIGHTER_IDS } from '../data/fighters';
import { sfx } from '../audio/Sfx';
import { MENU_KEYS, MenuInput, getSettings, inputManager, setSettings, toggleFullscreen } from '../utils/game';
import { addStageBackdrop, portraitKey, splashKey, text } from '../utils/textures';

const COLS = 5;
const CELL = 48;
const GAP = 4;
const GRID_W = COLS * CELL + (COLS - 1) * GAP;
const GRID_X0 = (GAME_WIDTH - GRID_W) / 2;
const GRID_Y0 = 22;
const SPLASH_Y = 150;
const SPLASH_SCALE = 0.8;
const INFO_W = 104;

function cellPos(i: number): { x: number; y: number } {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return { x: GRID_X0 + col * (CELL + GAP) + CELL / 2, y: GRID_Y0 + row * (CELL + GAP) + CELL / 2 };
}

/** Selección de luchador: rejilla de caras dibujadas y arte de cuerpo entero a cada lado. */
export class CharacterSelectScene extends Phaser.Scene {
  private p1Index = 0;
  private p2Index = 1;
  private p1Locked = false;
  private p2Locked = false;
  private cpuTimer = 0;
  private startTimer = -1;
  private frame = 0;
  private menu = new MenuInput();
  private gfx!: Phaser.GameObjects.Graphics;
  private nameP1!: Phaser.GameObjects.BitmapText;
  private nameP2!: Phaser.GameObjects.BitmapText;
  private infoP1!: Phaser.GameObjects.BitmapText;
  private infoP2!: Phaser.GameObjects.BitmapText;
  private labelP1!: Phaser.GameObjects.BitmapText;
  private labelP2!: Phaser.GameObjects.BitmapText;
  private banner!: Phaser.GameObjects.BitmapText;
  private bigP1!: Phaser.GameObjects.Image;
  private bigP2!: Phaser.GameObjects.Image;
  private shownP1 = '';
  private shownP2 = '';

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    const s = getSettings(this);
    this.menu = new MenuInput();
    this.p1Index = Math.max(0, FIGHTER_IDS.indexOf(s.p1));
    this.p2Index = Math.max(0, FIGHTER_IDS.indexOf(s.p2));
    this.p1Locked = false;
    this.p2Locked = false;
    this.cpuTimer = 0;
    this.startTimer = -1;
    this.frame = 0;
    this.shownP1 = '';
    this.shownP2 = '';

    addStageBackdrop(this, 'ribera', 0.62);

    text(this, GAME_WIDTH / 2, 10, 'ELIGE A TU LEYENDA', 1, 0xf8d048);
    // paneles laterales para el arte de cuerpo entero
    this.bigP1 = this.add.image(40, SPLASH_Y, 'white').setOrigin(0.5).setDepth(0);
    this.bigP2 = this.add.image(GAME_WIDTH - 40, SPLASH_Y, 'white').setOrigin(0.5).setDepth(0).setFlipX(true);

    // rejilla de caras
    FIGHTER_IDS.forEach((id, i) => {
      const p = cellPos(i);
      this.add.rectangle(p.x, p.y, CELL + 2, CELL + 2, 0x08060c, 1).setOrigin(0.5).setDepth(1);
      this.add.image(p.x, p.y, portraitKey(this, id, 'p1', 48)).setOrigin(0.5).setDepth(1);
    });
    this.gfx = this.add.graphics().setDepth(2);

    const infoY = GRID_Y0 + 2 * CELL + GAP + 8;
    this.nameP1 = text(this, 0, 0, '', 1, 0xf8d048).setOrigin(0, 0.5).setDepth(2);
    this.nameP2 = text(this, 0, 0, '', 1, 0x80c8ff).setOrigin(1, 0.5).setDepth(2);
    const x1 = GRID_X0 + 22;
    const x2 = GRID_X0 + GRID_W - 22;
    this.add.rectangle(GRID_X0 + 16, infoY - 7, GRID_W - 32, 48, 0x07060d, 0.7).setOrigin(0).setDepth(1);
    this.nameP1.setPosition(x1, infoY).setDepth(2);
    this.nameP2.setPosition(x2, infoY).setDepth(2);
    this.infoP1 = this.add.bitmapText(x1, infoY + 9, 'font_plain', '').setTint(0xe8e8f0).setMaxWidth(INFO_W).setAlpha(0.9).setDepth(2);
    this.infoP2 = this.add.bitmapText(x2, infoY + 9, 'font_plain', '').setOrigin(1, 0).setTint(0xe8e8f0).setMaxWidth(INFO_W).setAlpha(0.9).setDepth(2);
    this.labelP1 = text(this, 0, 0, 'P1', 1, 0xf8d048).setDepth(3);
    this.labelP2 = text(this, 0, 0, s.mode === 'cpu' ? 'CPU' : 'P2', 1, 0x80c8ff).setDepth(3);
    this.banner = text(this, GAME_WIDTH / 2, 186, '', 2, 0xf05060).setDepth(3);

    text(this, GAME_WIDTH / 2, 214, s.mode === 'cpu'
      ? 'WASD: ELEGIR   F/ENTER: CONFIRMAR   ESC: VOLVER'
      : 'P1: WASD + F     P2: FLECHAS + J     ESC: VOLVER', 1, 0x9088b0).setAlpha(0.9);
  }

  private move(index: number, dx: number, dy: number): number {
    const n = FIGHTER_IDS.length;
    const rows = Math.ceil(n / COLS);
    let col = index % COLS;
    let row = Math.floor(index / COLS);
    col = (col + dx + COLS) % COLS;
    row = (row + dy + rows) % rows;
    let i = row * COLS + col;
    if (i >= n) i = n - 1;
    return i;
  }

  private setBig(img: Phaser.GameObjects.Image, id: (typeof FIGHTER_IDS)[number], pal: 'p1' | 'p2'): void {
    const sk = splashKey(this, id, pal, 128);
    if (sk) {
      img.setTexture(sk).setScale(SPLASH_SCALE).setPosition(img.x, SPLASH_Y);
      return;
    }
    img.setTexture(portraitKey(this, id, pal, 64)).setScale(1).setPosition(img.x, SPLASH_Y - 20);
  }

  private draw(): void {
    const g = this.gfx;
    g.clear();
    const same = this.p1Index === this.p2Index;
    const frameAt = (idx: number, color: number, inset: number) => {
      const p = cellPos(idx);
      g.lineStyle(2, color, 1);
      g.strokeRect(p.x - CELL / 2 - 2 + inset, p.y - CELL / 2 - 2 + inset, CELL + 4 - inset * 2, CELL + 4 - inset * 2);
    };
    const blink1 = this.p1Locked || Math.floor(this.frame / 8) % 2 === 0;
    const blink2 = this.p2Locked || Math.floor(this.frame / 8) % 2 === 0;
    if (blink1) frameAt(this.p1Index, 0xf8d048, 0);
    if (blink2) frameAt(this.p2Index, 0x80c8ff, same ? 3 : 0);
    const c1 = cellPos(this.p1Index);
    const c2 = cellPos(this.p2Index);
    this.labelP1.setPosition(c1.x - (same ? 12 : 0), c1.y - CELL / 2 - 7);
    this.labelP2.setPosition(c2.x + (same ? 12 : 0), c2.y - CELL / 2 - 7);
    const id1 = FIGHTER_IDS[this.p1Index];
    const id2 = FIGHTER_IDS[this.p2Index];
    const f1 = FIGHTERS[id1];
    const f2 = FIGHTERS[id2];
    this.nameP1.setText(f1.name);
    this.nameP2.setText(f2.name);
    this.infoP1.setText(`${f1.title}\n${f1.description}`.toUpperCase());
    this.infoP2.setText(`${f2.title}\n${f2.description}`.toUpperCase());
    const key1 = `${id1}_p1`;
    const key2 = `${id2}_${same ? 'p2' : 'p1'}`;
    if (key1 !== this.shownP1) {
      this.shownP1 = key1;
      this.setBig(this.bigP1, id1, 'p1');
    }
    if (key2 !== this.shownP2) {
      this.shownP2 = key2;
      this.setBig(this.bigP2, id2, same ? 'p2' : 'p1');
    }
    // respiración sutil del arte lateral
    const bob = Math.sin(this.frame / 20) * 1.5;
    this.bigP1.setY(SPLASH_Y + bob);
    this.bigP2.setY(SPLASH_Y - bob);
  }

  override update(): void {
    inputManager.update();
    this.frame++;
    const s = getSettings(this);
    if (this.menu.pressed(MENU_KEYS.fullscreen)) toggleFullscreen(this);
    if (this.menu.pressed(MENU_KEYS.back)) {
      if (this.p1Locked && this.startTimer < 0) {
        this.p1Locked = false;
        this.p2Locked = false;
        this.cpuTimer = 0;
      } else {
        this.scene.start('MenuScene');
        return;
      }
    }
    const in1 = inputManager.snapshot(1);
    const in2 = inputManager.snapshot(2);

    if (!this.p1Locked) {
      let moved = false;
      if (this.menu.pressed(['KeyA'])) { this.p1Index = this.move(this.p1Index, -1, 0); moved = true; }
      if (this.menu.pressed(['KeyD'])) { this.p1Index = this.move(this.p1Index, 1, 0); moved = true; }
      if (this.menu.pressed(['KeyW'])) { this.p1Index = this.move(this.p1Index, 0, -1); moved = true; }
      if (this.menu.pressed(['KeyS'])) { this.p1Index = this.move(this.p1Index, 0, 1); moved = true; }
      if (moved) sfx.play('select');
      if (this.menu.pressed(['KeyF', 'Enter', 'Space']) || in1.pressed.light) {
        this.p1Locked = true;
        sfx.play('confirm');
        if (s.mode === 'cpu') this.cpuTimer = 50;
      }
    }
    if (s.mode === 'versus' && !this.p2Locked) {
      let moved = false;
      if (this.menu.pressed(['ArrowLeft'])) { this.p2Index = this.move(this.p2Index, -1, 0); moved = true; }
      if (this.menu.pressed(['ArrowRight'])) { this.p2Index = this.move(this.p2Index, 1, 0); moved = true; }
      if (this.menu.pressed(['ArrowUp'])) { this.p2Index = this.move(this.p2Index, 0, -1); moved = true; }
      if (this.menu.pressed(['ArrowDown'])) { this.p2Index = this.move(this.p2Index, 0, 1); moved = true; }
      if (moved) sfx.play('select');
      if (this.menu.pressed(['KeyJ']) || in2.pressed.light) {
        this.p2Locked = true;
        sfx.play('confirm');
      }
    }
    if (s.mode === 'cpu' && this.p1Locked && !this.p2Locked) {
      this.cpuTimer--;
      if (this.cpuTimer % 6 === 0) {
        this.p2Index = Math.floor(Math.random() * FIGHTER_IDS.length);
        sfx.play('select');
      }
      if (this.cpuTimer <= 0) {
        let pick = Math.floor(Math.random() * FIGHTER_IDS.length);
        if (pick === this.p1Index && Math.random() < 0.8) pick = (pick + 1 + Math.floor(Math.random() * (FIGHTER_IDS.length - 1))) % FIGHTER_IDS.length;
        this.p2Index = pick;
        this.p2Locked = true;
        sfx.play('confirm');
      }
    }
    if (this.p1Locked && this.p2Locked && this.startTimer < 0) {
      this.startTimer = 45;
      this.banner.setText('¡LISTOS!');
      setSettings(this, { ...s, p1: FIGHTER_IDS[this.p1Index], p2: FIGHTER_IDS[this.p2Index] });
      sfx.play('round');
    }
    if (this.startTimer > 0) {
      this.startTimer--;
      this.banner.setVisible(Math.floor(this.frame / 6) % 2 === 0);
      if (this.startTimer === 0) {
        this.scene.start('StageSelectScene');
        return;
      }
    }
    this.draw();
  }
}
