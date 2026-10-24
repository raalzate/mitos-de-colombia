import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config/game-config';
import type { StageChoice } from '../combat/CombatTypes';
import { STAGES, STAGE_IDS, type StageId } from '../art/StageArtist';
import { sfx } from '../audio/Sfx';
import { MENU_KEYS, MenuInput, getSettings, inputManager, setSettings, toggleFullscreen } from '../utils/game';
import { touchActive } from '../ui/TouchControls';
import { ensureStage, portraitKey, text, type StageKeys } from '../utils/textures';
import { startWithLoading } from '../ui/Loading';

const CHOICES: StageChoice[] = [...STAGE_IDS, 'random'];

/** Selección de escenario: se ve el escenario completo con parallax suave y el nombre; izquierda/derecha para cambiar. */
export class StageSelectScene extends Phaser.Scene {
  private index = 0;
  private frame = 0;
  private menu = new MenuInput();
  private layers: Phaser.GameObjects.Image[] = [];
  private river!: Phaser.GameObjects.Image;
  private clouds!: Phaser.GameObjects.TileSprite;
  private mist!: Phaser.GameObjects.TileSprite;
  private keys!: StageKeys;
  private shown: StageId | null = null;
  private title!: Phaser.GameObjects.BitmapText;
  private subtitle!: Phaser.GameObjects.BitmapText;
  private dots!: Phaser.GameObjects.Graphics;
  private banner!: Phaser.GameObjects.BitmapText;
  private startTimer = -1;

  constructor() {
    super('StageSelectScene');
  }

  create(): void {
    const s = getSettings(this);
    this.menu = new MenuInput();
    this.frame = 0;
    this.startTimer = -1;
    this.shown = null;
    this.index = Math.max(0, CHOICES.indexOf(s.stage));
    this.layers = [];

    // capas (se reasigna la textura al cambiar de escenario)
    const k = ensureStage(this, 'ribera');
    this.keys = k;
    this.layers.push(this.add.image(0, 0, k.sky).setOrigin(0).setDepth(0));
    this.clouds = this.add.tileSprite(0, 8, GAME_WIDTH, 90, k.clouds).setOrigin(0).setDepth(1);
    this.layers.push(this.add.image(-60, 60, k.far).setOrigin(0).setDepth(2));
    this.river = this.add.image(-40, 150, k.river(0)).setOrigin(0).setDepth(3);
    this.layers.push(this.add.image(-60, 88, k.mid).setOrigin(0).setDepth(4));
    this.mist = this.add.tileSprite(0, 152, GAME_WIDTH, 40, k.mist).setOrigin(0).setDepth(5);
    this.layers.push(this.add.image(-40, GROUND_Y - 40, k.ground).setOrigin(0).setDepth(6));
    this.layers.push(this.add.image(-60, GAME_HEIGHT - 38, k.fore).setOrigin(0).setDepth(7));

    // marco superior e inferior
    this.add.rectangle(0, 0, GAME_WIDTH, 44, 0x07060d, 0.75).setOrigin(0).setDepth(10);
    this.add.rectangle(0, GAME_HEIGHT - 26, GAME_WIDTH, 26, 0x07060d, 0.75).setOrigin(0).setDepth(10);
    text(this, GAME_WIDTH / 2, 10, 'ELIGE EL ESCENARIO', 1, 0xf8d048).setDepth(11);
    this.title = text(this, GAME_WIDTH / 2, 24, '', 1, 0xf8f0c8).setDepth(11);
    this.subtitle = text(this, GAME_WIDTH / 2, 35, '', 1, 0x9088b0).setDepth(11).setAlpha(0.9);
    text(this, 14, 112, '<', 2, 0xf8d048).setDepth(11);
    text(this, GAME_WIDTH - 14, 112, '>', 2, 0xf8d048).setDepth(11);
    this.dots = this.add.graphics().setDepth(11);
    this.banner = text(this, GAME_WIDTH / 2, 150, '', 2, 0xf05060).setDepth(12);

    // luchadores elegidos, en miniatura
    const mirror = s.p1 === s.p2;
    this.add.image(8, 8, portraitKey(this, s.p1, 'p1', 24)).setOrigin(0, 0).setDepth(11);
    this.add.image(GAME_WIDTH - 8, 8, portraitKey(this, s.p2, mirror ? 'p2' : 'p1', 24)).setOrigin(1, 0).setDepth(11).setFlipX(true);
    text(this, GAME_WIDTH / 2, GAME_HEIGHT - 13, touchActive() ? 'CRUCETA: CAMBIAR   A: CONFIRMAR   MENÚ: VOLVER' : 'FLECHAS: CAMBIAR   ESPACIO/ENTER: CONFIRMAR   ESC: VOLVER', 1, 0x9088b0).setDepth(11).setAlpha(0.9);
    this.applyChoice();
  }

