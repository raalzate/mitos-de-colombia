import {
  AREAS, BUILDINGS, CAMPO_CITY_BUILDINGS, CAMPO_CITY_PROPS, HERO_START, NPCS, PROPS, SIGNS, buildMap, doorOf, inRect,
  type Area, type Cell, type Dir, type Mood, type Npc, type Placed, type Rect, type Sign,
} from './World';
import { BUILDING_FOOTPRINT, BUILDING_NAME, PROP_FOOTPRINT, type BuildingKind, type PropKind } from './TownArt';
import { CITY_BUILDING_FOOTPRINT, CITY_BUILDING_NAME, CITY_PROP_FOOTPRINT, type CityBuildingKind, type CityPropKind } from './CityArt';
import { FURNITURE_FOOTPRINT, WALL_HUNG, type FloorKind, type FurnitureKind, type WallKind } from './InteriorArt';

/**
 * Todos los mapas del modo aventura: el campo (San Agustín), las ciudades (Medellín en jeep y
 * Santa Fe de Antioquia a caballo) y los interiores de casas, cantinas, tiendas e iglesias.
 * Puro: se puede probar sin Phaser.
 */

export type MapKind = 'campo' | 'ciudad' | 'interior';
export type MapId = string;
export type Sound = 'pueblo' | 'monte' | 'fiesta' | 'cantina' | 'hogar' | 'ciudad' | 'iglesia';

export interface MapBuilding { set: 'town' | 'city'; kind: BuildingKind | CityBuildingKind; x: number; y: number; id?: string; /** nombre propio si no es el del dibujo */ name?: string }
export interface MapProp { set: 'town' | 'city' | 'furniture'; kind: PropKind | CityPropKind | FurnitureKind; x: number; y: number }

export interface GameMap {
  id: MapId;
  kind: MapKind;
  name: string;
  grid: Cell[][];
  buildings: MapBuilding[];
  props: MapProp[];
  signs: Sign[];
  npcs: Npc[];
  areas: Area[];
  /** oscuridad de la noche según el ánimo del sitio */
  darkness: Record<Mood, number>;
  sound: Record<Mood, Sound>;
  floor?: FloorKind;
  wall?: WallKind;
  /** interiores: el tapete de la salida y a dónde se vuelve */
  exit?: { x: number; y: number; to: MapId; tx: number; ty: number };
  /** casilla donde se aparece Juan al llegar en el jeep */
  arrival?: [number, number];
  /** casilla donde se baja Juan del caballo, al lado de donde queda amarrado Lucero */
  horseArrival?: [number, number];
  /** trochas que llevan a otro mapa: al pisar la casilla, Juan aparece allá */
  links?: MapLink[];
}

export interface MapLink { x: number; y: number; to: MapId; tx: number; ty: number; facing: Dir }

export const w = (m: GameMap) => m.grid[0].length;
export const h = (m: GameMap) => m.grid.length;

export function buildingFootprint(b: MapBuilding): [number, number] {
  return b.set === 'town' ? BUILDING_FOOTPRINT[b.kind as BuildingKind] : CITY_BUILDING_FOOTPRINT[b.kind as CityBuildingKind];
}

export function buildingName(b: MapBuilding): string | null {
  if (b.name) return b.name;
  return b.set === 'town' ? BUILDING_NAME[b.kind as BuildingKind] : CITY_BUILDING_NAME[b.kind as CityBuildingKind];
}

export function propFootprint(p: MapProp): [number, number] {
  if (p.set === 'town') return PROP_FOOTPRINT[p.kind as PropKind];
  if (p.set === 'city') return CITY_PROP_FOOTPRINT[p.kind as CityPropKind];
  return FURNITURE_FOOTPRINT[p.kind as FurnitureKind];
}

/** Casillas que ocupa un objeto: su huella termina en (x, y) por abajo y está centrada en x. */
export function cellsOf(p: MapProp): [number, number][] {
  const [fw, fh] = propFootprint(p);
  const x0 = p.x - Math.floor((fw - 1) / 2);
  const out: [number, number][] = [];
  for (let y = p.y - fh + 1; y <= p.y; y++) for (let x = x0; x < x0 + fw; x++) out.push([x, y]);
  return out;
}

export function doorCell(b: MapBuilding): [number, number] {
  const [bw, bh] = buildingFootprint(b);
  return [b.x + Math.floor(bw / 2), b.y + bh];
}

export function moodIn(m: GameMap, x: number, y: number): Mood {
  return m.areas.find((a) => inRect(a.r, x, y))?.mood ?? (m.kind === 'campo' ? 'tension' : 'alegre');
}

export function soundIn(m: GameMap, x: number, y: number): Sound {
  const a = m.areas.find((r) => inRect(r.r, x, y));
  return a?.sound ?? m.sound[moodIn(m, x, y)];
}

export function areaIn(m: GameMap, x: number, y: number): string {
  return m.areas.find((a) => inRect(a.r, x, y))?.name ?? m.name;
}

const R = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 });

function fill(g: Cell[][], x0: number, y0: number, x1: number, y1: number, c: Cell): void {
  for (let y = Math.max(0, y0); y <= Math.min(g.length - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(g[0].length - 1, x1); x++) g[y][x] = c;
}

function stamp(g: Cell[][], buildings: MapBuilding[], props: MapProp[], signs: Sign[], doorGround: Cell): void {
  for (const b of buildings) {
    const [bw, bh] = buildingFootprint(b);
    fill(g, b.x, b.y, b.x + bw - 1, b.y + bh - 1, 'H');
    const [dx, dy] = doorCell(b);
    if (g[dy]?.[dx] === 'H' || g[dy]?.[dx] === 'P') g[dy][dx] = doorGround;
  }
  for (const p of props) for (const [x, y] of cellsOf(p)) if (g[y]?.[x] && g[y][x] !== 'H' && g[y][x] !== 'W') g[y][x] = 'P';
  for (const s of signs) g[s.y][s.x] = 'S';
}

// ------------------------------------------------------------------ campo

function campo(): GameMap {
  const buildings: MapBuilding[] = [
    ...BUILDINGS.map((b) => ({ set: 'town' as const, ...b, ...(b.id === 'trapiche0' ? { name: 'TRAPICHE EL DULCE, DE DON JULIO' } : {}) })),
    ...CAMPO_CITY_BUILDINGS.map((b) => ({ set: 'city' as const, ...b })),
  ];
  const props: MapProp[] = [
    ...PROPS.map((p) => ({ set: 'town' as const, ...p })),
    ...CAMPO_CITY_PROPS.map((p) => ({ set: 'city' as const, ...p })),
  ];
  return {
    id: 'campo', kind: 'campo', name: 'SAN AGUSTÍN', grid: buildMap(), buildings, props, signs: SIGNS, npcs: NPCS, areas: AREAS,
    darkness: { tension: 0.82, alegre: 0.45 }, sound: { tension: 'monte', alegre: 'fiesta' }, arrival: [111, 17], horseArrival: [7, 9],
    links: [{ x: 88, y: 1, to: 'monte', tx: MONTE_ENTRY[0], ty: MONTE_ENTRY[1], facing: 'up' }],
  };
}

// ------------------------------------------------------------------ el monte puro

export const MONTE_W = 40;
export const MONTE_H = 32;
/** casilla donde aparece Juan al subir por la trocha */
export const MONTE_ENTRY: [number, number] = [20, 29];

function ellipseFill(g: Cell[][], cx: number, cy: number, rx: number, ry: number, c: Cell): void {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    if (x < 1 || y < 1 || x >= g[0].length - 1 || y >= g.length - 1) continue;
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) g[y][x] = c;
  }
}

