import { Pixmap, hexToRgba, seededRandom, type Rgba } from '../art/PixelPainter';

/**
 * Pueblo colombiano de noche dibujado en código: edificios, adornos, pistas de los mitos,
 * aldeanos y espíritus menores. Todo se pinta a 16 px por baldosa, con contorno y 2–3 tonos.
 */

const C = (h: number, a = 255) => hexToRgba(h, a);
type Ramp = [Rgba, Rgba, Rgba];
const R = (d: number, m: number, l: number): Ramp => [C(d), C(m), C(l)];
type Pt = [number, number];

const INK = C(0x1a1016);

// ---------- paletas ----------
const WHITE_WALL = R(0xc8bca4, 0xece4d0, 0xfaf6ea);
const CLAY = R(0x7a2a1c, 0xb4482c, 0xd8704a);
const WOOD = R(0x4a2c16, 0x7a4a24, 0xa8703c);
const STONE = R(0x5e5a62, 0x8a8690, 0xb4b0b8);
const GLASS_TOP = C(0xfff4b0);
const GLASS_MID = C(0xffcc4c);
const GLASS_BOT = C(0xe88a28);
const TRIM: Record<string, Ramp> = {
  azul: R(0x1c3c78, 0x2c64b0, 0x5a94d8),
  verde: R(0x16502a, 0x24803e, 0x4cb060),
  roja: R(0x6a1418, 0xa82428, 0xd85048),
  amarilla: R(0x9a6a10, 0xd8a020, 0xf8d050),
  cafe: R(0x3e2410, 0x6a3e1c, 0x9a6232),
  vino: R(0x4a1024, 0x7a1c3a, 0xa83a58),
};

// ---------- fuente 3×5 para letreros ----------
const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', ' ': '000000000000000',
};

function text(pm: Pixmap, s: string, x: number, y: number, c: Rgba): void {
  for (const ch of s) {
    const g = FONT[ch] ?? FONT[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') pm.set(x + (i % 3), y + Math.floor(i / 3), c);
    x += 4;
  }
}
const textWidth = (s: string) => s.length * 4 - 1;

/** Letrero de madera con texto centrado. */
function signboard(pm: Pixmap, cx: number, y: number, s: string, board: Ramp, ink: Rgba, pad = 3): void {
  const w = textWidth(s) + pad * 2;
  const x = Math.round(cx - w / 2);
  pm.rect(x, y, w, 9, board[1]);
  pm.hline(x, x + w - 1, y, board[2]);
  pm.hline(x, x + w - 1, y + 8, board[0]);
  pm.rectOutline(x - 1, y - 1, w + 2, 11, INK);
  text(pm, s, x + pad, y + 2, ink);
}

// ---------- piezas de arquitectura ----------

/** Pared de bahareque encalada con textura de pañete y algún desconchado. */
function wall(pm: Pixmap, x: number, y: number, w: number, h: number, ramp: Ramp, seed: number): void {
  const rnd = seededRandom(seed);
  pm.rect(x, y, w, h, ramp[1]);
  for (let i = 0; i < (w * h) / 22; i++) {
    pm.set(x + Math.floor(rnd() * w), y + Math.floor(rnd() * h), ramp[rnd() < 0.7 ? 0 : 2]);
  }
  pm.vline(x, y, y + h - 1, ramp[2]);
  pm.vline(x + w - 1, y, y + h - 1, ramp[0]);
  // desconchado: se asoma el bahareque (barro con cañas)
  for (let k = 0; k < Math.max(1, Math.floor(w / 40)); k++) {
    const px = x + 4 + Math.floor(rnd() * (w - 14));
    const py = y + 6 + Math.floor(rnd() * Math.max(1, h - 18));
    pm.rect(px, py, 5, 3, C(0x9a7450));
    pm.hline(px + 1, px + 3, py + 1, C(0x6a4a2c));
    pm.set(px - 1, py + 1, ramp[0]);
    pm.hline(px, px + 4, py + 3, ramp[0]);
  }
  // sombra del alero
  pm.rect(x, y, w, 3, C(0x000000, 60));
}

function zocalo(pm: Pixmap, x: number, bottom: number, w: number, h: number, ramp: Ramp): void {
  pm.rect(x, bottom - h + 1, w, h, ramp[1]);
  pm.hline(x, x + w - 1, bottom - h + 1, ramp[2]);
  pm.hline(x, x + w - 1, bottom - h + 2, ramp[0]);
  pm.hline(x, x + w - 1, bottom, ramp[0]);
}

/** Tejado de barro a cuatro aguas visto desde arriba en 3/4. */
function clayRoof(pm: Pixmap, x0: number, y0: number, w: number, h: number, inset: number, pal: Ramp = CLAY, seed = 1): void {
  const rnd = seededRandom(seed * 7 + 3);
  const leftAt = (y: number) => x0 + inset * (1 - (y - y0) / h);
  const rightAt = (y: number) => x0 + w - 1 - inset * (1 - (y - y0) / h);
  pm.polygon([[x0, y0 + h], [x0 + inset, y0], [x0 + w - inset, y0], [x0 + w, y0 + h]], pal[1]);
  let row = 0;
  for (let y = y0 + 3; y < y0 + h - 1; y += 4, row++) {
    const l = Math.ceil(leftAt(y)), r = Math.floor(rightAt(y));
    pm.hline(l, r, y, pal[0]);
    pm.hline(l, r, y - 1, C(0x000000, 40));
    pm.hline(l, r, y + 1, pal[2]);
    for (let x = l + 1 + (row % 2) * 3; x < r - 1; x += 6) {
      pm.vline(x, y + 1, Math.min(y + 3, y0 + h - 1), pal[0]);
      pm.set(x + 1, y + 2, pal[2]);
      pm.set(x + 2, y + 2, C(0xf09868));
      // tejas viejas, más oscuras o con musgo
      const r = rnd();
      if (r < 0.12) pm.rect(x + 1, y + 1, 5, 2, r < 0.05 ? C(0x4a6a2c, 150) : C(0x5a1c12, 110));
    }
  }
  // cumbrera y limatesas
  pm.hline(x0 + inset, x0 + w - inset - 1, y0, C(0x5a1c12));
  pm.hline(x0 + inset, x0 + w - inset - 1, y0 + 1, C(0xe88a60));
  pm.line(x0, y0 + h, x0 + inset, y0, 1, C(0x5a1c12));
  pm.line(x0 + w - 1, y0 + h, x0 + w - 1 - inset, y0, 1, C(0x5a1c12));
  // canecillos bajo el alero
  pm.hline(x0, x0 + w - 1, y0 + h, C(0x3a160c));
  pm.hline(x0, x0 + w - 1, y0 + h + 1, WOOD[0]);
  for (let x = x0 + 2; x < x0 + w - 2; x += 5) pm.rect(x, y0 + h + 1, 2, 2, WOOD[1]);
}

/** Ventana encendida con marco, postigos abiertos y rejas de madera. */
function litWindow(
  pm: Pixmap, x: number, y: number, w: number, h: number, trim: Ramp, lights: Pt[],
  opts: { shutters?: boolean; bars?: boolean; arch?: boolean } = {},
): void {
  const { shutters = true, bars = true, arch = false } = opts;
  pm.rect(x - 1, y - 1, w + 2, h + 2, trim[0]);
  for (let j = 0; j < h; j++) {
    const c = j < h * 0.3 ? GLASS_TOP : j < h * 0.7 ? GLASS_MID : GLASS_BOT;
    pm.hline(x, x + w - 1, y + j, c);
  }
  if (arch) {
    pm.set(x, y, trim[0]); pm.set(x + w - 1, y, trim[0]);
    pm.hline(x + 1, x + w - 2, y - 2, trim[1]);
  }
  // silueta de interior: cortina
  pm.vline(x, y, y + h - 1, C(0xc86828));
  if (bars) for (let bx = x + 1; bx < x + w - 1; bx += 2) pm.vline(bx, y, y + h - 1, trim[1]);
  else { pm.vline(x + Math.floor(w / 2), y, y + h - 1, trim[1]); pm.hline(x, x + w - 1, y + Math.floor(h / 2), trim[1]); }
  pm.hline(x - 1, x + w, y - 1, trim[2]);
  pm.rect(x - 2, y + h + 1, w + 4, 1, trim[2]);
  pm.rect(x - 2, y + h + 2, w + 4, 1, trim[0]);
  if (shutters) {
    const sw = Math.max(3, Math.floor(w / 2));
    for (const sx of [x - 1 - sw, x + w + 1]) {
      pm.rect(sx, y - 1, sw, h + 2, trim[1]);
      pm.vline(sx, y - 1, y + h, trim[2]);
      for (let yy = y + 1; yy < y + h; yy += 2) pm.hline(sx + 1, sx + sw - 1, yy, trim[0]);
    }
  }
  lights.push([x + Math.floor(w / 2), y + Math.floor(h / 2)]);
}

/** Puerta de dos hojas con tableros; `open` deja salir luz por la rendija. */
function door(pm: Pixmap, cx: number, bottom: number, w: number, h: number, trim: Ramp, lights?: Pt[], arch = false): void {
  const x = Math.round(cx - w / 2);
  const y = bottom - h + 1;
  pm.rect(x - 2, y - 2, w + 4, h + 2, C(0x5a4a3a));
  pm.rect(x - 1, y - 1, w + 2, h + 1, trim[0]);
  pm.rect(x, y, w, h, trim[1]);
  if (arch) {
    pm.set(x, y, trim[0]); pm.set(x + w - 1, y, trim[0]);
    pm.hline(x - 1, x + w, y - 3, C(0x5a4a3a));
  }
  const half = Math.floor(w / 2);
  for (const lx of [x, x + half]) {
    pm.rectOutline(lx + 1, y + 2, half - 2, Math.floor(h / 2) - 3, trim[0]);
    pm.rectOutline(lx + 1, y + Math.floor(h / 2) + 1, half - 2, Math.floor(h / 2) - 3, trim[0]);
    pm.vline(lx + 1, y + 1, bottom, trim[2]);
  }
  pm.vline(x + half - 1, y, bottom, INK);
  if (lights) {
    pm.vline(x + half, y + 1, bottom, GLASS_MID);
    pm.vline(x + half - 1, y + 1, bottom, GLASS_BOT);
    lights.push([x + half, bottom - Math.floor(h / 2)]);
  }
  pm.set(x + half - 3, y + Math.floor(h / 2), C(0xf0c840));
  pm.set(x + half + 2, y + Math.floor(h / 2), C(0xf0c840));
  // escalón
  pm.rect(x - 3, bottom, w + 6, 1, STONE[0]);
}

/** Balcón de madera con barandas torneadas y canes. */
function balcony(pm: Pixmap, x: number, y: number, w: number, trim: Ramp): void {
  pm.rect(x, y + 3, w, 3, C(0x000000, 70));
  pm.rect(x, y, w, 3, trim[0]);
  pm.hline(x, x + w - 1, y, trim[2]);
  for (let bx = x + 3; bx < x + w - 2; bx += 8) pm.polygon([[bx, y + 3], [bx + 3, y + 3], [bx + 1, y + 7]], trim[0]);
  for (let bx = x + 1; bx < x + w - 1; bx += 2) {
    pm.vline(bx, y - 7, y - 1, trim[1]);
    pm.set(bx, y - 4, trim[2]);
  }
  pm.rect(x, y - 9, w, 2, trim[1]);
  pm.hline(x, x + w - 1, y - 9, trim[2]);
  pm.vline(x, y - 9, y, trim[0]);
  pm.vline(x + w - 1, y - 9, y, trim[0]);
}

/** Farolito de pared con su llama. */
function wallLamp(pm: Pixmap, x: number, y: number, lights: Pt[]): void {
  pm.hline(x - 2, x, y - 1, INK);
  pm.rect(x - 1, y, 4, 5, C(0x302018));
  pm.rect(x, y + 1, 2, 3, C(0xffe070));
  pm.set(x, y + 1, C(0xfffbd0));
  pm.hline(x - 2, x + 3, y - 1, C(0x302018));
  lights.push([x + 1, y + 2]);
}

function flowerPot(pm: Pixmap, x: number, y: number, flower: number): void {
  pm.rect(x, y + 3, 5, 3, C(0xb05a2c));
  pm.hline(x, x + 4, y + 3, C(0xd07a40));
  pm.ellipse(x + 2.5, y + 2, 3.5, 2.5, C(0x2a7a34));
  pm.set(x + 1, y + 1, C(flower)); pm.set(x + 3, y, C(flower)); pm.set(x + 4, y + 2, C(flower));
  pm.set(x, y + 2, C(0x4caa48));
}

/** Cruz de hierro o madera. */
function cross(pm: Pixmap, cx: number, top: number, size: number, c: Rgba): void {
  pm.rect(cx - 1, top, 2, size, c);
  pm.rect(cx - Math.floor(size / 3), top + Math.floor(size / 4), Math.floor(size / 3) * 2 + 1 - 1 + 1, 2, c);
}

// ---------- edificios ----------

export type BuildingKind =
  | 'cantina' | 'iglesia' | 'tienda' | 'alcaldia' | 'edificio'
  | 'casa_azul' | 'casa_amarilla' | 'casa_verde' | 'casa_roja' | 'casa_blanca'
  | 'finca' | 'trapiche' | 'capilla';

export const BUILDING_FOOTPRINT: Record<BuildingKind, [number, number]> = {
  cantina: [6, 4],
  iglesia: [7, 6],
  tienda: [5, 4],
  alcaldia: [7, 5],
  edificio: [6, 4],
  casa_azul: [5, 3],
  casa_amarilla: [4, 3],
  casa_verde: [5, 3],
  casa_roja: [4, 3],
  casa_blanca: [5, 4],
  finca: [7, 4],
  trapiche: [6, 4],
  capilla: [4, 4],
};

export const BUILDING_NAME: Record<BuildingKind, string | null> = {
  cantina: 'CANTINA LA ÚLTIMA LÁGRIMA',
  iglesia: 'IGLESIA DE NUESTRA SEÑORA DEL CARMEN',
  tienda: 'TIENDA DOÑA TERE',
  alcaldia: 'ALCALDÍA MUNICIPAL',
  edificio: 'EDIFICIO EL PORVENIR',
  casa_azul: null,
  casa_amarilla: null,
  casa_verde: null,
  casa_roja: null,
  casa_blanca: null,
  finca: 'FINCA LA ESPERANZA',
  trapiche: 'TRAPICHE EL DULCE',
  capilla: 'CAPILLA DEL CEMENTERIO',
};

interface Built { pm: Pixmap; lights: Pt[] }

function canvas(kind: BuildingKind, extra: number): Pixmap {
  const [w, h] = BUILDING_FOOTPRINT[kind];
  return new Pixmap(w * 16, h * 16 + extra);
}

interface HouseOpts {
  kind: BuildingKind; extra: number; wallH: number; wallRamp: Ramp; trim: Ramp; zoc: Ramp;
  storeys: 1 | 2; seed: number; windows: number[]; flowers?: number;
}

function house(o: HouseOpts): Built {
  const pm = canvas(o.kind, o.extra);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const wy = H - o.wallH;
  wall(pm, 2, wy, W - 4, o.wallH - 1, o.wallRamp, o.seed);
  zocalo(pm, 2, H - 2, W - 4, 7, o.zoc);
  clayRoof(pm, 1, 2, W - 2, wy - 2, 5, CLAY, o.seed);
  const ww = 10, wh = o.storeys === 2 ? 10 : 11;
  const lowY = H - 21;
  for (const wx of o.windows) litWindow(pm, wx, lowY, ww, wh, o.trim, lights);
  door(pm, W / 2, H - 2, 12, 20, o.trim, lights);
  if (o.storeys === 2) {
    const upY = wy + 9;
    for (const wx of o.windows) litWindow(pm, wx, upY, ww, 11, o.trim, lights, { shutters: false });
    litWindow(pm, W / 2 - 4, upY, 8, 11, o.trim, lights, { shutters: false });
    balcony(pm, 4, upY + 15, W - 8, o.trim);
  }
  if (o.flowers) for (const wx of o.windows) flowerPot(pm, wx + 2, lowY + 13 - 6 + 0, o.flowers);
  wallLamp(pm, W / 2 + 10, wy + (o.storeys === 2 ? 30 : 6), lights);
  pm.outline(INK);
  return { pm, lights };
}

function buildCasa(kind: BuildingKind): Built {
  const tinted = (d: number, m: number, l: number) => R(d, m, l);
  switch (kind) {
    case 'casa_azul':
      return house({ kind, extra: 12, wallH: 34, wallRamp: tinted(0x8ea8c8, 0xbcd0e8, 0xdce8f6), trim: TRIM.amarilla, zoc: TRIM.azul, storeys: 1, seed: 11, windows: [11, 59], flowers: 0xf04860 });
    case 'casa_amarilla':
      return house({ kind, extra: 12, wallH: 34, wallRamp: tinted(0xc8a050, 0xf0d070, 0xfae8a8), trim: TRIM.verde, zoc: TRIM.verde, storeys: 1, seed: 12, windows: [9, 45] });
    case 'casa_verde':
      return house({ kind, extra: 12, wallH: 34, wallRamp: WHITE_WALL, trim: TRIM.verde, zoc: TRIM.verde, storeys: 1, seed: 13, windows: [11, 59], flowers: 0xf8e048 });
    case 'casa_roja':
      return house({ kind, extra: 12, wallH: 34, wallRamp: WHITE_WALL, trim: TRIM.roja, zoc: TRIM.roja, storeys: 1, seed: 14, windows: [9, 45], flowers: 0xf8f8f8 });
    default:
      return house({ kind, extra: 20, wallH: 56, wallRamp: WHITE_WALL, trim: TRIM.cafe, zoc: TRIM.vino, storeys: 2, seed: 15, windows: [11, 59] });
  }
}

/** Bombillos de colores colgados en catenaria. */
function bulbString(pm: Pixmap, x0: number, x1: number, y: number, sag: number, lights: Pt[]): void {
  const cols = [0xff4040, 0x40e060, 0xffe040, 0x40a0ff, 0xff60e0];
  let k = 0;
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0);
    const yy = Math.round(y + sag * 4 * t * (1 - t));
    pm.set(x, yy, INK);
    if ((x - x0) % 6 === 3) {
      pm.rect(x, yy + 1, 2, 2, C(cols[k % cols.length]));
      pm.set(x, yy + 1, C(0xffffff));
      if (k % 2 === 0) lights.push([x, yy + 2]);
      k++;
    }
  }
}

