import {
  BLOCK_DAMAGE_FACTOR,
  MAX_HP,
  MAX_METER,
  MIN_CHIP_DAMAGE,
  ROUNDS_TO_WIN,
  ULTIMATE_COST,
} from '../config/game-config';
import type { AttackDef, HitResult, PlayerSlot, RoundWinner } from './CombatTypes';

/** Reglas puras del combate: sin Phaser, sin estado global. Fáciles de probar. */

export function computeDamage(baseDamage: number, blocked: boolean): number {
  if (baseDamage <= 0) return 0;
  if (!blocked) return Math.round(baseDamage);
  return Math.max(MIN_CHIP_DAMAGE, Math.round(baseDamage * BLOCK_DAMAGE_FACTOR));
}

export function resolveHit(attack: AttackDef, defenderBlocking: boolean): HitResult {
  const blocked = defenderBlocking && attack.blockable;
  if (blocked) {
    return {
      blocked: true,
      damage: computeDamage(attack.damage, true),
      hitstun: attack.blockstun,
      knockback: attack.knockback * 0.6,
      launch: 0,
      knockdown: false,
    };
  }
  return {
    blocked: false,
    damage: computeDamage(attack.damage, false),
    hitstun: attack.hitstun,
    knockback: attack.knockback,
    launch: attack.launch,
    knockdown: attack.knockdown,
  };
}

export function applyDamage(hp: number, damage: number): number {
  return Math.max(0, Math.min(MAX_HP, hp - damage));
}

export function addMeter(meter: number, amount: number): number {
  return Math.max(0, Math.min(MAX_METER, meter + amount));
}

export interface SpecialAvailability {
  meter: number;
  cooldownRemaining: number;
  meterCost: number;
}

export function canUseSpecial(a: SpecialAvailability): boolean {
  return a.cooldownRemaining <= 0 && a.meter >= a.meterCost;
}

export function canUseUltimate(meter: number): boolean {
  return meter >= ULTIMATE_COST;
}

/**
 * Determina si la ronda terminó y quién la ganó.
 * Devuelve null si la ronda sigue.
 */
export function resolveRoundEnd(hp1: number, hp2: number, timeLeft: number): RoundWinner | null {
  const dead1 = hp1 <= 0;
  const dead2 = hp2 <= 0;
  if (dead1 && dead2) return 'draw';
  if (dead1) return 2;
  if (dead2) return 1;
  if (timeLeft <= 0) {
    if (hp1 === hp2) return 'draw';
    return hp1 > hp2 ? 1 : 2;
  }
  return null;
}

export interface Score {
  p1: number;
  p2: number;
  roundsPlayed: number;
}

export function emptyScore(): Score {
  return { p1: 0, p2: 0, roundsPlayed: 0 };
}

export function applyRoundResult(score: Score, winner: RoundWinner): Score {
  return {
    p1: score.p1 + (winner === 1 ? 1 : 0),
    p2: score.p2 + (winner === 2 ? 1 : 0),
    roundsPlayed: score.roundsPlayed + 1,
  };
}

/** Ganador de la partida si alguien alcanzó las rondas necesarias; null si continúa. */
export function matchWinner(score: Score, roundsToWin: number = ROUNDS_TO_WIN): PlayerSlot | null {
  if (score.p1 >= roundsToWin) return 1;
  if (score.p2 >= roundsToWin) return 2;
  return null;
}

/** Tras alcanzar el máximo de rondas sin ganador, decide por marcador y luego por vida. */
export function forcedWinner(score: Score, hp1: number, hp2: number): PlayerSlot {
  if (score.p1 !== score.p2) return score.p1 > score.p2 ? 1 : 2;
  return hp1 >= hp2 ? 1 : 2;
}

/** Temporizador en frames → segundos mostrados (redondeo hacia arriba, clásico arcade). */
export function framesToDisplaySeconds(frames: number, fps: number): number {
  return Math.max(0, Math.ceil(frames / fps));
}

/** Orientación: 1 si el oponente está a la derecha, -1 si a la izquierda. Mantiene la actual si coinciden. */
export function facingToward(selfX: number, otherX: number, current: 1 | -1): 1 | -1 {
  if (otherX > selfX) return 1;
  if (otherX < selfX) return -1;
  return current;
}
