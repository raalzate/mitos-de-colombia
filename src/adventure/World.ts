import type { FighterId } from '../combat/CombatTypes';
import type { StageId } from '../art/StageArtist';
import { CITY_BUILDING_FOOTPRINT, CITY_PROP_FOOTPRINT, type CityBuildingKind, type CityPropKind } from './CityArt';
import type { StoryId } from './Stories';
import { BUILDING_FOOTPRINT, PROP_FOOTPRINT, type BuildingKind, type ClueKind, type PropKind, type SpiritKind, type VillagerKind } from './TownArt';

/** Mapa del modo aventura en baldosas de 16 px. Puro: se puede probar sin Phaser. */

export const TILE = 16;
export const MAP_W = 120;
export const MAP_H = 72;

/**
 * . hierba  = camino  " hierba alta  ~ agua  B puente  T árbol  H edificio  P objeto que estorba  f flores  S letrero  c tierra de cementerio
 * ciudad: a asfalto  d andén  z cebra  l ladrillo  o adoquín   interiores: W pared  F piso  M tapete de salida
 */
export type Cell = '.' | '=' | '"' | '~' | 'B' | 'T' | 'H' | 'P' | 'f' | 'S' | 'c' | 'a' | 'd' | 'z' | 'l' | 'o' | 'W' | 'F' | 'M';

export type Dir = 'up' | 'down' | 'left' | 'right';
export const STEP: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export interface Rect { x0: number; y0: number; x1: number; y1: number }
const R = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 });
export const inRect = (r: Rect, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/** Zonas con nombre; la primera que contiene la casilla es la que manda. */
/** alegre = fiesta, música y gente; tensión = monte, río y espantos. El campo es 3/4 tensión. */
export type Mood = 'tension' | 'alegre';
export interface Area { name: string; r: Rect; mood?: Mood; /** ambiente sonoro propio del sitio */ sound?: 'pueblo' }
export const AREAS: Area[] = [
  { name: 'TERMINAL DE JEEPS', r: R(96, 1, 118, 17), mood: 'alegre' },
  { name: 'FIESTAS DE SAN AGUSTÍN', r: R(96, 18, 118, 43), mood: 'alegre' },
  { name: 'CEMENTERIO DE SAN AGUSTÍN', r: R(43, 8, 59, 16) },
  { name: 'PLAZA PRINCIPAL', r: R(32, 25, 48, 32), mood: 'alegre' },
  { name: 'PUEBLO DE SAN AGUSTÍN', r: R(21, 17, 60, 43), sound: 'pueblo' },
  { name: 'VEREDA LA ESPERANZA', r: R(1, 17, 20, 43), sound: 'pueblo' },
  { name: 'EL LLANO', r: R(1, 1, 61, 16) },
  { name: 'EL MONTE', r: R(62, 1, 94, 43) },
  { name: 'EL RÍO GRANDE', r: R(1, 44, 118, 51) },
  { name: 'LA CIÉNAGA', r: R(1, 52, 30, 70) },
  { name: 'LAGUNA DE BACHUÉ', r: R(59, 52, 118, 70) },
  { name: 'POTREROS DEL SUR', r: R(31, 52, 58, 70) },
];

export function areaName(x: number, y: number): string {
  return AREAS.find((a) => inRect(a.r, x, y))?.name ?? 'SAN AGUSTÍN';
}

export function moodAt(x: number, y: number): Mood {
  return AREAS.find((a) => inRect(a.r, x, y))?.mood ?? 'tension';
}

export interface Placed<K> { kind: K; x: number; y: number; id?: string }
export interface Sign { x: number; y: number; lines: string[] }

/** Ruido determinista para repartir árboles y charcos sin que cambien entre partidas. */
function hash(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rect(g: Cell[][], x0: number, y0: number, x1: number, y1: number, c: Cell): void {
  for (let y = Math.max(0, y0); y <= Math.min(MAP_H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(MAP_W - 1, x1); x++) g[y][x] = c;
}

function ellipse(g: Cell[][], cx: number, cy: number, rx: number, ry: number, c: Cell, only?: (c: Cell) => boolean): void {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) continue;
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && (!only || only(g[y][x]))) g[y][x] = c;
  }
}

/** Calles del pueblo: filas donde dan las puertas. */
const STREETS_Y = [24, 33, 42];

/** Edificios en hilera, pegados por abajo a la calle, de izquierda a derecha con una baldosa de aire. */
function row(kinds: BuildingKind[], x0: number, bottom: number): Placed<BuildingKind>[] {
  let x = x0;
  return kinds.map((kind) => {
    const [w, h] = BUILDING_FOOTPRINT[kind];
    const p = { kind, x, y: bottom - h + 1 };
    x += w + 1;
    return p;
  });
}

