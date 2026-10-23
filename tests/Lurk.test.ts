import { describe, expect, it } from 'vitest';
import { LURK_GAP, MYTH_LURKS, STAGE_LURKS, aimLurk, buildLurk, lurkAt, lurkFeetY, lurkOptions, lurkScale, lurkSounds, wantsLurk } from '../src/combat/Lurk';
import { STAGE_IDS } from '../src/art/StageArtist';
import { GROUND_Y } from '../src/config/game-config';

const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };
const calm = { id: 'patasola' as const, framesSince: LURK_GAP, usedRound: 0, calm: true, dist: 150, hp: 50 };

describe('el mito se mete al fondo del escenario', () => {
  it('solo los mitos, con calma, distancia y de vez en cuando', () => {
    expect(wantsLurk(calm, 0)).toBe(true);
    expect(wantsLurk({ ...calm, id: 'juanmachete' }, 0)).toBe(false);
    expect(wantsLurk({ ...calm, calm: false }, 0)).toBe(false);
    expect(wantsLurk({ ...calm, dist: 40 }, 0)).toBe(false);
    expect(wantsLurk({ ...calm, framesSince: 10 }, 0)).toBe(false);
    expect(wantsLurk({ ...calm, usedRound: 2 }, 0)).toBe(false);
    expect(wantsLurk(calm, 0.5)).toBe(false);
  });

  it('cada escenario tiene escenas propias y algunos mitos la suya', () => {
    for (const st of STAGE_IDS) expect(STAGE_LURKS[st].length).toBeGreaterThan(0);
    expect(lurkOptions('pueblo', 'sombreron')).toContain('galope');
    expect(lurkOptions('selva', 'patasola')).toContain('acostada');
    expect(lurkOptions('cantina', 'muelona')).not.toContain('galope');
    expect(MYTH_LURKS.juanmachete).toBeUndefined();
  });

  it('arranca donde peleaba, se va al fondo y vuelve de una embestida junto a Juan', () => {
    for (const st of STAGE_IDS) for (let i = 0; i < 6; i++) {
      const s = buildLurk(st, 'llorona', 0.7, seq(i / 6, 0.3, 0.8));
      expect(lurkAt(s, 0).d).toBe(0);
      expect(lurkAt(s, 0).sx).toBeCloseTo(0.7);
      expect(lurkAt(s, 90).d).toBeCloseTo(1);
      aimLurk(s, 0.3);
      const end = lurkAt(s, s.total);
      expect(end.d).toBe(0);
      expect(end.sink).toBe(0);
      expect(end.alpha).toBe(1);
      expect(Math.abs(end.sx - 0.3)).toBeGreaterThan(0.25);
      expect(end.face).toBe(end.sx < 0.3 ? 1 : -1);
      for (let f = 0; f <= s.total; f++) {
        const k = lurkAt(s, f);
        expect(k.d, `${s.name} ${f}`).toBeGreaterThanOrEqual(0);
        expect(k.d).toBeLessThanOrEqual(1);
        expect(k.sink).toBeGreaterThanOrEqual(0);
        expect(k.sink).toBeLessThanOrEqual(1);
      }
      expect(s.aimAt).toBeLessThan(s.total);
    }
  });

  it('la Patasola a veces se acuesta y el Sombrerón pasa a caballo', () => {
    const pata = buildLurk('selva', 'patasola', 0.6, seq(0.99));
    expect(pata.name).toBe('acostada');
    expect(pata.keys.some((k) => k.pose === 'lying')).toBe(true);
    const somb = buildLurk('pueblo', 'sombreron', 0.6, seq(0.99));
    expect(somb.name).toBe('galope');
    expect(lurkSounds(somb, 0, somb.total)).toContain('galope');
  });

  it('los saltos tocan sonido una sola vez cada uno', () => {
    const s = buildLurk('llanos', 'silbon', 0.5, seq(0));
    let n = 0;
    for (let f = 0; f < s.total; f++) n += lurkSounds(s, f, f + 1).length;
    expect(n).toBe(lurkSounds(s, 0, s.total).length);
  });

  it('al aparecer en otro sitio se aclara poco a poco, sin saltar a la vista', () => {
    const s = buildLurk('llanos', 'silbon', 0.5, seq(0));
    const k = s.keys.find((x) => x.moved)!;
    expect(lurkAt(s, k.t).alpha).toBeLessThan(0.2);
    expect(lurkAt(s, k.t + 5).alpha).toBeGreaterThan(0.3);
    expect(lurkAt(s, k.t + 12).alpha).toBeGreaterThan(0.85);
  });

  it('lo que hace al fondo no queda tapado detrás de Juan', () => {
    for (const st of STAGE_IDS) {
      const s = buildLurk(st, 'muelona', 0.9, seq(0, 0.5), 0.3);
      for (const k of s.keys.slice(1, -2)) if (k.sx > 0 && k.sx < 1) expect(Math.abs(k.sx - 0.3), `${s.name}`).toBeGreaterThanOrEqual(0.2 - 1e-9);
    }
  });

  it('lejos se ve chiquito y más arriba', () => {
    expect(lurkScale(0)).toBe(1);
    expect(lurkScale(1)).toBeLessThan(0.5);
    expect(lurkFeetY(0, GROUND_Y)).toBe(GROUND_Y);
    expect(lurkFeetY(1, GROUND_Y)).toBeLessThan(GROUND_Y - 40);
  });
});