function crate(pm: Pixmap, x: number, y: number, c: Ramp): void {
  pm.rect(x, y, 10, 7, c[1]);
  pm.hline(x, x + 9, y, c[2]);
  pm.hline(x, x + 9, y + 6, c[0]);
  pm.rect(x + 3, y + 2, 4, 2, c[0]);
  for (let i = 0; i < 4; i++) {
    pm.rect(x + 1 + i * 2, y - 3, 1, 3, C(0x5a3010));
    pm.set(x + 1 + i * 2, y - 3, C(0xe0c080));
  }
  pm.rectOutline(x - 1, y - 1, 12, 9, INK);
}

function buildCantina(): Built {
  const pm = canvas('cantina', 16);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const wy = H - 44;
  wall(pm, 2, wy, W - 4, 43, R(0xb87850, 0xe8a070, 0xf8c898), 21);
  zocalo(pm, 2, H - 2, W - 4, 8, TRIM.verde);
  clayRoof(pm, 1, 2, W - 2, wy - 2, 5);
  // letrero grande
  signboard(pm, W / 2, wy + 4, 'CANTINA', R(0x1e3a20, 0x2a5a30, 0x4a8a50), C(0xffe070));
  bulbString(pm, 4, W - 5, wy + 15, 5, lights);
  // puertas batientes: vano oscuro con luz y dos medias hojas
  const dx = W / 2 - 8, dy = H - 24;
  pm.rect(dx - 2, dy - 2, 20, 24, C(0x5a4a3a));
  pm.rect(dx, dy, 16, 22, C(0xffb040));
  pm.rect(dx, dy, 16, 6, C(0xffe090));
  pm.rect(dx + 3, dy + 3, 4, 8, C(0x4a2a18, 200));
  pm.rect(dx + 2, dy + 1, 6, 3, C(0x4a2a18, 200));
  lights.push([dx + 8, dy + 6]);
  for (const hx of [dx, dx + 8]) {
    pm.rect(hx, dy + 7, 8, 10, TRIM.verde[1]);
    pm.hline(hx, hx + 7, dy + 7, TRIM.verde[2]);
    for (let s = hx + 1; s < hx + 7; s += 2) pm.vline(s, dy + 9, dy + 15, TRIM.verde[0]);
    pm.rectOutline(hx, dy + 7, 8, 10, INK);
  }
  litWindow(pm, 12, H - 30, 11, 11, TRIM.verde, lights);
  litWindow(pm, W - 23, H - 30, 11, 11, TRIM.verde, lights);
  // cajas de cerveza y anuncio de aguardiente
  crate(pm, 6, H - 10, R(0x8a1414, 0xc82020, 0xf04a3a));
  crate(pm, 17, H - 10, R(0x8a1414, 0xc82020, 0xf04a3a));
  crate(pm, 63, H - 10, R(0x8a6a10, 0xe0b020, 0xf8e070));
  pm.rect(W - 17, wy + 4, 12, 9, C(0xf0f0f0));
  pm.rect(W - 16, wy + 5, 10, 3, C(0xc82020));
  pm.rect(W - 12, wy + 9, 2, 3, C(0x2a7a34));
  pm.rectOutline(W - 18, wy + 3, 14, 11, INK);
  pm.rect(6, wy + 4, 10, 9, C(0x2a2a2a));
  pm.rect(7, wy + 5, 8, 3, C(0xf8d020));
  pm.rect(10, wy + 9, 2, 3, C(0xf0f0f0));
  pm.rectOutline(5, wy + 3, 12, 11, INK);
  // barril
  pm.rect(W - 15, H - 13, 10, 11, WOOD[1]);
  pm.vline(W - 15, H - 13, H - 3, WOOD[2]);
  pm.hline(W - 15, W - 6, H - 11, C(0x3a3a3a));
  pm.hline(W - 15, W - 6, H - 5, C(0x3a3a3a));
  pm.rectOutline(W - 16, H - 14, 12, 13, INK);
  pm.outline(INK);
  return { pm, lights };
}