export const BUILDINGS: Placed<BuildingKind>[] = [
  // pueblo: frente a la calle de arriba
  ...row(['alcaldia', 'casa_azul'], 22, 23),
  { kind: 'iglesia', x: 40 - Math.floor(BUILDING_FOOTPRINT.iglesia[0] / 2), y: 24 - BUILDING_FOOTPRINT.iglesia[1] },
  ...row(['tienda', 'casa_amarilla'], 48, 23),
  // a los lados de la plaza
  ...row(['cantina'], 23, 32),
  ...row(['edificio'], 50, 32),
  // calle de abajo
  ...row(['casa_verde', 'casa_roja', 'casa_blanca'], 22, 41),
  ...row(['cantina', 'edificio'], 42, 41),
  // vereda
  ...row(['casa_blanca'], 3, 23),
  ...row(['finca'], 12, 23),
  ...row(['trapiche'], 3, 41),
  ...row(['casa_verde'], 12, 41),
  // cementerio
  { kind: 'capilla', x: 51 - Math.floor(BUILDING_FOOTPRINT.capilla[0] / 2), y: 12 - BUILDING_FOOTPRINT.capilla[1] + 1 },
  // finca del sur
  ...row(['finca'], 36, 58),
];

// cada edificio tiene un nombre propio (cantina0, casa_blanca1…) que es la llave de su interior
{
  const n: Partial<Record<BuildingKind, number>> = {};
  for (const b of BUILDINGS) { const i = n[b.kind] ?? 0; b.id = `${b.kind}${i}`; n[b.kind] = i + 1; }
}

/** Arte de la ciudad que también se usa en el campo: la terminal de jeeps y la fonda de las fiestas. */
export const CAMPO_CITY_BUILDINGS: Placed<CityBuildingKind>[] = [
  { kind: 'terminal', x: 100, y: 14 - CITY_BUILDING_FOOTPRINT.terminal[1] + 1, id: 'terminal_campo' },
  { kind: 'fonda', x: 109, y: 23 - CITY_BUILDING_FOOTPRINT.fonda[1] + 1, id: 'fonda_campo' },
];

export const CAMPO_CITY_PROPS: Placed<CityPropKind>[] = [
  { kind: 'jeep', x: 113, y: 15 },
  { kind: 'tarima', x: 108, y: 28 },
  { kind: 'castillo_polvora', x: 115, y: 27 },
  { kind: 'puesto_arepas', x: 101, y: 30 },
  { kind: 'puesto_fruta', x: 101, y: 35 },
  ...[25, 31, 37].flatMap((y) => [101, 105, 111, 115].map((x) => ({ kind: 'bombillos' as const, x, y }))),
  ...[100, 116].map((x) => ({ kind: 'poste' as const, x, y: 38 })),
  { kind: 'guayacan', x: 98, y: 20 },
  { kind: 'guayacan', x: 117, y: 41 },
];

export function cityPropCells(p: Placed<CityPropKind>): [number, number][] {
  const [w, h] = CITY_PROP_FOOTPRINT[p.kind];
  const x0 = p.x - Math.floor((w - 1) / 2);
  const out: [number, number][] = [];
  for (let y = p.y - h + 1; y <= p.y; y++) for (let x = x0; x < x0 + w; x++) out.push([x, y]);
  return out;
}

/** La puerta queda abajo al centro de la huella: Juan entra parado en la casilla de abajo mirando arriba. */
export function doorOf(b: Placed<BuildingKind> | Placed<CityBuildingKind>): [number, number] {
  const [w, h] = b.kind in BUILDING_FOOTPRINT ? BUILDING_FOOTPRINT[b.kind as BuildingKind] : CITY_BUILDING_FOOTPRINT[b.kind as CityBuildingKind];
  return [b.x + Math.floor(w / 2), b.y + h];
}

function scatterProps(): Placed<PropKind>[] {
  const p: Placed<PropKind>[] = [];
  const add = (kind: PropKind, x: number, y: number) => p.push({ kind, x, y });
  // plaza: fuente, bancas y faroles
  add('fuente', 39, 28);
  for (const [x, y] of [[35, 27], [44, 27], [35, 31], [44, 31]]) add('banca', x, y);
  for (const [x, y] of [[33, 25], [47, 25], [33, 32], [47, 32], [27, 34], [53, 34], [30, 25], [55, 25], [36, 43], [45, 43]]) add('farol', x, y);
  // a la salida de las cantinas
  for (const [x, y] of [[22, 34], [31, 34], [41, 43], [48, 43]]) add('barril', x, y);
  add('mesa', 29, 35);
  add('chiva', 56, 37);
  // vereda: cafetal, plataneras y la mula del arriero
  for (let y = 28; y <= 34; y += 2) for (let x = 3; x <= 17; x += 2) add('cafeto', x, y);
  for (const [x, y] of [[2, 26], [18, 26], [18, 36], [2, 36]]) add('platanera', x, y);
  add('mula', 14, 25);
  add('farol', 11, 23);
  // cementerio: lápidas y cruces en hileras, con su cerca
  for (let y = 9; y <= 15; y += 2) for (let x = 44; x <= 58; x += 2) {
    if (x >= 49 && x <= 53 && y <= 12) continue;
    if (x === 51) continue;
    add(hash(x, y, 3) < 0.6 ? 'lapida' : 'cruz', x, y);
  }
  for (let x = 43; x <= 59; x++) if (x !== 51) { add('cerca', x, 7); add('cerca', x, 17); }
  for (let y = 8; y <= 16; y++) { add('cerca', 43, y); add('cerca', 59, y); }
  // el llano: palmas de cera y rocas
  for (const [x, y] of [[6, 4], [18, 11], [27, 3], [33, 12], [52, 3], [58, 5], [14, 6], [3, 13]]) add('palma', x, y);
  for (const [x, y] of [[12, 9], [24, 7], [47, 4], [37, 2]]) add('roca', x, y);
  // potreros del sur
  for (const [x, y] of [[33, 54], [52, 66], [45, 68]]) add('roca', x, y);
  add('mula', 48, 61);
  for (const [x, y] of [[40, 64], [42, 64], [44, 64], [40, 66], [42, 66], [44, 66]]) add('cafeto', x, y);
  // monte: troncos caídos
  for (const [x, y] of [[70, 12], [84, 28], [76, 37], [88, 8]]) add('tronco', x, y);
  return p;
}

