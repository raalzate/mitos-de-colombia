import { describe, expect, it } from 'vitest';
import { CHAIN_FRAMES, CHARGE_FRAMES, SIMUL_FRAMES, TwoButtonReader, toInput, type Intent } from '../src/combat/TwoButton';
import { EMPTY_INPUT } from '../src/combat/CombatTypes';

/** Simula una secuencia: cada paso dice qué botones están apretados ese fotograma. Devuelve las intenciones nuevas. */
function play(steps: [boolean, boolean][], meterFull = false): Intent[] {
  const r = new TwoButtonReader();
  const out: Intent[] = [];
  let last: Intent | null = null;
  for (const [a, b] of steps) {
    const i = r.update(a, b, meterFull);
    if (i && i !== last) { out.push(i); r.consume(); }
    last = i;
  }
  return out;
}

const tapA = (gap = 6): [boolean, boolean][] => [[true, false], [true, false], ...Array.from({ length: gap }, () => [false, false] as [boolean, boolean])];
const tapB = (gap = 6): [boolean, boolean][] => [[false, true], [false, true], ...Array.from({ length: gap }, () => [false, false] as [boolean, boolean])];
const idle = (n: number): [boolean, boolean][] => Array.from({ length: n }, () => [false, false]);
const hold = (a: boolean, b: boolean, n: number): [boolean, boolean][] => Array.from({ length: n }, () => [a, b]);

describe('controles de dos botones', () => {
  it('un toque es golpe o patada', () => {
    expect(play(tapA())).toEqual(['light']);
    expect(play(tapB())).toEqual(['lightkick']);
  });

  it('tres seguidos del mismo botón: el tercero sale fuerte', () => {
    expect(play([...tapA(), ...tapA(), ...tapA()])).toEqual(['light', 'light', 'heavy']);
    expect(play([...tapB(), ...tapB(), ...tapB()])).toEqual(['lightkick', 'lightkick', 'heavykick']);
  });

  it('si se demora mucho entre toques, la cuenta vuelve a empezar', () => {
    expect(play([...tapA(), ...idle(CHAIN_FRAMES + 5), ...tapA(), ...idle(CHAIN_FRAMES + 5), ...tapA()])).toEqual(['light', 'light', 'light']);
  });

  it('patrones: A B A da el poder 1 y B A B el poder 2', () => {
    expect(play([...tapA(), ...tapB(), ...tapA()])).toEqual(['light', 'lightkick', 'special1']);
    expect(play([...tapB(), ...tapA(), ...tapB()])).toEqual(['lightkick', 'light', 'special2']);
  });

  it('mantener y soltar carga un poder', () => {
    expect(play([...hold(true, false, CHARGE_FRAMES + 2), ...idle(4)])).toEqual(['light', 'special1']);
    expect(play([...hold(false, true, CHARGE_FRAMES + 2), ...idle(4)])).toEqual(['lightkick', 'special2']);
  });

  it('los dos juntos: golpe fuerte, o el definitivo con la barra llena', () => {
    expect(play([...hold(true, true, 2), ...idle(6)])).toEqual(['heavy']);
    expect(play([...hold(true, true, 2), ...idle(6)], true)).toEqual(['ultimate']);
    // casi juntos (B llega un par de fotogramas después) también cuenta
    expect(play([[true, false], [true, true], ...idle(6)], true)).toEqual(['ultimate']);
    expect(SIMUL_FRAMES).toBeGreaterThanOrEqual(2);
  });

  it('mantener los dos juntos no dispara poderes cargados al soltar', () => {
    expect(play([...hold(true, true, CHARGE_FRAMES + 5), ...idle(4)])).toEqual(['heavy']);
  });

  it('la intención espera un rato a que el luchador pueda atacar y luego se olvida', () => {
    const r = new TwoButtonReader();
    r.update(true, false, false);
    let seen = 0;
    for (let i = 0; i < 40; i++) if (r.update(false, false, false)) seen++;
    expect(seen).toBeGreaterThan(5);
    expect(seen).toBeLessThan(20);
  });

  it('el bloqueo es automático: atrás mientras el rival ataca', () => {
    expect(toInput(EMPTY_INPUT, null, true, true).block).toBe(true);
    expect(toInput(EMPTY_INPUT, null, true, false).block).toBe(false);
    expect(toInput(EMPTY_INPUT, 'special2', false, false).pressed.special2).toBe(true);
    expect(toInput(EMPTY_INPUT, 'special1', false, false).pressed.special).toBe(true);
  });
});
