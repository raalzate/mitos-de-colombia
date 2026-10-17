import type { FighterId } from '../combat/CombatTypes';
import type { StageId } from '../art/StageArtist';

/** Mapa del modo aventura en baldosas de 16 px. Puro: se puede probar sin Phaser. */

export const TILE = 16;
export const MAP_W = 40;
export const MAP_H = 32;

/** . hierba  = camino  " hierba alta  ~ río  B puente  T árbol  H casa  f flores  S letrero */
export type Cell = '.' | '=' | '"' | '~' | 'B' | 'T' | 'H' | 'f' | 'S';

export type Dir = 'up' | 'down' | 'left' | 'right';
export const STEP: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export const HOUSE_W = 5;
export const HOUSE_H = 4;
export const HOUSES: [number, number][] = [[4, 8], [12, 8]];

export interface Sign { x: number; y: number; lines: string[] }
export const SIGNS: Sign[] = [
  { x: 9, y: 15, lines: ['VEREDA SAN AGUSTÍN.', 'NORTE: EL LLANO.  ESTE: EL MONTE.  SUR: EL RÍO.'] },
  { x: 23, y: 13, lines: ['¡NO ENTRE AL MONTE DE NOCHE!', 'ALGUIEN SALTA EN UNA SOLA PATA POR AHÍ...'] },
];

function rect(g: Cell[][], x0: number, y0: number, x1: number, y1: number, c: Cell): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c;
}

export function buildMap(): Cell[][] {
  const g: Cell[][] = Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => '.' as Cell));
  // bordes de monte
  rect(g, 0, 0, MAP_W - 1, 0, 'T'); rect(g, 0, MAP_H - 1, MAP_W - 1, MAP_H - 1, 'T');
  rect(g, 0, 0, 0, MAP_H - 1, 'T'); rect(g, MAP_W - 1, 0, MAP_W - 1, MAP_H - 1, 'T');
  // el llano (norte)
  rect(g, 4, 1, 13, 3, '"'); rect(g, 19, 1, 34, 3, '"');
  rect(g, 1, 5, 8, 5, 'T'); rect(g, 13, 5, 22, 5, 'T');
  // el monte (este) con su claro
  rect(g, 24, 5, 38, 21, 'T');
  rect(g, 27, 9, 34, 18, '"');
  rect(g, 25, 13, 26, 15, '.');
  // caminos
  rect(g, 2, 14, 34, 14, '='); rect(g, 10, 4, 10, 23, '=');
  // el río y su puente
  rect(g, 15, 18, 21, 21, '"');
  rect(g, 1, 24, 38, 26, '~'); rect(g, 10, 24, 10, 26, 'B');
  // orilla sur
  rect(g, 10, 27, 10, 28, '='); rect(g, 15, 27, 32, 29, '"');
  // casas de la vereda (las ocupa la imagen de la casa)
  for (const [hx, hy] of HOUSES) rect(g, hx, hy, hx + HOUSE_W - 1, hy + HOUSE_H - 1, 'H');
  for (const [x, y] of [[3, 13], [9, 12], [17, 12], [3, 16], [17, 16], [11, 7], [6, 7]] as const) g[y][x] = 'f';
  for (const s of SIGNS) g[s.y][s.x] = 'S';
  return g;
}

export const BLOCKING = new Set<Cell>(['~', 'T', 'H', 'S']);

export function walkable(g: Cell[][], x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && !BLOCKING.has(g[y][x]);
}

/** Zona del mapa: decide qué mitos salvajes salen en la hierba alta y de qué nivel. */
export type Zone = 'llano' | 'rio' | 'monte' | 'sur';
/** Escenario del combate según la zona del mapa */
export const ZONE_STAGE: Record<Zone, StageId> = { llano: 'llanos', rio: 'ribera', monte: 'pantano', sur: 'laguna' };

export function zoneAt(x: number, y: number): Zone {
  if (y >= 27) return 'sur';
  if (x >= 24) return 'monte';
  if (y <= 5) return 'llano';
  return 'rio';
}

/** Mitos que saltan de la hierba alta en cada zona */
export const WILD: Record<Zone, FighterId[]> = {
  llano: ['muelona', 'madremonte'],
  rio: ['hombrecaiman', 'bachue', 'muelona'],
  monte: ['madremonte', 'muelona'],
  sur: ['hombrecaiman', 'bachue', 'muelona'],
};