function buildTienda(): Built {
  const pm = canvas('tienda', 14);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const wy = H - 42;
  wall(pm, 2, wy, W - 4, 41, R(0x7aa0a0, 0xa8d0c8, 0xd0ece4), 31);
  zocalo(pm, 2, H - 2, W - 4, 7, TRIM.roja);
  clayRoof(pm, 1, 2, W - 2, wy - 2, 5);
  signboard(pm, W / 2, wy + 3, 'TIENDA', R(0xc8b890, 0xf4ecd0, 0xffffff), C(0xa82428));
  // vitrina con mostrador
  litWindow(pm, 9, H - 22, 18, 10, TRIM.roja, lights, { shutters: false, bars: false });
  litWindow(pm, 52, H - 22, 18, 10, TRIM.roja, lights, { shutters: false, bars: false });
  for (let i = 0; i < 5; i++) {
    pm.rect(10 + i * 3.4, H - 17, 2, 4, C([0xc82020, 0x40a040, 0xf0d040, 0x3060c0, 0xf08030][i]));
  }
  door(pm, W / 2, H - 2, 12, 20, TRIM.roja, lights);
  // toldo a rayas
  const ay = H - 30;
  for (let x = 4; x < W - 4; x++) {
    const red = Math.floor((x - 4) / 4) % 2 === 0;
    pm.vline(x, ay, ay + 5, red ? C(0xc82828) : C(0xf4f0e8));
    pm.set(x, ay + 6 + ((x >> 1) % 2), red ? C(0x8a1818) : C(0xc8c0b0));
  }
  pm.hline(4, W - 5, ay, C(0xffffff, 120));
  pm.rect(4, ay + 8, W - 8, 2, C(0x000000, 60));
  // racimo de plátanos colgando y bultos de papa
  pm.vline(64, ay + 7, ay + 9, INK);
  pm.ellipse(64, ay + 13, 3, 4, C(0xe8c830));
  pm.set(63, ay + 11, C(0xfff080));
  pm.vline(65, ay + 11, ay + 16, C(0x9a8a20));
  for (const [sx, sy] of [[4, H - 10], [11, H - 10], [7, H - 16]] as const) {
    pm.ellipse(sx + 3, sy + 4, 4, 4, C(0xb8986a));
    pm.hline(sx + 1, sx + 5, sy + 1, C(0x8a6a44));
    pm.set(sx + 2, sy + 3, C(0xd8bc90));
  }
  pm.outline(INK);
  return { pm, lights };
}

/** Bandera de Colombia ondeando en su asta. */
function flag(pm: Pixmap, x: number, top: number, poleH: number): void {
  pm.vline(x, top, top + poleH, C(0x5a5a5a));
  pm.vline(x + 1, top, top + poleH, C(0x9a9a9a));
  pm.rect(x - 1, top - 2, 4, 2, C(0xf0c840));
  const fw = 18;
  for (let i = 0; i < fw; i++) {
    const wave = Math.round(Math.sin(i / 3) * 1);
    const fx = x + 2 + i;
    pm.vline(fx, top + 1 + wave, top + 5 + wave, C(0xf8d020));
    pm.vline(fx, top + 6 + wave, top + 8 + wave, C(0x2048a8));
    pm.vline(fx, top + 9 + wave, top + 11 + wave, C(0xd02028));
  }
}

function buildAlcaldia(): Built {
  const pm = canvas('alcaldia', 24);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const wy = H - 66;
  flag(pm, W / 2 - 1, 2, 30);
  wall(pm, 2, wy, W - 4, 65, WHITE_WALL, 41);
  zocalo(pm, 2, H - 2, W - 4, 6, R(0x2a3a5a, 0x3a5080, 0x5a78a8));
  clayRoof(pm, 1, 14, W - 2, wy - 14, 6);
  // frontón con escudo
  pm.polygon([[W / 2 - 18, wy + 1], [W / 2, wy - 10], [W / 2 + 18, wy + 1]], WHITE_WALL[1]);
  pm.line(W / 2 - 18, wy, W / 2, wy - 10, 1, WHITE_WALL[0]);
  pm.line(W / 2, wy - 10, W / 2 + 18, wy, 1, WHITE_WALL[0]);
  pm.ellipse(W / 2, wy - 2, 4, 4, C(0xd8a020));
  pm.rect(W / 2 - 2, wy - 4, 5, 2, C(0x2048a8));
  pm.rect(W / 2 - 2, wy - 2, 5, 2, C(0xd02028));
  // piso alto: balcón corrido
  const upY = wy + 10;
  for (const wx of [10, 30, 72, 92]) litWindow(pm, wx, upY, 10, 12, TRIM.azul, lights, { shutters: false });
  litWindow(pm, W / 2 - 5, upY, 10, 12, TRIM.azul, lights, { shutters: false });
  balcony(pm, 4, upY + 17, W - 8, TRIM.azul);
  // piso bajo: portal de arcos
  const ay = H - 30;
  pm.rect(4, ay, W - 8, 28, C(0x6a5a48));
  for (let i = 0; i < 6; i++) {
    const cx = 13 + i * 17.2;
    pm.ellipse(cx, ay + 5, 7, 6, C(0x3a3028));
    pm.rect(cx - 7, ay + 5, 14, 23, C(0x3a3028));
  }
  for (let i = 0; i < 7; i++) {
    const px = Math.round(3 + i * 17.2);
    pm.rect(px, ay, 4, 28, WHITE_WALL[1]);
    pm.vline(px, ay, ay + 27, WHITE_WALL[2]);
    pm.vline(px + 3, ay, ay + 27, WHITE_WALL[0]);
    pm.rect(px - 1, ay + 25, 6, 3, STONE[1]);
  }
  pm.hline(2, W - 3, ay, WHITE_WALL[0]);
  for (const wx of [14, 82]) litWindow(pm, wx, ay + 9, 10, 10, TRIM.azul, lights, { shutters: false });
  door(pm, W / 2, H - 2, 14, 22, TRIM.azul, lights, true);
  signboard(pm, W / 2, upY + 21, 'ALCALDIA', R(0x1c3c78, 0x2c64b0, 0x5a94d8), C(0xffffff), 2);
  pm.outline(INK);
  return { pm, lights };
}

function buildEdificio(): Built {
  const pm = canvas('edificio', 50);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const wy = H - 90;
  wall(pm, 2, wy, W - 4, 89, R(0xc89878, 0xf0c8a8, 0xfae4cc), 51);
  zocalo(pm, 2, H - 2, W - 4, 6, TRIM.vino);
  clayRoof(pm, 1, 2, W - 2, wy - 2, 5);
  // cornisa entre pisos
  for (const fy of [wy + 30, wy + 58]) {
    pm.hline(2, W - 3, fy, WHITE_WALL[2]);
    pm.hline(2, W - 3, fy + 1, WHITE_WALL[0]);
  }
  for (const fy of [wy + 8, wy + 36]) {
    for (const wx of [10, 30, 56, 76]) litWindow(pm, wx, fy, 9, 13, TRIM.vino, lights, { shutters: false });
    balcony(pm, 6, fy + 18, 34, TRIM.verde);
    balcony(pm, 52, fy + 18, 38, TRIM.verde);
  }
  // locales del primer piso
  const sy = H - 26;
  for (const sx of [6, 66]) {
    pm.rect(sx, sy, 24, 22, C(0x3a3028));
    litWindow(pm, sx + 2, sy + 2, 20, 10, TRIM.vino, lights, { shutters: false, bars: false });
    pm.rect(sx, sy + 14, 24, 8, TRIM.vino[1]);
    for (let x = sx + 1; x < sx + 24; x += 3) pm.vline(x, sy + 14, sy + 21, TRIM.vino[0]);
  }
  door(pm, W / 2, H - 2, 14, 22, TRIM.vino, lights);
  for (const fx of [34, 60]) flowerPot(pm, fx, wy + 22, 0xf04860);
  pm.outline(INK);
  return { pm, lights };
}

function buildIglesia(): Built {
  const pm = canvas('iglesia', 48);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const gold = C(0xf0c040);
  // nave con tejado a dos aguas, cumbrera vertical
  const nx0 = 24, nx1 = W - 25, ny0 = 40, fy = H - 46;
  pm.rect(nx0, ny0, nx1 - nx0 + 1, fy - ny0 + 4, CLAY[1]);
  const mid = (nx0 + nx1) / 2;
  for (let y = ny0 + 2; y < fy + 2; y += 4) {
    pm.hline(nx0, nx1, y, CLAY[0]);
    pm.hline(nx0, nx1, y + 1, CLAY[2]);
    for (let x = nx0 + ((y >> 2) % 2) * 3; x < nx1; x += 6) pm.vline(x, y + 1, y + 3, CLAY[0]);
  }
  pm.rect(Math.ceil(mid), ny0, Math.floor((nx1 - nx0) / 2), fy - ny0 + 4, C(0x000000, 50));
  pm.vline(Math.round(mid), ny0, fy + 3, C(0x5a1c12));
  pm.vline(Math.round(mid) - 1, ny0, fy + 3, C(0xe88a60));
  // fachada con frontón
  wall(pm, nx0, fy, nx1 - nx0 + 1, 45, WHITE_WALL, 61);
  pm.polygon([[nx0 - 1, fy + 2], [mid, fy - 16], [nx1 + 2, fy + 2]], WHITE_WALL[1]);
  pm.line(nx0 - 1, fy + 1, mid, fy - 16, 1, WHITE_WALL[0]);
  pm.line(mid, fy - 16, nx1 + 1, fy + 1, 1, WHITE_WALL[0]);
  pm.hline(nx0, nx1, fy + 2, WHITE_WALL[0]);
  pm.hline(nx0, nx1, fy + 3, WHITE_WALL[2]);
  cross(pm, Math.round(mid), fy - 26, 10, gold);
  // rosetón encendido
  pm.circle(mid, fy - 4, 5, C(0x6a5a48));
  pm.circle(mid, fy - 4, 4, GLASS_MID);
  pm.circle(mid, fy - 4, 2, C(0xd04a8a));
  pm.set(Math.round(mid) - 1, fy - 5, GLASS_TOP);
  lights.push([Math.round(mid), fy - 4]);
  door(pm, mid + 0.5, H - 2, 16, 26, TRIM.cafe, lights, true);
  pm.ellipse(mid, H - 28, 9, 5, C(0x5a4a3a));
  pm.ellipse(mid, H - 27, 7, 4, GLASS_MID);
  for (const wx of [32, 72]) litWindow(pm, wx, fy + 14, 7, 14, TRIM.cafe, lights, { shutters: false, bars: false, arch: true });
  // escalinata
  pm.rect(nx0 - 2, H - 3, nx1 - nx0 + 5, 2, STONE[1]);
  pm.hline(nx0 - 2, nx1 + 2, H - 3, STONE[2]);
  // torres
  for (const tx of [2, W - 26]) {
    const tw = 24, ty = 26;
    wall(pm, tx, ty, tw, H - ty - 2, WHITE_WALL, 62 + tx);
    for (const yy of [ty + 22, ty + 50]) {
      pm.hline(tx - 1, tx + tw, yy, WHITE_WALL[2]);
      pm.hline(tx - 1, tx + tw, yy + 1, WHITE_WALL[0]);
    }
    // campanario
    pm.ellipse(tx + tw / 2, ty + 10, 6, 6, C(0x2a2020));
    pm.rect(tx + tw / 2 - 6, ty + 10, 12, 9, C(0x2a2020));
    pm.ellipse(tx + tw / 2, ty + 13, 3.5, 3, C(0xc89030));
    pm.rect(tx + tw / 2 - 4, ty + 15, 8, 2, C(0xc89030));
    pm.set(tx + tw / 2 - 2, ty + 12, C(0xf8e080));
    pm.vline(tx + tw / 2, ty + 5, ty + 10, C(0x5a4a3a));
    litWindow(pm, tx + tw / 2 - 3, ty + 30, 6, 10, TRIM.cafe, lights, { shutters: false, bars: false, arch: true });
    wallLamp(pm, tx + tw / 2 - 1, ty + 60, lights);
    // cúpula
    pm.ellipse(tx + tw / 2, ty, 12, 9, C(0xb4482c));
    pm.rect(tx, ty, tw, 2, WHITE_WALL[2]);
    pm.ellipse(tx + tw / 2 - 3, ty - 3, 4, 3, CLAY[2]);
    for (let k = -8; k <= 8; k += 4) pm.line(tx + tw / 2 + k * 0.5, ty - 8, tx + tw / 2 + k, ty, 1, CLAY[0]);
    pm.rect(tx - 1, ty, tw + 2, 2, WHITE_WALL[2]);
    pm.hline(tx - 1, tx + tw, ty + 2, WHITE_WALL[0]);
    cross(pm, tx + tw / 2, ty - 18, 10, gold);
    pm.circle(tx + tw / 2 - 0.5, ty - 8, 1.5, gold);
  }
  pm.outline(INK);
  return { pm, lights };
}

