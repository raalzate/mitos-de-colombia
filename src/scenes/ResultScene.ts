import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/game-config';
import type { MatchSettings, PlayerSlot } from '../combat/CombatTypes';
import { FIGHTERS } from '../data/fighters';
import { sfx } from '../audio/Sfx';
import { MENU_KEYS, MenuInput, inputManager, toggleFullscreen } from '../utils/game';
import { ANIM_TABLES, addStageBackdrop, portraitKey, splashKey, text } from '../utils/textures';
import type { StageId } from '../art/StageArtist';
import { splashPose } from '../art/SplashPose';
import { drawnAnimKey, drawnFrame } from '../art/DrawnAnim';
import { isSwitching, startWithLoading } from '../ui/Loading';

export interface ResultData {
  winner: PlayerSlot;
  settings: MatchSettings;
  score: { p1: number; p2: number };
  spriteKey: string;
  stage: StageId;
}

const ITEMS = ['REVANCHA', 'ELEGIR LUCHADOR', 'MENÚ PRINCIPAL'];

export class ResultScene extends Phaser.Scene {
  private result!: ResultData;
  private index = 0;
  private items: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.Image;
  private sprite!: Phaser.GameObjects.Sprite;
  private frame = 0;
  private drawn = false;
  private menu = new MenuInput();

  constructor() {
    super('ResultScene');
  }

  init(data: ResultData): void {
    this.result = data;
  }

  create(): void {
    this.index = 0;
    this.menu = new MenuInput();
    this.frame = 0;
    this.items = [];
    const d = this.result;
    const winnerId = d.winner === 1 ? d.settings.p1 : d.settings.p2;
    const label = d.settings.mode === 'cpu' && d.winner === 2 ? 'CPU' : `JUGADOR ${d.winner}`;

    addStageBackdrop(this, d.stage ?? 'ribera', 0.4);

    text(this, GAME_WIDTH / 2, 22, '¡VICTORIA!', 2, 0xf8d048);
    text(this, GAME_WIDTH / 2, 44, `${label}: ${FIGHTERS[winnerId].name}`, 1, 0xf8f0c8);
    text(this, GAME_WIDTH / 2, 56, `RONDAS ${d.score.p1} - ${d.score.p2}`, 1, 0x9088b0);
    const pal = d.spriteKey.endsWith('_p2') ? 'p2' : 'p1';
    const splash = splashKey(this, winnerId, pal, 128);
    if (splash) this.add.image(300, 130, splash).setOrigin(0.5);
    else this.add.image(300, 120, portraitKey(this, winnerId, pal, 64)).setOrigin(0.5);
    const small = d.settings.art === 'drawn' ? splashKey(this, winnerId, pal, 72) : null;
    this.drawn = !!small;
    const vf = small ? drawnFrame(winnerId, { state: 'victory', anim: 'victory', animFrame: 0, frame: 0, grounded: true }) : null;
    const animKey = vf ? drawnAnimKey(winnerId, pal, vf.action) : null;
    this.sprite = animKey && this.textures.exists(animKey)
      ? this.add.sprite(96, 190, animKey, vf!.index).setOrigin(0.5, 1)
      : small
        ? this.add.sprite(96, 190, small).setOrigin(0.5, 1)
        : this.add.sprite(96, 190, d.spriteKey, 0).setOrigin(0.5, 93 / 96);
    this.cursor = this.add.image(0, 0, 'cursor');
    ITEMS.forEach((label2, i) => this.items.push(text(this, GAME_WIDTH / 2, 150 + i * 14, label2, 1, 0xe8e8f0)));
    this.layout();
    sfx.play('round');
  }

  private layout(): void {
    const it = this.items[this.index];
    this.cursor.setPosition(it.x - it.width / 2 - 10, it.y);
    this.items.forEach((t, i) => t.setTint(i === this.index ? 0xf8d048 : 0xe8e8f0));
  }

  override update(): void {
    inputManager.update();
    this.frame++;
    if (this.drawn) {
      const p = splashPose({ state: 'victory', anim: 'victory', animFrame: 0, frame: this.frame, vy: 0, grounded: true });
      this.sprite.setPosition(96, 190 + p.dy).setAngle(p.rot).setScale(p.sx, p.sy);
    } else {
      const table = ANIM_TABLES[this.result.spriteKey];
      const frames = table.victory;
      this.sprite.setFrame(frames[Math.floor(this.frame / 14) % frames.length]);
    }
    if (isSwitching()) return;
    if (this.menu.pressed(MENU_KEYS.fullscreen)) toggleFullscreen(this);
    if (this.menu.pressed(MENU_KEYS.up)) {
      this.index = (this.index + ITEMS.length - 1) % ITEMS.length;
      sfx.play('select');
      this.layout();
    }
    if (this.menu.pressed(MENU_KEYS.down)) {
      this.index = (this.index + 1) % ITEMS.length;
      sfx.play('select');
      this.layout();
    }
    if (this.menu.pressed(MENU_KEYS.back)) {
      this.scene.start('MenuScene');
      return;
    }
    if (!this.menu.pressed(MENU_KEYS.confirm)) return;
    sfx.play('confirm');
    if (this.index === 0) startWithLoading(this, 'FightScene');
    else if (this.index === 1) this.scene.start('CharacterSelectScene');
    else this.scene.start('MenuScene');
  }
}