/** Montaña arriba, monte puro: robles tupidos, una trocha que serpentea, la quebrada y el claro donde hay leña caída. */
function monte(): GameMap {
  const W = MONTE_W, H = MONTE_H;
  const g: Cell[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => 'T' as Cell));
  ellipseFill(g, 24, 27, 5, 2, '"');
  ellipseFill(g, 13, 21, 4, 2, '"');
  ellipseFill(g, 31, 12, 4, 2, '"');
  ellipseFill(g, 26, 5, 8, 3, '"');
  ellipseFill(g, 26, 5, 6, 2, '.');
  // la quebrada de agua fría que baja de la montaña
  fill(g, 1, 16, W - 2, 17, '~');
  const trail: [number, number, number, number][] = [[20, 25, 20, 30], [10, 25, 20, 25], [10, 11, 10, 25], [10, 11, 26, 11], [26, 5, 26, 11]];
  for (const [x0, y0, x1, y1] of trail) fill(g, x0, y0, x1, y1, '=');
  fill(g, 10, 16, 10, 17, 'B');
  // matojos a la orilla de la trocha
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (g[y][x] !== 'T') continue;
    const byTrail = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] === '=');
    if (byTrail && (x * 7 + y * 13) % 3 === 0) g[y][x] = '"';
  }
  const tp = (kind: PropKind, x: number, y: number): MapProp => ({ set: 'town', kind, x, y });
  const props: MapProp[] = [tp('tronco', 22, 4), tp('tronco', 29, 6), tp('tronco', 23, 6), tp('roca', 31, 4), tp('roca', 20, 6), tp('roca', 14, 22)];
  const signs: Sign[] = [
    { x: 21, y: 29, lines: ['MONTE PURO.', 'AQUÍ NO ENTRA NI EL SOL. LO QUE SE CAE SE PUEDE LLEVAR; LO QUE ESTÁ VIVO, NO SE TOCA.'] },
    { x: 11, y: 15, lines: ['QUEBRADA LA FRÍA.', 'EL AGUA BAJA DEL PÁRAMO. DICEN QUE AQUÍ SE BAÑA LA MADREMONTE.'] },
  ];
  stamp(g, [], props, signs, '.');
  g[H - 2][MONTE_ENTRY[0]] = '=';
  const areas: Area[] = [
    { name: 'EL CLARO DE LOS ROBLES', r: R(17, 1, 35, 9) },
    { name: 'QUEBRADA LA FRÍA', r: R(1, 14, W - 2, 18) },
    { name: 'MONTE PURO', r: R(0, 0, W - 1, H - 1) },
  ];
  return {
    id: 'monte', kind: 'campo', name: 'MONTE PURO', grid: g, buildings: [], props, signs, npcs: [], areas,
    darkness: { tension: 0.9, alegre: 0.6 }, sound: { tension: 'monte', alegre: 'monte' }, arrival: MONTE_ENTRY,
    links: [{ x: MONTE_ENTRY[0], y: H - 2, to: 'campo', tx: 88, ty: 2, facing: 'down' }],
  };
}

// ------------------------------------------------------------------ Medellín

export const CITY_W = 80;
export const CITY_H = 60;

function cityRow(kinds: CityBuildingKind[], x0: number, bottom: number, gap = 1): Placed<CityBuildingKind>[] {
  let x = x0;
  return kinds.map((kind) => {
    const [bw, bh] = CITY_BUILDING_FOOTPRINT[kind];
    const p = { kind, x, y: bottom - bh + 1 };
    x += bw + gap;
    return p;
  });
}

/** Avenidas (asfalto con andén) y bloques. Las calles horizontales y verticales dejan manzanas de distintos usos. */
const AVE_Y = [11, 30, 49];
const AVE_X = [13, 41, 67];

