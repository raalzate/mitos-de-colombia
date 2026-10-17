import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/game-config';
import { MENU_KEYS, type MenuInput } from '../utils/game';
import { sfx } from '../audio/Sfx';
import { paginate } from './text';

const BOX_Y = 170;
const BOX_H = 50;
interface SayOpts { speaker?: string; shake?: boolean }

/**
 * Caja de diálogo al pie de la pantalla: texto que se escribe letra a letra,
 * nombre de quien habla y, si está asustado, la caja tiembla.
 */
export class DialogBox {
  private root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.BitmapText;
  private nameTag: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.BitmapText;
  private arrow: Phaser.GameObjects.Triangle;
  private choice: Phaser.GameObjects.Container;
  private pages: string[][] = [];
  private page = 0;
  private shown = 0;
  private shake = false;
  private resolve: (() => void) | null = null;
  private options: string[] = [];
  private optionTexts: Phaser.GameObjects.BitmapText[] = [];
  private optionCursor!: Phaser.GameObjects.Triangle;
  private optionIndex = 0;
  private resolveChoice: ((i: number) => void) | null = null;
  private frame = 0;
  /** -1 si no hay opción para cancelar */
  private cancelIndex = -1;

  constructor(private scene: Phaser.Scene) {
    const box = scene.add.graphics();
    box.fillStyle(0x283048, 1).fillRoundedRect(2, BOX_Y - 2, GAME_WIDTH - 4, BOX_H + 4, 4);
    box.fillStyle(0xf8f8f0, 1).fillRoundedRect(5, BOX_Y + 1, GAME_WIDTH - 10, BOX_H - 2, 3);
    box.lineStyle(1, 0x88a0c8, 1).strokeRoundedRect(7, BOX_Y + 3, GAME_WIDTH - 14, BOX_H - 6, 2);
    this.body = scene.add.bitmapText(14, BOX_Y + 8, 'font_plain', '').setTint(0x303038);
    this.body.setLineSpacing(5);
    this.arrow = scene.add.triangle(GAME_WIDTH - 16, BOX_Y + BOX_H - 9, 0, 0, 7, 0, 3.5, 4, 0xd83030).setOrigin(0);
    const tagBg = scene.add.graphics();
    this.nameText = scene.add.bitmapText(14, BOX_Y - 9, 'font_plain', '').setTint(0xf8f8f8);
    this.nameTag = scene.add.container(0, 0, [tagBg, this.nameText]);
    this.choice = scene.add.container(0, 0);
    this.root = scene.add.container(0, 0, [box, this.body, this.arrow, this.nameTag, this.choice]);
    this.root.setScrollFactor(0).setDepth(5000).setVisible(false);
    this.root.each((c: Phaser.GameObjects.GameObject) => (c as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor?.(0));
  }

  get busy(): boolean {
    return this.resolve !== null || this.resolveChoice !== null;
  }

  say(texts: string | string[], opts: SayOpts = {}): Promise<void> {
    this.pages = paginate(Array.isArray(texts) ? texts : [texts]);
    this.page = 0;
    this.shown = 0;
    this.shake = !!opts.shake;
    this.setSpeaker(opts.speaker);
    this.root.setVisible(true);
    this.body.setText('');
    return new Promise((res) => { this.resolve = res; });
  }

  /** Pregunta con opciones; devuelve el índice elegido (o `cancel` si se pulsa atrás). */
  ask(question: string, options: string[], opts: SayOpts & { cancel?: number } = {}): Promise<number> {
    this.pages = paginate([question]).slice(0, 1);
    this.page = 0;
    this.shown = 9999;
    this.shake = false;
    this.setSpeaker(opts.speaker);
    this.root.setVisible(true);
    this.body.setText(this.pages[0].join('\n'));
    this.arrow.setVisible(false);
    this.options = options;
    this.cancelIndex = opts.cancel ?? -1;
    this.optionIndex = 0;
    this.choice.removeAll(true);
    const w = Math.max(...options.map((o) => o.length)) * 6 + 24;
    const h = options.length * 12 + 10;
    const x = GAME_WIDTH - w - 6, y = BOX_Y - h - 4;
    const g = this.scene.add.graphics();
    g.fillStyle(0x283048, 1).fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 4);
    g.fillStyle(0xf8f8f0, 1).fillRoundedRect(x, y, w, h, 3);
    this.choice.add(g);
    this.optionTexts = options.map((o, i) => {
      const t = this.scene.add.bitmapText(x + 16, y + 6 + i * 12, 'font_plain', o.toUpperCase()).setTint(0x303038);
      this.choice.add(t);
      return t;
    });
    this.optionCursor = this.scene.add.triangle(x + 6, y + 7, 0, 0, 0, 7, 4, 3.5, 0xd83030).setOrigin(0);
    this.choice.add(this.optionCursor);
    this.choice.setVisible(true);
    this.choice.each((c: Phaser.GameObjects.GameObject) => (c as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor?.(0));
    return new Promise((res) => { this.resolveChoice = res; });
  }

  hide(): void {
    this.root.setVisible(false);
  }

  private setSpeaker(name?: string): void {
    this.nameTag.setVisible(!!name);
    if (!name) return;
    this.nameText.setText(name.toUpperCase());
    const g = this.nameTag.list[0] as Phaser.GameObjects.Graphics;
    g.clear();
    g.fillStyle(0x283048, 1).fillRoundedRect(8, BOX_Y - 13, this.nameText.width + 12, 14, 3);
  }

  update(input: MenuInput): void {
    this.frame++;
    if (this.resolveChoice) {
      const n = this.options.length;
      if (input.pressed(MENU_KEYS.up)) { this.optionIndex = (this.optionIndex + n - 1) % n; sfx.play('select'); }
      if (input.pressed(MENU_KEYS.down)) { this.optionIndex = (this.optionIndex + 1) % n; sfx.play('select'); }
      this.optionCursor.setY(this.optionTexts[this.optionIndex].y + 1);
      const back = this.cancelIndex >= 0 && input.pressed(MENU_KEYS.back);
      if (input.pressed(MENU_KEYS.confirm) || back) {
        sfx.play('confirm');
        const r = this.resolveChoice;
        this.resolveChoice = null;
        this.choice.setVisible(false);
        this.root.setVisible(false);
        r(back ? this.cancelIndex : this.optionIndex);
      }
      return;
    }
    if (!this.resolve) return;
    const lines = this.pages[this.page];
    const total = lines.join('\n').length;
    const fast = input.pressed(MENU_KEYS.confirm);
    if (this.shown < total) {
      this.shown = fast ? total : this.shown + 1;
      this.body.setText(lines.join('\n').slice(0, this.shown));
    } else if (fast) {
      sfx.play('select');
      if (this.page + 1 < this.pages.length) {
        this.page++;
        this.shown = 0;
        this.body.setText('');
      } else {
        const r = this.resolve;
        this.resolve = null;
        this.root.setVisible(false);
        this.root.setPosition(0, 0);
        r();
        return;
      }
    }
    this.arrow.setVisible(this.shown >= total && Math.floor(this.frame / 20) % 2 === 0);
    this.root.setPosition(this.shake ? Math.round(Math.sin(this.frame * 1.7) * 1.5) : 0, this.shake && this.frame % 6 < 3 ? 1 : 0);
  }
}
