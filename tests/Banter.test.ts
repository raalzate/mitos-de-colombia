import { describe, expect, it } from 'vitest';
import { BANTER, BANTER_DISTANCE, BANTER_GAP, pickLine, wantsBanter } from '../src/combat/Banter';
import { FIGHTER_IDS } from '../src/data/fighters';

describe('los luchadores hablan', () => {
  it('cada luchador tiene varias frases cortas que caben en el globo', () => {
    for (const id of FIGHTER_IDS) {
      expect(BANTER[id].length, id).toBeGreaterThanOrEqual(5);
      for (const l of BANTER[id]) expect(l.length, l).toBeLessThanOrEqual(40);
    }
  });

  it('solo hablan de lejos, sin atropellarse', () => {
    expect(wantsBanter(BANTER_DISTANCE + 10, BANTER_GAP, 0)).toBe(true);
    expect(wantsBanter(BANTER_DISTANCE - 10, BANTER_GAP, 0)).toBe(false);
    expect(wantsBanter(BANTER_DISTANCE + 10, BANTER_GAP - 1, 0)).toBe(false);
    expect(wantsBanter(BANTER_DISTANCE + 10, BANTER_GAP, 0.99)).toBe(false);
  });

  it('no repite la misma frase dos veces seguidas', () => {
    const first = pickLine('silbon', 0);
    expect(pickLine('silbon', 0, first)).not.toBe(first);
  });
});