  private applyChoice(): void {
    const choice = CHOICES[this.index];
    const id: StageId = choice === 'random' ? STAGE_IDS[this.frame % STAGE_IDS.length] : choice;
    const t = STAGES[id];
    this.title.setText((choice === 'random' ? 'ALEATORIO' : t.name).toUpperCase());
    this.subtitle.setText((choice === 'random' ? 'EL DESTINO ELIGE EL CAMPO DE BATALLA' : t.subtitle).toUpperCase());
    if (this.shown !== id) {
      this.shown = id;
      sfx.setSoundscape(id);
      const k = ensureStage(this, id);
      this.keys = k;
      const [sky, far, mid, ground, fore] = this.layers;
      sky.setTexture(k.sky);
      far.setTexture(k.far);
      mid.setTexture(k.mid);
      ground.setTexture(k.ground);
      fore.setTexture(k.fore);
      this.clouds.setTexture(k.clouds);
      this.mist.setTexture(k.mist).setAlpha(t.mist.alpha);
      this.river.setTexture(k.river(0));
    }
    const g = this.dots;
    g.clear();
    const n = CHOICES.length;
    const x0 = GAME_WIDTH / 2 - (n - 1) * 6;
    for (let i = 0; i < n; i++) {
      g.fillStyle(i === this.index ? 0xf8d048 : 0x403848, 1).fillCircle(x0 + i * 12, GAME_HEIGHT - 32, 2.5);
    }
  }

  override update(): void {
    inputManager.update();
    this.frame++;
    if (this.menu.pressed(MENU_KEYS.fullscreen)) toggleFullscreen(this);
    if (this.startTimer < 0) {
      if (this.menu.pressed(MENU_KEYS.back)) {
        this.scene.start('CharacterSelectScene');
        return;
      }
      let moved = 0;
      if (this.menu.pressed(MENU_KEYS.left)) moved = -1;
      if (this.menu.pressed(MENU_KEYS.right)) moved = 1;
      if (moved) {
        this.index = (this.index + moved + CHOICES.length) % CHOICES.length;
        sfx.play('select');
        this.applyChoice();
      }
      if (this.menu.pressed(MENU_KEYS.confirm)) {
        const s = getSettings(this);
        setSettings(this, { ...s, stage: CHOICES[this.index] });
        this.startTimer = 50;
        this.banner.setText('¡A LUCHAR!');
        sfx.play('round');
      }
    } else {
      this.startTimer--;
      this.banner.setVisible(Math.floor(this.frame / 6) % 2 === 0);
      if (this.startTimer === 0) {
        startWithLoading(this, 'FightScene');
        return;
      }
    }
    // en "aleatorio" se rotan los escenarios como vista previa
    if (CHOICES[this.index] === 'random' && this.frame % 45 === 0 && this.startTimer < 0) this.applyChoice();
    this.river.setTexture(this.keys.river(Math.floor(this.frame / 9) % 3));
    this.clouds.tilePositionX = this.frame * 0.06;
    this.mist.tilePositionX = this.frame * 0.25;
    const sway = Math.sin(this.frame / 90) * 10;
    const [, far, mid, ground, fore] = this.layers;
    far.setX(-60 + sway * 0.25);
    mid.setX(-60 + sway * 0.6);
    ground.setX(-40 + sway);
    fore.setX(-60 + sway * 1.2);
    this.river.setX(-40 + sway * 0.4);
  }
}