function buildCapilla(): Built {
  const pm = canvas('capilla', 30);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const wy = H - 46;
  clayRoof(pm, 4, 30, W - 8, wy - 28, 3);
  wall(pm, 6, wy, W - 12, 45, WHITE_WALL, 71);
  // espadaña con campana
  pm.polygon([[16, wy + 2], [16, 16], [W / 2, 6], [W - 16, 16], [W - 16, wy + 2]], WHITE_WALL[1]);
  pm.vline(16, 16, wy, WHITE_WALL[2]);
  pm.vline(W - 17, 16, wy, WHITE_WALL[0]);
  pm.ellipse(W / 2, 20, 6, 6, C(0x2a2020));
  pm.rect(W / 2 - 6, 20, 12, 9, C(0x2a2020));
  pm.ellipse(W / 2, 22, 3.5, 3, C(0xc89030));
  pm.rect(W / 2 - 4, 24, 8, 2, C(0xc89030));
  pm.set(W / 2 - 2, 21, C(0xf8e080));
  cross(pm, W / 2, 0, 9, C(0x3a3a3a));
  pm.hline(14, W - 15, wy + 1, WHITE_WALL[0]);
  zocalo(pm, 6, H - 2, W - 12, 6, R(0x5a5a62, 0x7a7a84, 0xa0a0a8));
  door(pm, W / 2, H - 2, 12, 22, TRIM.cafe, lights, true);
  pm.circle(W / 2, wy + 9, 3, C(0x6a5a48));
  pm.circle(W / 2, wy + 9, 2, GLASS_MID);
  lights.push([W / 2, wy + 9]);
  for (const vx of [10, W - 14]) {
    pm.rect(vx, H - 9, 4, 6, C(0xf4f0e0));
    pm.set(vx + 1, H - 10, C(0xffd040));
    pm.set(vx + 1, H - 11, C(0xfff4a0));
    lights.push([vx + 1, H - 10]);
  }
  pm.outline(INK);
  return { pm, lights };
}

function buildFinca(): Built {
  const pm = canvas('finca', 14);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const wy = H - 44;
  wall(pm, 4, wy, W - 8, 34, WHITE_WALL, 81);
  zocalo(pm, 4, wy + 33, W - 8, 6, TRIM.roja);
  // corredor: piso de baldosa y barandal
  pm.rect(2, H - 12, W - 4, 10, C(0xb05a3a));
  for (let x = 2; x < W - 2; x += 6) pm.vline(x, H - 12, H - 3, C(0x8a4028));
  pm.hline(2, W - 3, H - 12, C(0xd07a50));
  for (const wx of [12, 36, 66, 90]) litWindow(pm, wx, wy + 12, 10, 12, TRIM.roja, lights);
  door(pm, W / 2, wy + 33, 12, 22, TRIM.roja, lights);
  clayRoof(pm, 1, 2, W - 2, wy - 2, 6);
  // alero largo del corredor con pilares
  pm.rect(1, wy - 2, W - 2, 5, CLAY[1]);
  pm.hline(1, W - 2, wy - 2, CLAY[2]);
  pm.hline(1, W - 2, wy + 2, C(0x3a160c));
  pm.rect(1, wy + 3, W - 2, 3, C(0x000000, 70));
  for (const px of [3, 30, 54, 78, W - 7]) {
    pm.rect(px, wy + 3, 4, H - wy - 6, WOOD[1]);
    pm.vline(px, wy + 3, H - 4, WOOD[2]);
    pm.vline(px + 3, wy + 3, H - 4, WOOD[0]);
  }
  // barandal con macetas de geranios
  for (const [a, b] of [[7, 29], [83, W - 8]] as const) {
    pm.rect(a, H - 20, b - a + 1, 2, WOOD[1]);
    for (let x = a + 1; x < b; x += 3) pm.vline(x, H - 18, H - 13, WOOD[0]);
    for (let x = a + 1; x < b - 4; x += 8) flowerPot(pm, x, H - 26, 0xe83050);
  }
  // bultos de café
  for (const [sx, sy] of [[36, H - 18], [42, H - 18], [39, H - 23]] as const) {
    pm.rect(sx, sy, 6, 6, C(0xc8b080));
    pm.hline(sx, sx + 5, sy, C(0xe8d4a8));
    pm.hline(sx + 1, sx + 4, sy + 3, C(0x2a7a34));
    pm.rectOutline(sx - 1, sy - 1, 8, 8, INK);
  }
  wallLamp(pm, 64, wy + 6, lights);
  signboard(pm, W / 2 + 26, wy - 1 + 6 - 6 + 2, 'LA ESPERANZA', R(0x4a2c16, 0x7a4a24, 0xa8703c), C(0xf8e8c0), 2);
  pm.outline(INK);
  return { pm, lights };
}

function buildTrapiche(): Built {
  const pm = canvas('trapiche', 12);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const ry = 2, rh = 40;
  // interior oscuro del galpón
  pm.rect(4, ry + rh, W - 8, H - ry - rh - 2, C(0x2a1e18));
  pm.rect(4, H - 10, W - 8, 8, C(0x5a4030));
  // pared trasera de tablas
  for (let x = 5; x < W - 5; x += 4) pm.vline(x, ry + rh, H - 11, C(0x3a2a20));
  // molino de hierro con engranajes
  pm.rect(14, H - 30, 22, 20, C(0x4a4a50));
  pm.rect(14, H - 30, 22, 2, C(0x7a7a84));
  for (const gy of [H - 26, H - 19]) {
    pm.circle(25, gy, 4, C(0x6a6a74));
    pm.circle(25, gy, 2, C(0x2a2a30));
    for (let a = 0; a < 8; a++) pm.set(25 + Math.round(Math.cos(a) * 5), gy + Math.round(Math.sin(a) * 5), C(0x8a8a94));
  }
  pm.line(36, H - 26, 44, H - 34, 2, WOOD[1]);
  // horno con paila de cobre y fuego
  pm.rect(52, H - 20, 30, 18, C(0x8a4a30));
  for (let x = 52; x < 82; x += 5) pm.vline(x, H - 20, H - 3, C(0x6a3420));
  pm.hline(52, 81, H - 14, C(0x6a3420));
  pm.ellipse(66, H - 21, 13, 4, C(0xc87a3a));
  pm.ellipse(66, H - 21, 10, 2.5, C(0xb07020));
  pm.ellipse(64, H - 22, 5, 1, C(0xf0b050));
  pm.rect(60, H - 10, 12, 7, C(0x1a0a08));
  pm.rect(62, H - 8, 8, 5, C(0xf08020));
  pm.rect(64, H - 7, 4, 4, C(0xffe060));
  lights.push([66, H - 6], [66, H - 22]);
  // vapor
  for (const [vx, vy] of [[60, H - 28], [70, H - 31], [64, H - 35]] as const) pm.circle(vx, vy, 2, C(0xe8e8e8, 120));
  // atados de caña y gaveras de panela
  for (let i = 0; i < 6; i++) pm.line(5 + i, H - 3, 9 + i * 2, H - 24, 1, i % 2 ? C(0x6a9a30) : C(0x8ab040));
  for (let i = 0; i < 3; i++) {
    pm.rect(84 + (i % 2) * 2, H - 6 - i * 4, 6, 3, C(0xa86a20));
    pm.hline(84 + (i % 2) * 2, 89 + (i % 2) * 2, H - 6 - i * 4, C(0xd8963a));
  }
  // postes y techo
  for (const px of [2, W / 2 - 2, W - 6]) {
    pm.rect(px, ry + rh, 4, H - ry - rh - 2, WOOD[1]);
    pm.vline(px, ry + rh, H - 3, WOOD[2]);
    pm.vline(px + 3, ry + rh, H - 3, WOOD[0]);
  }
  clayRoof(pm, 1, ry, W - 2, rh, 5);
  pm.rect(4, ry + rh + 2, W - 8, 4, C(0x000000, 90));
  wallLamp(pm, W / 2 + 6, ry + rh + 5, lights);
  pm.outline(INK);
  return { pm, lights };
}

const buildingCache = new Map<BuildingKind, Built>();

function makeBuilding(kind: BuildingKind): Built {
  let b = buildingCache.get(kind);
  if (b) return b;
  switch (kind) {
    case 'cantina': b = buildCantina(); break;
    case 'iglesia': b = buildIglesia(); break;
    case 'tienda': b = buildTienda(); break;
    case 'alcaldia': b = buildAlcaldia(); break;
    case 'edificio': b = buildEdificio(); break;
    case 'finca': b = buildFinca(); break;
    case 'trapiche': b = buildTrapiche(); break;
    case 'capilla': b = buildCapilla(); break;
    default: b = buildCasa(kind);
  }
  buildingCache.set(kind, b);
  return b;
}

/** dibujo a 16 px por baldosa: ancho = w*16; alto >= h*16 (el techo puede sobresalir arriba); se alinea por abajo */
export function buildBuilding(kind: BuildingKind): Pixmap {
  return makeBuilding(kind).pm.clone();
}

/** puntos (x, y) en píxeles del Pixmap donde hay ventanas/faroles encendidos, para ponerles luz de noche */
export function buildingLights(kind: BuildingKind): [number, number][] {
  return makeBuilding(kind).lights.map(([x, y]) => [x, y]);
}

// ---------- adornos ----------

export type PropKind =
  | 'farol' | 'fuente' | 'banca' | 'lapida' | 'cruz' | 'cerca' | 'barril' | 'mula'
  | 'cafeto' | 'platanera' | 'palma' | 'roca' | 'tronco' | 'chiva' | 'mesa';

export const PROP_FOOTPRINT: Record<PropKind, [number, number]> = {
  farol: [1, 1], fuente: [3, 3], banca: [2, 1], lapida: [1, 1], cruz: [1, 1], cerca: [1, 1],
  barril: [1, 1], mula: [2, 1], cafeto: [1, 1], platanera: [1, 1], palma: [1, 1], roca: [1, 1],
  tronco: [2, 1], chiva: [5, 3], mesa: [2, 1],
};

const IRON = R(0x14141c, 0x2c2c38, 0x50505e);
const LEAF = R(0x174a22, 0x2a7a34, 0x58b048);

