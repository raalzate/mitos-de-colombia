import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game-config';
import { MenuInput, inputManager } from '../utils/game';
import { text } from '../utils/textures';

/** Advertencia previa: sustos repentinos, gritos fuertes y destellos. */
export class WarningScene extends Phaser.Scene {
  private menu = new MenuInput();
  private frame = 0;
  private hint!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('WarningScene');
  }

  create(): void {
    this.menu = new MenuInput();
    this.frame = 0;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050003, 1).setOrigin(0);
    text(this, GAME_WIDTH / 2, 44, 'ADVERTENCIA', 2, 0xd01020);
    const lines = [
      'ESTE JUEGO CONTIENE SUSTOS REPENTINOS',
      '(SCREAMERS), GRITOS FUERTES Y DESTELLOS.',
      '',
      'SI ERES SENSIBLE A LA LUZ O A LOS SUSTOS,',
      'DESACTÍVALOS EN EL MENÚ: SUSTOS: NO.',
      '',
      'SE RECOMIENDA JUGAR CON AUDÍFONOS',
      'Y CON LA LUZ APAGADA.',
    ];
    lines.forEach((l, i) => text(this, GAME_WIDTH / 2, 86 + i * 12, l, 1, 0xe8d8d8));
    this.hint = text(this, GAME_WIDTH / 2, 196, 'PULSA CUALQUIER TECLA', 1, 0x9088b0);
  }

  override update(): void {
    inputManager.update();
    this.frame++;
    this.hint.setVisible(Math.floor(this.frame / 40) % 2 === 0);
    // cualquier tecla (la pulsación también desbloquea el audio en main.ts)
    if (this.frame > 20 && inputManager.heldKeys().size > 0 && this.menu.pressed([...inputManager.heldKeys()])) {
      this.scene.start('MenuScene');
    }
  }
}
