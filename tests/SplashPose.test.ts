import { describe, expect, it } from 'vitest';
import { splashPoseIndex } from '../src/art/SplashPose';

describe('índice de pose del arte dibujado', () => {
  it('los estados neutros, de daño y de derribo usan la imagen base', () => {
    for (const anim of ['idle', 'walk', 'jump', 'crouch', 'block', 'crouchblock', 'hit', 'knockdown', 'getup', 'victory', 'desconocida']) {
      for (let f = 0; f < 3; f++) expect(splashPoseIndex(anim, f)).toBeNull();
    }
  });

  it('el puño ligero solo cambia de pose en el fotograma activo', () => {
    for (const anim of ['light', 'airlight']) {
      expect(splashPoseIndex(anim, 0)).toBeNull();
      expect(splashPoseIndex(anim, 1)).toBe(0);
      expect(splashPoseIndex(anim, 2)).toBeNull();
    }
  });

  it('cada ataque fuerte, patada, habilidad y definitivo tiene su fila', () => {
    for (let f = 0; f < 3; f++) {
      expect(splashPoseIndex('heavy', f)).toBe(1);
      expect(splashPoseIndex('lightkick', f)).toBe(2);
      expect(splashPoseIndex('airkick', f)).toBe(2);
      expect(splashPoseIndex('heavykick', f)).toBe(3);
      expect(splashPoseIndex('special1', f)).toBe(0);
      expect(splashPoseIndex('special2', f)).toBe(2);
      expect(splashPoseIndex('ultimate', f)).toBe(3);
    }
  });

  it('siempre devuelve null o un índice 0..3', () => {
    for (const anim of ['light', 'heavy', 'lightkick', 'heavykick', 'special1', 'special2', 'ultimate', 'idle']) {
      const n = splashPoseIndex(anim, 1);
      expect(n === null || (Number.isInteger(n) && n >= 0 && n <= 3)).toBe(true);
    }
  });
});