function propFarol(l: Pt[]): Pixmap {
  const pm = new Pixmap(16, 46);
  pm.rect(4, 40, 8, 5, STONE[1]);
  pm.hline(4, 11, 40, STONE[2]);
  pm.vline(11, 41, 44, STONE[0]);
  pm.rect(6, 37, 4, 3, IRON[1]);
  pm.rect(7, 16, 2, 22, IRON[1]);
  pm.vline(7, 16, 37, IRON[2]);
  pm.rect(6, 24, 4, 2, IRON[1]);
  // farol de cuatro vidrios
  pm.rect(5, 15, 6, 2, IRON[1]);
  pm.rect(4, 7, 8, 8, IRON[0]);
  pm.rect(5, 8, 6, 6, C(0xffd050));
  pm.rect(6, 9, 4, 3, C(0xfff6c0));
  pm.vline(7, 8, 13, C(0xe8a030));
  pm.polygon([[3, 7], [8, 2], [13, 7]], IRON[1]);
  pm.hline(3, 12, 6, IRON[2]);
  pm.set(8, 1, IRON[2]);
  l.push([8, 11]);
  pm.outline(INK);
  return pm;
}

function propFuente(): Pixmap {
  const pm = new Pixmap(48, 56);
  const water = R(0x1c4a8a, 0x2f6fc8, 0x8ac0f8);
  pm.ellipse(24, 42, 23, 13, STONE[0]);
  pm.ellipse(24, 40, 23, 12, STONE[1]);
  pm.ellipse(24, 38, 21, 10, STONE[2]);
  pm.ellipse(24, 39, 18, 8, water[1]);
  pm.ellipse(24, 41, 16, 5, water[0]);
  for (const [x, y] of [[12, 38], [30, 36], [20, 43], [34, 42]] as const) pm.hline(x, x + 3, y, water[2]);
  // pila central
  pm.rect(21, 22, 6, 18, STONE[1]);
  pm.vline(21, 22, 39, STONE[2]);
  pm.vline(26, 22, 39, STONE[0]);
  pm.ellipse(24, 39, 5, 2, C(0xb8e0ff, 160));
  pm.ellipse(24, 21, 11, 4, STONE[0]);
  pm.ellipse(24, 20, 11, 3, STONE[2]);
  pm.ellipse(24, 20, 8, 2, water[1]);
  pm.rect(22, 10, 4, 10, STONE[1]);
  pm.ellipse(24, 10, 4, 2, STONE[2]);
  // chorros
  for (const d of [-1, 1]) {
    for (let t = 0; t <= 14; t++) {
      const x = 24 + d * (2 + t * 0.9);
      const y = 8 + (t - 5) * (t - 5) * 0.32 - 8 + 8;
      pm.set(Math.round(x), Math.round(y), water[2]);
    }
    for (let t = 0; t <= 10; t++) pm.set(24 + d * (11 + t * 0.5), 22 + t * 1.5, C(0x8ac0f8, 200));
  }
  pm.set(24, 6, C(0xffffff)); pm.set(23, 7, water[2]);
  pm.outline(INK);
  return pm;
}

function propBanca(): Pixmap {
  const pm = new Pixmap(32, 22);
  for (const x of [4, 26]) { pm.rect(x, 12, 2, 9, IRON[1]); pm.set(x - 1, 20, IRON[1]); pm.set(x + 2, 20, IRON[1]); }
  pm.rect(2, 2, 28, 3, WOOD[1]); pm.hline(2, 29, 2, WOOD[2]);
  pm.rect(2, 6, 28, 3, WOOD[1]); pm.hline(2, 29, 6, WOOD[2]); pm.hline(2, 29, 8, WOOD[0]);
  pm.rect(1, 11, 30, 4, WOOD[1]); pm.hline(1, 30, 11, WOOD[2]); pm.hline(1, 30, 14, WOOD[0]);
  pm.hline(1, 30, 13, WOOD[0]);
  for (const x of [5, 26]) pm.vline(x, 1, 11, IRON[1]);
  pm.rect(2, 15, 28, 2, C(0x000000, 60));
  pm.outline(INK);
  return pm;
}

function propLapida(): Pixmap {
  const pm = new Pixmap(16, 22);
  pm.ellipse(8, 19, 7, 2.5, C(0x2a5a28));
  pm.rect(3, 6, 10, 14, STONE[1]);
  pm.ellipse(8, 6, 5, 4, STONE[1]);
  pm.vline(3, 5, 19, STONE[2]); pm.hline(5, 10, 2, STONE[2]);
  pm.vline(12, 5, 19, STONE[0]);
  pm.vline(8, 6, 12, STONE[0]); pm.hline(6, 10, 8, STONE[0]);
  pm.hline(5, 11, 14, STONE[0]); pm.hline(5, 9, 16, STONE[0]);
  pm.set(11, 4, C(0x6a8a50)); pm.set(4, 18, C(0x4a7a3a)); pm.set(5, 17, C(0x4a7a3a));
  pm.set(13, 19, C(0xf8f8f8)); pm.set(14, 18, C(0xf8f8f8)); pm.set(13, 18, C(0xf8e048));
  pm.outline(INK);
  return pm;
}

function propCruz(): Pixmap {
  const pm = new Pixmap(16, 28);
  pm.ellipse(8, 24, 7, 3.5, C(0x5a3e24));
  pm.ellipse(7, 23, 5, 2, C(0x7a5634));
  pm.rect(7, 2, 3, 22, WOOD[1]); pm.vline(7, 2, 23, WOOD[2]); pm.vline(9, 2, 23, WOOD[0]);
  pm.rect(2, 7, 13, 3, WOOD[1]); pm.hline(2, 14, 7, WOOD[2]); pm.hline(2, 14, 9, WOOD[0]);
  pm.rect(4, 11, 3, 1, C(0xe8e0d0)); pm.set(4, 12, C(0xd02040));
  pm.outline(INK);
  return pm;
}

function propCerca(): Pixmap {
  const pm = new Pixmap(16, 20);
  for (const x of [1, 13]) {
    pm.rect(x, 2, 3, 17, WOOD[1]); pm.vline(x, 2, 18, WOOD[2]); pm.vline(x + 2, 2, 18, WOOD[0]);
    pm.hline(x, x + 2, 2, C(0xc8945c));
  }
  for (const y of [6, 12]) { pm.rect(0, y, 16, 3, WOOD[1]); pm.hline(0, 15, y, WOOD[2]); pm.hline(0, 15, y + 2, WOOD[0]); }
  pm.set(7, 7, WOOD[0]); pm.set(9, 13, WOOD[0]);
  pm.outline(INK);
  return pm;
}

function propBarril(): Pixmap {
  const pm = new Pixmap(16, 20);
  pm.ellipse(8, 11, 6.5, 8, WOOD[1]);
  pm.rect(2, 4, 12, 14, WOOD[1]);
  for (let x = 4; x < 13; x += 3) pm.vline(x, 4, 17, WOOD[0]);
  pm.vline(2, 4, 17, WOOD[2]); pm.vline(13, 4, 17, WOOD[0]);
  for (const y of [6, 15]) { pm.hline(2, 13, y, IRON[1]); pm.hline(2, 13, y + 1, IRON[2]); }
  pm.ellipse(8, 3.5, 6, 2.5, C(0xa8703c));
  pm.ellipse(8, 3.5, 4, 1.5, C(0x8a5a2e));
  pm.outline(INK);
  return pm;
}

function propMula(): Pixmap {
  const pm = new Pixmap(32, 32);
  const hide = R(0x3a2418, 0x6a4430, 0x8e6448);
  // patas
  for (const [x, d] of [[7, 0], [10, 1], [21, 0], [24, 1]] as const) {
    pm.rect(x, 21, 3, 9, d ? hide[0] : hide[1]);
    pm.rect(x, 28, 3, 2, C(0x1a1410));
  }
  // cuerpo, cuello y cabeza
  pm.ellipse(16, 17, 12, 6, hide[1]);
  pm.hline(6, 25, 12, hide[2]);
  pm.ellipse(16, 21, 9, 2, hide[0]);
  pm.polygon([[23, 15], [26, 6], [30, 7], [28, 17]], hide[1]);
  pm.ellipse(29, 9, 3, 4, hide[1]);
  pm.rect(28, 10, 4, 4, C(0x8a7060));
  pm.set(30, 12, INK);
  pm.set(28, 7, INK);
  // orejas largas
  pm.polygon([[25, 6], [24, 0], [27, 5]], hide[1]);
  pm.polygon([[27, 5], [28, 0], [29, 5]], hide[0]);
  pm.vline(25, 6, 13, C(0x1a1410));
  // cola
  pm.line(4, 14, 2, 22, 1, C(0x1a1410));
  // enjalma y carga (costales y bultos con cabuya)
  pm.rect(10, 9, 12, 5, C(0xc8302c));
  pm.hline(10, 21, 9, C(0xf05a48));
  pm.rect(7, 11, 8, 9, C(0xc8b080)); pm.hline(7, 14, 11, C(0xe8d4a8)); pm.vline(14, 11, 19, C(0x9a8460));
  pm.rect(17, 11, 8, 9, C(0x8a6a3a)); pm.hline(17, 24, 11, C(0xa8885a)); pm.vline(24, 11, 19, C(0x6a4a2a));
  pm.hline(7, 24, 15, C(0x5a3a1a));
  pm.rect(11, 5, 9, 4, C(0xd8c8a0)); pm.hline(11, 19, 5, C(0xf0e4c0));
  pm.outline(INK);
  return pm;
}

function propCafeto(): Pixmap {
  const pm = new Pixmap(16, 26);
  const rnd = seededRandom(91);
  pm.vline(8, 16, 25, WOOD[0]);
  for (const [cx, cy, r] of [[8, 16, 7], [5, 11, 5], [11, 10, 5], [8, 6, 5]] as const) pm.ellipse(cx, cy, r, r * 0.8, LEAF[0]);
  for (let i = 0; i < 26; i++) {
    const x = 2 + Math.floor(rnd() * 12), y = 3 + Math.floor(rnd() * 18);
    if (pm.alpha(x, y)) { pm.set(x, y, LEAF[rnd() < 0.5 ? 1 : 2]); pm.set(x + 1, y, LEAF[1]); }
  }
  for (let i = 0; i < 12; i++) {
    const x = 3 + Math.floor(rnd() * 10), y = 6 + Math.floor(rnd() * 14);
    if (!pm.alpha(x, y)) continue;
    pm.set(x, y, C(0xd02028));
    pm.set(x, y - 1, C(0xff6050));
    if (rnd() < 0.5) pm.set(x + 1, y, C(0x8a1018));
  }
  pm.outline(INK);
  return pm;
}

