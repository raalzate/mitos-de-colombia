import type { Difficulty, FighterId } from '../combat/CombatTypes';
import { GUARDIANS, HERO_START, type Dir } from './World';
import type { StoryId } from './Stories';

/** Partida del modo aventura. Se guarda en el navegador si se puede; si no, dura la sesión. */
export interface AdventureState {
  calmed: FighterId[];
  /** mapa donde está Juan: el campo, Medellín o un interior (int:cantina0…) */
  map: string;
  x: number;
  y: number;
  facing: Dir;
  /** sucesos ya ocurridos (presentación, susto de don Toño…) */
  flags: string[];
  /** veces que cada mito se le ha volado a Juan */
  escapes: Partial<Record<FighterId, number>>;
  /** historias que ya le contaron a Juan */
  stories: StoryId[];
  /** dónde han visto a cada mito (lo que reporta el cabo y lo que ve Juan): se marca en el mapa */
  sightings: Partial<Record<FighterId, [number, number][]>>;
}

/** Combate en curso del modo aventura: lo lee el FightScene para volver al mapa al terminar. */
export interface AdventureFight {
  id: FighterId;
  /** veces que ya se le había volado a Juan: menos ganas tiene de volver a huir */
  escapes?: number;
}

export type FightOutcome = 'win' | 'lose' | 'fled';

const KEY = 'mitos-aventura-v5';

export function newAdventure(): AdventureState {
  return { calmed: [], map: 'campo', x: HERO_START[0], y: HERO_START[1], facing: 'up', flags: [], escapes: {}, stories: [], sightings: {} };
}

export function loadAdventure(): AdventureState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AdventureState;
    s.escapes ??= {};
    s.stories ??= [];
    s.map ??= 'campo';
    s.sightings ??= {};
    // partidas de antes del machete ganado: el que ya calmó mitos ya tenía machete
    if (s.calmed.length && !s.flags.includes('machete')) s.flags.push('machete');
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

/** Sin el machete del abuelo, Juan no se le mide a ningún espanto. */
export const hasMachete = (s: AdventureState) => s.flags.includes('machete');

export const MAX_SIGHTINGS = 3;

/** Anota dónde se vio un mito; se guardan los últimos avistamientos de cada uno. */
export function addSighting(s: AdventureState, id: FighterId, x: number, y: number): void {
  const list = (s.sightings[id] ??= []);
  if (list.some(([a, b]) => a === x && b === y)) return;
  list.push([x, y]);
  if (list.length > MAX_SIGHTINGS) list.shift();
}

/** Las denuncias que el cabo Ramírez ya tenía marcadas: una por cada mito suelto, en el sitio de su leyenda. */
export function reportSightings(s: AdventureState): void {
  for (const g of GUARDIANS) {
    if (s.calmed.includes(g.id)) continue;
    addSighting(s, g.id, Math.round((g.zone.x0 + g.zone.x1) / 2), Math.round((g.zone.y0 + g.zone.y1) / 2));
  }
}
