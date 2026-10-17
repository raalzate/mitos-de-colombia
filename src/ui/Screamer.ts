import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game-config';
import { sfx } from '../audio/Sfx';

/** Duración del susto en milisegundos. */
export const SCREAMER_MS = 950;

/**
 * Susto a pantalla completa: la cara se abalanza sobre la cámara con un grito distorsionado,
 * temblor y glitch. Como máximo dos destellos (sin parpadeo rápido) por fotosensibilidad.
 * Devuelve una promesa que se resuelve al terminar.
 */
export function playScreamer(scene: Phaser.Scene, faceKey: string): Promise<void> {
  return new Promise((resolve) => {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const layer = scene.add.container(0, 0).setDepth(1000).setScrollFactor(0);
    const black = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1).setOrigin(0);
    const face = scene.add.image(cx, cy + 12, faceKey).setOrigin(0.5);
    const base = (GAME_HEIGHT * 1.15) / Math.max(1, face.height);
    face.setScale(base).setTint(0xff8a80);
    const blood = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x8a0000, 0.28).setOrigin(0);
    const flash = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 1).setOrigin(0);
    const bars: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 7; i++) bars.push(scene.add.rectangle(0, 0, GAME_WIDTH, 2, i % 2 ? 0x000000 : 0xff2020, 0.7).setOrigin(0));
    layer.add([black, face, blood, ...bars, flash]);

    sfx.play('screamer');
    scene.cameras.main.shake(650, 0.025);

    const start = scene.time.now;
    const tick = scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const t = (scene.time.now - start) / SCREAMER_MS;
        // se abalanza: crece rápido al principio y tiembla
        const grow = 1 + 0.5 * (1 - Math.pow(1 - Math.min(1, t * 1.6), 3));
        face.setScale(base * grow).setPosition(cx + Phaser.Math.Between(-5, 5), cy + 12 + Phaser.Math.Between(-4, 4));
        // dos destellos: al aparecer y a mitad
        flash.setAlpha(t < 0.12 ? 1 - t / 0.12 : t > 0.45 && t < 0.55 ? 0.7 * (1 - (t - 0.45) / 0.1) : 0);
        for (const b of bars) {
          b.setVisible(Math.random() < 0.5).setY(Phaser.Math.Between(0, GAME_HEIGHT)).setSize(GAME_WIDTH, Phaser.Math.Between(1, 6));
        }
        if (t >= 1) {
          tick.remove();
          layer.destroy(true);
          resolve();
        }
      },
    });
  });
}
