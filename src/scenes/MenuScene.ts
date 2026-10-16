import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/game-config';
import type { Difficulty } from '../combat/CombatTypes';
import { sfx } from '../audio/Sfx';
import { MENU_KEYS, MenuInput, getSettings, inputManager, setSettings, toggleFullscreen } from '../utils/game';
import { addStageBackdrop, text } from '../utils/textures';

type Page = 'main' | 'difficulty' | 'controls';

const MAIN_ITEMS = ['UN JUGADOR VS CPU', 'DOS JUGADORES', 'CONTROLES', 'ARTE: DIBUJADO', 'PANTALLA COMPLETA'];
const ART_INDEX = 3;
const DIFF_ITEMS: { label: string; value: Difficulty }[] = [
  { label: 'FÁCIL', value: 'easy' },
  { label: 'NORMAL', value: 'normal' },
  { label: 'DIFÍCIL', value: 'hard' },
];

export class MenuScene extends Phaser.Scene {
  private page: Page = 'main';
  private index = 0;
  private items: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.Image;
  private subtitle!: Phaser.GameObjects.BitmapText;
  private controls!: Phaser.GameObjects.Container;
  private title!: Phaser.GameObjects.BitmapText;
  private menu = new MenuInput();
  private frame = 0;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.page = 'main';
    this.menu = new MenuInput();
    this.index = 0;
    this.items = [];
    addStageBackdrop(this, 'ribera', 0.45);

    this.add.image(GAME_WIDTH / 2, 52, 'logo').setOrigin(0.5);
    this.subtitle = text(this, GAME_WIDTH / 2, 98, 'SANGRE DE LEYENDA', 1, 0xf05060);
    this.title = text(this, GAME_WIDTH / 2, 118, '', 1, 0xf8d048);

    this.cursor = this.add.image(0, 0, 'cursor').setOrigin(0.5);
    this.buildControls();
    this.showPage('main');

    text(this, GAME_WIDTH / 2, 206, 'W/S FLECHAS: MOVER   F/J/ENTER: ACEPTAR', 1, 0x9088b0).setAlpha(0.9);
    text(this, GAME_WIDTH / 2, 216, 'Z: PANTALLA COMPLETA', 1, 0x9088b0).setAlpha(0.7);

    inputManager.setGamepadEnabled(2, true);
  }

  private buildControls(): void {
    const c = this.add.container(0, 0).setVisible(false);
    const bg = this.add.rectangle(GAME_WIDTH / 2, 150, 340, 118, 0x100c18, 0.92).setStrokeStyle(1, 0xd8b070);
    c.add(bg);
    const p1 = [
      'JUGADOR 1', 'A/D MOVER  W SALTAR  S AGACHAR',
      'F PUÑO LIGERO  G PUÑO FUERTE', 'V PATADA LIG.  B PATADA FUERTE',
      'R ESPECIAL  S+R ESPECIAL 2', 'T DEFINITIVO  Q BLOQUEAR',
    ];
    const p2 = [
      'JUGADOR 2', 'FLECHAS MOVER/SALTAR/AGACHAR',
      'J PUÑO LIGERO  K PUÑO FUERTE', 'U PATADA LIG.  I PATADA FUERTE',
      'O ESPECIAL  ABAJO+O ESPECIAL 2', 'P DEFINITIVO  L BLOQUEAR',
    ];
    p1.forEach((line, i) => c.add(this.add.bitmapText(26, 100 + i * 10, 'font_plain', line).setTint(i === 0 ? 0xf8d048 : 0xe8e8f0)));
    p2.forEach((line, i) => c.add(this.add.bitmapText(26, 160 + i * 10 - 60 + 60, 'font_plain', line).setTint(i === 0 ? 0x80c8ff : 0xe8e8f0).setY(100 + 62 + i * 10)));
    c.add(this.add.bitmapText(GAME_WIDTH / 2, 199, 'font_plain', 'MANDOS: GAMEPAD API (DISPOSICIÓN ESTÁNDAR)').setOrigin(0.5, 0).setTint(0x9088b0));
    this.controls = c;
  }

  private showPage(page: Page): void {
    this.page = page;
    this.index = 0;
    for (const it of this.items) it.destroy();
    this.items = [];
    this.controls.setVisible(page === 'controls');
    this.cursor.setVisible(page !== 'controls');
    const art = getSettings(this).art === 'drawn' ? 'ARTE: DIBUJADO' : 'ARTE: PROCEDIMENTAL';
    const labels = page === 'main' ? MAIN_ITEMS.map((l, i) => (i === ART_INDEX ? art : l)) : page === 'difficulty' ? [...DIFF_ITEMS.map((d) => d.label), 'VOLVER'] : [];
    this.title.setText(page === 'difficulty' ? 'DIFICULTAD' : page === 'controls' ? 'CONTROLES' : '');
    labels.forEach((label, i) => {
      this.items.push(text(this, GAME_WIDTH / 2, 136 + i * 14, label, 1, 0xe8e8f0));
    });
    if (page === 'difficulty') {
      const cur = getSettings(this).difficulty;
      this.index = Math.max(0, DIFF_ITEMS.findIndex((d) => d.value === cur));
    }
    this.layoutCursor();
  }

  private layoutCursor(): void {
    if (!this.items.length) return;
    const it = this.items[this.index];
    this.cursor.setPosition(it.x - it.width / 2 - 10, it.y);
    this.items.forEach((t, i) => t.setTint(i === this.index ? 0xf8d048 : 0xe8e8f0));
  }

  override update(): void {
    inputManager.update();
    this.frame++;
    this.subtitle.setVisible(Math.floor(this.frame / 30) % 2 === 0 || this.page !== 'main');
    if (this.menu.pressed(MENU_KEYS.fullscreen)) toggleFullscreen(this);

    if (this.page === 'controls') {
      if (this.menu.pressed(MENU_KEYS.confirm) || this.menu.pressed(MENU_KEYS.back)) {
        sfx.play('select');
        this.showPage('main');
      }
      return;
    }
    const n = this.items.length;
    if (this.menu.pressed(MENU_KEYS.up)) {
      this.index = (this.index + n - 1) % n;
      sfx.play('select');
      this.layoutCursor();
    }
    if (this.menu.pressed(MENU_KEYS.down)) {
      this.index = (this.index + 1) % n;
      sfx.play('select');
      this.layoutCursor();
    }
    if (this.menu.pressed(MENU_KEYS.back) && this.page === 'difficulty') {
      this.showPage('main');
      return;
    }
    if (!this.menu.pressed(MENU_KEYS.confirm)) return;
    sfx.play('confirm');
    const s = getSettings(this);
    if (this.page === 'main') {
      switch (this.index) {
        case 0:
          this.showPage('difficulty');
          break;
        case 1:
          setSettings(this, { ...s, mode: 'versus' });
          this.scene.start('CharacterSelectScene');
          break;
        case 2:
          this.showPage('controls');
          break;
        case ART_INDEX: {
          setSettings(this, { ...s, art: s.art === 'drawn' ? 'procedural' : 'drawn' });
          const keep = this.index;
          this.showPage('main');
          this.index = keep;
          this.layoutCursor();
          break;
        }
        case 4:
          toggleFullscreen(this);
          break;
      }
    } else if (this.page === 'difficulty') {
      if (this.index === DIFF_ITEMS.length) {
        this.showPage('main');
        return;
      }
      setSettings(this, { ...s, mode: 'cpu', difficulty: DIFF_ITEMS[this.index].value });
      this.scene.start('CharacterSelectScene');
    }
  }
}