function medellin(): GameMap {
  const g: Cell[][] = Array.from({ length: CITY_H }, () => Array.from({ length: CITY_W }, () => 'd' as Cell));
  // montañas del valle de Aburrá alrededor
  fill(g, 0, 0, CITY_W - 1, 0, 'T'); fill(g, 0, CITY_H - 1, CITY_W - 1, CITY_H - 1, 'T');
  fill(g, 0, 0, 0, CITY_H - 1, 'T'); fill(g, CITY_W - 1, 0, CITY_W - 1, CITY_H - 1, 'T');
  for (const y of AVE_Y) fill(g, 1, y, CITY_W - 2, y + 1, 'a');
  for (const x of AVE_X) fill(g, x, 1, x + 1, CITY_H - 2, 'a');
  for (const y of AVE_Y) for (const x of AVE_X) { fill(g, x - 1, y, x - 1, y + 1, 'z'); fill(g, x + 2, y, x + 2, y + 1, 'z'); }
  // plaza Botero y parque de las luces: ladrillo
  fill(g, 15, 13, 39, 28, 'l');
  // parque Berrío
  fill(g, 43, 13, 65, 28, 'o');
  // cerro Nutibara con el Pueblito Paisa: grama y adoquín
  fill(g, 69, 1, 78, 28, '.');
  fill(g, 70, 14, 77, 22, 'o');
  // comuna 13: lomas con tierra roja y escaleras
  fill(g, 1, 32, 12, 58, '.');
  fill(g, 15, 32, 39, 47, '.');
  fill(g, 4, 34, 4, 57, '=');
  fill(g, 15, 39, 39, 39, '=');
  // feria de las flores
  fill(g, 43, 32, 65, 47, 'l');
  // parque del río al sur
  fill(g, 1, 51, 78, 58, '.');
  fill(g, 1, 56, 78, 57, '~');
  for (const x of [20, 54]) fill(g, x, 56, x, 57, 'B');

  const B = (kind: CityBuildingKind, x: number, bottom: number, id?: string): Placed<CityBuildingKind> => ({ kind, x, y: bottom - CITY_BUILDING_FOOTPRINT[kind][1] + 1, id });
  const buildings: Placed<CityBuildingKind>[] = [
    B('terminal', 2, 9, 'terminal_ciudad'),
    ...cityRow(['ladrillo_alto', 'ladrillo_bajo', 'tienda_esquina'], 15, 9),
    ...cityRow(['ladrillo_bajo', 'ladrillo_alto'], 43, 9),
    B('palacio_cultura', 22, 18, 'palacio_cultura'),
    B('coltejer', 45, 19),
    B('estacion_metro', 55, 19, 'estacion_metro'),
    B('pueblito_iglesia', 71, 12, 'pueblito_iglesia'),
    B('pueblito_casa', 69, 22),
    B('pueblito_casa', 73, 27, 'pueblito_casa'),
    ...cityRow(['casa_comuna', 'casa_comuna'], 2, 47),
    B('casa_comuna', 16, 37, 'casa_comuna'),
    B('casa_comuna', 26, 37),
    B('fonda', 44, 47, 'fonda_ciudad'),
    B('teatro', 58, 47, 'teatro'),
    ...cityRow(['ladrillo_bajo', 'ladrillo_alto', 'tienda_esquina'], 15, 48),
    ...cityRow(['ladrillo_alto', 'ladrillo_bajo'], 69, 47, 0),
  ].filter((b) => b.x + CITY_BUILDING_FOOTPRINT[b.kind][0] < CITY_W - 1);
  const named: Record<string, number> = {};
  for (const b of buildings) if (!b.id) { const i = named[b.kind] ?? 0; b.id = `${b.kind}${i}`; named[b.kind] = i + 1; }

  const P = (kind: CityPropKind, x: number, y: number): MapProp => ({ set: 'city', kind, x, y });
  const props: MapProp[] = [
    P('jeep', 11, 5), P('taxi', 20, 12), P('taxi', 50, 31), P('buseta', 30, 50),
    P('botero_gorda', 18, 24), P('botero_caballo', 30, 25), P('botero_gato', 36, 22), P('botero_gorda', 34, 27),
    P('guayacan', 16, 14), P('guayacan', 38, 14), P('guayacan', 16, 28), P('palmera', 39, 27),
    P('banca', 24, 22), P('banca', 28, 22), P('fuente_ciudad', 26, 27),
    P('kiosko', 60, 24), P('banca', 50, 25), P('guayacan', 63, 27), P('poste', 44, 27), P('poste', 64, 14),
    P('puesto_fruta', 49, 23), P('puesto_arepas', 58, 27),
    P('grafiti', 8, 38), P('grafiti', 8, 50), P('grafiti', 32, 42), P('escalera_electrica', 2, 41), P('torre_cable', 10, 33), P('torre_cable', 35, 33),
    P('tarima', 54, 36), P('bombillos', 46, 33), P('bombillos', 50, 33), P('bombillos', 58, 33), P('bombillos', 62, 33),
    P('castillo_polvora', 64, 38), P('silleta', 47, 41), P('silleta', 51, 41), P('silleta', 59, 41),
    P('puesto_arepas', 44, 40), P('puesto_fruta', 64, 40),
    P('semaforo', 12, 10), P('semaforo', 43, 29), P('semaforo', 66, 48),
    P('palmera', 72, 4), P('palmera', 76, 7), P('guayacan', 70, 26),
    P('guayacan', 10, 53), P('guayacan', 30, 53), P('guayacan', 48, 53), P('guayacan', 70, 53),
    ...[3, 9, 19, 25, 31, 37, 47, 53, 59, 63, 73].map((x) => P('poste', x, 29)),
  ];
  // la línea del metro cruza la ciudad por arriba: solo estorban los pilares que no caen en la calle
  const under = (x: number, y: number) => buildings.some((b) => {
    const [bw, bh] = CITY_BUILDING_FOOTPRINT[b.kind];
    return x >= b.x && x < b.x + bw && y >= b.y && y < b.y + bh;
  });
  for (let x = 3; x <= 66; x += 4) props.push(P('metro_via', x, 20));
  for (let x = 4; x <= 66; x += 6) if (g[21][x] !== 'a' && g[21][x] !== 'z' && !under(x, 21)) props.push(P('metro_pilar', x, 21));

  const signs: Sign[] = [
    { x: 11, y: 9, lines: ['TERMINAL DEL NORTE.', 'YIPAOS PA\' SAN AGUSTÍN TODA LA NOCHE.'] },
    { x: 21, y: 19, lines: ['PLAZA BOTERO.', 'VEINTITRÉS ESCULTURAS DE BRONCE DONADAS POR EL MAESTRO FERNANDO BOTERO.'] },
    { x: 68, y: 13, lines: ['CERRO NUTIBARA - PUEBLITO PAISA.', 'ASÍ ERAN LOS PUEBLOS DE ANTIOQUIA.'] },
    { x: 14, y: 33, lines: ['COMUNA 13.', 'DE LA OSCURIDAD A LOS COLORES. BIENVENIDO.'] },
    { x: 42, y: 33, lines: ['FERIA DE LAS FLORES.', '¡DESFILE DE SILLETEROS ESTA NOCHE!'] },
  ];
  const npcs: Npc[] = [
    { key: 'conductor', name: 'DON EVELIO', x: 11, y: 7, facing: 'down', action: 'carro', story: 'chiva', lines: [['¿YA SE CANSÓ DE LA CIUDAD? CUANDO QUIERA VOLVEMOS A SAN AGUSTÍN, MIJO.']] },
    { key: 'silletero', name: 'DON HERNANDO', x: 52, y: 44, facing: 'down', story: 'silleteros', lines: [['ESTA SILLETA TIENE CLAVELES, AGAPANTOS Y PENSAMIENTOS. ¡LA HICE CON MIS NIETOS!']] },
    { key: 'rapero', name: 'KEVIN', x: 9, y: 41, facing: 'right', wander: 2, story: 'comuna13', lines: [['¡QUÉ MÁS, PARCE! ¿VINO A VER LOS GRAFITIS? CADA COLOR ES UNA HISTORIA DEL BARRIO.']] },
    { key: 'bailarina', name: 'YURANI', x: 50, y: 38, facing: 'down', wander: 2, action: 'baile', story: 'cumbia', lines: [['¡ESTA NOCHE HAY TABLADO! ¿SE ANIMA A UNA SALSITA, PAISA?']] },
    { key: 'acordeonero', name: 'EL CHOLO', x: 54, y: 37, facing: 'down', action: 'baile', story: 'vallenato', lines: [['¡ESTE ACORDEÓN LO TRAJE DESDE VALLEDUPAR! ¡AY HOMBE!']] },
    { key: 'policia', name: 'PATRULLERO GÓMEZ', x: 27, y: 20, facing: 'down', story: 'botero', lines: [['TRANQUILO, CIUDADANO: AQUÍ EN LA PLAZA BOTERO ESTÁ SEGURO. ¡NO SE VAYA SIN SOBARLE LA BARRIGA A LA GORDA!']] },
    { key: 'cafetero', name: 'DON TULIO', x: 74, y: 16, facing: 'left', story: 'pueblito', lines: [['DESDE ESTE CERRO SE VE TODO MEDELLÍN. ¡QUÉ BELLEZA DE VALLE!']] },
    { key: 'nina', name: 'SARITA', x: 60, y: 26, facing: 'up', wander: 3, story: 'metro', lines: [['¡YO ME MONTÉ EN EL METROCABLE! ¡SE VE LA CIUDAD DESDE EL CIELO!']] },
    { key: 'vendedora', name: 'DOÑA LUCERO', x: 48, y: 24, facing: 'down', story: 'navidad', lines: [['¡MANGO BICHE CON SAL Y LIMÓN! ¡OBLEAS CON AREQUIPE!']] },
    { key: 'borracho', name: 'EL PROFE', x: 33, y: 40, facing: 'down', wander: 2, story: 'tiple', lines: [['YO ERA PROFESOR DE MÚSICA... AHORA SOLO TOCO EL TIPLE EN LA ESQUINA. ¡PERO QUÉ TIPLE!']] },
    { key: 'nino', name: 'BRAYAN', x: 20, y: 44, facing: 'right', wander: 3, lines: [['¿USTED ES DEL CAMPO? ¿ALLÁ SÍ HAY ESPANTOS DE VERDAD? ¡QUÉ MIEDO TAN BACANO!']] },
  ];
  const all: MapBuilding[] = buildings.map((b) => ({ set: 'city', ...b }));
  stamp(g, all, props.filter((p) => p.kind !== 'metro_via'), signs, 'd');
  const areas: Area[] = [
    { name: 'TERMINAL DEL NORTE', r: R(1, 1, 12, 10) },
    { name: 'PLAZA BOTERO', r: R(14, 12, 40, 29) },
    { name: 'PARQUE BERRÍO', r: R(42, 12, 66, 29) },
    { name: 'PUEBLITO PAISA', r: R(68, 1, 78, 29) },
    { name: 'COMUNA 13', r: R(1, 31, 40, 58) },
    { name: 'FERIA DE LAS FLORES', r: R(42, 31, 66, 48) },
    { name: 'PARQUE DEL RÍO', r: R(1, 50, 78, 58) },
  ];
  return {
    id: 'medellin', kind: 'ciudad', name: 'MEDELLÍN', grid: g, buildings: all, props, signs, npcs, areas,
    darkness: { tension: 0.7, alegre: 0.5 }, sound: { tension: 'ciudad', alegre: 'ciudad' }, arrival: [9, 10],
  };
}