function propPlatanera(): Pixmap {
  const pm = new Pixmap(36, 48);
  pm.rect(16, 22, 5, 25, C(0x6a8a3a));
  pm.vline(16, 22, 46, C(0x9ab858));
  pm.vline(20, 22, 46, C(0x4a6a2a));
  for (let y = 26; y < 46; y += 5) pm.hline(17, 19, y, C(0x8a7040));
  // hoja: curva cuadrática con nervio central, borde claro y punta caída
  const leaf = (tx: number, ty: number, cx: number, cy: number, w: number, dry = false) => {
    const ox = 18, oy = 22;
    const ramp = dry ? R(0x6a5a20, 0x9a8a40, 0xc0b060) : LEAF;
    const pts: [number, number, number][] = [];
    for (let t = 0; t <= 1.0001; t += 0.03) {
      const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      pts.push([a * ox + b * cx + c * tx, a * oy + b * cy + c * ty, w * Math.sin(Math.min(1, t * 1.15) * Math.PI) + 0.5]);
    }
    for (const [x, y, r] of pts) pm.ellipse(x, y, r, r * 0.75, ramp[1]);
    for (const [x, y, r] of pts) pm.set(Math.round(x), Math.round(y - r * 0.6), ramp[2]);
    for (const [x, y, r] of pts) pm.set(Math.round(x), Math.round(y + r * 0.6), ramp[0]);
    for (const [x, y] of pts) pm.set(Math.round(x), Math.round(y), C(0xa8d878));
  };
  leaf(2, 30, 4, 14, 3, true);
  leaf(1, 22, 6, 6, 3.5);
  leaf(35, 24, 30, 6, 3.5);
  leaf(10, 2, 12, 6, 3);
  leaf(28, 2, 24, 4, 3);
  leaf(19, 0, 18, 8, 2.5);
  // racimo y bellota morada
  pm.line(14, 23, 11, 27, 1, C(0x4a6a2a));
  pm.ellipse(11, 31, 4, 5, C(0x5a8a28));
  for (let y = 27; y < 36; y += 2) { pm.hline(8, 14, y, C(0x8ab840)); pm.set(8, y + 1, C(0x3a5a1a)); }
  pm.ellipse(11, 39, 2, 3, C(0x7a2a5a));
  pm.set(10, 38, C(0xa84a80));
  pm.outline(INK);
  return pm;
}

function propPalma(): Pixmap {
  const pm = new Pixmap(44, 104);
  const cx = 22;
  // tallo altísimo de palma de cera: blanquecino, con anillos y algo más grueso abajo
  for (let y = 20; y < 103; y++) {
    const half = y > 92 ? 2 : 1;
    pm.hline(cx - half, cx + 1 + half, y, C(0xd0ccb8));
    pm.set(cx - half, y, C(0xf0ecdc));
    pm.set(cx + 1 + half, y, C(0x8a8676));
    if (y % 5 === 0) pm.hline(cx - half, cx + 1 + half, y, C(0xa09c8a));
  }
  pm.rect(cx - 2, 17, 6, 6, C(0x5a7a34));
  pm.hline(cx - 2, cx + 3, 17, C(0x8ab050));
  const frond = (ang: number, len: number, droop: number) => {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let px = cx, py = 18;
    for (let t = 0; t < len; t++) {
      const x = cx + 0.5 + dx * t, y = 18 + dy * t + (t * t * droop) / len;
      const nx = -(y - py), ny = x - px;
      const n = Math.hypot(nx, ny) || 1;
      if (t > 1) {
        const leafLen = Math.min(4, 1 + (len - t) * 0.35 + t * 0.15);
        for (const sg of [1, -1]) {
          pm.line(x, y, x + (sg * nx / n) * leafLen * 0.8, y + (sg * ny / n) * leafLen * 0.6 + leafLen * 0.6, 1, sg > 0 ? LEAF[1] : LEAF[0]);
        }
      }
      pm.set(Math.round(x), Math.round(y), C(0x9ac860));
      px = x; py = y;
    }
  };
  const fronds: [number, number, number][] = [
    [-2.9, 20, 1.6], [-0.25, 20, 1.6], [-2.4, 19, 1.0], [-0.75, 19, 1.0],
    [-1.9, 16, 0.5], [-1.25, 16, 0.5], [-1.57, 14, 0.2], [-3.3, 16, 2.2], [0.15, 16, 2.2],
  ];
  for (const [a, l, d] of fronds) frond(a, l, d);
  pm.ellipse(cx + 3, 22, 2, 2, C(0xd06030)); pm.set(cx + 2, 21, C(0xf09060));
  pm.outline(INK);
  return pm;
}

function propRoca(): Pixmap {
  const pm = new Pixmap(16, 14);
  pm.polygon([[1, 13], [2, 7], [6, 2], [11, 3], [15, 8], [15, 13]], STONE[1]);
  pm.polygon([[2, 8], [6, 2], [9, 3], [6, 8]], STONE[2]);
  pm.polygon([[10, 6], [15, 9], [15, 13], [9, 13]], STONE[0]);
  pm.line(6, 8, 9, 12, 1, STONE[0]);
  pm.set(4, 11, C(0x4a7a3a)); pm.set(5, 12, C(0x4a7a3a)); pm.set(11, 4, C(0x6a8a50));
  pm.outline(INK);
  return pm;
}

function propTronco(): Pixmap {
  const pm = new Pixmap(32, 16);
  pm.rect(3, 4, 24, 9, WOOD[1]);
  pm.hline(3, 26, 4, WOOD[2]); pm.hline(3, 26, 5, WOOD[2]);
  pm.hline(3, 26, 12, WOOD[0]);
  for (const [x, y] of [[6, 7], [12, 9], [18, 7], [22, 10]] as const) pm.hline(x, x + 4, y, WOOD[0]);
  pm.ellipse(27.5, 8.5, 3.5, 5, C(0xc8945c));
  pm.ellipse(27.5, 8.5, 2, 3, C(0xa8703c));
  pm.set(27, 8, WOOD[0]);
  pm.ellipse(3, 8.5, 2, 4.5, WOOD[0]);
  pm.rect(8, 3, 7, 2, C(0x4a8a3a)); pm.set(10, 2, C(0x6ab050)); pm.set(9, 3, C(0x6ab050));
  pm.line(16, 4, 19, 0, 1, WOOD[0]);
  pm.set(13, 13, C(0xf0e0c0)); pm.set(14, 13, C(0xd04020));
  pm.outline(INK);
  return pm;
}

function propChiva(l: Pt[]): Pixmap {
  const pm = new Pixmap(80, 62);
  const top = 14, body = 30;
  // parrilla del techo con trasteo
  pm.rect(4, top, 72, 4, C(0xe8c020));
  pm.hline(4, 75, top, C(0xf8e870));
  for (let x = 4; x < 76; x += 4) pm.vline(x, top - 4, top, IRON[1]);
  pm.hline(4, 75, top - 4, IRON[2]);
  const bundles: [number, number, number, number, number][] = [[8, 2, 12, 10, 0xc8b080], [21, 5, 10, 7, 0x2c64b0], [32, 0, 9, 12, 0x8a6a3a], [42, 6, 14, 6, 0xc82020], [58, 3, 8, 9, 0x24803e]];
  for (const [x, y, w, h, c] of bundles) {
    pm.rect(x, y, w, h, C(c));
    pm.hline(x, x + w - 1, y, C(0xffffff, 90));
    pm.hline(x, x + w - 1, y + h - 1, C(0x000000, 80));
    pm.rectOutline(x - 1, y - 1, w + 2, h + 2, INK);
  }
  pm.ellipse(70, 9, 4, 3, C(0x5a8a30)); pm.ellipse(69, 8, 2, 1, C(0x8ab850));
  // carrocería de madera pintada
  pm.rect(4, top + 4, 66, body + 2, C(0xf4d020));
  const bands = [0xc82020, 0x2c64b0, 0x24803e, 0xf08020];
  bands.forEach((c, i) => pm.rect(4, top + 30 + i * 0 + (i > 1 ? 0 : 0) - 4 + i * 1.5 - 0, 66, 1, C(c)));
  pm.rect(4, top + 26, 66, 3, C(0xc82020));
  pm.rect(4, top + 29, 66, 2, C(0x2c64b0));
  pm.rect(4, top + 31, 66, 2, C(0x24803e));
  // ventanas sin vidrio con pasajeros a contraluz
  for (let i = 0; i < 6; i++) {
    const wx = 7 + i * 10;
    pm.rect(wx, top + 7, 8, 11, C(0xffc860));
    pm.rect(wx, top + 7, 8, 3, C(0xfff0a8));
    pm.rectOutline(wx - 1, top + 6, 10, 13, C(0x2c64b0));
    if (i % 2 === 0) { pm.ellipse(wx + 4, top + 13, 2.5, 3, C(0x3a2418)); pm.rect(wx + 1, top + 15, 6, 3, C(0x3a2418)); }
    pm.polygon([[wx + 1, top + 20], [wx + 4, top + 23], [wx + 7, top + 20]], C([0xc82020, 0x24803e, 0x2c64b0][i % 3]));
    if (i % 2 === 1) l.push([wx + 4, top + 12]);
  }
  // cabina y capó
  pm.rect(68, top + 10, 10, body - 6, C(0x2c64b0));
  pm.rect(70, top + 6, 6, 8, C(0xb8d8f0));
  pm.hline(68, 77, top + 10, C(0x5a94d8));
  pm.rect(76, top + 22, 3, 3, C(0xfff4b0));
  l.push([78, top + 23]);
  pm.rect(68, top + 26, 11, 6, C(0x9a9aa8));
  for (let y = top + 27; y < top + 32; y += 2) pm.hline(69, 77, y, C(0x5a5a68));
  pm.rect(2, top + 30, 4, 4, C(0x9a9aa8));
  // llantas
  for (const wx of [17, 60]) {
    pm.circle(wx, 54, 7, C(0x1a1a1e));
    pm.circle(wx, 54, 4, C(0x5a5a62));
    pm.circle(wx, 54, 2, C(0xc8c8d0));
    pm.ellipse(wx, 47, 9, 3, C(0x000000, 100));
  }
  pm.rect(4, 60, 74, 2, C(0x000000, 70));
  // escalera trasera
  for (let y = top + 4; y < top + 30; y += 4) pm.hline(2, 4, y, IRON[1]);
  pm.vline(2, top, top + 30, IRON[1]);
  pm.outline(INK);
  return pm;
}

function propMesa(l: Pt[]): Pixmap {
  const pm = new Pixmap(32, 26);
  for (const x of [2, 26]) {
    pm.rect(x, 18, 4, 6, WOOD[0]);
    pm.ellipse(x + 2, 17, 3, 1.5, WOOD[2]);
  }
  pm.rect(9, 12, 2, 12, WOOD[0]); pm.rect(21, 12, 2, 12, WOOD[0]);
  pm.rect(7, 9, 18, 5, WOOD[1]);
  pm.hline(7, 24, 9, WOOD[2]);
  pm.hline(7, 24, 13, WOOD[0]);
  // botella de aguardiente, copitas y vela
  pm.rect(12, 2, 3, 8, C(0x9ad0e8, 220)); pm.rect(13, 0, 1, 2, C(0xc82020));
  pm.rect(12, 5, 3, 2, C(0xc82020));
  pm.set(18, 8, C(0xd8f0ff)); pm.set(20, 8, C(0xd8f0ff)); pm.set(18, 7, C(0xd8f0ff)); pm.set(20, 7, C(0xd8f0ff));
  pm.rect(9, 6, 2, 3, C(0xf4f0e0)); pm.set(9, 5, C(0xffd040)); pm.set(9, 4, C(0xfff4a0));
  l.push([9, 5]);
  pm.outline(INK);
  return pm;
}

interface BuiltProp { pm: Pixmap; lights: Pt[] }
const propCache = new Map<PropKind, BuiltProp>();

