import { describe, expect, it } from 'vitest';
import {
  addMeter, applyDamage, applyRoundResult, canUseSpecial, canUseUltimate, computeDamage, emptyScore, facingToward,
  forcedWinner, framesToDisplaySeconds, matchWinner, resolveHit, resolveRoundEnd,
} from '../src/combat/CombatRules';
import { FIGHTERS } from '../src/data/fighters';
import { BLOCK_DAMAGE_FACTOR, MAX_HP, MAX_METER, ULTIMATE_COST } from '../src/config/game-config';

describe('cálculo de daño', () => {
  it('sin bloqueo aplica el daño completo redondeado', () => {
    expect(computeDamage(10, false)).toBe(10);
    expect(computeDamage(7.6, false)).toBe(8);
  });
  it('con bloqueo reduce el daño a una fracción con mínimo de 1 (chip)', () => {
    expect(computeDamage(10, true)).toBe(Math.round(10 * BLOCK_DAMAGE_FACTOR));
    expect(computeDamage(2, true)).toBe(1);
  });
  it('nunca produce daño negativo', () => {
    expect(computeDamage(0, false)).toBe(0);
    expect(computeDamage(-5, true)).toBe(0);
  });
  it('applyDamage no baja de 0 ni sube de la vida máxima', () => {
    expect(applyDamage(5, 20)).toBe(0);
    expect(applyDamage(MAX_HP, -50)).toBe(MAX_HP);
    expect(applyDamage(50, 12)).toBe(38);
  });
});

describe('resolución de golpes', () => {
  const heavy = FIGHTERS.madremonte.attacks.heavy;
  const ult = FIGHTERS.mohan.attacks.ultimate;
  it('golpe limpio: hitstun, knockback y daño del ataque', () => {
    const r = resolveHit(heavy, false);
    expect(r.blocked).toBe(false);
    expect(r.damage).toBe(heavy.damage);
    expect(r.hitstun).toBe(heavy.hitstun);
    expect(r.knockback).toBe(heavy.knockback);
  });
  it('golpe bloqueado: blockstun, sin derribo y daño reducido', () => {
    const r = resolveHit(heavy, true);
    expect(r.blocked).toBe(true);
    expect(r.damage).toBeLessThan(heavy.damage);
    expect(r.knockdown).toBe(false);
    expect(r.hitstun).toBe(heavy.blockstun);
  });
  it('el definitivo no se puede bloquear', () => {
    const r = resolveHit(ult, true);
    expect(r.blocked).toBe(false);
    expect(r.damage).toBe(ult.damage);
  });
});

describe('energía y habilidades', () => {
  it('la energía se limita entre 0 y el máximo', () => {
    expect(addMeter(95, 20)).toBe(MAX_METER);
    expect(addMeter(5, -20)).toBe(0);
  });
  it('especial requiere enfriamiento a cero y energía suficiente', () => {
    expect(canUseSpecial({ meter: 0, cooldownRemaining: 0, meterCost: 0 })).toBe(true);
    expect(canUseSpecial({ meter: 0, cooldownRemaining: 10, meterCost: 0 })).toBe(false);
    expect(canUseSpecial({ meter: 10, cooldownRemaining: 0, meterCost: 20 })).toBe(false);
  });
  it('definitivo exige la barra completa', () => {
    expect(canUseUltimate(ULTIMATE_COST - 1)).toBe(false);
    expect(canUseUltimate(ULTIMATE_COST)).toBe(true);
  });
});

describe('transición de rondas y victoria', () => {
  it('la ronda sigue si ambos tienen vida y queda tiempo', () => {
    expect(resolveRoundEnd(50, 50, 100)).toBeNull();
  });
  it('KO decide al ganador', () => {
    expect(resolveRoundEnd(0, 30, 100)).toBe(2);
    expect(resolveRoundEnd(30, 0, 100)).toBe(1);
  });
  it('doble KO es empate', () => {
    expect(resolveRoundEnd(0, 0, 100)).toBe('draw');
  });
  it('al agotarse el tiempo gana quien tenga más vida; igual vida es empate', () => {
    expect(resolveRoundEnd(40, 20, 0)).toBe(1);
    expect(resolveRoundEnd(20, 40, 0)).toBe(2);
    expect(resolveRoundEnd(33, 33, 0)).toBe('draw');
  });
  it('se necesitan dos rondas ganadas; el empate no suma', () => {
    let s = emptyScore();
    s = applyRoundResult(s, 1);
    expect(matchWinner(s)).toBeNull();
    s = applyRoundResult(s, 'draw');
    expect(matchWinner(s)).toBeNull();
    expect(s.roundsPlayed).toBe(2);
    s = applyRoundResult(s, 2);
    expect(matchWinner(s)).toBeNull();
    s = applyRoundResult(s, 1);
    expect(matchWinner(s)).toBe(1);
    expect(s).toEqual({ p1: 2, p2: 1, roundsPlayed: 4 });
  });
  it('tercera ronda de desempate: 1-1 y luego gana el que se lleva la tercera', () => {
    let s = applyRoundResult(applyRoundResult(emptyScore(), 1), 2);
    expect(matchWinner(s)).toBeNull();
    s = applyRoundResult(s, 2);
    expect(matchWinner(s)).toBe(2);
  });
  it('ganador forzado por marcador y luego por vida', () => {
    expect(forcedWinner({ p1: 1, p2: 0, roundsPlayed: 5 }, 0, 100)).toBe(1);
    expect(forcedWinner({ p1: 1, p2: 1, roundsPlayed: 5 }, 10, 40)).toBe(2);
  });
  it('el temporizador se muestra redondeando hacia arriba', () => {
    expect(framesToDisplaySeconds(99 * 60, 60)).toBe(99);
    expect(framesToDisplaySeconds(59, 60)).toBe(1);
    expect(framesToDisplaySeconds(0, 60)).toBe(0);
  });
  it('la orientación apunta hacia el rival', () => {
    expect(facingToward(10, 50, -1)).toBe(1);
    expect(facingToward(50, 10, 1)).toBe(-1);
    expect(facingToward(10, 10, -1)).toBe(-1);
  });
});