// ------------------------------------------------------------------ Santa Fe de Antioquia

export const SANTAFE_W = 64;
export const SANTAFE_H = 46;

/** La ciudad madre: casas blancas, calles de piedra, la catedral, la plaza con su ceiba y el Puente de Occidente sobre el Cauca. */
function santafe(): GameMap {
  const W = SANTAFE_W, H = SANTAFE_H;
  const g: Cell[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => 'o' as Cell));
  fill(g, 0, 0, W - 1, 0, 'T'); fill(g, 0, H - 1, W - 1, H - 1, 'T');
  fill(g, 0, 0, 0, H - 1, 'T'); fill(g, W - 1, 0, W - 1, H - 1, 'T');
  // afueras: potrero con árboles y el camino de herradura que llega del oriente antioqueño
  fill(g, 1, 1, 9, 44, '.');
  for (let y = 1; y <= 44; y++) for (let x = 1; x <= 9; x++) if ((x * 7 + y * 11) % 9 === 0 && (y < 15 || y > 22)) g[y][x] = 'T';
  fill(g, 1, 18, 21, 19, '=');
  // plaza mayor de ladrillo
  fill(g, 22, 14, 42, 24, 'l');
  // orillas y el río Cauca, con el puente colgante
  fill(g, 10, 33, W - 2, 35, '.');
  fill(g, 1, 36, W - 2, 40, '~');
  fill(g, 1, 41, W - 2, 44, '.');
  fill(g, 56, 36, 57, 40, 'B');

  const T = (kind: BuildingKind, x: number, bottom: number, id?: string, name?: string): MapBuilding =>
    ({ set: 'town', kind, x, y: bottom - BUILDING_FOOTPRINT[kind][1] + 1, id, name });
  const buildings: MapBuilding[] = [
    T('casa_blanca', 11, 11, 'sf_casa', 'CASA DE LA TÍA ROSALÍA'),
    T('casa_amarilla', 17, 11),
    T('alcaldia', 22, 11, undefined, 'CASA DE GOBIERNO'),
    T('iglesia', 30, 11, 'sf_catedral', 'CATEDRAL BASÍLICA DE LA INMACULADA'),
    T('casa_azul', 38, 11),
    T('tienda', 44, 11, 'sf_dulceria', 'DULCERÍA DOÑA CHAVA'),
    T('casa_roja', 50, 11),
    T('casa_verde', 55, 11),
    T('cantina', 12, 31, undefined, 'CANTINA EL TAMARINDO'),
    T('casa_blanca', 20, 31),
    T('edificio', 26, 31, undefined, 'HOTEL CASA TEJADA'),
    T('casa_amarilla', 33, 31),
    T('finca', 38, 31, undefined, 'CASA MUSEO JUAN DEL CORRAL'),
    T('casa_verde', 46, 31),
    T('casa_roja', 52, 31),
  ];
  const n: Record<string, number> = {};
  for (const b of buildings) if (!b.id) { const i = n[b.kind] ?? 0; b.id = `sf_${b.kind}${i}`; n[b.kind] = i + 1; }

  const tp = (kind: PropKind, x: number, y: number): MapProp => ({ set: 'town', kind, x, y });
  const cp = (kind: CityPropKind, x: number, y: number): MapProp => ({ set: 'city', kind, x, y });
  const props: MapProp[] = [
    tp('fuente', 32, 19),
    tp('banca', 26, 16), tp('banca', 37, 16), tp('banca', 26, 22), tp('banca', 37, 22),
    ...([[23, 14], [41, 14], [23, 24], [41, 24], [16, 13], [48, 13], [16, 26], [48, 26]] as const).map(([x, y]) => tp('farol', x, y)),
    // la ceiba de la plaza y los palos de tamarindo
    cp('guayacan', 28, 19), cp('guayacan', 36, 19),
    cp('puesto_fruta', 30, 24), cp('bombillos', 27, 14), cp('bombillos', 37, 14),
    ...([[12, 34], [24, 34], [36, 34], [48, 34], [20, 42], [40, 43]] as const).map(([x, y]) => tp('palma', x, y)),
    tp('mula', 6, 20), tp('roca', 4, 24), tp('cafeto', 7, 26), tp('cafeto', 8, 12),
  ];
  const signs: Sign[] = [
    { x: 8, y: 17, lines: ['SANTA FE DE ANTIOQUIA, LA CIUDAD MADRE.', 'FUNDADA EN 1541. ¡BIENVENIDO, ARRIERO!'] },
    { x: 21, y: 15, lines: ['PLAZA MAYOR.', 'DE NOCHE SE OYEN CASCOS DE HIERRO EN LAS CALLES EMPEDRADAS. NO SE ASOME.'] },
    { x: 55, y: 34, lines: ['PUENTE DE OCCIDENTE, 1895.', 'PUENTE COLGANTE SOBRE EL RÍO CAUCA. ¡NO SE MECE, NO SE MECE!'] },
  ];
  const npcs: Npc[] = [
    { key: 'caballo', name: 'LUCERO', x: 3, y: 19, facing: 'right', action: 'caballo' },
    { key: 'cura', name: 'PADRE JACINTO', x: 33, y: 13, facing: 'down', story: 'ciudad_madre', lines: [['BIENVENIDO A LA CIUDAD MADRE, HIJO. ESTA CATEDRAL TIENE MÁS AÑOS QUE TODO MEDELLÍN.']] },
    { key: 'vendedora', name: 'DOÑA CHAVA', x: 31, y: 23, facing: 'up', story: 'tamarindo', lines: [['¡BOLITAS DE TAMARINDO, MIJO! DULCES, ÁCIDAS Y CON AZÚCAR. ¡PA\'L CALOR NO HAY NADA MEJOR!']] },
    { key: 'arriero', name: 'DON EUSEBIO', x: 54, y: 35, facing: 'down', story: 'puente', lines: [['YO CRUCÉ ESTE PUENTE CON CUARENTA MULAS CARGADAS DE CAFÉ. ¡NI SE MOVIÓ!']] },
    { key: 'campesina', name: 'DOÑA OFELIA', x: 17, y: 21, facing: 'right', story: 'mula_herrada', lines: [['¿OYÓ ANOCHE? CLAC, CLAC, CLAC... POR LA CALLE DE LA AMARGURA. ¡ES ELLA, LA MULA HERRADA!']] },
    { key: 'nino', name: 'SIMÓN', x: 40, y: 21, facing: 'left', wander: 3, lines: [['¿ESE CABALLO ES SUYO? ¡QUÉ CABALLO TAN BONITO! ¿ME DEJA MONTARLO?']] },
    { key: 'borracho', name: 'DON LISÍMACO', x: 18, y: 32, facing: 'down', story: 'arrieros', lines: [['¡HIP! EN LA CANTINA EL TAMARINDO EL AGUARDIENTE ES TIBIO... ¡PORQUE AQUÍ TODO ES TIBIO, HIP!']] },
    { key: 'pescador', name: 'EL BALSERO', x: 48, y: 42, facing: 'up', story: 'mohan', lines: [['ANTES DEL PUENTE YO PASABA LA GENTE EN BALSA. EL CAUCA ES BRAVO... Y DE NOCHE SE OYE TOCAR UN TIPLE DESDE EL AGUA.']] },
  ];
  stamp(g, buildings, props, signs, 'o');
  const areas: Area[] = [
    { name: 'CAMINO DE HERRADURA', r: R(1, 1, 9, 44), mood: 'tension' },
    { name: 'PUENTE DE OCCIDENTE', r: R(52, 33, 60, 44), mood: 'tension' },
    { name: 'RÍO CAUCA', r: R(1, 36, 62, 44), mood: 'tension' },
    { name: 'PLAZA MAYOR', r: R(22, 14, 42, 24) },
    { name: 'CALLE DE LA AMARGURA', r: R(10, 12, 21, 27) },
    { name: 'SANTA FE DE ANTIOQUIA', r: R(10, 1, 62, 35) },
  ];
  return {
    id: 'santafe', kind: 'ciudad', name: 'SANTA FE DE ANTIOQUIA', grid: g, buildings, props, signs, npcs, areas,
    darkness: { tension: 0.78, alegre: 0.5 }, sound: { tension: 'monte', alegre: 'pueblo' }, horseArrival: [4, 19],
  };
}