export const ENCOUNTER_RATE = 0.06;

export interface Guardian {
  id: FighterId;
  x: number;
  y: number;
  /** lo que grita el héroe al verlo */
  fright: string;
  /** lo que dice el mito antes de pelear */
  taunt: string;
  /** al vencerlo */
  defeat: string;
}

/** Los espantos que hay que calmar. Se ven en el mapa y atacan si uno se les acerca. */
export const GUARDIANS: Guardian[] = [
  { id: 'silbon', x: 16, y: 2, fright: '¡AVE MARÍA, PUES! ¿Y ESE SILBIDO?... DO, RE, MI, FA, SOL, LA, SI... ¡QUÉ MIEDO TAN BERRACO!', taunt: 'FIIIIIIU... CUANDO LO OYES CERCA, ESTOY LEJOS... Y CUANDO LO OYES LEJOS...', defeat: 'EL SILBÓN RECOGE SU SACO DE HUESOS Y SE ALEJA SILBANDO BAJITO.' },
  { id: 'llorona', x: 20, y: 23, fright: '¡ESE LLANTO! ¡UY, NO, PARCE, SE ME PARARON HASTA LOS PELOS DEL BIGOTE!', taunt: '¡AAAAY, MIS HIJOS! ¿TÚ HAS VISTO A MIS HIJOS?', defeat: 'LA LLORONA DEJA DE LLORAR. POR PRIMERA VEZ EN SIGLOS, SONRÍE.' },
  { id: 'patasola', x: 31, y: 12, fright: '¡TUM... TUM... TUM! ¡ALGO SALTA EN UNA SOLA PATA! ¡VIRGEN SANTÍSIMA!', taunt: '¡NADIE SALE DEL MONTE CUANDO YO LO DIGO!', defeat: 'LA PATASOLA SE PIERDE ENTRE LOS ÁRBOLES, MÁS TRANQUILA.' },
  { id: 'sombreron', x: 35, y: 2, fright: 'ESE SOMBRERO TAN GRANDE... ¡NO ME MIRE ASÍ, SEÑOR, QUE ME TIEMBLAN LAS CORVAS!', taunt: 'SI TE ALCANZA MI SOMBRERO, YA ERES MÍO.', defeat: 'EL SOMBRERÓN SE QUITA EL SOMBRERO Y TE HACE UNA REVERENCIA.' },
  { id: 'mohan', x: 6, y: 28, fright: '¡EL RÍO SE ESTÁ MOVIENDO SOLO! ¡AHÍ HAY ALGUIEN, PUES!', taunt: 'JE, JE, JE... ¿UN PAISA POR ACÁ? ¿VIENES A ROBARME EL ORO DEL RÍO?', defeat: 'EL MOHÁN SE HUNDE EN EL AGUA RIENDO. EL RÍO VUELVE A ESTAR EN CALMA.' },
];

/** El protagonista: Juan Machete, campesino paisa de carne y hueso. Siempre pelea él. */
export const HERO_FIGHTER: FighterId = 'juanmachete';

export interface Npc {
  key: 'abuela' | 'pescador';
  name: string;
  x: number;
  y: number;
  facing: Dir;
}

export const NPCS: Npc[] = [
  { key: 'abuela', name: 'ABUELA ROSA', x: 7, y: 13, facing: 'down' },
  { key: 'pescador', name: 'DON TOÑO', x: 13, y: 22, facing: 'left' },
];

/** Donde se refugia don Toño tras el susto */
export const PESCADOR_REFUGIO: [number, number] = [14, 15];
/** Fila donde don Toño oye a la Llorona */
export const LLORONA_EVENT_Y = 19;

export const HERO_START: [number, number] = [8, 15];

/** Nombre del lugar que se anuncia al entrar */
export function areaName(x: number, y: number): string {
  if (y >= 27) return 'ORILLA SUR DEL RÍO';
  if (x >= 24) return 'EL MONTE';
  if (y <= 4) return 'EL LLANO';
  if (y >= 18) return 'RIBERA DEL RÍO';
  return 'VEREDA SAN AGUSTÍN';
}
