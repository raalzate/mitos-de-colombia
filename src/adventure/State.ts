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
}

/** Combate en curso del modo aventura: lo lee el FightScene para volver al mapa al terminar. */
export interface AdventureFight {
  kind: 'wild' | 'guardian';
  id: FighterId;
}

export type FightOutcome = 'win' | 'lose';

const KEY = 'mitos-aventura-v3';

export function newAdventure(): AdventureState {
  return { calmed: [], x: HERO_START[0], y: HERO_START[1], facing: 'up', flags: [] };
}

export function loadAdventure(): AdventureState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdventureState) : null;
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
  if (fight.kind === 'guardian' && !s.calmed.includes(fight.id)) s.calmed.push(fight.id);
  return s;
}

/** Los espantos se ponen más bravos a medida que calmas a los demás. */
export function fightDifficulty(s: AdventureState, fight: Pick<AdventureFight, 'kind'>): Difficulty {
  if (fight.kind === 'wild') return 'easy';
  return s.calmed.length >= 3 ? 'hard' : 'normal';
}

export const allCalmed = (s: AdventureState) => GUARDIANS.every((g) => s.calmed.includes(g.id));