// ------------------------------------------------------------------ interiores

interface InteriorDef {
  name: string;
  w: number;
  h: number;
  floor: FloorKind;
  wall: WallKind;
  sound: Sound;
  furniture: [FurnitureKind, number, number][];
  npcs: Npc[];
}

const N = (key: Npc['key'], name: string, x: number, y: number, story?: Npc['story'], line?: string, facing: Dir = 'down', wander = 0): Npc =>
  ({ key, name, x, y, facing, story, wander, lines: line ? [[line]] : undefined });

const CASA_FURNI: [FurnitureKind, number, number][] = [
  ['sagrado_corazon', 3, 1], ['ventana', 6, 1], ['reloj', 8, 1], ['fogon_lena', 2, 3], ['olla', 4, 3],
  ['mesa_comedor', 6, 5], ['mecedora', 2, 6], ['radio', 8, 3], ['matera', 9, 6], ['tapete', 5, 7],
];

/** Los interiores, por el nombre del edificio cuya puerta lleva a ellos. */
export const INTERIORS: Record<string, InteriorDef> = {
  casa_blanca0: {
    name: 'CASA DE LA ABUELA ROSA', w: 11, h: 9, floor: 'baldosa', wall: 'bahareque', sound: 'hogar',
    furniture: [...CASA_FURNI, ['carriel_pared', 5, 1], ['sombrero_pared', 4, 1], ['gallina', 7, 7]],
    npcs: [N('campesina', 'TÍA CARMEN', 3, 4, 'patasola', 'SIÉNTESE, MIJO, QUE YA ESTÁ LA AGUAPANELA. ¿LE CUENTO UNA HISTORIA DE MI JUVENTUD?')],
  },
  casa_blanca1: {
    name: 'CASA DE LOS MONTOYA', w: 10, h: 8, floor: 'madera', wall: 'bahareque', sound: 'hogar',
    furniture: [['cuadro_paisaje', 3, 1], ['ventana', 6, 1], ['tv_vieja', 2, 3], ['mecedora', 4, 4], ['cama', 8, 3], ['matera', 2, 6]],
    npcs: [N('cafetero', 'DON GILDARDO', 4, 5, 'dorado', 'MI ABUELO ERA GUAQUERO: BUSCABA ORO DE LOS INDIOS EN LAS TUMBAS. NUNCA ENCONTRÓ NADA, ¡PERO QUÉ CUENTOS ECHABA!', 'right')],
  },
  cantina0: {
    name: 'CANTINA LA ÚLTIMA LÁGRIMA', w: 13, h: 9, floor: 'madera', wall: 'madera', sound: 'cantina',
    furniture: [['estante_botellas', 3, 1], ['estante_botellas', 5, 1], ['bombillos_pared', 8, 1], ['bombillos_pared', 10, 1], ['barra', 4, 3], ['rockola', 11, 3],
      ['mesa_billar', 9, 5], ['mesa_cantina', 3, 6], ['silla', 2, 6], ['silla', 4, 6], ['mesa_cantina', 8, 7], ['canasta_cerveza', 11, 7]],
    npcs: [
      N('cantinero', 'DOÑA ROCÍO', 4, 2, 'muelona', '¿AGUARDIENTE O CERVECITA? AQUÍ LA RONDA LA PAGA EL QUE PIERDA AL BILLAR.'),
      N('borracho', 'EL TUERTO', 7, 5, 'tiple', '¡ESA ROCKOLA TIENE LAS MEJORES CANCIONES DE DESPECHO DEL DEPARTAMENTO!', 'left'),
      N('arriero', 'DON PACHO', 3, 7, 'arrieros', 'BRINDEMOS POR LAS MULAS, QUE SIN ELLAS NO HUBIERA PUEBLO.', 'up'),
    ],
  },
  cantina1: {
    name: 'CANTINA EL REMOLINO', w: 11, h: 8, floor: 'madera', wall: 'madera', sound: 'cantina',
    furniture: [['estante_botellas', 3, 1], ['bombillos_pared', 7, 1], ['barra', 3, 3], ['rockola', 9, 3], ['mesa_cantina', 6, 5], ['silla', 5, 5], ['silla', 7, 5], ['canasta_cerveza', 2, 6]],
    npcs: [N('cantinero', 'DON PEPE', 3, 2, 'mohan', 'ESTA CANTINA QUEDA AL LADO DEL RÍO. DE NOCHE SE OYE TOCAR UN TIPLE DESDE EL AGUA...'),
      N('pescador', 'EL BOGA', 7, 6, 'caiman', 'YO REMÉ EN EL MAGDALENA TREINTA AÑOS. ¡LO QUE HE VISTO EN ESE RÍO!', 'left')],
  },
  tienda0: {
    name: 'TIENDA DOÑA TERE', w: 10, h: 8, floor: 'baldosa_ajedrez', wall: 'azul', sound: 'hogar',
    furniture: [['estante_tienda', 3, 1], ['estante_tienda', 6, 1], ['mostrador', 4, 3], ['costales', 8, 3], ['racimo_platano', 2, 4], ['nevera', 8, 6], ['radio', 6, 3]],
    npcs: [N('vendedora', 'DOÑA TERE', 4, 2, 'bandeja', '¿QUÉ SE LE OFRECE, VECINO? HAY PANELA, VELAS, AGUARDIENTE Y CHISMES FRESQUITOS.')],
  },
  iglesia0: {
    name: 'IGLESIA DE SAN AGUSTÍN', w: 13, h: 11, floor: 'baldosa_ajedrez', wall: 'iglesia', sound: 'iglesia',
    furniture: [['virgen', 3, 1], ['altar', 6, 3], ['virgen', 9, 1], ['velas', 3, 3], ['velas', 9, 3], ['pulpito', 10, 4],
      ['banca_iglesia', 4, 6], ['banca_iglesia', 8, 6], ['banca_iglesia', 4, 8], ['banca_iglesia', 8, 8]],
    npcs: [N('campesina', 'DOÑA BERTA', 6, 7, 'llorona', 'ESTOY REZANDO PA\' QUE SE CALMEN LOS ESPANTOS. ¿USTED TAMBIÉN VINO A PEDIR PROTECCIÓN?', 'up')],
  },
  capilla0: {
    name: 'CAPILLA DEL CEMENTERIO', w: 9, h: 8, floor: 'ladrillo', wall: 'iglesia', sound: 'iglesia',
    furniture: [['altar', 4, 3], ['velas', 2, 3], ['velas', 6, 3], ['banca_iglesia', 3, 5], ['banca_iglesia', 6, 5]],
    npcs: [N('cura', 'EL SACRISTÁN', 2, 6, 'madremonte', 'AQUÍ VELAMOS A LOS MUERTOS... Y A VECES LOS MUERTOS NOS VELAN A NOSOTROS.', 'right')],
  },
  alcaldia0: {
    name: 'ALCALDÍA MUNICIPAL', w: 12, h: 8, floor: 'baldosa', wall: 'verde', sound: 'hogar',
    furniture: [['cuadro_paisaje', 3, 1], ['ventana', 6, 1], ['cuadro_paisaje', 9, 1], ['mesa_comedor', 6, 3], ['silla', 4, 3], ['matera', 2, 6], ['matera', 10, 6]],
    npcs: [N('policia', 'EL ALCALDE', 6, 2, 'sombreron', '¡BIENVENIDO! SI CALMA A LOS ESPANTOS, LE HACEMOS UNA ESTATUA EN LA PLAZA... BUENO, UN BUSTO.')],
  },
  casa_azul0: {
    name: 'CASA DE LOS RESTREPO', w: 10, h: 8, floor: 'madera', wall: 'azul', sound: 'hogar',
    furniture: [['tiple', 3, 1], ['ventana', 6, 1], ['hamaca', 3, 4], ['mesa_comedor', 7, 4], ['matera', 8, 6]],
    npcs: [N('cafetero', 'DON OCTAVIO', 7, 6, 'tiple', '¿OYE ESE TIPLE COLGADO? ERA DE MI PAPÁ. ÉL TOCABA BAMBUCOS HASTA QUE SALÍA EL SOL.', 'left')],
  },
  casa_amarilla0: {
    name: 'CASA DE LAS HERMANAS POSADA', w: 9, h: 8, floor: 'baldosa', wall: 'bahareque', sound: 'hogar',
    furniture: [['sagrado_corazon', 4, 1], ['velas', 2, 3], ['mecedora', 3, 5], ['mecedora', 6, 5], ['matera', 7, 3]],
    npcs: [N('campesina', 'DOÑA FABIOLA', 3, 4, 'navidad', 'MI HERMANA Y YO HACEMOS LA NATILLA MÁS RICA DEL PUEBLO. ¡EN DICIEMBRE VENGA!'),
      N('vendedora', 'DOÑA AMPARO', 6, 4, 'bachue', 'NUESTRA BISABUELA ERA BOYACENSE. ELLA SÍ SABÍA DE LAS LAGUNAS SAGRADAS.')],
  },
  casa_verde0: {
    name: 'CASA DE LOS GIRALDO', w: 10, h: 8, floor: 'tierra', wall: 'verde', sound: 'hogar',
    furniture: CASA_FURNI.slice(0, 7),
    npcs: [N('nino', 'TOMASITO', 6, 6, 'silbon', 'MI ABUELO ME CONTÓ DEL SILBÓN. ¡YO NO DUERMO SIN EL PERRO EN LA CAMA!', 'up', 2)],
  },
  casa_verde1: {
    name: 'CASA DE DOÑA ELVIRA', w: 9, h: 8, floor: 'tierra', wall: 'verde', sound: 'hogar',
    furniture: [['fogon_lena', 2, 3], ['olla', 4, 3], ['gallina', 6, 6], ['escoba', 7, 3], ['virgen', 4, 1]],
    npcs: [N('nina', 'LA NIETA', 5, 5, 'llorona', '¡MI ABUELA DICE QUE NO ME BAÑE EN EL RÍO DE NOCHE!', 'down', 2)],
  },
  casa_roja0: {
    name: 'CASA DE LOS OSORIO', w: 9, h: 8, floor: 'madera', wall: 'bahareque', sound: 'hogar',
    furniture: [['radio', 3, 3], ['mesa_comedor', 5, 4], ['cuadro_paisaje', 4, 1], ['acordeon', 7, 1], ['matera', 7, 6]],
    npcs: [N('arriero', 'DON ABEL', 5, 6, 'vallenato', 'YO VIVÍ EN LA COSTA DIEZ AÑOS. ¡ALLÁ APRENDÍ A TOCAR EL ACORDEÓN!', 'up')],
  },
  edificio0: {
    name: 'HOTEL CENTRAL', w: 11, h: 8, floor: 'baldosa_ajedrez', wall: 'verde', sound: 'hogar',
    furniture: [['mostrador', 5, 3], ['reloj', 3, 1], ['cuadro_paisaje', 7, 1], ['planta', 2, 6], ['planta', 9, 6], ['matera', 9, 3]],
    npcs: [N('vendedora', 'LA RECEPCIONISTA', 5, 2, 'cumbia', 'BIENVENIDO AL HOTEL CENTRAL. TODAS LAS HABITACIONES ESTÁN LLENAS DE GENTE QUE NO SE ATREVE A SALIR.')],
  },
  edificio1: {
    name: 'BILLARES EL PROGRESO', w: 11, h: 8, floor: 'cemento', wall: 'ladrillo', sound: 'cantina',
    furniture: [['mesa_billar', 3, 4], ['mesa_billar', 8, 4], ['bombillos_pared', 5, 1], ['canasta_cerveza', 9, 6], ['radio', 2, 2]],
    npcs: [N('borracho', 'EL CALVO', 6, 6, 'sombreron', '¡CARAMBOLA! AQUÍ JUGAMOS HASTA QUE PASE EL SOMBRERÓN... O HASTA QUE AMANEZCA.', 'up')],
  },
  finca0: {
    name: 'FINCA LA ESPERANZA', w: 12, h: 9, floor: 'ladrillo', wall: 'bahareque', sound: 'hogar',
    furniture: [['costales', 3, 3], ['costales', 4, 3], ['fogon_lena', 9, 3], ['olla', 10, 3], ['hamaca', 5, 6], ['carriel_pared', 6, 1], ['sombrero_pared', 7, 1], ['gallina', 9, 7]],
    npcs: [N('cafetero', 'DON ALONSO', 7, 4, 'cafe', '¡ESTOS COSTALES SON DE CAFÉ PERGAMINO! MAÑANA LOS LLEVO A LA COOPERATIVA.', 'left')],
  },
  finca1: {
    name: 'FINCA EL CEDRAL', w: 12, h: 9, floor: 'ladrillo', wall: 'bahareque', sound: 'hogar',
    furniture: [['fogon_lena', 3, 3], ['olla', 4, 3], ['mesa_comedor', 7, 5], ['mecedora', 10, 4], ['racimo_platano', 2, 6], ['gallina', 9, 7]],
    npcs: [N('campesina', 'DOÑA GRACIELA', 4, 5, 'bandeja', 'AQUÍ EN EL SUR SE COME SANCOCHO DE GALLINA LOS DOMINGOS. ¡QUÉDESE A ALMORZAR!')],
  },
  trapiche0: {
    name: 'TRAPICHE DE DON JULIO', w: 11, h: 8, floor: 'tierra', wall: 'madera', sound: 'hogar',
    furniture: [['fogon_lena', 3, 3], ['olla', 5, 3], ['olla', 6, 3], ['costales', 9, 3], ['escoba', 2, 6]],
    npcs: [N('arriero', 'DON JULIO', 7, 5, 'arrieros', 'AQUÍ SE MUELE LA CAÑA Y SE HACE LA PANELA. ¡PRUEBE ESTE MELAO, CALIENTICO!', 'left')],
  },
  fonda_campo: {
    name: 'FONDA EL ARRIERO', w: 12, h: 9, floor: 'madera', wall: 'madera', sound: 'fiesta',
    furniture: [['estante_botellas', 3, 1], ['bombillos_pared', 6, 1], ['bombillos_pared', 9, 1], ['barra', 4, 3], ['guitarra', 7, 1], ['mesa_cantina', 8, 5], ['silla', 7, 5], ['silla', 9, 5], ['mesa_cantina', 3, 6]],
    npcs: [N('cantinero', 'DOÑA NUBIA', 4, 2, 'bandeja', '¡AQUÍ SE VIENE A GOZAR, MIJO! LA TRISTEZA SE QUEDA EN LA PUERTA.'),
      N('bailarina', 'LA MONA', 6, 7, 'cumbia', '¡ESTA NOCHE BAILAMOS HASTA QUE SALGA EL SOL!', 'up', 2)],
  },
  terminal_campo: {
    name: 'TERMINAL DE JEEPS', w: 10, h: 7, floor: 'cemento', wall: 'azul', sound: 'hogar',
    furniture: [['banca_iglesia', 3, 4], ['banca_iglesia', 7, 4], ['reloj', 5, 1], ['cuadro_paisaje', 3, 1], ['radio', 8, 2]],
    npcs: [N('nino', 'EL VOCEADOR', 5, 3, 'chiva', '¡MEDELLÍN, MEDELLÍN, MEDELLÍN! ¡EL YIPAO ESTÁ AFUERA!')],
  },
  // Santa Fe de Antioquia
  sf_catedral: {
    name: 'CATEDRAL BASÍLICA DE LA INMACULADA', w: 13, h: 11, floor: 'ladrillo', wall: 'iglesia', sound: 'iglesia',
    furniture: [['virgen', 3, 1], ['altar', 6, 3], ['virgen', 9, 1], ['velas', 3, 3], ['velas', 9, 3], ['pulpito', 10, 4],
      ['banca_iglesia', 4, 6], ['banca_iglesia', 8, 6], ['banca_iglesia', 4, 8], ['banca_iglesia', 8, 8]],
    npcs: [N('cura', 'EL SACRISTÁN VIEJO', 2, 7, 'ciudad_madre', 'ESTAS PAREDES SON DE CAL Y CANTO. HAN AGUANTADO TEMBLORES, GUERRAS Y PROCESIONES.', 'right')],
  },
  sf_casa: {
    name: 'CASA DE LA TÍA ROSALÍA', w: 11, h: 9, floor: 'baldosa', wall: 'bahareque', sound: 'hogar',
    furniture: [...CASA_FURNI, ['hamaca', 8, 6]],
    npcs: [N('campesina', 'TÍA ROSALÍA', 3, 4, 'mula_herrada', '¡JUAN! ¿USTED ES EL NIETO DE ROSA? ¡VENGA LE DOY UN JUGO DE TAMARINDO, QUE AQUÍ SE ASA UNO!')],
  },
  sf_dulceria: {
    name: 'DULCERÍA DOÑA CHAVA', w: 10, h: 8, floor: 'baldosa_ajedrez', wall: 'azul', sound: 'hogar',
    furniture: [['estante_tienda', 3, 1], ['estante_tienda', 6, 1], ['mostrador', 4, 3], ['costales', 8, 3], ['olla', 2, 4], ['radio', 6, 3]],
    npcs: [N('vendedora', 'LA NIETA DE DOÑA CHAVA', 4, 2, 'tamarindo', 'MI ABUELA ESTÁ EN LA PLAZA VENDIENDO. AQUÍ HACEMOS LOS DULCES: ¡HUELA ESE TAMARINDO!')],
  },
  // Medellín
  terminal_ciudad: {
    name: 'TERMINAL DEL NORTE', w: 12, h: 8, floor: 'cemento', wall: 'verde', sound: 'ciudad',
    furniture: [['banca_iglesia', 3, 5], ['banca_iglesia', 7, 5], ['reloj', 6, 1], ['mostrador', 9, 3], ['planta', 2, 3]],
    npcs: [N('vendedora', 'LA DE LOS TIQUETES', 9, 2, 'chiva', '¡PA\' TODOS LOS PUEBLOS DE ANTIOQUIA SALEN BUSES DE AQUÍ!')],
  },
  palacio_cultura: {
    name: 'PALACIO DE LA CULTURA', w: 13, h: 9, floor: 'baldosa_ajedrez', wall: 'iglesia', sound: 'iglesia',
    furniture: [['cuadro_paisaje', 3, 1], ['cuadro_paisaje', 6, 1], ['cuadro_paisaje', 9, 1], ['planta', 2, 4], ['planta', 11, 4], ['banca_iglesia', 6, 6]],
    npcs: [N('cura', 'EL GUÍA DEL MUSEO', 6, 3, 'botero', 'ESTE PALACIO LO DISEÑÓ UN ARQUITECTO BELGA. ¡MIRE ESOS CUADROS DE ARTISTAS ANTIOQUEÑOS!')],
  },
  estacion_metro: {
    name: 'ESTACIÓN PARQUE BERRÍO', w: 12, h: 8, floor: 'cemento', wall: 'verde', sound: 'ciudad',
    furniture: [['mostrador', 4, 3], ['banca_iglesia', 8, 5], ['reloj', 6, 1], ['planta', 2, 6]],
    npcs: [N('policia', 'LA GUÍA DEL METRO', 4, 2, 'metro', '¡BIENVENIDO AL METRO! AQUÍ TODO ESTÁ LIMPIO PORQUE ES DE TODOS.')],
  },
  pueblito_iglesia: {
    name: 'CAPILLA DEL PUEBLITO PAISA', w: 9, h: 8, floor: 'ladrillo', wall: 'iglesia', sound: 'iglesia',
    furniture: [['altar', 4, 3], ['velas', 2, 3], ['velas', 6, 3], ['banca_iglesia', 4, 5]],
    npcs: [N('campesina', 'DOÑA INÉS', 2, 6, 'pueblito', 'AQUÍ SE CASAN LAS PAREJAS DE TODA LA CIUDAD. ¡ES LA CAPILLA MÁS BONITA!', 'right')],
  },
  pueblito_casa: {
    name: 'BARBERÍA DEL PUEBLITO', w: 9, h: 7, floor: 'baldosa', wall: 'bahareque', sound: 'hogar',
    furniture: [['silla', 4, 3], ['cuadro_paisaje', 3, 1], ['radio', 7, 2], ['sombrero_pared', 6, 1]],
    npcs: [N('arriero', 'EL BARBERO', 5, 3, 'arrieros', '¿UNA MOTILADITA? ASÍ SE PEINABAN LOS ARRIEROS, CON BRILLANTINA.', 'left')],
  },
  casa_comuna: {
    name: 'CASA DE DOÑA OLGA', w: 9, h: 8, floor: 'cemento', wall: 'azul', sound: 'hogar',
    furniture: [['tv_vieja', 3, 3], ['mesa_comedor', 6, 4], ['sagrado_corazon', 4, 1], ['matera', 7, 6], ['nevera', 2, 6]],
    npcs: [N('campesina', 'DOÑA OLGA', 6, 6, 'comuna13', 'LLEVO CUARENTA AÑOS EN ESTE BARRIO. LO VI LLORAR Y LO VI FLORECER.', 'up')],
  },
  fonda_ciudad: {
    name: 'FONDA LA ALPARGATA', w: 13, h: 9, floor: 'madera', wall: 'madera', sound: 'fiesta',
    furniture: [['estante_botellas', 3, 1], ['bombillos_pared', 6, 1], ['bombillos_pared', 9, 1], ['barra', 4, 3], ['acordeon', 11, 1], ['mesa_cantina', 8, 5], ['silla', 7, 5], ['silla', 9, 5], ['mesa_cantina', 4, 7], ['mesa_billar', 10, 7]],
    npcs: [N('cantinero', 'DON MARIO', 4, 2, 'bandeja', '¡BIENVENIDO A LA ALPARGATA! AQUÍ SUENA MÚSICA PARRANDERA HASTA EL AMANECER.'),
      N('bailarina', 'CATALINA', 7, 7, 'cumbia', '¿SABE BAILAR SALSA, PAISA? ¡EN CALI LA BAILAN MEJOR, PERO AQUÍ LE PONEMOS EL ALMA!', 'up', 2)],
  },
  teatro: {
    name: 'TEATRO PABLO TOBÓN', w: 13, h: 9, floor: 'madera', wall: 'ladrillo', sound: 'iglesia',
    furniture: [['banca_iglesia', 4, 5], ['banca_iglesia', 8, 5], ['banca_iglesia', 4, 7], ['banca_iglesia', 8, 7], ['guitarra', 6, 1], ['tiple', 7, 1]],
    npcs: [N('acordeonero', 'LA CANTANTE', 6, 3, 'vallenato', '¡ESTA NOCHE HAY CONCIERTO DE MÚSICA COLOMBIANA! BAMBUCO, CUMBIA Y VALLENATO.')],
  },
  tienda_esquina0: {
    name: 'LA TIENDA DE LA ESQUINA', w: 9, h: 7, floor: 'baldosa_ajedrez', wall: 'verde', sound: 'hogar',
    furniture: [['estante_tienda', 3, 1], ['mostrador', 4, 3], ['nevera', 7, 3], ['radio', 2, 3]],
    npcs: [N('vendedora', 'DON ALIRIO EL TENDERO', 4, 2, 'cafe', '¿UN TINTICO? AQUÍ EN LA ESQUINA SE ARREGLA EL PAÍS TODAS LAS MAÑANAS.')],
  },
};

