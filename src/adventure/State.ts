import type { Difficulty, FighterId } from '../combat/CombatTypes';
import { GUARDIANS, HERO_START, SWAPS, walkable, type Dir, type Guardian, type Haunt } from './World';
import { campoSpot, getMap } from './Maps';
import type { StoryId } from './Stories';
import type { MissionId } from './Missions';

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
  /** misión que Juan escogió seguir en pantalla */
  pinned?: MissionId;
  /** sitio que le tocó a cada mito esta noche (índice en Guardian.haunts) */
  homes: Partial<Record<FighterId, number>>;
  /** minutos de la noche que ya pasaron desde las 6:00 PM */
  minutes: number;
  /** objetos del mapa que Juan ya recogió («monte:22,4»): no vuelven a aparecer */
  taken: string[];
  /** minuto de la noche en que Juan recibió el escapulario que carga */
  escapularioAt?: number;
  /** minuto de la noche de la última pelea (o del comienzo): tras un rato sin pelear, la gente da pistas */
  lastFight?: number;
}

/** La noche entera: de las 6:00 PM a las 12:00 AM. */
export const NIGHT_MINUTES = 360;
/** Un minuto de la noche dura 10 s de juego andando: la noche completa, una hora. */
export const MS_PER_MINUTE = 10_000;
/** Lo que se lleva una pelea y un viaje largo. */
export const FIGHT_MINUTES = 10;
export const TRIP_MINUTES = 30;
/** desde las 11:00 PM el reloj se pone rojo y Juan avisa que queda poco */
export const LAST_HOUR = 300;

/** 0 → «6:00 PM», 360 → «12:00 AM». */
export function clockText(minutes: number): string {
  const m = Math.max(0, Math.min(NIGHT_MINUTES, Math.floor(minutes)));
  const h = 6 + Math.floor(m / 60);
  return `${h === 12 ? 12 : h}:${String(m % 60).padStart(2, '0')} ${h === 12 ? 'AM' : 'PM'}`;
}

export const nightOver = (s: AdventureState) => s.minutes >= NIGHT_MINUTES && !s.flags.includes('fin');

/** Sortea dónde ronda cada mito esta noche: las parejas se intercambian el sitio y los demás escogen uno de los suyos. */
export function rollHomes(rnd: () => number = Math.random): Partial<Record<FighterId, number>> {
  const homes: Partial<Record<FighterId, number>> = {};
  for (const g of GUARDIANS) homes[g.id] = Math.floor(rnd() * g.haunts.length);
  for (const [a, b] of SWAPS) {
    const swap = rnd() < 0.5 ? 1 : 0;
    homes[a] = swap;
    homes[b] = swap;
  }
  return homes;
}

export function homeOf(s: AdventureState, g: Guardian): Haunt {
  return g.haunts[s.homes[g.id] ?? 0] ?? g.haunts[0];
}

/** Combate en curso del modo aventura: lo lee el FightScene para volver al mapa al terminar. */
export interface AdventureFight {
  id: FighterId;
  /** veces que ya se le había volado a Juan: menos ganas tiene de volver a huir */
  escapes?: number;
}

export type FightOutcome = 'win' | 'lose' | 'fled';

const KEY = 'mitos-aventura-v5';

export function newAdventure(rnd: () => number = Math.random): AdventureState {
  return { calmed: [], map: 'campo', x: HERO_START[0], y: HERO_START[1], facing: 'up', flags: [], escapes: {}, stories: [], sightings: {}, homes: rollHomes(rnd), minutes: 0, taken: [] };
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
    s.homes ??= rollHomes();
    s.minutes ??= 0;
    s.taken ??= [];
    if (hasEscapulario(s)) s.escapularioAt ??= s.minutes;
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
  s.minutes += FIGHT_MINUTES;
  s.lastFight = s.minutes;
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

/** Con el escapulario bendito el duende, el pollo maligno y la mano peluda ya no se le arriman. */
export const hasEscapulario = (s: AdventureState) => s.flags.includes('escapulario');

/** El cordón no aguanta: el escapulario le dura a Juan a lo sumo una hora de la noche (10 minutos de juego andando). */
export const ESCAPULARIO_MINUTES = 60;
/** En plena pelea el cordón se puede reventar. */
export const ESCAPULARIO_FIGHT_LOSS = 0.35;

export function giveEscapulario(s: AdventureState): void {
  if (!hasEscapulario(s)) s.flags.push('escapulario');
  s.escapularioAt = s.minutes;
}

/** Ya se le cumplió el tiempo: en cualquier momento se le pierde. */
export const escapularioWornOut = (s: AdventureState) => hasEscapulario(s) && s.minutes - (s.escapularioAt ?? s.minutes) >= ESCAPULARIO_MINUTES;

/** Se le pierde el escapulario: toca volver donde el padre Anselmo por otro. */
export function loseEscapulario(s: AdventureState): void {
  s.flags = s.flags.filter((f) => f !== 'escapulario');
  if (!s.flags.includes('escapulario_perdido')) s.flags.push('escapulario_perdido');
  s.escapularioAt = undefined;
}

/** Después de un combate, ¿se le reventó el cordón? Siempre, si ya se le había cumplido el tiempo. */
export const losesEscapularioInFight = (s: AdventureState, rnd: () => number = Math.random) =>
  hasEscapulario(s) && (escapularioWornOut(s) || rnd() < ESCAPULARIO_FIGHT_LOSS);

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
    const { map, zone } = homeOf(s, g);
    const [cx, cy] = [Math.round((zone.x0 + zone.x1) / 2), Math.round((zone.y0 + zone.y1) / 2)];
    // la marca va en la casilla libre más cercana al centro del sitio, no encima de un árbol
    const grid = getMap(map).grid;
    let best: [number, number] = [cx, cy], bd = Infinity;
    for (let y = zone.y0; y <= zone.y1; y++) for (let x = zone.x0; x <= zone.x1; x++) {
      const d = Math.abs(x - cx) + Math.abs(y - cy);
      if (d < bd && walkable(grid, x, y)) { best = [x, y]; bd = d; }
    }
    const spot = campoSpot(map, best[0], best[1]);
    if (spot) addSighting(s, g.id, spot[0], spot[1]);
  }
}
