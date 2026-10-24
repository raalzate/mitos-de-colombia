import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/game-config';
import type { Difficulty } from '../combat/CombatTypes';
import { sfx } from '../audio/Sfx';
import { MENU_KEYS, MenuInput, getSettings, inputManager, setSettings, toggleFullscreen } from '../utils/game';
import { touchActive } from '../ui/TouchControls';
import { addStageBackdrop, portraitKey, text } from '../utils/textures';
import { playScreamer } from '../ui/Screamer';
import { MENU_IDLE_SCARE_SECONDS } from '../combat/Fear';
import { loadAdventure } from '../adventure/State';
import type { FighterId } from '../combat/CombatTypes';
import { startWithLoading } from '../ui/Loading';

type Page = 'main' | 'difficulty' | 'controls' | 'adventure';

// Un jugador contra la CPU (el modo de dos jugadores está oculto)
const MAIN_ITEMS = ['MODO AVENTURA', 'COMBATE', 'CONTROLES', 'ARTE: DIBUJADO', 'SUSTOS: SÍ', 'PANTALLA COMPLETA'];
const ADVENTURE_INDEX = 0;
const PLAY_INDEX = 1;
const CONTROLS_INDEX = 2;
const ART_INDEX = 3;
const SCARES_INDEX = 4;
const FULLSCREEN_INDEX = 5;
const SCARE_FACES: FighterId[] = ['llorona', 'muelona', 'patasola', 'silbon', 'sombreron'];
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
  private idleFrames = 0;
  private scaring = false;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.idleFrames = 0;
    this.scaring = false;
    sfx.setTension(0);
    sfx.setSoundscape('menu');
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

    const touch = touchActive();
    text(this, GAME_WIDTH / 2, 206, touch ? 'CRUCETA: MOVER   A: ACEPTAR' : 'FLECHAS: MOVER   ESPACIO/ENTER: ACEPTAR', 1, 0x9088b0).setAlpha(0.9);
    if (!touch) text(this, GAME_WIDTH / 2, 216, 'F: PANTALLA COMPLETA', 1, 0x9088b0).setAlpha(0.7);

    inputManager.setGamepadEnabled(2, false);
  }

  private buildControls(): void {
    const c = this.add.container(0, 0).setVisible(false);
    const bg = this.add.rectangle(GAME_WIDTH / 2, 145, 348, 108, 0x100c18, 1).setStrokeStyle(1, 0xd8b070);
    c.add(bg);
    const left = ['MOVERSE / SALTAR / AGACHARSE', 'GOLPE', 'PATADA', 'COMBO: 3 SEGUIDOS', 'PODER 1', 'PODER 2', 'GOLPE FUERTE', 'DEFINITIVO (BARRA LLENA)', 'BLOQUEAR'];
    const right = touchActive()
      ? ['CRUCETA', 'A', 'B', 'A A A  O  B B B', 'MANTÉN A Y SUELTA  O  A B A', 'MANTÉN B Y SUELTA  O  B A B', 'A + B', 'A + B', 'ATRÁS CUANDO ATACAN']
      : ['FLECHAS', 'Z  O  ESPACIO', 'X', 'Z Z Z  O  X X X', 'MANTÉN Z Y SUELTA  O  Z X Z', 'MANTÉN X Y SUELTA  O  X Z X', 'Z + X', 'Z + X', 'ATRÁS CUANDO ATACAN'];
    c.add(this.add.bitmapText(GAME_WIDTH / 2, 94, 'font_plain', 'CONTROLES').setOrigin(0.5, 0).setTint(0xf8d048));
    left.forEach((line, i) => c.add(this.add.bitmapText(28, 106 + i * 9, 'font_plain', line).setTint(0xe8e8f0)));
    right.forEach((line, i) => c.add(this.add.bitmapText(GAME_WIDTH - 28, 106 + i * 9, 'font_plain', line).setOrigin(1, 0).setTint(0x80c8ff)));
    c.add(this.add.bitmapText(GAME_WIDTH / 2, 188, 'font_plain', touchActive() ? 'A GOLPE   B PATADA   ¡SOLO DOS BOTONES!' : 'MANDO: X/Y GOLPE   A/B PATADA   ¡SOLO DOS BOTONES!').setOrigin(0.5, 0).setTint(0x9088b0));
    this.controls = c;
  }

  private showPage(page: Page): void {
    this.page = page;
    this.index = 0;
    for (const it of this.items) it.destroy();
    this.items = [];
    this.controls.setVisible(page === 'controls').setDepth(10);
    this.subtitle.setAlpha(page === 'controls' ? 0 : 1);
    this.cursor.setVisible(page !== 'controls');
    const art = getSettings(this).art === 'drawn' ? 'ARTE: DIBUJADO' : 'ARTE: PROCEDIMENTAL';
    const scares = getSettings(this).scares ? 'SUSTOS: SÍ' : 'SUSTOS: NO';
    const labels = page === 'main' ? MAIN_ITEMS.map((l, i) => (i === ART_INDEX ? art : i === SCARES_INDEX ? scares : l))
      : page === 'difficulty' ? [...DIFF_ITEMS.map((d) => d.label), 'VOLVER']
      : page === 'adventure' ? (loadAdventure() ? ['CONTINUAR', 'NUEVA PARTIDA', 'VOLVER'] : ['NUEVA PARTIDA', 'VOLVER']) : [];
    this.title.setText(page === 'difficulty' ? 'DIFICULTAD' : page === 'controls' ? 'CONTROLES' : page === 'adventure' ? 'MODO AVENTURA' : '');
    labels.forEach((label, i) => {
      this.items.push(text(this, GAME_WIDTH / 2, 132 + i * 12, label, 1, 0xe8e8f0));
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
    // susto si el menú se queda quieto un rato
    if (this.scaring) return;
    if (inputManager.heldKeys().size > 0) this.idleFrames = 0;
    else this.idleFrames++;
    if (getSettings(this).scares && this.idleFrames > MENU_IDLE_SCARE_SECONDS * 60 && sfx.ready) {
      this.idleFrames = 0;
      this.scaring = true;
      const id = SCARE_FACES[Math.floor(Math.random() * SCARE_FACES.length)];
      void playScreamer(this, portraitKey(this, id, 'p1', 96)).then(() => { this.scaring = false; this.menu = new MenuInput(); });
      return;
    }
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
    if (this.menu.pressed(MENU_KEYS.back) && (this.page === 'difficulty' || this.page === 'adventure')) {
      this.showPage('main');
      return;
    }
    if (!this.menu.pressed(MENU_KEYS.confirm)) return;
    sfx.play('confirm');
    const s = getSettings(this);
    if (this.page === 'main') {
      switch (this.index) {
        case ADVENTURE_INDEX:
          this.showPage('adventure');
          break;
        case PLAY_INDEX:
          this.showPage('difficulty');
          break;
        case CONTROLS_INDEX:
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
        case SCARES_INDEX: {
          setSettings(this, { ...s, scares: !s.scares });
          const keep = this.index;
          this.showPage('main');
          this.index = keep;
          this.layoutCursor();
          if (!s.scares) sfx.play('sting');
          break;
        }
        case FULLSCREEN_INDEX:
          toggleFullscreen(this);
          break;
      }
    } else if (this.page === 'adventure') {
      const label = this.items[this.index].text;
      if (label === 'VOLVER') { this.showPage('main'); return; }
      this.registry.remove('adventure');
      startWithLoading(this, 'AdventureScene', { fresh: label === 'NUEVA PARTIDA' }, label === 'NUEVA PARTIDA' ? 'SAN AGUSTÍN' : 'CONTINUANDO LA AVENTURA');
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
