import { describe, expect, it } from 'vitest';
import { boxesOverlap, intersectionCenter, overlapAmountX, toWorldBox } from '../src/combat/HitboxSystem';

describe('hitboxes', () => {
  it('convierte una caja relativa según la orientación', () => {
    const box = { x: 10, y: -40, w: 20, h: 10 };
    expect(toWorldBox(box, 100, 200, 1)).toEqual({ left: 110, top: 160, right: 130, bottom: 170 });
    expect(toWorldBox(box, 100, 200, -1)).toEqual({ left: 70, top: 160, right: 90, bottom: 170 });
  });
  it('detecta solapamiento y bordes que solo se tocan no cuentan', () => {
    const a = { left: 0, top: 0, right: 10, bottom: 10 };
    expect(boxesOverlap(a, { left: 5, top: 5, right: 15, bottom: 15 })).toBe(true);
    expect(boxesOverlap(a, { left: 10, top: 0, right: 20, bottom: 10 })).toBe(false);
    expect(boxesOverlap(a, { left: 0, top: 11, right: 10, bottom: 20 })).toBe(false);
  });
  it('calcula el solapamiento horizontal y el punto de impacto', () => {
    const a = { left: 0, top: 0, right: 10, bottom: 10 };
    const b = { left: 6, top: 2, right: 20, bottom: 8 };
    expect(overlapAmountX(a, b)).toBe(4);
    expect(intersectionCenter(a, b)).toEqual({ x: 8, y: 5 });
  });
});
