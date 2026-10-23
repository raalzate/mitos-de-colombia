import type { FighterId } from '../combat/CombatTypes';
import { inRect, walkable, type Cell, type Guardian, type Rect } from './World';

/**
 * Mitos escondidos: no se ven en el mapa. Rondan su zona, dejan señales en el suelo,
 * se oyen de lejos y aparecen de la nada cuando Juan se les acerca. Puro, sin Phaser.
 */

export interface Hidden {
  id: FighterId;
  x: number;
  y: number;
  /** señales recientes que dejó, de la más vieja a la más nueva */
  trail: [number, number][];
  /** pasos de Juan que faltan para que pueda volver a aparecer tras esfumarse */
  rest: number;
  /** veces que ya se le voló a Juan: cada vez es menos probable que vuelva a huir */
  escapes: number;
}

export const TRAIL_LEN = 5;
/** distancia (en baldosas) a la que se oye */
export const HEAR_RADIUS = 9;
/** distancia a la que a veces se deja ver de lejos, un instante */
export const GLIMPSE_MIN = 4;
export const GLIMPSE_MAX = 7;

export type Rnd = () => number;

export const dist = (ax: number, ay: number, bx: number, by: number) => Math.abs(ax - bx) + Math.abs(ay - by);

/** Casillas transitables de una zona, lejos de (fx, fy) si se pide. */
export function zoneCells(map: Cell[][], zone: Rect, far?: { x: number; y: number; d: number }): [number, number][] {
  const out: [number, number][] = [];
  for (let y = zone.y0; y <= zone.y1; y++) for (let x = zone.x0; x <= zone.x1; x++) {
    if (!walkable(map, x, y)) continue;
    if (far && dist(x, y, far.x, far.y) < far.d) continue;
    out.push([x, y]);
  }
  return out;
}

/** Lo pone en un sitio al azar de su zona, a una distancia prudente del héroe. */
export function relocate(map: Cell[][], h: Hidden, g: Guardian, rnd: Rnd, hero: { x: number; y: number }): void {
  let cells = zoneCells(map, g.zone, { ...hero, d: 10 });
  if (!cells.length) cells = zoneCells(map, g.zone);
  const [x, y] = cells[Math.floor(rnd() * cells.length)];
  h.x = x; h.y = y;
  h.trail = [];
}

export function spawnHidden(map: Cell[][], guardians: Guardian[], rnd: Rnd, hero: { x: number; y: number }): Hidden[] {
  return guardians.map((g) => {
    const h: Hidden = { id: g.id, x: 0, y: 0, trail: [], rest: 0, escapes: 0 };
    relocate(map, h, g, rnd, hero);
    return h;
  });
}

/** Un paso de ronda: se mueve una casilla dentro de su zona y a veces deja una señal donde estaba. */
export function wander(map: Cell[][], h: Hidden, g: Guardian, rnd: Rnd, occupied: (x: number, y: number) => boolean): boolean {
  const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const [dx, dy] = dirs[Math.floor(rnd() * 4)];
  const nx = h.x + dx, ny = h.y + dy;
  if (!inRect(g.zone, nx, ny) || !walkable(map, nx, ny) || occupied(nx, ny)) return false;
  if (rnd() < 0.5 && !h.trail.some(([x, y]) => x === h.x && y === h.y)) {
    h.trail.push([h.x, h.y]);
    if (h.trail.length > TRAIL_LEN) h.trail.shift();
  }
  h.x = nx; h.y = ny;
  return true;
}

/**
 * Probabilidad de que salte encima de Juan en este paso. Muy cerca, casi seguro;
 * a unas casillas, a veces; lejos, nunca. Descansa unos pasos tras esfumarse.
 */
export function ambushChance(d: number, rest: number): number {
  if (rest > 0) return 0;
  if (d <= 1) return 0.9;
  if (d <= 2) return 0.45;
  if (d <= 4) return 0.12;
  return 0;
}

/** Al aparecer puede esfumarse en vez de pelear; cuanto más se ha volado, menos ganas tiene. */
export function vanishChance(escapes: number): number {
  return Math.max(0, 0.3 - escapes * 0.12);
}

/** En plena pelea, con poca vida, el mito puede volarse (como un salvaje que huye). */
export function fleeFightChance(escapes: number): number {
  return Math.max(0.1, 0.45 - escapes * 0.15);
}

/** Casilla libre junto a Juan donde aparece el mito: a un lado, para que el mito grande no lo tape. */
export function popSpot(map: Cell[][], hero: { x: number; y: number }, ahead: [number, number], occupied: (x: number, y: number) => boolean): [number, number] | null {
  const side: [number, number] = ahead[0] ? ahead : [1, 0];
  const opts: [number, number][] = [side, [-side[0], 0], [0, -1], ahead, [0, 1]];
  for (const [dx, dy] of opts) {
    const x = hero.x + dx, y = hero.y + dy;
    if (walkable(map, x, y) && !occupied(x, y)) return [x, y];
  }
  return null;
}
