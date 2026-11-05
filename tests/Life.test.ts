import { describe, expect, it } from 'vitest';
import { BREATH_AMP, breath, dogMood, dogRoam, faceToward, glance, nextBeat } from '../src/adventure/Life';

const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };

describe('vida propia de la gente y del perro', () => {
  it('la respiración apenas estira el fotograma (~1 px)', () => {
    for (let f = 0; f < 400; f += 7) {
      const k = breath(f, 0.5);
      expect(Math.abs(k - 1)).toBeLessThanOrEqual(BREATH_AMP + 1e-9);
    }
  });

  it('voltean a mirar hacia Juan', () => {
    expect(faceToward(5, 5, 7, 5)).toBe('right');
    expect(faceToward(5, 5, 4, 5)).toBe('left');
    expect(faceToward(5, 5, 5, 3)).toBe('up');
    expect(faceToward(5, 5, 6, 8)).toBe('down');
    expect(faceToward(5, 5, 5, 5)).toBeNull();
  });

  it('miran a un lado, no para atrás', () => {
    expect(['left', 'right']).toContain(glance('down', Math.random));
    expect(['up', 'down']).toContain(glance('left', Math.random));
  });

  it('cada quien a su ritmo', () => {
    expect(nextBeat(seq(0), 100, 50)).toBe(100);
    expect(nextBeat(seq(0.99), 100, 50)).toBe(149);
    expect(dogMood(seq(0.1))).toBe('olfatear');
    expect(dogMood(seq(0.5))).toBe('corretear');
    expect(dogMood(seq(0.9))).toBe('mirar');
  });

  it('el perro corretea de a una casilla, cerca de Juan y por donde se puede', () => {
    const hero: [number, number] = [10, 10];
    for (let i = 0; i < 50; i++) {
      const to = dogRoam(hero, [10, 11], Math.random, (x) => x !== 11)!;
      expect(to).not.toBeNull();
      expect(Math.abs(to[0] - 10) + Math.abs(to[1] - 11)).toBe(1);
      expect(Math.abs(to[0] - hero[0]) + Math.abs(to[1] - hero[1])).toBeLessThanOrEqual(2);
      expect(to).not.toEqual(hero);
      expect(to[0]).not.toBe(11);
    }
    expect(dogRoam(hero, [10, 11], Math.random, () => false)).toBeNull();
  });
});