export const PROPS: Placed<PropKind>[] = scatterProps();

/** Casillas que ocupa un objeto: su huella termina en (x, y) por abajo y está centrada en x. */
export function propCells(p: Placed<PropKind>): [number, number][] {
  const [w, h] = PROP_FOOTPRINT[p.kind];
  const x0 = p.x - Math.floor((w - 1) / 2);
  const out: [number, number][] = [];
  for (let y = p.y - h + 1; y <= p.y; y++) for (let x = x0; x < x0 + w; x++) out.push([x, y]);
  return out;
}

export const SIGNS: Sign[] = [
  { x: 12, y: 25, lines: ['VEREDA LA ESPERANZA.', 'ESTE: EL PUEBLO.  NORTE: EL LLANO.  SUR: EL RÍO Y LA CIÉNAGA.'] },
  { x: 37, y: 25, lines: ['PLAZA PRINCIPAL DE SAN AGUSTÍN.', 'TOQUE DE QUEDA: NADIE EN LA CALLE DESPUÉS DE LAS DOCE. ¡POR SU BIEN!'] },
  { x: 59, y: 34, lines: ['¡NO ENTRE AL MONTE DE NOCHE!', 'SI OYE PASOS DE UNA SOLA PATA, NO MIRE PA\' ATRÁS.'] },
  { x: 41, y: 17, lines: ['CEMENTERIO DE SAN AGUSTÍN.', 'DICEN QUE ALGO PELUDO SALE DE LA TIERRA A AGARRAR TOBILLOS.'] },
  { x: 41, y: 52, lines: ['RÍO GRANDE. PROHIBIDO BAÑARSE DE NOCHE.', 'EL MOHÁN SE LLEVA A LOS QUE SE METEN.'] },
  { x: 77, y: 52, lines: ['LAGUNA SAGRADA.', 'DE AQUÍ SALIÓ BACHUÉ CON UN NIÑO EN BRAZOS, MADRE DE LOS MUISCAS.'] },
  { x: 11, y: 52, lines: ['CIÉNAGA. CUIDADO CON LOS CAIMANES...', '...Y CON LOS QUE NO SON CAIMANES DEL TODO.'] },
  { x: 87, y: 3, lines: ['SUBIDA AL MONTE PURO.', 'MONTAÑA ARRIBA NO HAY CAMINO NI CASAS: SOLO ROBLES, NEBLINA Y LA MADREMONTE.'] },
  { x: 5, y: 7, lines: ['CAMINO DE HERRADURA A SANTA FE DE ANTIOQUIA.', 'TRES DÍAS A PIE... UNO A CABALLO. ¡SIN BESTIA NI LO INTENTE!'] },
];