function makeProp(kind: PropKind): BuiltProp {
  const cached = propCache.get(kind);
  if (cached) return cached;
  const l: Pt[] = [];
  const art: Record<PropKind, () => Pixmap> = {
    farol: () => propFarol(l), fuente: propFuente, banca: propBanca, lapida: propLapida, cruz: propCruz,
    cerca: propCerca, barril: propBarril, mula: propMula, cafeto: propCafeto, platanera: propPlatanera,
    palma: propPalma, roca: propRoca, tronco: propTronco, chiva: () => propChiva(l), mesa: () => propMesa(l),
  };
  const pm = art[kind]();
  const b = { pm, lights: l };
  propCache.set(kind, b);
  return b;
}

export function buildProp(kind: PropKind): Pixmap {
  return makeProp(kind).pm.clone();
}

export function propLights(kind: PropKind): [number, number][] {
  return makeProp(kind).lights.map(([x, y]) => [x, y]);
}

// ---------- pistas de los mitos ----------

export type ClueKind =
  | 'huella_pata' | 'sombrero' | 'oro' | 'burbujas' | 'huesos'
  | 'ramas' | 'diente' | 'escamas' | 'charco_lagrimas' | 'huella_caiman';

function footprint(pm: Pixmap, x: number, y: number, c: Rgba, rim: Rgba): void {
  pm.ellipse(x, y, 2, 3, rim);
  pm.ellipse(x, y, 1.5, 2.5, c);
  pm.ellipse(x, y + 5, 1.5, 1.5, rim);
  pm.set(x, y + 5, c);
}

export function buildClue(kind: ClueKind, frame: number): Pixmap {
  const pm = new Pixmap(16, 16);
  const f = frame % 2;
  const glint = (x: number, y: number) => {
    pm.set(x, y, C(0xffffff));
    pm.set(x - 1, y, C(0xfff4b0, 200)); pm.set(x + 1, y, C(0xfff4b0, 200));
    pm.set(x, y - 1, C(0xfff4b0, 200)); pm.set(x, y + 1, C(0xfff4b0, 200));
  };
  switch (kind) {
    case 'huella_pata': {
      // una sola pata, saltando: huellas de un solo pie en fila
      const mud = C(0x2a1a10, 200), rim = C(0x6a4a2a, 200);
      footprint(pm, 4, 2, mud, rim);
      footprint(pm, 10, 8, mud, rim);
      if (f) pm.set(11, 7, C(0x9ab0d0, 200));
      pm.ellipse(10, 15, 1, 0.5, C(0x6a4a2a, 140));
      break;
    }
    case 'sombrero': {
      pm.ellipse(8, 11, 7.5, 3.5, C(0x101014));
      pm.ellipse(8, 10.5, 6.5, 2.5, C(0x24242c));
      pm.rect(4, 4, 8, 7, C(0x18181e));
      pm.ellipse(8, 4, 4, 1.5, C(0x2c2c36));
      pm.hline(4, 11, 8, C(0x6a1420));
      pm.vline(4, 4, 10, C(0x3a3a46));
      pm.hline(2, 13, 12, C(0x3a3a46));
      if (f) glint(11, 9);
      pm.outline(C(0x000000, 160));
      break;
    }
    case 'oro': {
      pm.ellipse(8, 9, 7.5, 6, C(0x2f6fc8, 120));
      for (const [x, y] of [[3, 7], [8, 11], [12, 6], [6, 4]] as const) {
        pm.set(x, y, C(0xd8a020)); pm.set(x + 1, y, C(0xf8d050));
      }
      pm.hline(2, 6, 12, C(0x8ac0f8, 160));
      glint(f ? 12 : 4, f ? 6 : 7);
      if (f) pm.set(8, 11, C(0xffffff));
      break;
    }
    case 'burbujas': {
      const bub = (x: number, y: number, r: number) => {
        pm.circle(x, y, r, C(0xb8e0ff, 120));
        pm.circle(x, y, r - 0.6, C(0x2f6fc8, 60));
        pm.set(Math.round(x - r / 2), Math.round(y - r / 2), C(0xffffff));
      };
      pm.ellipse(8, 12, 7, 3, C(0x1c4a8a, 120));
      bub(5, f ? 9 : 11, 2.5);
      bub(10, f ? 5 : 7, 2);
      bub(11, f ? 12 : 13, 1.5);
      if (f) bub(7, 3, 1.2);
      break;
    }
    case 'huesos': {
      const bone = C(0xe8e0c8), bd = C(0xa89c80);
      pm.line(2, 12, 11, 5, 2, bone);
      for (const [x, y] of [[2, 12], [11, 5]] as const) { pm.circle(x, y, 1.5, bone); pm.set(x + 1, y + 1, bd); }
      pm.line(5, 4, 13, 13, 1, bone);
      pm.set(13, 13, bd); pm.set(5, 4, bd);
      pm.circle(4, 5, 2.5, bone);
      pm.set(3, 5, INK); pm.set(5, 5, INK); pm.hline(3, 5, 7, bd);
      if (f) glint(12, 6);
      pm.outline(C(0x1a1016, 200));
      break;
    }
    case 'ramas': {
      const br = C(0x4e3018), brl = C(0x7a4a24), moss = C(0x4a8a3a);
      pm.line(1, 12, 9, 8, 1, br); pm.line(9, 8, 14, 11, 1, brl);
      pm.line(4, 3, 8, 9, 1, br); pm.line(10, 3, 12, 7, 1, brl);
      pm.set(9, 7, C(0xc8a070));
      for (const [x, y] of [[2, 13], [3, 12], [6, 4], [12, 12], [13, 4], [7, 13]] as const) pm.set(x, y, moss);
      pm.set(f ? 11 : 4, f ? 2 : 13, C(0x6ab050));
      pm.ellipse(11, 13, 2, 1, C(0x2a7a34));
      break;
    }
    case 'diente': {
      // muela enorme con dos raíces y una gota de sangre
      const t = C(0xf4f0e0), td = C(0xc0b89c), tl = C(0xffffff);
      pm.ellipse(8, 10, 6, 2, C(0x000000, 70));
      pm.polygon([[3, 4], [13, 4], [13, 8], [11, 10], [11, 14], [9, 14], [8, 10], [7, 14], [5, 14], [5, 10], [3, 8]], t);
      pm.ellipse(5, 4, 2.2, 2, t); pm.ellipse(11, 4, 2.2, 2, t); pm.ellipse(8, 4, 1.5, 1.2, t);
      pm.vline(12, 4, 8, td); pm.vline(10, 10, 13, td); pm.vline(6, 11, 13, td);
      pm.hline(4, 6, 3, tl); pm.set(4, 4, tl); pm.set(10, 3, tl);
      pm.set(8, 3, td);
      pm.outline(C(0x1a1016, 230));
      pm.set(10, 14, C(0xa01020)); pm.set(10, 15, C(0xd02030));
      if (f) glint(5, 6);
      break;
    }
    case 'escamas': {
      const sc = (x: number, y: number) => {
        pm.ellipse(x, y, 2, 1.5, C(0xb08018));
        pm.hline(x - 1, x, y - 1, C(0xf8d050));
        pm.set(x + 1, y + 1, C(0x6a4a10));
      };
      for (const [x, y] of [[4, 4], [9, 6], [5, 10], [11, 11], [13, 4]] as const) sc(x, y);
      glint(f ? 9 : 4, f ? 6 : 4);
      break;
    }
    case 'charco_lagrimas': {
      pm.ellipse(8, 10, 7, 4, C(0x3a6ab0, 170));
      pm.ellipse(7, 9, 5, 2.5, C(0x6a9ad8, 170));
      pm.hline(4, 6, 8, C(0xd8ecff, 220));
      const ry = f ? 4 : 5;
      pm.ellipse(8, 10, f ? 4 : 2, f ? 2 : 1, C(0xd8ecff, 0));
      pm.set(10, ry - 3 + f * 3, C(0xb8dcff));
      pm.set(10, ry - 2 + f * 3, C(0xd8ecff));
      if (f) { pm.hline(5, 11, 13, C(0xb8dcff, 160)); pm.set(4, 12, C(0xb8dcff, 160)); pm.set(12, 12, C(0xb8dcff, 160)); }
      else pm.set(10, 1, C(0xffffff));
      break;
    }
    default: {
      // huella de caimán: palma ovalada, cuatro dedos con garra y el arrastre de la cola
      const mud = C(0x2a1a10, 210), rim = C(0x6a4a2a, 180), claw = C(0xe8e0c8, 220);
      for (let y = 0; y < 16; y++) {
        const x = 8 + Math.round(Math.sin(y / 2.6) * 1.5);
        pm.set(x, y, C(0x3a2a18, 120)); pm.set(x + 1, y, C(0x5a4a2a, 90));
      }
      for (const [x, y] of [[3, 3], [12, 10]] as const) {
        pm.ellipse(x, y + 2, 2.2, 1.8, rim);
        pm.ellipse(x, y + 2, 1.5, 1.2, mud);
        for (let k = 0; k < 4; k++) {
          const tx = x - 3 + k * 2, ty = y - 1 - (k === 1 || k === 2 ? 1 : 0);
          pm.line(x, y + 1, tx, ty, 1, mud);
          pm.set(tx, ty - 1, claw);
        }
      }
      if (f) { pm.set(4, 5, C(0x9ab0d0, 220)); pm.set(12, 12, C(0x9ab0d0, 220)); }
    }
  }
  return pm;
}

// ---------- aldeanos (respaldo sencillo; los buenos vienen de PixelLab) ----------

export type VillagerKind =
  | 'cantinero' | 'cura' | 'borracho' | 'nina' | 'arriero'
  | 'vendedora' | 'campesina' | 'policia' | 'cafetero' | 'nino';

interface Look {
  skin: number; hair: number; top: number; legs: number; shoes: number;
  long?: boolean; skirt?: boolean; robe?: boolean; kid?: boolean;
  hat?: number; brim?: boolean; apron?: number; prop?: number;
}

const LOOKS: Record<VillagerKind, Look> = {
  cantinero: { skin: 0xd8a070, hair: 0x1a1210, top: 0xf0ece0, legs: 0x2a2a34, shoes: 0x1a1210, apron: 0xe8e4d8 },
  cura: { skin: 0xf0c8a0, hair: 0x9a9a9a, top: 0x18181e, legs: 0x18181e, shoes: 0x0e0e12, robe: true },
  borracho: { skin: 0xc88860, hair: 0x3a2a1a, top: 0xa8c0d0, legs: 0x5a4a3a, shoes: 0x3a2a1a, prop: 0x3a8a3a },
  nina: { skin: 0xd8a070, hair: 0x2a1a10, top: 0xf080b0, legs: 0xf080b0, shoes: 0xc82020, long: true, skirt: true, kid: true },
  arriero: { skin: 0xc88860, hair: 0x1a1210, top: 0xa8302c, legs: 0xe8e0c8, shoes: 0x8a6a3a, hat: 0xe8dcb4, brim: true, prop: 0x7a4a24 },
  vendedora: { skin: 0xb07850, hair: 0x1a1210, top: 0x2c64b0, legs: 0xc82060, shoes: 0x3a2a1a, long: true, skirt: true, hat: 0xd84a2a, prop: 0xc8a050 },
  campesina: { skin: 0xd8a070, hair: 0x2a1a10, top: 0xf4f0e0, legs: 0xc82020, shoes: 0x8a6a3a, long: true, skirt: true, hat: 0xe0c880, brim: true },
  policia: { skin: 0xd8a070, hair: 0x1a1210, top: 0x2c5a34, legs: 0x2c5a34, shoes: 0x101010, hat: 0x234a2a, prop: 0xf0c840 },
  cafetero: { skin: 0xb07850, hair: 0x1a1210, top: 0xf4f0e0, legs: 0x3a5a8a, shoes: 0x101010, hat: 0xe8dcb4, brim: true, prop: 0xc8302c },
  nino: { skin: 0xc88860, hair: 0x1a1210, top: 0xd83030, legs: 0x3a5a8a, shoes: 0xf0f0f0, kid: true },
};