function interior(id: string, def: InteriorDef, back: { to: MapId; tx: number; ty: number }): GameMap {
  const g: Cell[][] = Array.from({ length: def.h }, () => Array.from({ length: def.w }, () => 'F' as Cell));
  fill(g, 0, 0, def.w - 1, 1, 'W');
  fill(g, 0, 0, 0, def.h - 1, 'W');
  fill(g, def.w - 1, 0, def.w - 1, def.h - 1, 'W');
  fill(g, 0, def.h - 1, def.w - 1, def.h - 1, 'W');
  const ex = Math.floor(def.w / 2);
  g[def.h - 1][ex] = 'M';
  const props: MapProp[] = def.furniture.map(([kind, x, y]) => ({ set: 'furniture', kind, x, y }));
  stamp(g, [], props.filter((p) => !WALL_HUNG.has(p.kind as FurnitureKind)), [], 'F');
  return {
    id, kind: 'interior', name: def.name, grid: g, buildings: [], props, signs: [], npcs: def.npcs,
    areas: [{ name: def.name, r: R(0, 0, def.w, def.h), mood: 'alegre' }],
    darkness: { tension: 0.3, alegre: 0.22 }, sound: { tension: def.sound, alegre: def.sound },
    floor: def.floor, wall: def.wall, exit: { x: ex, y: def.h - 1, ...back },
  };
}