export function buildMap(): Cell[][] {
  const g: Cell[][] = Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => '.' as Cell));
  // bordes de monte
  rect(g, 0, 0, MAP_W - 1, 0, 'T'); rect(g, 0, MAP_H - 1, MAP_W - 1, MAP_H - 1, 'T');
  rect(g, 0, 0, 0, MAP_H - 1, 'T'); rect(g, MAP_W - 1, 0, MAP_W - 1, MAP_H - 1, 'T');

  // el llano: hierba alta en manchas grandes
  for (let y = 1; y <= 15; y++) for (let x = 1; x <= 60; x++) if (hash(x >> 2, y >> 2, 1) < 0.55 && hash(x, y, 2) < 0.85) g[y][x] = '"';
  rect(g, 1, 16, 61, 16, 'T');
  for (let x = 1; x <= 61; x++) if (hash(x, 16, 9) < 0.35) g[16][x] = '.';

  // el monte: árboles tupidos con claros y trochas
  for (let y = 1; y <= 43; y++) for (let x = 62; x <= 94; x++) {
    const clear = hash(x >> 2, y >> 2, 4) < 0.28;
    g[y][x] = clear ? (hash(x, y, 5) < 0.7 ? '"' : '.') : hash(x, y, 6) < 0.12 ? '"' : 'T';
  }
  ellipse(g, 78, 9, 6, 4, '"'); ellipse(g, 86, 30, 5, 4, '"'); ellipse(g, 70, 24, 4, 3, '"');

  // la vereda y el pueblo: hierba corta
  rect(g, 1, 17, 61, 43, '.');
  // cementerio
  rect(g, 43, 7, 59, 17, 'c');

  // el río grande y sus orillas
  rect(g, 1, 44, 118, 47, '~');
  for (let x = 1; x <= 118; x++) { if (hash(x, 43, 7) < 0.3) g[44][x] = '.'; if (hash(x, 48, 7) < 0.35) g[48][x] = '~'; }
  rect(g, 1, 49, 118, 51, '"');
  for (let x = 1; x <= 118; x++) for (let y = 49; y <= 51; y++) if (hash(x, y, 8) < 0.3) g[y][x] = '.';

  // la ciénaga: charcos, juncos y algún árbol
  for (let y = 52; y <= 70; y++) for (let x = 1; x <= 30; x++) {
    const n = (hash(x >> 2, y >> 2, 10) * 2 + hash(x >> 1, y >> 1, 14) + hash(x, y, 15)) / 4;
    g[y][x] = n < 0.36 ? '~' : n < 0.7 ? '"' : hash(x, y, 11) < 0.25 ? 'T' : '.';
  }
  // potreros del sur
  for (let y = 52; y <= 70; y++) for (let x = 31; x <= 58; x++) g[y][x] = hash(x >> 2, y >> 2, 12) < 0.3 ? '"' : '.';
  // laguna de Bachué
  for (let y = 52; y <= 70; y++) for (let x = 59; x <= 118; x++) g[y][x] = hash(x, y, 13) < 0.22 ? 'T' : '.';
  // el alto: terminal de jeeps y la plaza de las fiestas, separados del monte por una fila de árboles
  rect(g, 95, 1, 95, 43, 'T');
  rect(g, 96, 1, 118, 43, '.');
  for (let y = 1; y <= 43; y++) for (let x = 96; x <= 118; x++) if (hash(x, y, 16) < 0.06) g[y][x] = 'f';
  rect(g, 99, 24, 117, 39, '=');
  rect(g, 99, 15, 117, 16, '=');
  rect(g, 108, 4, 108, 24, '=');
  ellipse(g, 78, 62, 15, 9, '"');
  ellipse(g, 78, 62, 12, 6, '~');
  rect(g, 77, 63, 79, 64, '.'); // islote en el centro

  // caminos
  for (const y of STREETS_Y) rect(g, 21, y, 60, y, '=');
  rect(g, 32, 25, 48, 32, '='); // plaza empedrada
  rect(g, 21, 17, 21, 42, '='); rect(g, 60, 17, 60, 43, '=');
  rect(g, 40, 3, 40, 24, '='); rect(g, 4, 8, 40, 8, '='); // al llano
  rect(g, 2, 24, 21, 24, '='); rect(g, 10, 17, 10, 50, '='); // vereda
  rect(g, 60, 33, 99, 33, '='); rect(g, 75, 4, 75, 33, '='); rect(g, 75, 4, 88, 4, '='); // trochas del monte
  rect(g, 75, 33, 75, 43, '=');
  rect(g, 88, 1, 88, 4, '='); // la trocha sube al monte puro
  rect(g, 40, 42, 40, 58, '='); rect(g, 31, 57, 58, 57, '='); rect(g, 58, 53, 58, 57, '='); rect(g, 58, 53, 66, 53, '=');
  rect(g, 10, 50, 10, 53, '='); rect(g, 75, 48, 75, 54, '=');
  // puentes sobre el río
  rect(g, 108, 39, 108, 43, '=');
  for (const x of [10, 40, 75, 108]) { rect(g, x, 44, x, 48, 'B'); rect(g, x, 43, x, 43, '='); }
  // trocha a la ciénaga
  rect(g, 4, 54, 24, 54, '='); rect(g, 10, 53, 10, 54, '=');
  for (let y = 55; y <= 68; y++) if (g[y][16] === '~') g[y][16] = 'B';
  rect(g, 16, 55, 16, 68, g[55][16] === 'B' ? 'B' : '=');
  for (let y = 55; y <= 68; y++) g[y][16] = g[y][16] === '~' || g[y][16] === 'B' ? 'B' : '=';

  for (const b of [...BUILDINGS, ...CAMPO_CITY_BUILDINGS]) {
    const [w, h] = b.kind in BUILDING_FOOTPRINT ? BUILDING_FOOTPRINT[b.kind as BuildingKind] : CITY_BUILDING_FOOTPRINT[b.kind as CityBuildingKind];
    rect(g, b.x, b.y, b.x + w - 1, b.y + h - 1, 'H');
    const [dx, dy] = doorOf(b);
    if (g[dy]?.[dx] && g[dy][dx] !== '=' && g[dy][dx] !== 'B') g[dy][dx] = '=';
  }
  for (const p of PROPS) for (const [x, y] of propCells(p)) if (g[y]?.[x] && g[y][x] !== 'H') g[y][x] = 'P';
  for (const p of CAMPO_CITY_PROPS) for (const [x, y] of cityPropCells(p)) if (g[y]?.[x] && g[y][x] !== 'H') g[y][x] = 'P';
  for (const [x, y] of [[5, 26], [16, 38], [26, 26], [55, 26], [44, 35], [34, 35], [8, 20], [24, 40]] as const) if (g[y][x] === '.') g[y][x] = 'f';
  for (const s of SIGNS) g[s.y][s.x] = 'S';
  return g;
}

export const BLOCKING = new Set<Cell>(['~', 'T', 'H', 'P', 'S', 'W']);

export function walkable(g: Cell[][], x: number, y: number): boolean {
  return y >= 0 && y < g.length && x >= 0 && x < g[y].length && !BLOCKING.has(g[y][x]);
}

/** Probabilidad de que algo se mueva en la hierba alta y asuste a Juan (sin pelea) */
export const RUSTLE_RATE = 0.03;

