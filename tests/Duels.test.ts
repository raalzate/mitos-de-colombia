import { describe, expect, it } from 'vitest';
import { pickDuel } from '../src/combat/Duels';
import { FIGHTER_IDS } from '../src/data/fighters';

describe('charla de reto antes de pelear', () => {
  it('hay conversación para cualquier pareja, con frases que caben en el globo', () => {
    for (const a of FIGHTER_IDS) for (const b of FIGHTER_IDS) for (const roll of [0, 0.7]) {
      const d = pickDuel(a, b, roll);
      expect(d.length).toBeGreaterThanOrEqual(2);
      for (const l of d) expect(l.text.length, l.text).toBeLessThanOrEqual(44);
      // se turnan: nadie habla dos veces seguidas
      for (let i = 1; i < d.length; i++) expect(d[i].who).not.toBe(d[i - 1].who);
    }
  });

  it('Juan tiene diálogos propios con cada mito, también si juega como segundo', () => {
    for (const id of FIGHTER_IDS.filter((x) => x !== 'juanmachete')) {
      expect(pickDuel('juanmachete', id, 0)).toHaveLength(3);
      const rev = pickDuel(id, 'juanmachete', 0);
      expect(rev).toHaveLength(3);
      const asP1 = pickDuel('juanmachete', id, 0);
      expect(rev.map((l) => l.text)).toEqual(asP1.map((l) => l.text));
      expect(rev[0].who).not.toBe(asP1[0].who);
    }
  });

  it('es al azar: con otro número sale otra conversación', () => {
    expect(pickDuel('juanmachete', 'silbon', 0)[0].text).not.toBe(pickDuel('juanmachete', 'silbon', 0.9)[0].text);
  });
});