// ------------------------------------------------------------------ registro

const cache = new Map<MapId, GameMap>();

/** Interior al que lleva la puerta de un edificio, si tiene. */
export function interiorOf(b: MapBuilding): MapId | null {
  return b.id && INTERIORS[b.id] ? `int:${b.id}` : null;
}

export function getMap(id: MapId): GameMap {
  const hit = cache.get(id);
  if (hit) return hit;
  let m: GameMap;
  if (id === 'campo') m = campo();
  else if (id === 'medellin') m = medellin();
  else if (id === 'santafe') m = santafe();
  else if (id === 'monte') m = monte();
  else if (id.startsWith('int:')) {
    const key = id.slice(4);
    const def = INTERIORS[key];
    if (!def) throw new Error(`interior desconocido: ${id}`);
    const parent = [getMap('campo'), getMap('medellin'), getMap('santafe')].find((p) => p.buildings.some((b) => b.id === key))!;
    const b = parent.buildings.find((x) => x.id === key)!;
    const [tx, ty] = doorCell(b);
    m = interior(id, def, { to: parent.id, tx, ty });
  } else throw new Error(`mapa desconocido: ${id}`);
  cache.set(id, m);
  return m;
}

export const ALL_MAP_IDS: MapId[] = ['campo', 'medellin', 'santafe', 'monte', ...Object.keys(INTERIORS).map((k) => `int:${k}`)];

export { HERO_START, doorOf };