export interface Guardian {
  id: FighterId;
  /** dónde ronda: el mito se mueve dentro de este rectángulo y nunca sale de él */
  zone: Rect;
  /** escenario donde ocurre su leyenda */
  stage: StageId;
  /** señal que deja en el suelo por donde pasa */
  clue: ClueKind;
  /** lo que piensa Juan al ver la señal */
  clueText: string;
  /** lo que grita el héroe al verlo */
  fright: string;
  /** lo que dice el mito antes de pelear */
  taunt: string;
  /** al vencerlo */
  defeat: string;
  /** cuando se esfuma antes de pelear o se vuela de la pelea */
  flee: string;
}

/** Todos los mitos de la tierra: andan escondidos, cada uno rondando el lugar de su leyenda. */
export const GUARDIANS: Guardian[] = [
  {
    id: 'sombreron', zone: R(22, 33, 59, 43), stage: 'pueblo', clue: 'sombrero',
    clueText: 'UN SOMBRERO NEGRO ENORME TIRADO EN LA CALLE... ¿DE QUIÉN SERÁ? MEJOR NO LO TOCO.',
    fright: 'ESE SOMBRERO TAN GRANDE EN PLENO PUEBLO... ¡NO ME MIRE ASÍ, SEÑOR, QUE ME TIEMBLAN LAS CORVAS!',
    taunt: 'SI TE ALCANZA MI SOMBRERO, YA ERES MÍO.',
    defeat: 'EL SOMBRERÓN SE QUITA EL SOMBRERO Y TE HACE UNA REVERENCIA.',
    flee: 'EL SOMBRERÓN SE TAPA CON EL SOMBRERO... ¡Y DEBAJO NO QUEDA NADIE!',
  },
  {
    id: 'muelona', zone: R(21, 25, 31, 36), stage: 'cantina', clue: 'diente',
    clueText: '¿UN DIENTE? ¡ESTE DIENTE ES MÁS GRANDE QUE MI DEDO! ALGUIEN CON MUCHA MUELA ANDA POR AQUÍ...',
    fright: '¿Y ESA SEÑORA TAN BONITA?... ¡AVE MARÍA, QUÉ DIENTES! ¡ES LA MUELONA!',
    taunt: 'JI, JI, JI... VEN, PAISITA, QUE TE QUIERO DAR UN BESITO...',
    defeat: 'LA MUELONA SE TAPA LA BOCA AVERGONZADA Y SE VA PARA LA CANTINA.',
    flee: 'LA MUELONA SUELTA UNA CARCAJADA Y SE METE ENTRE LAS SOMBRAS DE LA CANTINA.',
  },
  {
    id: 'silbon', zone: R(2, 1, 60, 15), stage: 'llanos', clue: 'huesos',
    clueText: 'HUESOS... UN MONTÓN DE HUESOS REGADOS EN LA HIERBA. ALGUIEN LOS VIENE CONTANDO.',
    fright: '¡AVE MARÍA, PUES! ¿Y ESE SILBIDO?... DO, RE, MI, FA, SOL, LA, SI... ¡QUÉ MIEDO TAN BERRACO!',
    taunt: 'FIIIIIIU... CUANDO LO OYES CERCA, ESTOY LEJOS... Y CUANDO LO OYES LEJOS...',
    defeat: 'EL SILBÓN RECOGE SU SACO DE HUESOS Y SE ALEJA SILBANDO BAJITO.',
    flee: 'FIIIIIIU... EL SILBIDO SE VA ALEJANDO HASTA QUE YA NO SE OYE.',
  },
  {
    id: 'hombrecaiman', zone: R(2, 52, 29, 69), stage: 'pantano', clue: 'huella_caiman',
    clueText: 'HUELLAS DE CAIMÁN... PERO A RATOS PARECEN DE PIE DE CRISTIANO. ¡QUÉ COSA TAN RARA!',
    fright: '¡ESE CAIMÁN TIENE CARA DE CRISTIANO! ¡VIRGEN DEL CARMEN!',
    taunt: '¡GRRRR! ¡NADIE ME MIRA CUANDO ME BAÑO EN EL RÍO!',
    defeat: 'EL HOMBRE CAIMÁN SE ZAMBULLE EN LA CIÉNAGA Y NO VUELVE A ASOMARSE.',
    flee: '¡SPLASH! EL HOMBRE CAIMÁN SE HUNDE EN EL BARRO Y SOLO QUEDAN BURBUJAS.',
  },
  {
    id: 'llorona', zone: R(20, 48, 60, 51), stage: 'ribera', clue: 'charco_lagrimas',
    clueText: 'UN CHARQUITO... ¿DE LÁGRIMAS? Y SE OYE UN LLANTO QUE VIENE Y VA CON EL RÍO.',
    fright: '¡ESE LLANTO! ¡UY, NO, PARCE, SE ME PARARON HASTA LOS PELOS DEL BIGOTE!',
    taunt: '¡AAAAY, MIS HIJOS! ¿TÚ HAS VISTO A MIS HIJOS?',
    defeat: 'LA LLORONA DEJA DE LLORAR. POR PRIMERA VEZ EN SIGLOS, SONRÍE.',
    flee: 'LA LLORONA SE DESHACE EN NEBLINA... ¡AAAAY! EL LLANTO SIGUE RÍO ABAJO.',
  },
  {
    id: 'patasola', zone: R(63, 1, 94, 20), stage: 'selva', clue: 'huella_pata',
    clueText: 'HUELLAS DE UN SOLO PIE... UNA, OTRA, OTRA... ¡SIN EL OTRO PIE! ¡ALGO VA SALTANDO POR AQUÍ!',
    fright: '¡TUM... TUM... TUM! ¡ALGO SALTA EN UNA SOLA PATA! ¡VIRGEN SANTÍSIMA!',
    taunt: '¡NADIE SALE DEL MONTE CUANDO YO LO DIGO!',
    defeat: 'LA PATASOLA SE PIERDE ENTRE LOS ÁRBOLES, MÁS TRANQUILA.',
    flee: '¡TUM, TUM, TUM! LA PATASOLA SE PIERDE DE UN SALTO ENTRE LOS ÁRBOLES.',
  },
  {
    id: 'madremonte', zone: R(63, 21, 94, 43), stage: 'selva', clue: 'ramas',
    clueText: 'RAMAS PARTIDAS Y MUSGO FRESCO... COMO SI EL MONTE MISMO HUBIERA CAMINADO POR AQUÍ.',
    fright: '¡LOS ÁRBOLES SE MUEVEN SOLOS! ¡ESA SEÑORA ESTÁ HECHA DE MUSGO Y RAÍCES!',
    taunt: '¿QUIÉN ANDA TUMBANDO MI MONTE CON ESE MACHETE?',
    defeat: 'LA MADREMONTE TE PERDONA: SABE QUE EL MACHETE ES PARA TRABAJAR, NO PARA DAÑAR EL MONTE.',
    flee: 'LA MADREMONTE SE VUELVE HOJAS Y EL VIENTO SE LA LLEVA.',
  },
  {
    id: 'mohan', zone: R(61, 48, 118, 51), stage: 'ribera', clue: 'oro',
    clueText: '¡PEPITAS DE ORO EN LA ORILLA! ...UY, NO. EL ABUELO DECÍA QUE ASÍ ENGAÑA EL MOHÁN A LA GENTE.',
    fright: '¡EL RÍO SE ESTÁ MOVIENDO SOLO! ¡AHÍ HAY ALGUIEN, PUES!',
    taunt: 'JE, JE, JE... ¿UN PAISA POR ACÁ? ¿VIENES A ROBARME EL ORO DEL RÍO?',
    defeat: 'EL MOHÁN SE HUNDE EN EL AGUA RIENDO. EL RÍO VUELVE A ESTAR EN CALMA.',
    flee: 'JE, JE, JE... EL MOHÁN SE ZAMBULLE Y EL RÍO SE QUEDA QUIETICO.',
  },
  {
    id: 'bachue', zone: R(60, 53, 118, 70), stage: 'laguna', clue: 'escamas',
    clueText: 'ESCAMAS DORADAS, GRANDES COMO MONEDAS... DE UNA CULEBRA MUY, MUY GRANDE.',
    fright: '¡DE LA LAGUNA SALE UNA SERPIENTE GIGANTE CON CARA DE MUJER! ¡MAMITA LINDA!',
    taunt: 'SOY LA MADRE DE TODOS. DEMUÉSTRAME QUE ERES DIGNO DE ESTA TIERRA.',
    defeat: 'BACHUÉ VUELVE A LA LAGUNA CONVERTIDA EN SERPIENTE Y TE BENDICE.',
    flee: 'BACHUÉ SE DESLIZA EN LA LAGUNA SIN HACER UNA SOLA ONDA.',
  },
];

