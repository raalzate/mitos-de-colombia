import Phaser from 'phaser';
import { packSheet } from './PixelPainter';
import { LIFE_LAYERS, LIFE_MAX_ACTORS, LifeSim, buildLifeSheets, lifeKey, lifeSpecs, type ScareLevel } from './StageLife';
import type { StageId } from './StageArtist';
import { addSheet } from '../utils/textures';

/** Genera (una sola vez por escenario) las tiras de la vida del fondo. */
export function ensureLifeTextures(scene: Phaser.Scene, id: StageId): void {
  const first = lifeSpecs(id)[0];
  if (!first || scene.textures.exists(lifeKey(id, first.kind, first.layer))) return;
  for (const sheet of buildLifeSheets(id)) {
    const { sheet: pm, frameWidth, frameHeight } = packSheet(sheet.frames);
    addSheet(scene, sheet.key, pm, frameWidth, frameHeight, sheet.frames.length);
  }
}

/**
 * Vida del fondo del escenario en la pelea: un pool fijo de imágenes que siguen a `LifeSim`.
 * Va detrás de los peleadores (en las capas de cielo, lejanía, agua y capa media), con el mismo parallax.
 */
export class StageLifeView {
  private readonly sim: LifeSim;
  private readonly pool: Phaser.GameObjects.Image[] = [];

  constructor(private readonly scene: Phaser.Scene, id: StageId) {
    ensureLifeTextures(scene, id);
    this.sim = new LifeSim(id);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** `dtMs` = 0 congela todo (pausa). */
  update(camScrollX: number, dtMs: number): void {
    this.sim.update(dtMs / 1000, camScrollX);
    const draws = this.sim.draws();
    for (let i = 0; i < draws.length && i < LIFE_MAX_ACTORS; i++) {
      const d = draws[i];
      let img = this.pool[i];
      if (!img) {
        img = this.scene.add.image(0, 0, d.key, d.frame).setOrigin(0.5, 1);
        this.pool[i] = img;
      }
      const L = LIFE_LAYERS[d.layer];
      if (img.texture.key !== d.key) img.setTexture(d.key, d.frame);
      else if (img.frame.name !== String(d.frame)) img.setFrame(d.frame);
      img.setPosition(d.x, d.y).setScrollFactor(L.sf, 0).setDepth(L.depth).setFlipX(d.flip).setAlpha(d.alpha).setVisible(true);
    }
    for (let i = draws.length; i < this.pool.length; i++) this.pool[i].setVisible(false);
  }

  scare(level: ScareLevel): void {
    this.sim.scare(level);
  }

  destroy(): void {
    for (const img of this.pool) img.destroy();
    this.pool.length = 0;
  }
}