function shadeTone(hex: number, k: number): Rgba {
  const c = C(hex);
  return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k), 255];
}

function drawVillager(pm: Pixmap, ox: number, lk: Look, dir: 0 | 1 | 2): void {
  const f = new Pixmap(48, 48);
  const k = lk.kid ? 6 : 0;
  const hy = 11 + k, sy = 18 + k, wy = lk.kid ? 33 : 31;
  const side = dir === 1;
  const sk = C(lk.skin), skD = shadeTone(lk.skin, 0.78);
  const top = C(lk.top), topD = shadeTone(lk.top, 0.72), topL = shadeTone(lk.top, 1.18);
  const legs = C(lk.legs), legsD = shadeTone(lk.legs, 0.72);
  // piernas y zapatos
  if (side) {
    f.rect(21, wy, 4, 45 - wy - 2, legsD); f.rect(24, wy, 4, 45 - wy - 2, legs);
    f.rect(21, 43, 5, 3, C(lk.shoes)); f.rect(24, 43, 6, 3, C(lk.shoes));
  } else {
    f.rect(19, wy, 4, 45 - wy - 2, legs); f.rect(25, wy, 4, 45 - wy - 2, legsD);
    f.rect(18, 43, 5, 3, C(lk.shoes)); f.rect(25, 43, 5, 3, C(lk.shoes));
  }
  // torso / sotana / falda
  const tl = side ? 19 : lk.kid ? 18 : 17, tr = side ? 29 : lk.kid ? 30 : 31;
  f.rect(tl, sy, tr - tl, wy - sy + 1, top);
  f.vline(tl, sy, wy, topL); f.vline(tr - 1, sy, wy, topD);
  if (lk.robe) f.polygon([[tl, sy + 6], [tr, sy + 6], [tr + 2, 44], [tl - 2, 44]], top);
  if (lk.skirt) {
    f.polygon([[tl, wy - 2], [tr, wy - 2], [tr + 3, 42], [tl - 3, 42]], legs);
    f.hline(tl - 3, tr + 2, 41, legsD);
    f.hline(tl - 2, tr + 1, 38, C(0xf8f0e0, 120));
  } else if (!lk.robe) f.hline(tl, tr - 1, wy, C(0x2a1a10));
  if (lk.apron && dir === 0) { f.rect(tl + 2, sy + 7, tr - tl - 4, wy - sy + 4, C(lk.apron)); f.hline(tl + 2, tr - 3, sy + 7, C(0xffffff)); }
  if (lk.robe && dir === 0) f.rect(22, sy, 4, 2, C(0xf8f8f8));
  // brazos y manos
  const arms = side ? [[23, 4]] : [[tl - 3, 3], [tr, 3]];
  for (const [ax, aw] of arms) {
    f.rect(ax, sy + 1, aw, wy - sy - 2, side ? topD : top);
    f.vline(ax, sy + 1, wy - 2, side ? top : topL);
    f.rect(ax, wy - 1, aw, 3, sk);
  }
  // cabeza
  const hx = side ? 25 : 24;
  f.ellipse(hx, hy, 7, 7, sk);
  f.vline(hx + 6, hy - 3, hy + 3, skD);
  // pelo
  const hair = C(lk.hair);
  if (dir === 2) {
    f.ellipse(hx, hy, 7, 7, hair);
    if (lk.long) f.rect(hx - 6, hy, 13, 12, hair);
  } else if (side) {
    f.ellipse(hx - 1, hy - 3, 7, 4.5, hair);
    f.rect(hx - 7, hy - 3, 6, 8, hair);
    if (lk.long) f.rect(hx - 7, hy, 5, 12, hair);
    f.rect(hx + 3, hy - 1, 1, 2, INK);
    f.set(hx + 7, hy + 1, sk);
  } else {
    f.ellipse(hx, hy - 3, 7.5, 4.5, hair);
    f.vline(hx - 7, hy - 2, hy + 1, hair); f.vline(hx + 6, hy - 2, hy + 1, hair);
    if (lk.long) { f.rect(hx - 8, hy, 3, 12, hair); f.rect(hx + 5, hy, 3, 12, hair); }
    f.rect(hx - 3, hy, 1, 2, INK); f.rect(hx + 2, hy, 1, 2, INK);
    f.hline(hx - 1, hx, hy + 4, skD);
  }
  // sombrero o gorra
  if (lk.hat !== undefined) {
    const hc = C(lk.hat), hd = shadeTone(lk.hat, 0.7);
    if (lk.brim) {
      f.ellipse(hx, hy - 4, 11, 3, hc);
      f.hline(hx - 10, hx + 10, hy - 3, hd);
      f.rect(hx - 5, hy - 11, 10, 7, hc);
      f.hline(hx - 5, hx + 4, hy - 6, C(0x1a1210));
    } else {
      f.ellipse(hx, hy - 5, 7.5, 4, hc);
      f.hline(hx - 7, hx + 7, hy - 3, hd);
      if (dir !== 2) f.rect(side ? hx + 2 : hx - 5, hy - 2, side ? 6 : 10, 1, hd);
    }
  }
  if (lk.prop !== undefined && dir !== 2) {
    const px = side ? 26 : tl - 3;
    f.rect(px, wy - 4, 4, 7, C(lk.prop));
    f.set(px + 1, wy - 3, C(0xffffff, 140));
  }
  f.outline(INK);
  pm.blit(f, ox, 0);
}

export function buildVillager(kind: VillagerKind): Pixmap {
  const pm = new Pixmap(144, 48);
  ([0, 1, 2] as const).forEach((d) => drawVillager(pm, d * 48, LOOKS[kind], d));
  return pm;
}

// ---------- espíritus menores (respaldo sencillo) ----------

export type SpiritKind = 'duende' | 'pollo' | 'mano';
export const SPIRIT_FRAMES: Record<SpiritKind, number> = { duende: 4, pollo: 3, mano: 4 };

function duendeFrame(i: number): Pixmap {
  const f = new Pixmap(48, 48);
  const bob = i === 1 ? 1 : i >= 2 ? -2 : 0;
  const y = 22 + bob;
  f.rect(20, y + 18, 3, 4, C(0x4a2c16)); f.rect(25, y + 18, 3, 4, C(0x4a2c16));
  f.rect(18, y + 9, 12, 10, C(0x2a7a34));
  f.vline(18, y + 9, y + 18, C(0x4cb060));
  f.ellipse(24, y + 6, 6, 5, C(0xe8b088));
  f.polygon([[18, y + 6], [30, y + 6], [27, y + 17], [24, y + 19], [21, y + 17]], C(0xe8e4dc));
  f.set(24, y + 6, C(0xd84a3a)); f.set(25, y + 6, C(0xd84a3a));
  if (i >= 2) { f.hline(22, 26, y + 8, C(0x5a1010)); f.set(21, y + 4, INK); f.set(27, y + 4, INK); }
  else { f.rect(21, y + 3, 1, 2, INK); f.rect(27, y + 3, 1, 2, INK); }
  f.ellipse(24, y + 1, 12, 3, C(0x6a3a1a));
  f.polygon([[17, y + 1], [31, y + 1], [26 + (i === 3 ? 2 : 0), y - 18], [23, y - 19]], C(0x8a4a1c));
  f.hline(17, 30, y - 1, C(0xc82020));
  if (i >= 2) { f.rect(14, y + 4, 3, 4, C(0xe8b088)); f.rect(31, y + 4, 3, 4, C(0xe8b088)); }
  f.outline(INK);
  return f;
}

function polloFrame(i: number): Pixmap {
  const f = new Pixmap(48, 48);
  const blk = C(0x16141c), blkL = C(0x3a3448);
  const hd = i === 1 ? 6 : 0;
  f.line(22, 38, 21, 44, 1, C(0xd8a020)); f.line(27, 38, 28, 44, 1, C(0xd8a020));
  f.ellipse(24, 32, 10, 8, blk);
  f.polygon([[14, 30], [8, 18], [16, 26]], blk);
  if (i === 2) { f.polygon([[16, 30], [2, 22], [6, 34]], blkL); f.polygon([[32, 30], [46, 22], [42, 34]], blkL); }
  else f.ellipse(26, 31, 6, 4, blkL);
  f.ellipse(30, 20 + hd, 5, 5, blk);
  f.polygon([[27, 15 + hd], [29, 12 + hd], [31, 15 + hd], [33, 13 + hd], [34, 17 + hd]], C(0xc81818));
  f.polygon([[35, 20 + hd], [39, 21 + hd], [35, 23 + hd]], C(0xd8a020));
  f.rect(32, 19 + hd, 2, 2, C(0xff2020)); f.set(32, 19 + hd, C(0xffd0d0));
  f.rect(32, 24 + hd, 2, 3, C(0xc81818));
  f.outline(C(0x000000));
  return f;
}

function manoFrame(i: number): Pixmap {
  const f = new Pixmap(48, 48);
  const sk = C(0x6a5a48), skD = C(0x4a3a2c), hair = C(0x1a1410), nail = C(0xd8c890);
  const rise = [30, 18, 10, 12][i];
  f.rect(18, rise + 10, 12, 44 - rise - 10, sk);
  f.vline(29, rise + 10, 43, skD);
  f.ellipse(24, rise + 8, 8, 7, sk);
  const spread = i === 2 ? 1 : 0;
  if (i === 3) {
    f.ellipse(24, rise + 4, 8, 6, sk);
    for (let k = 0; k < 4; k++) f.hline(18, 30, rise + 1 + k * 2, skD);
  } else {
    for (let k = 0; k < 4; k++) {
      const fx = 17 + k * 4 + (k - 1.5) * spread * 2;
      const top = rise - 8 - (k === 1 || k === 2 ? 2 : 0) + (i === 0 ? 6 : 0);
      f.line(fx + 1, rise + 4, fx + 1 + (k - 1.5) * spread * 2, top, 3, sk);
      f.set(Math.round(fx + 1 + (k - 1.5) * spread * 2), top - 2, nail);
    }
    f.line(31, rise + 10, 35 + spread * 2, rise + 3, 3, sk);
  }
  const rnd = seededRandom(5);
  for (let n = 0; n < 40; n++) {
    const x = 16 + Math.floor(rnd() * 16), y = rise - 6 + Math.floor(rnd() * 40);
    if (f.alpha(x, y) && y < 43) f.set(x, y, hair);
  }
  f.outline(INK);
  f.ellipse(24, 44, 14, 3.5, C(0x4a3020));
  f.ellipse(24, 43, 11, 2, C(0x6a4a30));
  for (const x of [12, 34]) f.circle(x, 42, 2, C(0x5a3e28));
  return f;
}

export function buildSpirit(kind: SpiritKind): Pixmap {
  const n = SPIRIT_FRAMES[kind];
  const pm = new Pixmap(48 * n, 48);
  const draw = kind === 'duende' ? duendeFrame : kind === 'pollo' ? polloFrame : manoFrame;
  for (let i = 0; i < n; i++) pm.blit(draw(i), i * 48, 0);
  return pm;
}