/** El protagonista: Juan Machete, campesino paisa de carne y hueso. Siempre pelea él. */
export const HERO_FIGHTER: FighterId = 'juanmachete';

export type NpcKey = 'abuela' | 'pescador' | VillagerKind | 'conductor' | 'silletero' | 'acordeonero' | 'bailarina' | 'rapero' | 'perro' | 'caballo';

export interface Npc {
  key: NpcKey;
  name: string;
  x: number;
  y: number;
  facing: Dir;
  /** lo que dice; varias tandas que se turnan */
  lines?: string[][];
  /** casillas que se aleja de su sitio cuando camina; 0 = quieto */
  wander?: number;
  /** historia que cuenta si Juan quiere oírla */
  story?: StoryId;
  /** algo que hace además de hablar: llevar a Juan en el jeep o a caballo, o ponerlo a bailar */
  action?: 'carro' | 'baile' | 'caballo';
  /** solo aparece cuando ya pasó este suceso (por ejemplo, el caballo después de ganárselo) */
  needs?: string;
  /** se va del mapa cuando pasa este suceso (por ejemplo, el perro callejero cuando se une a Juan) */
  gone?: string;
}

export const NPCS: Npc[] = [
  { key: 'abuela', name: 'ABUELA ROSA', x: 6, y: 24, facing: 'down' },
  { key: 'pescador', name: 'DON TOÑO', story: 'mohan', x: 37, y: 50, facing: 'left' },
  { key: 'cantinero', name: 'DON EFRAÍN', story: 'muelona', x: 27, y: 33, facing: 'down', lines: [
    ['BIENVENIDO A LA CANTINA LA ÚLTIMA LÁGRIMA, MIJO. ¿UN AGUARDIENTICO PA\'L SUSTO?'],
    ['AQUÍ VIENE UNA SEÑORA MUY BONITA TODAS LAS NOCHES... PERO NUNCA SONRÍE. DICEN QUE TIENE UNOS DIENTES...'],
  ] },
  { key: 'borracho', name: 'EL MONO', story: 'sombreron', x: 33, y: 34, facing: 'left', wander: 2, lines: [
    ['¡HIP! YO VI UN SOMBRERO GIGANTE CAMINANDO SOLO POR LA CALLE DE ABAJO... ¡HIP! ¡NO ES EL GUARO, LO JURO!'],
    ['¡A MÍ ME PERSIGUIÓ UN POLLO NEGRO CON LOS OJOS ROJOS! ¡ESO FUE EN EL MONTE, NO SE META POR ALLÁ!'],
  ] },
  { key: 'cura', name: 'PADRE ANSELMO', story: 'navidad', x: 41, y: 25, facing: 'down', lines: [
    ['QUE DIOS LO ACOMPAÑE, HIJO. ESOS ESPANTOS NO SE VEN A SIMPLE VISTA: HAY QUE BUSCAR LAS SEÑALES QUE DEJAN.'],
    ['HUESOS EN EL LLANO, LÁGRIMAS EN EL RÍO, HUELLAS DE UNA SOLA PATA EN EL MONTE... DONDE HAY SEÑAL, HAY ESPANTO.'],
  ] },
  { key: 'policia', name: 'CABO RAMÍREZ', story: 'dorado', x: 23, y: 24, facing: 'right', lines: [
    ['ALTO AHÍ, CIUDADANO. ¿USTED NO SABE QUE HAY TOQUE DE QUEDA?... AH, ¿USTED ES EL QUE VA A CAZAR ESPANTOS? SIGA, PUES.'],
    ['ANOCHE UNA SEÑORA DEJÓ UN DIENTE EN LA PUERTA DE LA CANTINA. NO ERA UN DIENTE NORMAL.'],
  ] },
  { key: 'vendedora', name: 'DOÑA GLORIA', story: 'bandeja', x: 46, y: 26, facing: 'down', lines: [
    ['¡ARREPAS, BUÑUELOS, EMPANADAS!... BUENO, A ESTA HORA YA NO HAY NADA, MIJO.'],
    ['UN DUENDECITO ME ESCONDE LAS CANASTAS TODAS LAS NOCHES. ¡ESE BICHO SABE COSAS, PREGÚNTELE A ÉL!'],
  ] },
  { key: 'nina', name: 'MARIQUITA', story: 'llorona', x: 30, y: 37, facing: 'up', wander: 2, lines: [
    ['MI MAMÁ DICE QUE NO ME DEJE TRENZAR EL PELO DEL DUENDE... ¿USTED HA VISTO UN DUENDE?'],
  ] },
  { key: 'nino', name: 'PEPITO', story: 'silbon', x: 52, y: 43, facing: 'left', wander: 3, lines: [
    ['¡YO NO LE TENGO MIEDO A NADA!... BUENO, AL SILBÓN SÍ. DICEN QUE SI LO OYE LEJOS ES QUE ESTÁ CERQUITA.'],
    ['EN EL CEMENTERIO SALE UNA MANO PELUDA DE LA TIERRA. ¡MI PRIMO LA VIO!'],
  ] },
  // el perro flaco de la plaza: se gana con una arepa y desde ahí acompaña a Juan
  { key: 'perro', name: 'PERRO CALLEJERO', x: 36, y: 30, facing: 'down', wander: 2, gone: 'perro' },
  // Lucero, el caballo que don Rubén le regala a Juan, amarrado al principio del camino de herradura
  { key: 'caballo', name: 'LUCERO', x: 8, y: 9, facing: 'right', needs: 'caballo', action: 'caballo' },
  { key: 'arriero', name: 'DON RUBÉN', story: 'arrieros', x: 14, y: 26, facing: 'left', lines: [
    ['ESTA MULA SE NIEGA A PASAR POR EL LLANO DE NOCHE. ALLÁ SE OYE SILBAR Y HAY HUESOS REGADOS.'],
    ['YO ATRAVESÉ EL MONTE UNA VEZ. LA MADREMONTE ME ENREDÓ LA MULA EN LOS BEJUCOS. ¡NUNCA MÁS!'],
  ] },
  { key: 'campesina', name: 'DOÑA ELVIRA', story: 'caiman', x: 6, y: 42, facing: 'up', lines: [
    ['EN LA CIÉNAGA VIVE UN SEÑOR QUE SE VOLVIÓ CAIMÁN POR ESPIAR A LAS MUCHACHAS EN EL RÍO. ¡DEJA HUELLAS RARÍSIMAS!'],
  ] },
  { key: 'cafetero', name: 'DON ALIRIO', story: 'cafe', x: 9, y: 31, facing: 'right', wander: 2, lines: [
    ['ESTE CAFÉ LO RECOGEMOS DE DÍA, PORQUE DE NOCHE EL DUENDE SE ROBA LOS GRANOS.'],
    ['LA LAGUNA DEL SUR ES SAGRADA. ALLÁ BRILLAN ESCAMAS DE ORO EN LA ORILLA. NADIE SE ACERCA.'],
  ] },
  { key: 'arriero', name: 'DON JAIRO', story: 'chiva', x: 55, y: 57, facing: 'down', lines: [
    ['¿VA PA\' LA LAGUNA? ESTA CHIVA YA NO SALE HASTA EL AMANECER. TOCA A PIE.'],
    ['EN LA ORILLA DEL RÍO, PA\'LLÁ ABAJO, BRILLA ORO. NO LO COJA: ES TRAMPA DEL MOHÁN.'],
  ] },
  // las fiestas y la terminal: la gente alegre del pueblo
  { key: 'conductor', name: 'DON EVELIO', x: 111, y: 16, facing: 'down', action: 'carro', story: 'chiva', lines: [
    ['¡PA\' MEDELLÍN, PA\' MEDELLÍN! EL YIPAO SALE YA MISMO, MIJO. ¿SE VA O SE QUEDA?'],
  ] },
  { key: 'acordeonero', name: 'EL MAESTRO ALEJO', x: 106, y: 29, facing: 'down', action: 'baile', story: 'vallenato', lines: [
    ['¡AY HOMBE! ESTA NOCHE NO SE LLORA, ESTA NOCHE SE BAILA. ¡ARRIMESE AL TABLADO!'],
  ] },
  { key: 'bailarina', name: 'LUZ DARY', x: 104, y: 32, facing: 'right', wander: 2, story: 'cumbia', lines: [
    ['¿Y USTED NO BAILA, PUES? ¡CON ESE MACHETE ASUSTA, PERO CON ESOS PIES QUIÉN SABE!'],
  ] },
  { key: 'borracho', name: 'DON CHUCHO', x: 112, y: 36, facing: 'left', wander: 1, story: 'tiple', lines: [
    ['¡SALUD, PARCERO! AQUÍ EN LAS FIESTAS NO HAY ESPANTO QUE SE ATREVA... ¡HIP! LA PÓLVORA LOS ESPANTA.'],
  ] },
  { key: 'vendedora', name: 'DOÑA MARINA', x: 102, y: 32, facing: 'right', story: 'bandeja', lines: [
    ['¡AREPAS DE CHÓCLO CON QUESITO, CALIENTICAS! PRUEBE, MIJO, QUE ESTO ESPANTA EL FRÍO Y EL MIEDO.'],
  ] },
  { key: 'bailarina', name: 'DORIS', x: 109, y: 33, facing: 'left', wander: 2, story: 'navidad', lines: [
    ['¡ESTO SÍ ES VIDA! ¡LA BANDA PAPAYERA ESTÁ TOCANDO DESDE LAS OCHO!'],
  ] },
  { key: 'campesina', name: 'DOÑA ROSALBA', x: 113, y: 30, facing: 'down', wander: 1, story: 'cumbia', lines: [
    ['CUANDO YO ERA JOVEN BAILABA CUMBIA CON VELAS EN LA MANO. ¡TODAVÍA ME SÉ LOS PASOS!'],
  ] },
  { key: 'nina', name: 'VALENTINA', x: 103, y: 36, facing: 'right', wander: 2, lines: [
    ['¡ME COMPRARON UN ALGODÓN DE AZÚCAR Y UNA BOMBA DE COLORES!'],
  ] },
  { key: 'nino', name: 'JUANCHO', x: 110, y: 35, facing: 'up', wander: 3, lines: [
    ['¡VA A EMPEZAR LA PÓLVORA! ¡MI PAPÁ DICE QUE EL CASTILLO TIENE MIL VOLADORES!'],
  ] },
];

