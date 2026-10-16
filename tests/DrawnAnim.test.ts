import { describe, expect, it } from 'vitest';
import { DRAWN_ANIM } from '../src/art/drawnAnimManifest';
import { drawnAnimFile, drawnAnimKey, drawnFrame } from '../src/art/DrawnAnim';
import { FIGHTER_IDS } from '../src/data/fighters';

const files = import.meta.glob('../public/assets/anim/*.png');
const base = { state: 'idle' as const, anim: 'idle', animFrame: 0, frame: 0, grounded: true };

describe('animación dibujada', () => {
  it('cada personaje tiene las tres tiras con archivo en disco', () => {
    for (const id of FIGHTER_IDS) {
      for (const action of ['walk', 'attack', 'hurt'] as const) {
        const m = DRAWN_ANIM[id][action];
        expect(m.frames).toBeGreaterThanOrEqual(4);
        expect(m.w).toBeGreaterThan(0);
        for (const slot of ['p1', 'p2'] as const) {
          expect(Object.keys(files)).toContain(`../public/assets/${drawnAnimFile(id, slot, action)}`);
        }
        expect(drawnAnimKey(id, 'p1', action)).toBe(`anim_${id}_p1_${action}`);
      }
    }
  });

  it('elige fotogramas dentro de rango para todos los estados', () => {
    const anims = ['walk', 'light', 'heavy', 'lightkick', 'heavykick', 'airlight', 'airkick', 'hit', 'knockdown', 'getup', 'victory'];
    for (const id of FIGHTER_IDS) {
      for (const anim of anims) {
        for (let f = 0; f < 3; f++) {
          const r = drawnFrame(id, { ...base, anim, animFrame: f, frame: f * 13 });
          expect(r).not.toBeNull();
          const n = DRAWN_ANIM[id][r!.action].frames;
          expect(r!.index).toBeGreaterThanOrEqual(0);
          expect(r!.index).toBeLessThan(n);
        }
      }
      expect(drawnFrame(id, { ...base, anim: 'idle' })).toBeNull();
      expect(drawnFrame(id, { ...base, anim: 'special1' })).toBeNull();
    }
  });

  it('puño y patada usan mitades distintas de la tira de golpes y el ciclo de andar recorre todos los fotogramas', () => {
    const punch = drawnFrame('mohan', { ...base, anim: 'light', animFrame: 1 })!;
    const kick = drawnFrame('mohan', { ...base, anim: 'heavykick', animFrame: 1 })!;
    expect(kick.index).toBeGreaterThan(punch.index);
    const seen = new Set<number>();
    for (let f = 0; f < 200; f++) seen.add(drawnFrame('mohan', { ...base, anim: 'walk', frame: f })!.index);
    expect(seen.size).toBe(DRAWN_ANIM.mohan.walk.frames);
    expect(drawnFrame('mohan', { ...base, state: 'victory', anim: 'victory' })!.index).toBe(DRAWN_ANIM.mohan.hurt.frames - 1);
  });
});
