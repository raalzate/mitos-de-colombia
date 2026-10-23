import type { Difficulty, FighterId } from '../combat/CombatTypes';
import { GUARDIANS, HERO_START, type Dir } from './World';

/** Partida del modo aventura. Se guarda en el navegador si se puede; si no, dura la sesión. */
export interface AdventureState {
  calmed: FighterId[];
  x: number;
  y: number;
  facing: Dir;
  /** sucesos ya ocurridos (presentación, susto de don Toño…) */
  flags: string[];
  /** veces que cada mito se le ha volado a Juan */
  escapes: Partial<Record<FighterId, number>>;
}

/** Combate en curso del modo aventura: lo lee el FightScene para volver al mapa al terminar. */
export interface AdventureFight {
  id: FighterId;
  /** veces que ya se le había volado a Juan: menos ganas tiene de volver a huir */
  escapes?: number;
}

export type FightOutcome = 'win' | 'lose' | 'fled';

const KEY = 'mitos-aventura-v4';

export function newAdventure(): AdventureState {
  return { calmed: [], x: HERO_START[0], y: HERO_START[1], facing: 'up', flags: [], escapes: {} };
}

export function loadAdventure(): AdventureState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AdventureState;
    s.escapes ??= {};
    return s;
  } catch {
    return null;
  }
}

export function saveAdventure(s: AdventureState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sin almacenamiento: la partida dura la sesión */
  }
}

export function clearAdventure(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada que borrar */
  }
}

/** Aplica el resultado de un combate. Perder reinicia la partida desde cero. */
export function applyOutcome(s: AdventureState, fight: AdventureFight, outcome: FightOutcome): AdventureState {
  if (outcome === 'lose') return newAdventure();
  if (outcome === 'fled') {
    s.escapes[fight.id] = (s.escapes[fight.id] ?? 0) + 1;
    return s;
  }
  if (!s.calmed.includes(fight.id)) s.calmed.push(fight.id);
  return s;
}

/** Los mitos se ponen más bravos a medida que Juan calma a los demás. */
export function fightDifficulty(s: AdventureState): Difficulty {
  if (s.calmed.length < 3) return 'easy';
  return s.calmed.length < 6 ? 'normal' : 'hard';
}

export const allCalmed = (s: AdventureState) => GUARDIANS.every((g) => s.calmed.includes(g.id));