/** Donde se refugia don Toño tras el susto */
export const PESCADOR_REFUGIO: [number, number] = [41, 41];
/** Fila donde don Toño oye a la Llorona */
export const LLORONA_EVENT_Y = 49;

export const HERO_START: [number, number] = [8, 25];

/** Personajes secundarios: no pelean, aparecen, asustan, dan pistas y se esfuman. */
export interface Spirit {
  kind: SpiritKind;
  name: string;
  zone: Rect;
  /** pistas que suelta; una al azar cada vez */
  hints: string[];
}

export const SPIRITS: Spirit[] = [
  { kind: 'duende', name: 'EL DUENDE', zone: R(2, 18, 60, 42), hints: [
    'JI, JI, JI... ¿BUSCAS A LA MUELONA? SE ESCONDE DONDE SIRVEN GUARO, A LA IZQUIERDA DE LA PLAZA.',
    'JI, JI... YO VI AL SOMBRERÓN EN LA CALLE DE ABAJO, ESPERANDO A LOS QUE SALEN TARDE.',
    '¡TE ESCONDÍ EL SOMBRERO!... MENTIRAS, JI, JI. EL SILBÓN ANDA EN EL LLANO; SIGUE LOS HUESOS.',
  ] },
  { kind: 'pollo', name: 'EL POLLO MALIGNO', zone: R(63, 1, 94, 43), hints: [
    'PÍO... PÍO... (EL POLLO NEGRO MIRA HACIA EL NORTE DEL MONTE, DONDE SUENAN SALTOS DE UNA SOLA PATA)',
    'PÍO... (EL POLLO TE CLAVA LOS OJOS ROJOS Y PICOTEA UNA RAMA PARTIDA. LA MADREMONTE ANDA CERCA)',
  ] },
  { kind: 'mano', name: 'LA MANO PELUDA', zone: R(44, 8, 58, 16), hints: [
    '(LA MANO PELUDA TE AGARRA EL TOBILLO... Y SEÑALA CON UN DEDO HACIA EL RÍO, DONDE LLORA UNA MUJER)',
    '(LA MANO PELUDA ESCARBA LA TIERRA Y DIBUJA UNA LAGUNA CON UNA CULEBRA. LUEGO SE HUNDE)',
  ] },
];
