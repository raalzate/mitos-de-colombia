import { Pixmap, hexToRgba, seededRandom, type Rgba } from '../art/PixelPainter';

/**
 * Interiores paisas de noche (cantina, casa campesina, tienda, iglesia, fonda) dibujados en código:
 * pisos y paredes por baldosa de 16 px y muebles con contorno y 2–3 tonos, cálidos y acogedores.
 */

const C = (h: number, a = 255) => hexToRgba(h, a);
type Ramp = [Rgba, Rgba, Rgba];
const R = (d: number, m: number, l: number): Ramp => [C(d), C(m), C(l)];
type Pt = [number, number];

const INK = C(0x1a1016);
const VOID = C(0x0e0a12);

// ---------- paletas ----------
const WOOD = R(0x4a2c16, 0x7a4a24, 0xa8703c);
const WOOD_D = R(0x2e1a0e, 0x4e2c16, 0x6e4224);
const WOOD_L = R(0x8a5a2c, 0xb47c40, 0xd8a060);
const STONE = R(0x5e5a62, 0x8a8690, 0xb4b0b8);
const BRASS = R(0x8a6010, 0xd0a030, 0xf8e080);
const CHROME = R(0x5e5e6c, 0xa8a8b4, 0xecf0f4);
const CREAM = R(0xc8bca4, 0xece4d0, 0xfaf6ea);
const COW = R(0x4a2c18, 0xe8dcc4, 0xfaf4e6);
const FIRE = [C(0xb82810), C(0xf06818), C(0xffc838), C(0xfff6c0)];
const WHITE = C(0xffffff);

// ---------- ayudas ----------

/** Caja con luz arriba/izquierda y sombra abajo/derecha. */
function box(pm: Pixmap, x: number, y: number, w: number, h: number, r: Ramp): void {
  pm.rect(x, y, w, h, r[1]);
  pm.hline(x, x + w - 1, y, r[2]);
  pm.vline(x, y, y + h - 1, r[2]);
  pm.hline(x, x + w - 1, y + h - 1, r[0]);
  pm.vline(x + w - 1, y, y + h - 1, r[0]);
}

/** Sombra en el piso: sólo pinta donde no hay dibujo. */
function groundShadow(pm: Pixmap, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && pm.inBounds(x, y) && pm.alpha(x, y) === 0) pm.set(x, y, C(0x000000, 80));
    }
  }
}

function bottle(pm: Pixmap, x: number, bottom: number, h: number, glass: Rgba, label: Rgba, cap: Rgba): void {
  pm.rect(x, bottom - h + 3, 3, h - 3, glass);
  pm.rect(x + 1, bottom - h + 1, 1, 2, glass);
  pm.set(x + 1, bottom - h, cap);
  pm.rect(x, bottom - 4, 3, 2, label);
  pm.vline(x, bottom - h + 3, bottom - 5, C(0xffffff, 140));
}
const AGUARDIENTE: [Rgba, Rgba, Rgba] = [C(0xcfeaf2), C(0x2050b0), C(0xc82020)];
const RON: [Rgba, Rgba, Rgba] = [C(0x8a4416), C(0xf0d070), C(0xd0a030)];
const CERVEZA: [Rgba, Rgba, Rgba] = [C(0x6a3a10), C(0xf0c020), C(0xd8d8d8)];
const VINO: [Rgba, Rgba, Rgba] = [C(0x2a5a2a), C(0xf4ecd0), C(0x7a1c3a)];

function copita(pm: Pixmap, x: number, y: number): void {
  pm.rect(x, y, 2, 2, C(0xd8eef4));
  pm.set(x, y, WHITE);
}

/** Llamita de vela; `frame` la hace bailar. */
function flame(pm: Pixmap, x: number, y: number, frame: number): void {
  const lean = frame % 2 ? 1 : 0;
  pm.set(x, y, FIRE[1]);
  pm.set(x, y - 1, FIRE[2]);
  pm.set(x + lean, y - 2, FIRE[3]);
  if (!lean) pm.set(x, y - 3, C(0xffc838, 170));
}

/** Fuego de leña: lenguas por columna que cambian con el fotograma. */
function fire(pm: Pixmap, x: number, bottom: number, w: number, h: number, frame: number): void {
  const pat = [0.55, 0.9, 0.7, 1, 0.6, 0.85, 0.5, 0.95, 0.65];
  for (let i = 0; i < w; i++) {
    const t = pat[(i * 2 + frame * 3) % pat.length];
    const hi = Math.max(2, Math.round(h * t));
    pm.vline(x + i, bottom - hi + 1, bottom, FIRE[0]);
    pm.vline(x + i, bottom - Math.round(hi * 0.75) + 1, bottom, FIRE[1]);
    if (i > 0 && i < w - 1) pm.vline(x + i, bottom - Math.round(hi * 0.45) + 1, bottom, FIRE[2]);
  }
  pm.hline(x + 1, x + w - 2, bottom, FIRE[3]);
}

function steam(pm: Pixmap, x: number, y: number, frame: number): void {
  const s = frame % 2;
  const puffs: Pt[] = s ? [[x + 1, y], [x - 1, y - 4], [x + 2, y - 7]] : [[x, y - 1], [x + 2, y - 4], [x, y - 8]];
  for (const [px, py] of puffs) {
    pm.set(px, py, C(0xf0f0f0, 150));
    pm.set(px + 1, py, C(0xf0f0f0, 110));
    pm.set(px, py - 1, C(0xf0f0f0, 90));
  }
}

function nail(pm: Pixmap, x: number, y: number): void {
  pm.set(x, y, C(0x3a3a40));
  pm.set(x, y + 1, C(0x000000, 70));
}

/** Piel de vaca: base clara con manchas cafés. */
function cowhide(pm: Pixmap, x: number, y: number, w: number, h: number, seed: number): void {
  const rnd = seededRandom(seed);
  pm.rect(x, y, w, h, COW[1]);
  for (let k = 0; k < Math.max(1, Math.round((w * h) / 18)); k++) {
    const sx = x + Math.floor(rnd() * w), sy = y + Math.floor(rnd() * h);
    pm.set(sx, sy, COW[0]);
    if (sx + 1 < x + w) pm.set(sx + 1, sy, COW[0]);
    if (rnd() < 0.5 && sy + 1 < y + h) pm.set(sx, sy + 1, C(0x6a4428));
  }
  pm.hline(x, x + w - 1, y, COW[2]);
}

function hash(s: string): number {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// ---------- pisos ----------

export type FloorKind = 'madera' | 'baldosa' | 'baldosa_ajedrez' | 'ladrillo' | 'tierra' | 'cemento';

function floorMadera(v: number): Pixmap {
  const pm = new Pixmap(16, 16);
  const rnd = seededRandom(101 + v * 17);
  const tones = [R(0x5a3418, 0x8a5228, 0xa86a36), R(0x60381a, 0x94592c, 0xb4743c), R(0x5a3418, 0x8a5228, 0xa86a36), R(0x52301a, 0x7e4a24, 0x9c6232)];
  const seam = C(0x3a200e);
  const joints = [[3, 11, 7, 14], [6, 13, 2, 10], [11, 4, 13, 8], [1, 9, 5, 12]][v & 3];
  for (let r = 0; r < 4; r++) {
    const y0 = r * 4, t = tones[r];
    pm.rect(0, y0, 16, 4, t[1]);
    pm.hline(0, 15, y0, seam);
    for (let x = 0; x < 16; x++) if ((x + r * 5) % 9 < 5) pm.set(x, y0 + 1, t[2]);
    for (let k = 0; k < 3; k++) {
      const gx = Math.floor(rnd() * 14);
      pm.hline(gx, gx + 1 + Math.floor(rnd() * 3), y0 + 2 + (k % 2), t[0]);
    }
    const jx = joints[r];
    pm.vline(jx, y0 + 1, y0 + 3, seam);
    if (jx + 1 < 16) pm.vline(jx + 1, y0 + 1, y0 + 3, t[2]);
  }
  if (v === 1) { pm.rect(9, 6, 3, 2, tones[1][0]); pm.set(10, 6, C(0x3a200e)); }
  if (v === 3) { pm.rect(3, 13, 3, 2, tones[3][0]); pm.set(4, 14, C(0x3a200e)); }
  return pm;
}

function floorBaldosa(v: number): Pixmap {
  const pm = new Pixmap(16, 16);
  const rnd = seededRandom(211 + v * 13);
  const grout = C(0x6a3a26);
  const bases = [R(0x8a3e26, 0xb4583a, 0xcc7452), R(0x924428, 0xbc6040, 0xd47c58), R(0x84381e, 0xac5234, 0xc46c4a)];
  for (let sy = 0; sy < 2; sy++) {
    for (let sx = 0; sx < 2; sx++) {
      const r = bases[Math.floor(rnd() * bases.length)];
      const x = sx * 8, y = sy * 8;
      pm.rect(x, y, 8, 8, r[1]);
      pm.hline(x + 1, x + 6, y + 1, r[2]);
      pm.vline(x + 1, y + 1, y + 6, r[2]);
      pm.hline(x + 1, x + 7, y + 7, r[0]);
      pm.vline(x + 7, y + 1, y + 7, r[0]);
      for (let k = 0; k < 3; k++) pm.set(x + 2 + Math.floor(rnd() * 5), y + 2 + Math.floor(rnd() * 5), r[rnd() < 0.5 ? 0 : 2]);
      pm.hline(x, x + 7, y, grout);
      pm.vline(x, y, y + 7, grout);
    }
  }
  if (v === 2) { pm.set(11, 4, C(0x6a3a26)); pm.set(12, 5, C(0x6a3a26)); pm.set(12, 6, C(0x6a3a26)); }
  if (v === 3) pm.rect(3, 11, 2, 2, C(0xe8a080));
  return pm;
}

function floorAjedrez(v: number): Pixmap {
  const pm = new Pixmap(16, 16);
  const light = R(0xb8ac94, 0xe4d8bc, 0xf8f0dc), dark = R(0x1c1820, 0x2e2834, 0x4a4252);
  for (let sy = 0; sy < 2; sy++) {
    for (let sx = 0; sx < 2; sx++) {
      const r = (sx + sy) % 2 === 0 ? light : dark;
      const x = sx * 8, y = sy * 8;
      pm.rect(x, y, 8, 8, r[1]);
      pm.hline(x, x + 7, y, r[2]);
      pm.vline(x, y, y + 7, r[2]);
      pm.hline(x + 1, x + 7, y + 7, r[0]);
      pm.vline(x + 7, y + 1, y + 7, r[0]);
      // brillo de cera
      pm.set(x + 2, y + 2, r[2]);
      pm.set(x + 3, y + 2, r[2]);
    }
  }
  if (v === 1) pm.set(5, 5, C(0x9a8e78));
  if (v === 2) { pm.set(12, 12, C(0x6a6274)); pm.set(13, 11, C(0x6a6274)); }
  if (v === 3) pm.hline(9, 11, 4, C(0xa89c84));
  return pm;
}

function floorLadrillo(v: number): Pixmap {
  const pm = new Pixmap(16, 16);
  const rnd = seededRandom(307 + v * 29);
  const mortar = C(0x7a5440);
  const bricks = [R(0x7a3420, 0xa04a2c, 0xbc643c), R(0x84381e, 0xac5434, 0xc87048), R(0x6e3020, 0x944628, 0xb05c38)];
  for (let r = 0; r < 4; r++) {
    const y = r * 4, off = (r % 2) * 4;
    for (let b = -1; b < 2; b++) {
      const x0 = off + b * 8;
      // el ladrillo partido por el borde usa el mismo tono a ambos lados
      const pick = Math.floor(rnd() * bricks.length);
      const t = bricks[off && b !== 0 ? r % 3 : pick];
      for (let x = Math.max(0, x0); x < Math.min(16, x0 + 8); x++) {
        pm.vline(x, y + 1, y + 3, t[1]);
        pm.set(x, y + 1, t[2]);
        pm.set(x, y + 3, t[0]);
      }
      if (rnd() < 0.6) pm.set(Math.max(0, Math.min(15, x0 + 3 + Math.floor(rnd() * 3))), y + 2, t[0]);
    }
    pm.hline(0, 15, y, mortar);
    pm.vline(off, y, y + 3, mortar);
    pm.vline(off + 8, y, y + 3, mortar);
  }
  if (v === 3) { pm.set(10, 6, C(0x5a2a18)); pm.set(11, 7, C(0x5a2a18)); }
  return pm;
}

function floorTierra(v: number): Pixmap {
  const pm = new Pixmap(16, 16);
  const rnd = seededRandom(401 + v * 31);
  pm.rect(0, 0, 16, 16, C(0x7a5a3a));
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = rnd();
      if (r < 0.12) pm.set(x, y, C(0x664a2e));
      else if (r < 0.19) pm.set(x, y, C(0x8e6c48));
    }
  }
  for (let k = 0; k < 2; k++) {
    const px = 2 + Math.floor(rnd() * 11), py = 2 + Math.floor(rnd() * 11);
    pm.set(px, py, C(0x9a9088));
    pm.set(px + 1, py, C(0xb4aca0));
    pm.set(px, py + 1, C(0x5a4a3a));
  }
  if (v === 2) for (const [x, y] of [[4, 5], [9, 10], [11, 3]] as const) { pm.set(x, y, C(0xd8b860)); pm.set(x + 1, y + 1, C(0xc8a850)); }
  if (v === 3) { pm.set(6, 8, C(0x4a3420)); pm.set(7, 9, C(0x4a3420)); pm.set(8, 9, C(0x4a3420)); pm.set(9, 10, C(0x4a3420)); }
  return pm;
}

function floorCemento(v: number): Pixmap {
  const pm = new Pixmap(16, 16);
  const rnd = seededRandom(503 + v * 37);
  pm.rect(0, 0, 16, 16, C(0x9a9488));
  for (let k = 0; k < 3; k++) pm.ellipse(3 + rnd() * 10, 3 + rnd() * 10, 2.5, 1.5, C(rnd() < 0.5 ? 0x8a8478 : 0xaaa498, 160));
  for (let k = 0; k < 10; k++) pm.set(1 + Math.floor(rnd() * 14), 1 + Math.floor(rnd() * 14), C(0x847e72));
  pm.hline(0, 15, 0, C(0x6e6a62));
  pm.vline(0, 0, 15, C(0x6e6a62));
  pm.hline(1, 15, 1, C(0xb4aea2));
  pm.vline(1, 1, 15, C(0xb4aea2));
  if (v === 1) { pm.set(7, 4, C(0x5e5a52)); pm.set(8, 5, C(0x5e5a52)); pm.set(8, 6, C(0x5e5a52)); pm.set(9, 7, C(0x5e5a52)); pm.set(9, 8, C(0x5e5a52)); }
  if (v === 2) pm.ellipse(10, 11, 3, 2, C(0x6a5a4a, 70));
  return pm;
}

/** 16×16 que se repite sin costuras; `variant` 0..3 cambia vetas, nudos y manchas. */
export function buildFloor(kind: FloorKind, variant: number): Pixmap {
  const v = ((variant % 4) + 4) % 4;
  switch (kind) {
    case 'madera': return floorMadera(v);
    case 'baldosa': return floorBaldosa(v);
    case 'baldosa_ajedrez': return floorAjedrez(v);
    case 'ladrillo': return floorLadrillo(v);
    case 'tierra': return floorTierra(v);
    default: return floorCemento(v);
  }
}

// ---------- paredes ----------

export type WallKind = 'bahareque' | 'ladrillo' | 'madera' | 'iglesia' | 'azul' | 'verde';

const WALL_UPPER: Record<WallKind, Ramp> = {
  bahareque: R(0xc8bca4, 0xece4d0, 0xfaf6ea),
  ladrillo: R(0x7a3420, 0xa04a2c, 0xc0643c),
  madera: R(0x5a3418, 0x8a5428, 0xa86c34),
  iglesia: R(0xd4c8ac, 0xf0e8d4, 0xfcf8ec),
  azul: R(0x4a74a8, 0x6c98cc, 0x94b8e0),
  verde: R(0x4a8a5a, 0x78b888, 0xa4d8b0),
};
const WALL_ZOCALO: Record<WallKind, Ramp> = {
  bahareque: R(0x6a2418, 0xa83a2c, 0xc85a40),
  ladrillo: WOOD_D,
  madera: WOOD_D,
  iglesia: R(0x5a6474, 0x8a96a8, 0xb8c2d0),
  azul: R(0x142c5a, 0x1e4080, 0x3a64a8),
  verde: R(0x0e3a1e, 0x1a5a30, 0x2e7e48),
};
const WALL_CAP: Record<WallKind, Ramp> = {
  bahareque: R(0x9a8e78, 0xd0c4ac, 0xf0e8d4),
  ladrillo: R(0x6a2a18, 0x9a4428, 0xc0643c),
  madera: WOOD,
  iglesia: R(0x9a8a6a, 0xd8ccac, 0xf4ecd8),
  azul: R(0x23406e, 0x3e66a0, 0x6a94cc),
  verde: R(0x1e5a32, 0x3a8a50, 0x6ab878),
};

function paintTexture(pm: Pixmap, y0: number, y1: number, r: Ramp, rnd: () => number, n: number): void {
  for (let k = 0; k < n; k++) pm.set(Math.floor(rnd() * 16), y0 + Math.floor(rnd() * (y1 - y0 + 1)), r[rnd() < 0.65 ? 0 : 2]);
}

/** pared del fondo: 16 de ancho × 32 de alto (dos baldosas: zócalo abajo, cal/ladrillo arriba). variant 0..3 */
export function buildBackWall(kind: WallKind, variant: number): Pixmap {
  const v = ((variant % 4) + 4) % 4;
  const pm = new Pixmap(16, 32);
  const rnd = seededRandom(hash(kind) + v * 101);
  const up = WALL_UPPER[kind], zo = WALL_ZOCALO[kind];
  // pared alta
  pm.rect(0, 4, 16, 18, up[1]);
  if (kind === 'ladrillo') {
    const mortar = C(0xb09478), bricks = [R(0x7a3420, 0xa04a2c, 0xc0643c), R(0x84381e, 0xac5434, 0xc87048), R(0x6e3020, 0x944628, 0xb05c38)];
    for (let r = 0; r < 5; r++) {
      const y = 4 + r * 4, off = (r % 2) * 4;
      for (let b = -1; b < 2; b++) {
        const x0 = off + b * 8, pick = Math.floor(rnd() * 3), t = bricks[off && b !== 0 ? r % 3 : pick];
        for (let x = Math.max(0, x0); x < Math.min(16, x0 + 8); x++) {
          pm.vline(x, y + 1, y + 3, t[1]);
          pm.set(x, y + 1, t[2]);
          pm.set(x, y + 3, t[0]);
        }
      }
      pm.hline(0, 15, y, mortar);
      pm.vline(off, y, y + 3, mortar);
      pm.vline(off + 8, y, y + 3, mortar);
    }
    pm.hline(0, 15, 24, mortar);
    if (v === 1) { pm.rect(9, 9, 6, 3, C(0x5a2214)); pm.hline(9, 14, 9, C(0x7a3420)); }
    if (v === 2) pm.ellipse(6, 8, 4, 3, C(0x1a1010, 70));
    if (v === 3) { pm.rect(2, 13, 5, 6, C(0xd8c8a8)); pm.hline(2, 6, 13, C(0xf0e4c8)); pm.set(4, 15, C(0xb09478)); }
  } else if (kind === 'madera') {
    const tones = [WOOD, R(0x52301a, 0x82502a, 0xa26a38), WOOD, R(0x4e2e16, 0x744424, 0x9a6232)];
    for (let p = 0; p < 4; p++) {
      const x = p * 4, t = tones[p];
      pm.rect(x, 4, 4, 20, t[1]);
      pm.vline(x, 4, 23, C(0x2e1a0e));
      pm.vline(x + 1, 4, 23, t[2]);
      for (let k = 0; k < 3; k++) {
        const gy = 5 + Math.floor(rnd() * 14);
        pm.vline(x + 2, gy, gy + 2, t[0]);
      }
      pm.set(x + 2, 6, C(0x2a1a10));
      pm.set(x + 2, 19, C(0x2a1a10));
    }
    if (v === 1) { pm.rect(9, 11, 2, 2, C(0x2e1a0e)); pm.set(9, 11, C(0x4a2c16)); }
    if (v === 3) pm.rect(5, 14, 1, 3, C(0x1a0e08));
  } else {
    paintTexture(pm, 5, 21, up, rnd, 14);
    if (kind === 'iglesia') {
      const gold = BRASS;
      pm.hline(0, 15, 7, gold[1]);
      pm.rect(0, 8, 16, 2, C(0x8a2a2a));
      for (let x = 1; x < 16; x += 4) { pm.set(x, 8, gold[2]); pm.set(x + 1, 9, gold[1]); }
      pm.hline(0, 15, 10, gold[0]);
      if (v === 1) { pm.rect(7, 13, 2, 7, gold[1]); pm.rect(5, 15, 6, 2, gold[1]); pm.set(7, 13, gold[2]); }
      if (v === 2) pm.ellipse(10, 17, 3, 3, C(0x8a7a5a, 60));
    } else {
      if (v === 1) {
        if (kind === 'bahareque') {
          pm.rect(4, 11, 7, 4, C(0x9a7450));
          pm.hline(5, 9, 12, C(0x6a4a2c));
          pm.hline(4, 10, 14, C(0x7a5838));
          pm.hline(4, 10, 15, up[0]);
          pm.vline(3, 11, 14, up[0]);
        } else {
          for (const [x, y] of [[5, 12], [6, 12], [10, 16], [6, 13]] as const) pm.set(x, y, CREAM[2]);
        }
      }
      if (v === 2) {
        for (const [x, y] of [[9, 5], [9, 6], [10, 7], [10, 8], [11, 9], [10, 10], [10, 11], [11, 12]] as const) pm.set(x, y, up[0]);
      }
      if (v === 3 && kind === 'bahareque') {
        // cruz de palma del Domingo de Ramos
        nail(pm, 8, 8);
        pm.vline(8, 9, 15, C(0xc8b450));
        pm.hline(6, 10, 11, C(0xc8b450));
        pm.set(8, 9, C(0xe8d478));
        pm.set(9, 15, C(0x8a7a30));
      } else if (v === 3) nail(pm, 7, 9);
    }
  }
  // sombra bajo la viga
  pm.rect(0, 4, 16, 2, C(0x000000, 60));
  // viga del techo
  pm.hline(0, 15, 0, INK);
  pm.hline(0, 15, 1, WOOD_D[2]);
  pm.hline(0, 15, 2, WOOD_D[1]);
  pm.hline(0, 15, 3, WOOD_D[0]);
  pm.set((v * 5 + 3) % 16, 2, WOOD_D[0]);
  // zócalo
  const zy = kind === 'ladrillo' || kind === 'madera' ? 24 : 22;
  pm.rect(0, zy, 16, 30 - zy, zo[1]);
  if (kind === 'iglesia') {
    for (let k = 0; k < 4; k++) {
      const x = Math.floor(rnd() * 14), y = zy + 2 + Math.floor(rnd() * 4);
      pm.set(x, y, zo[2]); pm.set(x + 1, y + 1, zo[2]);
    }
    pm.hline(0, 15, zy, CREAM[2]);
  } else if (kind === 'azul' || kind === 'verde') {
    pm.hline(0, 15, zy, CREAM[2]);
    pm.hline(0, 15, zy + 1, zo[0]);
    paintTexture(pm, zy + 2, 28, zo, rnd, 5);
  } else if (kind === 'bahareque') {
    pm.hline(0, 15, zy, zo[0]);
    pm.hline(0, 15, zy + 1, zo[2]);
    paintTexture(pm, zy + 2, 28, zo, rnd, 6);
  } else {
    pm.hline(0, 15, zy, WOOD[2]);
    pm.hline(0, 15, zy + 1, WOOD_D[0]);
    for (let x = 0; x < 16; x += 8) pm.vline(x, zy + 2, 29, WOOD_D[0]);
  }
  pm.hline(0, 15, 29, zo[0]);
  // rodapié y sombra contra el piso
  pm.hline(0, 15, 30, WOOD_D[0]);
  pm.hline(0, 15, 31, C(0x24140c));
  return pm;
}

/** borde lateral/inferior de la pieza (1 baldosa), para cerrar el cuarto */
export function buildWallEdge(kind: WallKind, side: 'left' | 'right' | 'bottom' | 'corner_l' | 'corner_r'): Pixmap {
  const pm = new Pixmap(16, 16);
  const cap = WALL_CAP[kind];
  pm.rect(0, 0, 16, 16, VOID);
  // franja del muro vista desde arriba: 6 px pegados al cuarto
  const vertical = (x0: number, y0: number, y1: number) => {
    pm.rect(x0, y0, 6, y1 - y0 + 1, cap[1]);
    pm.vline(x0, y0, y1, INK);
    pm.vline(x0 + 5, y0, y1, INK);
    pm.vline(x0 + 1, y0, y1, cap[2]);
    pm.vline(x0 + 4, y0, y1, cap[0]);
    for (let y = y0 + 3; y <= y1; y += 4) pm.hline(x0 + 1, x0 + 4, y, cap[0]);
  };
  const horizontal = (x0: number, x1: number) => {
    pm.rect(x0, 0, x1 - x0 + 1, 6, cap[1]);
    pm.hline(x0, x1, 0, INK);
    pm.hline(x0, x1, 5, INK);
    pm.hline(x0, x1, 1, cap[2]);
    pm.hline(x0, x1, 4, cap[0]);
    for (let x = x0 + 3; x <= x1; x += 4) pm.vline(x, 1, 4, cap[0]);
  };
  switch (side) {
    case 'left': vertical(10, 0, 15); break;
    case 'right': vertical(0, 0, 15); break;
    case 'bottom': horizontal(0, 15); break;
    case 'corner_l':
      horizontal(10, 15);
      pm.vline(10, 0, 5, INK);
      pm.vline(11, 1, 4, cap[2]);
      break;
    case 'corner_r':
      horizontal(0, 5);
      pm.vline(5, 0, 5, INK);
      pm.vline(4, 1, 4, cap[0]);
      break;
  }
  return pm;
}

/** Estera tejida a la salida (16×16, se pone sobre el piso). */
export function buildDoorMat(): Pixmap {
  const pm = new Pixmap(16, 16);
  const stripes = [0x8a2a1c, 0xc84a2a, 0xe8b030, 0xc84a2a, 0x2a6a3a, 0xc84a2a, 0xe8b030, 0xc84a2a, 0x8a2a1c, 0xc84a2a];
  for (let i = 0; i < 10; i++) pm.hline(2, 13, 3 + i, C(stripes[i]));
  for (let y = 3; y < 13; y++) for (let x = 2; x < 14; x++) if ((x + y) % 4 === 0) pm.set(x, y, C(0x000000, 50));
  pm.hline(2, 13, 3, C(0xffffff, 70));
  for (let y = 4; y < 13; y += 2) { pm.set(1, y, C(0xe8d8a8)); pm.set(14, y, C(0xe8d8a8)); }
  pm.outline(INK);
  for (let y = 4; y < 13; y += 2) { pm.set(0, y, C(0xe8d8a8)); pm.set(15, y, C(0xe8d8a8)); }
  return pm;
}

// ---------- muebles ----------

export type FurnitureKind =
  | 'barra' | 'mesa_cantina' | 'silla' | 'rockola' | 'estante_botellas' | 'mesa_billar' | 'canasta_cerveza' | 'bombillos_pared'
  | 'fogon_lena' | 'olla' | 'mesa_comedor' | 'mecedora' | 'hamaca' | 'cama' | 'baul' | 'radio' | 'tv_vieja' | 'nevera' | 'planta' | 'matera'
  | 'sagrado_corazon' | 'cuadro_paisaje' | 'virgen' | 'altar' | 'banca_iglesia' | 'pulpito' | 'velas'
  | 'mostrador' | 'estante_tienda' | 'costales' | 'racimo_platano' | 'tiple' | 'guitarra' | 'acordeon' | 'carriel_pared' | 'sombrero_pared'
  | 'ventana' | 'reloj' | 'tapete' | 'chimenea' | 'escoba' | 'gallina' | 'lampara';

/**
 * Baldosas que bloquea cada mueble. 0×0 = no bloquea: los colgados de pared (ver WALL_HUNG)
 * y los del piso que se pisan o se mueven (tapete, escoba, gallina), que se alinean como si fueran 1×1.
 */
export const FURNITURE_FOOTPRINT: Record<FurnitureKind, [number, number]> = {
  barra: [4, 1], mesa_cantina: [2, 1], silla: [1, 1], rockola: [1, 1], estante_botellas: [0, 0],
  mesa_billar: [3, 2], canasta_cerveza: [1, 1], bombillos_pared: [0, 0],
  fogon_lena: [2, 1], olla: [1, 1], mesa_comedor: [2, 1], mecedora: [1, 1], hamaca: [3, 1], cama: [2, 2],
  baul: [1, 1], radio: [1, 1], tv_vieja: [1, 1], nevera: [1, 1], planta: [1, 1], matera: [1, 1],
  sagrado_corazon: [0, 0], cuadro_paisaje: [0, 0], virgen: [1, 1], altar: [3, 1], banca_iglesia: [3, 1],
  pulpito: [1, 1], velas: [1, 1],
  mostrador: [3, 1], estante_tienda: [2, 1], costales: [1, 1], racimo_platano: [1, 1], tiple: [0, 0],
  guitarra: [1, 1], acordeon: [1, 1], carriel_pared: [0, 0], sombrero_pared: [0, 0],
  ventana: [0, 0], reloj: [0, 0], tapete: [0, 0], chimenea: [2, 1], escoba: [0, 0], gallina: [0, 0], lampara: [1, 1],
};

/** Colgados en la pared del fondo: su dibujo mide 32 de alto y se pone encima de la pared (arriba con arriba). */
export const WALL_HUNG: ReadonlySet<FurnitureKind> = new Set<FurnitureKind>([
  'estante_botellas', 'bombillos_pared', 'sagrado_corazon', 'cuadro_paisaje', 'tiple', 'carriel_pared',
  'sombrero_pared', 'ventana', 'reloj',
]);

/** Muebles cuyo dibujo cambia entre el fotograma 0 y el 1. */
export const FURNITURE_ANIMATED: ReadonlySet<FurnitureKind> = new Set<FurnitureKind>([
  'rockola', 'bombillos_pared', 'fogon_lena', 'olla', 'radio', 'tv_vieja', 'sagrado_corazon', 'altar',
  'velas', 'reloj', 'chimenea', 'gallina', 'lampara',
]);

interface Built { pm: Pixmap; lights: Pt[] }
type Draw = (f: number) => Built;

function fin(pm: Pixmap, lights: Pt[], shadow?: [number, number, number, number]): Built {
  pm.outline(INK);
  if (shadow) groundShadow(pm, ...shadow);
  return { pm, lights };
}

// --- cantina ---

const barra: Draw = () => {
  const pm = new Pixmap(64, 34), l: Pt[] = [];
  // frente de caoba con tableros
  pm.rect(1, 15, 62, 16, WOOD_D[1]);
  for (let i = 0; i < 4; i++) {
    const px = 3 + i * 15;
    pm.rect(px, 17, 13, 9, WOOD_D[0]);
    pm.rect(px + 1, 18, 11, 7, WOOD_D[1]);
    pm.hline(px + 1, px + 11, 18, WOOD_D[2]);
    pm.vline(px + 1, 18, 24, WOOD_D[2]);
    pm.rect(px + 5, 20, 3, 3, WOOD[1]);
    pm.set(px + 5, 20, WOOD[2]);
  }
  pm.rect(1, 28, 62, 3, WOOD_D[0]);
  // barra de bronce para los pies
  pm.hline(2, 61, 27, BRASS[2]);
  pm.hline(2, 61, 28, BRASS[0]);
  for (const x of [6, 32, 57]) pm.vline(x, 26, 29, BRASS[1]);
  // cubierta pulida
  pm.rect(1, 9, 62, 6, WOOD_L[1]);
  pm.hline(1, 62, 9, WOOD_L[2]);
  pm.hline(1, 62, 13, WOOD[1]);
  pm.hline(1, 62, 14, WOOD[0]);
  for (const x of [8, 30, 47]) pm.hline(x, x + 5, 10, C(0xf8d8a0));
  pm.hline(1, 62, 15, C(0x000000, 90));
  // aguardiente, copitas, cerveza y caja registradora
  bottle(pm, 5, 11, 10, ...AGUARDIENTE);
  bottle(pm, 9, 11, 10, ...AGUARDIENTE);
  copita(pm, 14, 10); copita(pm, 17, 11); copita(pm, 21, 10);
  bottle(pm, 27, 12, 8, ...CERVEZA);
  bottle(pm, 31, 12, 8, ...CERVEZA);
  pm.ellipse(39, 11, 3, 1.5, C(0x5a8a2a));
  pm.set(38, 10, C(0x9ad04a)); pm.set(40, 11, C(0x9ad04a));
  box(pm, 49, 3, 11, 8, BRASS);
  pm.rect(50, 4, 9, 2, C(0x2a2a20));
  pm.set(52, 4, C(0x80ff80)); pm.set(53, 4, C(0x80ff80)); pm.set(55, 4, C(0x80ff80));
  for (let x = 50; x < 59; x += 2) pm.set(x, 7, C(0xf4ecd0));
  pm.rect(48, 10, 13, 2, BRASS[0]);
  return fin(pm, l, [32, 31.5, 31, 2]);
};

const mesaCantina: Draw = () => {
  const pm = new Pixmap(32, 28), l: Pt[] = [];
  pm.ellipse(16, 25, 7, 2, WOOD_D[0]);
  pm.rect(14, 15, 4, 10, WOOD_D[1]);
  pm.vline(14, 15, 24, WOOD_D[2]);
  pm.ellipse(16, 14, 13, 6, WOOD[0]);
  pm.ellipse(16, 13, 13, 5.5, WOOD[1]);
  pm.ellipse(15, 12, 10, 3.5, WOOD[2]);
  pm.ellipse(16, 13, 8, 2.5, WOOD[1]);
  // dominó, cervezas y copitas
  for (const [x, y] of [[8, 12], [11, 13], [9, 15]] as const) {
    pm.rect(x, y, 3, 2, C(0xf4f0e4));
    pm.set(x, y, C(0x2a2a2a)); pm.set(x + 2, y + 1, C(0x2a2a2a));
  }
  bottle(pm, 17, 13, 8, ...CERVEZA);
  bottle(pm, 21, 14, 8, ...CERVEZA);
  copita(pm, 14, 9);
  return fin(pm, l, [16, 26.5, 10, 1.5]);
};

const silla: Draw = () => {
  const pm = new Pixmap(16, 24), l: Pt[] = [];
  // taburete paisa con espaldar y asiento de cuero de vaca
  for (const x of [3, 11]) {
    pm.rect(x, 2, 2, 20, WOOD[1]);
    pm.vline(x, 2, 21, WOOD[2]);
    pm.set(x, 1, WOOD[2]); pm.set(x + 1, 1, WOOD[1]);
  }
  cowhide(pm, 5, 4, 6, 6, 41);
  pm.hline(5, 10, 3, WOOD[0]);
  pm.hline(5, 10, 10, WOOD[0]);
  cowhide(pm, 3, 12, 10, 4, 43);
  pm.hline(3, 12, 16, WOOD[0]);
  pm.hline(3, 12, 17, WOOD[1]);
  pm.hline(3, 12, 19, WOOD[0]);
  pm.rect(5, 18, 1, 4, WOOD[0]); pm.rect(10, 18, 1, 4, WOOD[0]);
  return fin(pm, l, [8, 22.5, 6, 1.5]);
};

const rockola: Draw = (f) => {
  const pm = new Pixmap(16, 32), l: Pt[] = [];
  const cols = [0xff4060, 0xffd040, 0x40e070, 0x40a8ff];
  pm.rect(2, 9, 12, 20, WOOD_D[1]);
  pm.ellipse(8, 9, 6, 7, WOOD_D[1]);
  pm.vline(2, 9, 28, WOOD_D[2]);
  pm.vline(13, 9, 28, WOOD_D[0]);
  // tubos de luz en arco y a los lados
  let s = 0;
  for (let a = 0; a <= 16; a++) {
    const t = Math.PI - (a / 16) * Math.PI;
    pm.set(Math.round(7.5 + Math.cos(t) * 5), Math.round(9 - Math.sin(t) * 6), C(cols[(Math.floor(a / 3) + f) % 4]));
  }
  for (let y = 9; y < 26; y++, s++) {
    const c = C(cols[(Math.floor(s / 3) + f + 1) % 4]);
    pm.set(3, y, c);
    pm.set(12, y, c);
  }
  // ventana de los discos
  pm.rect(5, 6, 6, 6, C(0xffc040));
  pm.rect(5, 6, 6, 2, C(0xfff0a0));
  pm.hline(5, 10, 10, C(0x2a1a10));
  pm.set(7, 9, C(0x2a1a10)); pm.set(8, 9, C(0xc82020));
  // botonera
  for (let x = 5; x < 11; x++) pm.set(x, 13, C(x % 2 ? 0xf4f0e0 : 0xc82020));
  pm.set(5 + ((f * 3) % 6), 13, C(0x80ff80));
  // rejilla cromada
  pm.rect(5, 16, 6, 8, CHROME[1]);
  for (let y = 17; y < 24; y += 2) pm.hline(5, 10, y, CHROME[0]);
  pm.vline(5, 16, 23, CHROME[2]);
  pm.rect(2, 26, 12, 3, CHROME[0]);
  pm.hline(2, 13, 26, CHROME[2]);
  l.push([8, 8]);
  return fin(pm, l, [8, 29.5, 7, 1.5]);
};

const estanteBotellas: Draw = () => {
  const pm = new Pixmap(32, 32), l: Pt[] = [];
  // espejo detrás de las repisas
  pm.rect(3, 5, 26, 17, C(0x3a4a5a));
  pm.line(6, 20, 14, 6, 1, C(0x6a7e92));
  pm.line(18, 20, 24, 9, 1, C(0x5a6e82));
  pm.rectOutline(2, 4, 28, 19, WOOD_D[1]);
  const kinds = [AGUARDIENTE, RON, AGUARDIENTE, VINO, CERVEZA, RON, AGUARDIENTE];
  for (const [y, n] of [[12, 7], [21, 6]] as const) {
    for (let i = 0; i < n; i++) {
      const k = kinds[(i + y) % kinds.length];
      bottle(pm, 4 + i * 4 - (n === 6 ? -2 : 0), y, 7 + ((i + y) % 3), ...k);
    }
    pm.rect(1, y + 1, 30, 2, WOOD[1]);
    pm.hline(1, 30, y + 1, WOOD[2]);
    pm.hline(1, 30, y + 3, C(0x000000, 70));
    for (const bx of [3, 28]) pm.set(bx, y + 3, WOOD[0]);
  }
  return fin(pm, l);
};

const mesaBillar: Draw = () => {
  const pm = new Pixmap(48, 40), l: Pt[] = [];
  const felt = R(0x0e4a22, 0x1a7a3a, 0x2e9a50);
  // patas y faldón
  for (const x of [3, 41]) { pm.rect(x, 30, 4, 8, WOOD_D[1]); pm.vline(x, 30, 37, WOOD_D[2]); }
  pm.rect(2, 28, 44, 5, WOOD_D[1]);
  pm.hline(2, 45, 28, WOOD_D[2]);
  for (let x = 6; x < 42; x += 9) pm.rect(x, 30, 5, 2, WOOD_D[0]);
  // bandas
  pm.rect(1, 4, 46, 25, WOOD[1]);
  pm.hline(1, 46, 4, WOOD[2]);
  pm.hline(1, 46, 28, WOOD[0]);
  for (const x of [8, 24, 39]) { pm.set(x, 5, C(0xf4ecd0)); pm.set(x, 27, C(0xf4ecd0)); }
  // paño
  pm.rect(4, 7, 40, 19, felt[1]);
  pm.hline(4, 43, 7, felt[0]);
  pm.vline(4, 7, 25, felt[0]);
  pm.ellipse(24, 16, 14, 5, felt[2]);
  pm.ellipse(24, 16, 11, 4, felt[1]);
  // troneras
  for (const [x, y] of [[4, 7], [23, 6], [42, 7], [4, 24], [23, 25], [42, 24]] as const) pm.rect(x, y, 2, 2, C(0x0a0a0a));
  // bolas y taco
  const balls: [number, number, number][] = [[30, 13, 0xf4f0e0], [14, 17, 0xd82020], [17, 15, 0xf0c020], [16, 19, 0x2050c0], [19, 18, 0x1a1a1a], [33, 20, 0xe07020]];
  for (const [x, y, c] of balls) {
    pm.rect(x, y, 2, 2, C(c));
    pm.set(x, y, C(0xffffff, 200));
  }
  pm.line(28, 23, 44, 11, 1, WOOD_L[2]);
  pm.line(40, 14, 44, 11, 1, WOOD_D[1]);
  pm.set(28, 23, C(0x3a7ad0));
  return fin(pm, l, [24, 38.5, 22, 1.5]);
};

const canastaCerveza: Draw = () => {
  const pm = new Pixmap(16, 24), l: Pt[] = [];
  const red = R(0x8a1414, 0xc82020, 0xf04a3a), yel = R(0x9a6a10, 0xe0b020, 0xf8e070);
  const crate = (y: number, r: Ramp) => {
    box(pm, 1, y, 14, 8, r);
    pm.rect(5, y + 2, 6, 2, r[0]);
    pm.hline(2, 13, y + 6, r[0]);
  };
  crate(14, yel);
  crate(7, red);
  // botellas asomadas
  for (let i = 0; i < 4; i++) {
    pm.rect(2 + i * 3, 3, 2, 4, C(0x6a3a10));
    pm.set(2 + i * 3, 2, C(0xd8d8d8));
    pm.set(3 + i * 3, 2, C(0xb0b0b0));
    pm.set(2 + i * 3, 4, C(0xa86a30));
  }
  return fin(pm, l, [8, 22.5, 7, 1.5]);
};

const bombillosPared: Draw = (f) => {
  const pm = new Pixmap(16, 32), l: Pt[] = [];
  const cols = [0xff4040, 0x40e060, 0xffe040, 0x40a0ff];
  const wireY = (x: number) => Math.round(6 + 9.6 * (x / 16) * (1 - x / 16));
  // bombillos con contorno propio; el cable queda fino
  const bulbs = new Pixmap(16, 32);
  ([[0, 3], [1, 8], [2, 13]] as const).forEach(([i, bx]) => {
    const by = wireY(bx) + 1;
    const c = cols[(i + f) % 4];
    const on = (i + f) % 2 === 0;
    bulbs.set(bx, by, C(0x3a3a3a));
    bulbs.rect(bx - 1, by + 1, 3, 3, C(c));
    bulbs.set(bx - 1, by + 1, on ? WHITE : C(0xffffff, 120));
    l.push([bx, by + 2]);
  });
  bulbs.outline(INK);
  for (let x = 0; x < 16; x++) pm.set(x, wireY(x), INK);
  pm.blit(bulbs, 0, 0);
  ([[0, 3], [1, 8], [2, 13]] as const).forEach(([i, bx]) => {
    if ((i + f) % 2) return;
    const by = wireY(bx) + 1, c = cols[(i + f) % 4];
    for (const [dx, dy] of [[-3, 2], [3, 2], [0, 6]] as const) if (pm.alpha(bx + dx, by + dy) === 0) pm.set(bx + dx, by + dy, C(c, 110));
  });
  return { pm, lights: l };
};

// --- casa campesina ---

const fogonLena: Draw = (f) => {
  const pm = new Pixmap(32, 34), l: Pt[] = [];
  const adobe = R(0x7a4a30, 0xa86a48, 0xc88a64);
  // cuerpo de barro
  pm.rect(1, 12, 30, 19, adobe[1]);
  pm.vline(1, 12, 30, adobe[2]);
  pm.vline(30, 12, 30, adobe[0]);
  for (const [x, y] of [[5, 16], [24, 20], [7, 27], [26, 27], [12, 14]] as const) pm.hline(x, x + 2, y, adobe[0]);
  // plancha con hollín
  pm.rect(1, 9, 30, 4, C(0x3a3036));
  pm.hline(1, 30, 9, C(0x6a5e64));
  pm.hline(1, 30, 12, C(0x1a1418));
  // boca del fogón
  pm.rect(9, 19, 14, 11, C(0x1a0e0a));
  pm.hline(10, 21, 18, C(0x1a0e0a));
  fire(pm, 10, 28, 12, 8, f);
  pm.line(6, 30, 14, 27, 2, WOOD[0]);
  pm.line(26, 30, 18, 27, 2, WOOD[1]);
  pm.set(13, 27, FIRE[2]); pm.set(19, 27, FIRE[2]);
  pm.hline(9, 22, 30, C(0x2a1a14));
  // olla de sancocho y budare con arepas
  pm.rect(3, 3, 12, 8, CHROME[1]);
  pm.vline(3, 3, 10, CHROME[2]);
  pm.vline(14, 3, 10, CHROME[0]);
  pm.ellipse(9, 3, 6, 2, CHROME[0]);
  pm.ellipse(9, 3, 5, 1.5, C(0xe0b040));
  pm.set(7, 3, C(0xf8e8a0)); pm.set(11, 2, C(0x5aa040)); pm.set(9, 3, C(0xf4f0e0));
  pm.hline(1, 2, 5, CHROME[0]); pm.hline(15, 16, 5, CHROME[0]);
  steam(pm, 8, 0, f);
  pm.ellipse(23, 9, 7, 2, C(0x1e1a1e));
  for (const x of [20, 26]) { pm.ellipse(x, 8, 2.5, 1.2, C(0xf0e4c0)); pm.set(x - 1, 8, C(0xc89a50)); }
  l.push([16, 24]);
  return fin(pm, l, [16, 31.5, 15, 2]);
};

const olla: Draw = (f) => {
  const pm = new Pixmap(16, 22), l: Pt[] = [];
  const clay = R(0x5a2a16, 0x8a4a2a, 0xb06a40);
  pm.ellipse(8, 14, 6.5, 6, clay[0]);
  pm.ellipse(8, 14, 5, 4.5, clay[1]);
  pm.ellipse(6.5, 12.5, 2.5, 2, clay[2]);
  pm.ellipse(8, 9, 5.5, 2, clay[0]);
  pm.ellipse(8, 9, 4.5, 1.4, C(0xd8a030));
  pm.set(6, 9, C(0xf4e8a0)); pm.set(9, 9, C(0x4a9a30));
  pm.rect(1, 12, 2, 2, clay[0]); pm.rect(13, 12, 2, 2, clay[0]);
  // cuchara de palo
  pm.line(10, 9, 13, 3, 1, WOOD_L[1]);
  steam(pm, 6, 6, f);
  return fin(pm, l, [8, 20.5, 6, 1.5]);
};

const mesaComedor: Draw = () => {
  const pm = new Pixmap(32, 30), l: Pt[] = [];
  for (const x of [3, 27]) { pm.rect(x, 20, 2, 8, WOOD[0]); pm.set(x, 20, WOOD[1]); }
  // mantel de cuadros rojos
  pm.rect(1, 9, 30, 13, C(0xf4ecdc));
  for (let y = 9; y < 22; y++) for (let x = 1; x < 31; x++) {
    const a = Math.floor(x / 3) % 2, b = Math.floor(y / 3) % 2;
    if (a && b) pm.set(x, y, C(0xc02a2a));
    else if (a || b) pm.set(x, y, C(0xe08a80));
  }
  pm.hline(1, 30, 15, C(0x000000, 50));
  for (let x = 1; x < 31; x += 3) pm.set(x, 21, C(0x000000, 0));
  // platos con arepa y fríjoles, jarra de aguapanela
  for (const x of [8, 22]) {
    pm.ellipse(x, 11, 4, 2, C(0xf8f8f8));
    pm.ellipse(x - 1, 11, 1.8, 1, C(0xe8c870));
    pm.ellipse(x + 2, 11, 1.4, 0.9, C(0x6a2a1a));
  }
  pm.rect(14, 4, 4, 7, C(0xc8e0e8, 220));
  pm.rect(14, 7, 4, 4, C(0xb87a30));
  pm.vline(18, 6, 8, C(0xc8e0e8));
  pm.set(14, 4, WHITE);
  return fin(pm, l, [16, 28.5, 14, 1.5]);
};

const mecedora: Draw = () => {
  const pm = new Pixmap(16, 26), l: Pt[] = [];
  const cane = R(0xb8904a, 0xd8b470, 0xf0d898);
  // espaldar de esterilla
  pm.rect(4, 2, 8, 11, cane[1]);
  for (let y = 2; y < 13; y++) for (let x = 4; x < 12; x++) if ((x + y) % 2 === 0) pm.set(x, y, cane[0]);
  pm.rectOutline(3, 1, 10, 13, WOOD_D[1]);
  pm.hline(4, 11, 1, WOOD_D[2]);
  // asiento y brazos
  pm.rect(3, 14, 10, 4, cane[1]);
  pm.dither(3, 14, 10, 4, cane[0]);
  pm.rect(1, 10, 2, 8, WOOD_D[1]); pm.rect(13, 10, 2, 8, WOOD_D[1]);
  pm.hline(1, 2, 10, WOOD_D[2]); pm.hline(13, 14, 10, WOOD_D[2]);
  pm.rect(3, 18, 2, 4, WOOD_D[1]); pm.rect(11, 18, 2, 4, WOOD_D[1]);
  // balancines curvos
  for (let x = 1; x <= 14; x++) {
    const y = 22 + Math.round(((x - 7.5) * (x - 7.5)) / 30);
    pm.set(x, y, WOOD_D[1]);
    pm.set(x, y - 1, WOOD_D[2]);
  }
  return fin(pm, l, [8, 24.5, 6, 1]);
};

const hamaca: Draw = () => {
  const pm = new Pixmap(48, 28), l: Pt[] = [];
  for (const x of [2, 43]) {
    pm.rect(x, 2, 3, 24, WOOD[1]);
    pm.vline(x, 2, 25, WOOD[2]);
    pm.vline(x + 2, 2, 25, WOOD[0]);
  }
  // cabuyas
  pm.line(5, 6, 11, 11, 1, C(0xd8c8a0));
  pm.line(42, 6, 36, 11, 1, C(0xd8c8a0));
  // tela de rayas de colores en catenaria
  const stripes = [0xc82a2a, 0xf0c030, 0x2a8a4a, 0x2a5ab0, 0xf0c030, 0xc82a2a];
  for (let x = 10; x <= 37; x++) {
    const t = (x - 10) / 27;
    const sag = Math.round(10 * t * (1 - t) * 1.2);
    for (let k = 0; k < stripes.length; k++) pm.set(x, 9 + sag + k, C(stripes[k]));
    pm.set(x, 9 + sag, C(0xffffff, 90));
    if (x % 2 === 0) { pm.set(x, 15 + sag, C(0xf4ecd0)); pm.set(x, 16 + sag, C(0xe8dcb4)); }
  }
  return fin(pm, l, [24, 25.5, 16, 1.5]);
};

const cama: Draw = () => {
  const pm = new Pixmap(32, 40), l: Pt[] = [];
  // cabecero tallado
  pm.rect(2, 4, 28, 9, WOOD[1]);
  pm.ellipse(16, 5, 10, 4, WOOD[1]);
  pm.ellipse(16, 5, 7, 2.5, WOOD[2]);
  pm.ellipse(16, 5, 5, 1.5, WOOD[1]);
  for (const x of [2, 28]) { pm.rect(x, 2, 2, 34, WOOD[0]); pm.set(x, 2, WOOD[2]); }
  // colchón, almohada y cobija de retazos
  pm.rect(4, 11, 24, 23, C(0xf4ecdc));
  pm.rect(6, 12, 20, 5, WHITE);
  pm.hline(6, 25, 16, C(0xd8d0c0));
  pm.hline(6, 25, 12, C(0xffffff));
  const patch = [0xc83a3a, 0xf0c040, 0x3a7ac0, 0x4a9a4a, 0xe07a30, 0x9a4ab0];
  for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
    const c = patch[(px * 3 + py * 2) % patch.length];
    pm.rect(4 + px * 6, 18 + py * 4, 6, 4, C(c));
    pm.set(5 + px * 6, 19 + py * 4, C(0xffffff, 110));
  }
  pm.hline(4, 27, 18, C(0xf8f0e0));
  pm.rect(4, 34, 24, 2, C(0x8a2a2a));
  // pie de cama
  pm.rect(2, 35, 28, 3, WOOD[1]);
  pm.hline(2, 29, 35, WOOD[2]);
  return fin(pm, l, [16, 38.5, 15, 1.5]);
};

const baul: Draw = () => {
  const pm = new Pixmap(16, 18), l: Pt[] = [];
  box(pm, 1, 8, 14, 8, WOOD);
  pm.rect(1, 3, 14, 5, WOOD[1]);
  pm.ellipse(8, 4, 7, 2, WOOD[2]);
  pm.hline(1, 14, 7, WOOD[0]);
  for (const x of [3, 12]) pm.vline(x, 3, 15, C(0x3a3a40));
  pm.rect(7, 7, 2, 3, BRASS[1]);
  pm.set(7, 7, BRASS[2]);
  return fin(pm, l, [8, 16.5, 7, 1]);
};

const radio: Draw = (f) => {
  const pm = new Pixmap(16, 26), l: Pt[] = [];
  // mesita
  pm.rect(2, 13, 12, 3, WOOD[1]);
  pm.hline(2, 13, 13, WOOD[2]);
  pm.rect(3, 16, 1, 8, WOOD[0]); pm.rect(12, 16, 1, 8, WOOD[0]);
  pm.hline(3, 12, 20, WOOD[0]);
  // radio de tubos con frente de tela
  pm.rect(3, 5, 10, 8, WOOD_L[1]);
  pm.ellipse(8, 5, 5, 3, WOOD_L[1]);
  pm.vline(3, 5, 12, WOOD_L[2]);
  pm.vline(12, 4, 12, WOOD_L[0]);
  pm.rect(5, 5, 6, 4, C(0xd8c8a0));
  for (let x = 5; x < 11; x += 2) pm.vline(x, 5, 8, C(0xb8a478));
  pm.rect(5, 10, 6, 2, C(f ? 0xffd860 : 0xffb030));
  pm.set(6 + f * 2, 10, C(0xc82020));
  pm.set(4, 11, BRASS[1]); pm.set(11, 11, BRASS[1]);
  // notas de música
  const ny = f ? 1 : 2, nx = f ? 12 : 13;
  pm.set(nx, ny, C(0xf8e8a0)); pm.vline(nx + 1, ny - 1, ny, C(0xf8e8a0));
  l.push([8, 10]);
  return fin(pm, l, [8, 24.5, 6, 1]);
};

const tvVieja: Draw = (f) => {
  const pm = new Pixmap(16, 30), l: Pt[] = [];
  // antena de conejo
  pm.line(7, 9, 3, 1, 1, CHROME[1]);
  pm.line(9, 9, 13, 2, 1, CHROME[1]);
  pm.set(3, 1, CHROME[2]); pm.set(13, 2, CHROME[2]);
  // mueble de madera con patas
  box(pm, 1, 9, 14, 13, WOOD);
  pm.rect(2, 22, 1, 6, WOOD_D[1]); pm.rect(13, 22, 1, 6, WOOD_D[1]);
  pm.hline(2, 13, 22, WOOD[0]);
  // pantalla con rayas de estática
  pm.rect(3, 11, 8, 8, C(0x1a2a3a));
  const rnd = seededRandom(7 + f * 11);
  for (let y = 12; y < 18; y++) for (let x = 4; x < 10; x++) {
    const r = rnd();
    pm.set(x, y, C(r < 0.3 ? 0xd8e8f8 : r < 0.6 ? 0x8ab0d0 : 0x4a6a90));
  }
  pm.hline(4, 9, 12 + f * 3, C(0xf0f8ff));
  pm.set(3, 11, C(0x3a4a5a)); pm.set(10, 11, C(0x3a4a5a)); pm.set(3, 18, C(0x3a4a5a)); pm.set(10, 18, C(0x3a4a5a));
  for (const y of [12, 15]) { pm.rect(12, y, 2, 2, C(0x2a2a2a)); pm.set(12, y, CHROME[2]); }
  l.push([7, 15]);
  return fin(pm, l, [8, 28.5, 6, 1]);
};

const nevera: Draw = () => {
  const pm = new Pixmap(16, 34), l: Pt[] = [];
  const enamel = R(0xb8b8a8, 0xe8e8dc, 0xfafaf2);
  pm.rect(2, 4, 12, 27, enamel[1]);
  pm.ellipse(8, 5, 6, 3, enamel[1]);
  pm.vline(2, 4, 30, enamel[2]);
  pm.vline(13, 4, 30, enamel[0]);
  pm.ellipse(7, 4, 4, 1.5, enamel[2]);
  pm.hline(2, 13, 12, enamel[0]);
  pm.rect(11, 6, 1, 4, CHROME[0]); pm.rect(11, 15, 1, 6, CHROME[0]);
  pm.set(11, 6, CHROME[2]); pm.set(11, 15, CHROME[2]);
  // imanes y un dibujo de niño
  pm.rect(4, 15, 4, 5, C(0xf8f4e0));
  pm.set(5, 16, C(0xe04040)); pm.set(6, 17, C(0x3a7ac0)); pm.set(5, 18, C(0x3a9a4a));
  pm.set(6, 15, C(0xf0c020));
  pm.set(5, 8, C(0xc82020)); pm.set(8, 7, C(0x3a7ac0));
  pm.rect(2, 30, 12, 1, C(0x6a6a60));
  return fin(pm, l, [8, 32.5, 7, 1]);
};

const LEAF = R(0x174a22, 0x2a7a34, 0x58b048);

const planta: Draw = () => {
  const pm = new Pixmap(16, 28), l: Pt[] = [];
  const pot = R(0x7a3a1e, 0xb05a2c, 0xd07a40);
  pm.polygon([[3, 19], [13, 19], [12, 26], [4, 26]], pot[1]);
  pm.hline(3, 12, 19, pot[2]);
  pm.rect(3, 19, 10, 2, pot[2]);
  pm.vline(11, 21, 25, pot[0]);
  // hojas de costilla de Adán
  const leaves: [number, number, number, number][] = [[8, 6, 4, 3], [4, 10, 4, 2.5], [12, 11, 3.5, 2.5], [6, 15, 4, 2.5], [11, 16, 3.5, 2], [8, 11, 3, 3]];
  for (const [x, y, rx, ry] of leaves) {
    pm.ellipse(x, y, rx, ry, LEAF[1]);
    pm.set(Math.round(x - rx / 2), Math.round(y - 1), LEAF[2]);
    pm.set(Math.round(x), Math.round(y), LEAF[0]);
  }
  pm.line(8, 18, 8, 8, 1, LEAF[0]);
  pm.set(9, 5, C(0x0e2e14)); pm.set(5, 10, C(0x0e2e14));
  return fin(pm, l, [8, 26.5, 5, 1]);
};

const matera: Draw = () => {
  const pm = new Pixmap(16, 18), l: Pt[] = [];
  const pot = R(0x1c3c78, 0x2c64b0, 0x5a94d8);
  pm.polygon([[3, 10], [13, 10], [12, 16], [4, 16]], pot[1]);
  pm.hline(3, 12, 10, pot[2]);
  pm.vline(11, 11, 15, pot[0]);
  for (const x of [5, 8, 11]) pm.set(x, 13, C(0xf8f0e0));
  pm.ellipse(8, 7, 5.5, 3.5, LEAF[1]);
  pm.ellipse(6, 6, 2, 1.5, LEAF[2]);
  for (const [x, y, c] of [[5, 4, 0xe82a40], [8, 3, 0xe82a40], [11, 5, 0xe82a40], [7, 7, 0xf8f8f8], [10, 7, 0xe82a40], [4, 7, 0xf04880]] as const) {
    pm.rect(x, y, 2, 2, C(c));
    pm.set(x, y, C(0xffffff, 140));
  }
  return fin(pm, l, [8, 16.5, 5, 1]);
};

// --- santos y cuadros ---

const sagradoCorazon: Draw = (f) => {
  const pm = new Pixmap(16, 32), l: Pt[] = [];
  nail(pm, 8, 4);
  // marco dorado
  box(pm, 2, 6, 12, 14, BRASS);
  pm.rect(4, 8, 8, 10, C(0x2e2450));
  pm.rect(4, 8, 8, 4, C(0x4a3a6a));
  // Jesús: halo, pelo, cara, túnica blanca, manto rojo y corazón
  pm.circle(8, 10.5, 3.2, C(0xf8d860));
  pm.ellipse(8, 11, 2.2, 2.6, C(0x5a3418));
  pm.rect(7, 10, 2, 2, C(0xe8b890));
  pm.set(7, 12, C(0x7a4a24)); pm.set(8, 12, C(0x7a4a24));
  pm.rect(5, 13, 6, 5, C(0xc02424));
  pm.vline(5, 13, 17, C(0xe04a3a));
  pm.rect(7, 13, 2, 5, C(0xf4ece4));
  pm.vline(10, 14, 17, C(0x2a4a9a));
  pm.rect(7, 14, 2, 2, C(0xff2a2a));
  pm.set(7, 13, C(0xffd040));
  pm.set(6, 16, C(0xe8b890));
  // repisa con veladora roja
  pm.rect(4, 22, 8, 2, WOOD[1]);
  pm.hline(4, 11, 22, WOOD[2]);
  pm.set(5, 24, WOOD[0]); pm.set(10, 24, WOOD[0]);
  pm.rect(7, 19, 2, 3, C(f ? 0xff3030 : 0xd81818));
  pm.set(7, 19, C(f ? 0xffb0a0 : 0xff6a5a));
  pm.set(7 + f, 18, FIRE[2]);
  l.push([8, 20]);
  return { pm: (pm.outline(INK), pm), lights: l };
};

const cuadroPaisaje: Draw = () => {
  const pm = new Pixmap(32, 32), l: Pt[] = [];
  nail(pm, 16, 4);
  pm.line(9, 7, 16, 4, 1, C(0x3a2a20, 160));
  pm.line(23, 7, 16, 4, 1, C(0x3a2a20, 160));
  box(pm, 4, 7, 24, 14, WOOD_L);
  // cielo, montañas, cafetal, casita y palma de cera
  pm.rect(6, 9, 20, 10, C(0x8ac8f0));
  pm.rect(6, 9, 20, 3, C(0x6ab0e8));
  pm.set(22, 10, C(0xfff4b0)); pm.set(23, 10, C(0xfff4b0));
  pm.polygon([[6, 15], [12, 11], [17, 14], [22, 10], [26, 13], [26, 19], [6, 19]], C(0x3a8a4a));
  pm.polygon([[6, 17], [10, 14], [16, 17], [20, 15], [26, 17], [26, 19], [6, 19]], C(0x5aaa48));
  for (let x = 7; x < 25; x += 2) pm.set(x, 18, C(0x2a6a2a));
  pm.rect(12, 14, 3, 2, C(0xf4ecdc));
  pm.hline(11, 15, 13, C(0xc84a2a));
  pm.vline(20, 11, 17, C(0xd8d0b8));
  pm.set(19, 11, C(0x2a7a34)); pm.set(21, 11, C(0x2a7a34)); pm.set(20, 10, C(0x2a7a34));
  pm.outline(INK);
  return { pm, lights: l };
};

const virgen: Draw = () => {
  const pm = new Pixmap(16, 32), l: Pt[] = [];
  // pedestal
  box(pm, 3, 24, 10, 6, STONE);
  pm.hline(2, 13, 24, STONE[2]);
  // manto azul y vestido
  pm.polygon([[8, 7], [12, 13], [12, 24], [4, 24], [4, 13]], C(0x2a5ab0));
  pm.polygon([[8, 10], [10, 14], [10, 23], [6, 23], [6, 14]], C(0xf4ecf0));
  pm.vline(11, 13, 23, C(0x1a3a80));
  pm.vline(4, 13, 23, C(0x4a7ad0));
  pm.hline(4, 12, 23, C(0xf0c040));
  // manos juntas, cara y corona con halo
  pm.rect(7, 15, 2, 2, C(0xf0c8a0));
  pm.ellipse(8, 7, 2.5, 2.8, C(0xf0c8a0));
  pm.polygon([[5, 6], [8, 4], [11, 6], [11, 10], [5, 10]], C(0x2a5ab0));
  pm.ellipse(8, 7.5, 1.8, 2, C(0xf0c8a0));
  pm.set(7, 7, C(0x3a2a2a)); pm.set(9, 7, C(0x3a2a2a));
  for (let a = 0; a < 12; a++) {
    const t = Math.PI * (0.1 + (a / 11) * 0.8);
    pm.set(Math.round(8 + Math.cos(t) * 5), Math.round(6 - Math.sin(t) * 4), C(0xf8d860));
  }
  pm.set(8, 3, C(0xfff4b0));
  // rosas al pie
  pm.set(4, 22, C(0xe82a40)); pm.set(12, 22, C(0xf8f8f8)); pm.set(5, 23, LEAF[1]); pm.set(11, 23, LEAF[1]);
  return fin(pm, l, [8, 30.5, 6, 1]);
};

const altar: Draw = (f) => {
  const pm = new Pixmap(48, 36), l: Pt[] = [];
  // mesa con mantel blanco y franja dorada
  pm.rect(2, 16, 44, 18, C(0xf4f0e6));
  pm.vline(2, 16, 33, WHITE);
  pm.vline(45, 16, 33, C(0xc8c0b0));
  pm.rect(2, 20, 44, 3, C(0xe8c040));
  pm.hline(2, 45, 20, C(0xf8e080));
  for (let x = 4; x < 45; x += 4) pm.set(x, 21, C(0xb02a2a));
  pm.rect(20, 25, 8, 7, C(0xe8c040));
  pm.rect(23, 26, 2, 5, C(0xb02a2a)); pm.rect(21, 27, 6, 2, C(0xb02a2a));
  pm.hline(2, 45, 16, WHITE);
  pm.rect(2, 14, 44, 2, C(0xd8d0c0));
  // crucifijo
  pm.rect(23, 1, 2, 14, WOOD_D[1]);
  pm.rect(19, 4, 10, 2, WOOD_D[1]);
  pm.vline(23, 1, 14, WOOD_D[2]);
  pm.rect(23, 5, 2, 6, C(0xe8c8a0));
  pm.rect(23, 11, 2, 3, BRASS[1]);
  // candelabros y flores
  for (const x of [10, 37]) {
    pm.rect(x - 1, 12, 3, 2, BRASS[1]);
    pm.rect(x, 7, 1, 5, C(0xf8f4e8));
    flame(pm, x, 6, f + (x > 20 ? 1 : 0));
    l.push([x, 5]);
  }
  for (const x of [15, 32]) {
    pm.rect(x - 1, 11, 3, 3, C(0xc8e0e8));
    pm.set(x - 1, 9, C(0xf8f8f8)); pm.set(x + 1, 9, C(0xe82a40)); pm.set(x, 8, C(0xf8f8f8));
    pm.set(x, 10, LEAF[1]);
  }
  pm.rect(27, 12, 4, 2, C(0x7a1c3a));
  return fin(pm, l, [24, 34.5, 22, 1.2]);
};

const bancaIglesia: Draw = () => {
  const pm = new Pixmap(48, 24), l: Pt[] = [];
  // espaldar visto desde atrás, asiento y costados tallados
  pm.rect(3, 5, 42, 8, WOOD[1]);
  pm.hline(3, 44, 5, WOOD[2]);
  pm.hline(3, 44, 9, WOOD[0]);
  pm.hline(3, 44, 12, WOOD[0]);
  pm.rect(3, 13, 42, 4, WOOD_L[1]);
  pm.hline(3, 44, 13, WOOD_L[2]);
  pm.hline(3, 44, 16, WOOD[0]);
  for (const x of [1, 44]) {
    pm.rect(x, 3, 3, 19, WOOD_D[1]);
    pm.ellipse(x + 1.5, 3, 1.5, 1.5, WOOD_D[1]);
    pm.vline(x, 3, 21, WOOD_D[2]);
  }
  pm.rect(8, 17, 32, 2, WOOD_D[0]);
  // reclinatorio y misal
  pm.rect(4, 19, 40, 2, WOOD[0]);
  pm.rect(30, 3, 4, 2, C(0x2a2a3a)); pm.set(31, 3, C(0xf0c040));
  return fin(pm, l, [24, 22.5, 22, 1]);
};

const pulpito: Draw = () => {
  const pm = new Pixmap(16, 32), l: Pt[] = [];
  pm.rect(5, 22, 6, 7, WOOD_D[1]);
  pm.vline(5, 22, 28, WOOD_D[2]);
  pm.rect(3, 28, 10, 2, WOOD_D[0]);
  pm.polygon([[1, 8], [15, 8], [13, 22], [3, 22]], WOOD[1]);
  pm.vline(2, 9, 21, WOOD[2]);
  pm.line(13, 9, 12, 21, 1, WOOD[0]);
  pm.rect(1, 7, 14, 2, WOOD_L[1]);
  pm.hline(1, 14, 7, WOOD_L[2]);
  pm.rectOutline(5, 11, 6, 8, WOOD_D[1]);
  pm.rect(7, 12, 2, 6, BRASS[1]); pm.rect(6, 13, 4, 2, BRASS[1]);
  // libro abierto
  pm.rect(4, 4, 8, 3, C(0xf4ecd8));
  pm.vline(8, 4, 6, C(0xb8a888));
  pm.set(10, 6, C(0xb02a2a)); pm.set(10, 7, C(0xb02a2a));
  return fin(pm, l, [8, 30.5, 5, 1]);
};

const velas: Draw = (f) => {
  const pm = new Pixmap(16, 24), l: Pt[] = [];
  // velero de hierro con dos gradas de veladoras
  pm.rect(7, 14, 2, 8, C(0x2c2c38));
  pm.rect(4, 21, 8, 1, C(0x2c2c38));
  pm.rect(1, 13, 14, 2, C(0x3a3a48));
  pm.hline(1, 14, 13, C(0x5a5a68));
  pm.rect(3, 8, 10, 2, C(0x3a3a48));
  pm.hline(3, 12, 8, C(0x5a5a68));
  const slots: Pt[] = [[2, 12], [5, 12], [8, 12], [11, 12], [4, 7], [7, 7], [10, 7]];
  slots.forEach(([x, y], i) => {
    pm.rect(x, y - 1, 2, 2, C(i % 3 === 1 ? 0xd02a2a : 0xf4ecd8, 230));
    flame(pm, x + (i % 2), y - 2, f + i);
    if (i === 1 || i === 5) l.push([x, y - 3]);
  });
  return fin(pm, l, [8, 22.5, 6, 1]);
};

// --- tienda ---

const mostrador: Draw = () => {
  const pm = new Pixmap(48, 32), l: Pt[] = [];
  // vitrina con panes y bocadillos
  pm.rect(1, 14, 46, 16, WOOD[1]);
  pm.rect(3, 15, 42, 8, C(0x2a3a48));
  pm.rect(3, 15, 42, 2, C(0x6a8aa0));
  for (let i = 0; i < 7; i++) {
    const x = 5 + i * 6;
    if (i % 2) { pm.rect(x, 19, 4, 3, C(0x8a1a2a)); pm.hline(x, x + 3, 19, C(0xc84a5a)); }
    else { pm.ellipse(x + 2, 20, 2.5, 1.6, C(0xd8a050)); pm.set(x + 1, 19, C(0xf0d090)); }
  }
  pm.line(6, 22, 12, 15, 1, C(0xffffff, 70));
  pm.rect(1, 24, 46, 6, WOOD_D[1]);
  for (let x = 4; x < 45; x += 8) pm.rect(x, 25, 6, 4, WOOD_D[0]);
  // cubierta
  pm.rect(1, 9, 46, 5, WOOD_L[1]);
  pm.hline(1, 46, 9, WOOD_L[2]);
  pm.hline(1, 46, 13, WOOD[0]);
  // pesa roja, frascos de dulces y cuaderno de fiados
  pm.rect(4, 6, 8, 4, C(0xc82828));
  pm.hline(4, 11, 6, C(0xe85a4a));
  pm.ellipse(8, 4, 4, 1.4, CHROME[1]);
  pm.rect(7, 7, 2, 1, C(0xf4f0e0));
  const jars = [0xf04060, 0xf0c020, 0x40c060];
  jars.forEach((c, i) => {
    const x = 16 + i * 5;
    pm.rect(x, 4, 4, 6, C(0xc8e0e8, 200));
    pm.rect(x, 6, 4, 4, C(c));
    pm.dither(x, 6, 4, 4, C(0xffffff, 110));
    pm.rect(x, 3, 4, 1, C(0xd02020));
  });
  pm.rect(33, 8, 7, 3, C(0x2a5ab0));
  pm.rect(34, 8, 5, 2, C(0xf4f0e0));
  pm.set(36, 9, C(0x2a2a2a));
  pm.rect(42, 7, 3, 3, C(0xf0c020));
  return fin(pm, l, [24, 30.5, 23, 1.3]);
};

const estanteTienda: Draw = () => {
  const pm = new Pixmap(32, 46), l: Pt[] = [];
  pm.rect(2, 3, 28, 41, WOOD_D[1]);
  pm.rect(4, 5, 24, 37, C(0x3a2214));
  pm.rect(1, 2, 30, 2, WOOD[1]);
  pm.hline(1, 30, 2, WOOD[2]);
  for (const x of [2, 29]) pm.vline(x, 3, 43, WOOD[x < 10 ? 2 : 0]);
  const shelves = [13, 22, 31, 40];
  const rnd = seededRandom(77);
  shelves.forEach((y, s) => {
    let x = 5;
    while (x < 26) {
      const kind = Math.floor(rnd() * 5);
      if (kind === 0) { // lata
        pm.rect(x, y - 4, 3, 4, C(s % 2 ? 0xc82020 : 0xf0c020));
        pm.hline(x, x + 2, y - 4, CHROME[2]);
        x += 4;
      } else if (kind === 1) { // botella de aceite
        pm.rect(x, y - 6, 2, 6, C(0xf0d040));
        pm.set(x, y - 7, C(0xe04020));
        x += 3;
      } else if (kind === 2) { // caja de fósforos / galletas
        pm.rect(x, y - 5, 4, 5, C(s % 2 ? 0x2a6ac0 : 0xe07020));
        pm.hline(x, x + 3, y - 3, C(0xf4f0e0));
        x += 5;
      } else if (kind === 3) { // panela envuelta
        pm.rect(x, y - 3, 4, 3, C(0xb87a30));
        pm.hline(x, x + 3, y - 3, C(0xd8a050));
        x += 5;
      } else { // jabón azul
        pm.rect(x, y - 2, 3, 2, C(0x4a8ad8));
        pm.set(x, y - 2, C(0xa8d0f8));
        x += 4;
      }
    }
    pm.rect(3, y, 26, 2, WOOD[1]);
    pm.hline(3, 28, y, WOOD[2]);
  });
  return fin(pm, l, [16, 44.5, 15, 1.2]);
};

const costales: Draw = () => {
  const pm = new Pixmap(16, 22), l: Pt[] = [];
  const fique = R(0x8a6a40, 0xc0a070, 0xdcc090);
  // costal de café abierto atrás
  pm.ellipse(10, 12, 5, 7, fique[1]);
  pm.ellipse(10, 6, 4.5, 2, fique[0]);
  pm.ellipse(10, 6, 3.5, 1.4, C(0x4a2416));
  pm.set(9, 6, C(0x7a3a20)); pm.set(11, 5, C(0x7a3a20));
  pm.vline(14, 9, 17, fique[0]);
  // bulto de arroz adelante
  pm.ellipse(6, 15, 5, 5, C(0xf0ece0));
  pm.ellipse(5, 13, 2.5, 2, WHITE);
  pm.hline(2, 9, 15, C(0x2a6ac0));
  pm.hline(2, 9, 16, C(0xc82020));
  pm.vline(10, 13, 18, C(0xc8c4b8));
  pm.set(4, 10, C(0xd8d4c8)); pm.set(7, 10, C(0xd8d4c8));
  return fin(pm, l, [8, 20.5, 7, 1.2]);
};

const racimoPlatano: Draw = () => {
  const pm = new Pixmap(16, 26), l: Pt[] = [];
  pm.vline(8, 0, 4, C(0xc8b080));
  pm.rect(7, 4, 2, 4, C(0x6a7a2a));
  // manos de plátano verde-amarillo alrededor del vástago
  const greens = [C(0x5a8a20), C(0x8ab030), C(0xd8c840)];
  for (let r = 0; r < 4; r++) {
    const y = 7 + r * 4, w = 6 - Math.abs(r - 1.2);
    for (let i = -w; i <= w; i += 2) {
      pm.line(8 + i * 0.6, y, 8 + i, y + 3, 1, greens[(r + Math.round(Math.abs(i))) % 2]);
      pm.set(Math.round(8 + i), y + 3, greens[2]);
    }
    pm.hline(Math.round(8 - w * 0.6), Math.round(8 + w * 0.6), y, C(0x4a6a18));
  }
  // bellota morada
  pm.ellipse(8, 23, 2, 2.5, C(0x6a2a4a));
  pm.set(7, 22, C(0x9a4a6a));
  return fin(pm, l, [8, 25, 4, 1]);
};

// --- música ---

function stringBody(pm: Pixmap, cx: number, top: number, len: number, wood: Ramp, board: Rgba, scale: number): void {
  // clavijero, mástil y caja de un tiple o guitarra
  pm.rect(cx - 1, top, 3, 3, wood[0]);
  pm.set(cx - 2, top + 1, CHROME[2]); pm.set(cx + 2, top + 1, CHROME[2]);
  pm.rect(cx, top + 3, 1, len, board);
  const by = top + 3 + len;
  pm.ellipse(cx + 0.5, by + 2 * scale, 3 * scale, 2.2 * scale, wood[1]);
  pm.ellipse(cx + 0.5, by + 5.5 * scale, 3.8 * scale, 3 * scale, wood[1]);
  pm.ellipse(cx - 0.5, by + 2 * scale, 1.5 * scale, 1.2 * scale, wood[2]);
  pm.circle(cx + 0.5, by + 3 * scale, 1.2, C(0x1a0e08));
  pm.rect(cx - 1, by + 6 * scale, 3, 1, wood[0]);
  pm.vline(cx, top + 3, by + 6 * scale, C(0xe8e0d0, 140));
}

const tiple: Draw = () => {
  const pm = new Pixmap(16, 32), l: Pt[] = [];
  nail(pm, 8, 4);
  pm.line(7, 5, 8, 6, 1, C(0x8a2a1c));
  stringBody(pm, 7, 6, 8, R(0x8a5a24, 0xd8a860, 0xf0d090), WOOD_D[1], 1.7);
  // cinta tricolor
  pm.set(9, 7, C(0xf0d020)); pm.set(10, 8, C(0x2a50b0)); pm.set(10, 9, C(0xc82020));
  pm.outline(INK);
  return { pm, lights: l };
};

const guitarra: Draw = () => {
  const pm = new Pixmap(16, 30), l: Pt[] = [];
  stringBody(pm, 7, 1, 10, R(0x5a2a10, 0xa85a24, 0xe0a050), WOOD_D[0], 2);
  // atril
  pm.line(3, 28, 7, 22, 1, C(0x2a2a30));
  pm.line(12, 28, 9, 22, 1, C(0x2a2a30));
  return fin(pm, l, [8, 28, 5, 1]);
};

const acordeon: Draw = () => {
  const pm = new Pixmap(16, 22), l: Pt[] = [];
  // taburete
  pm.rect(3, 13, 10, 3, WOOD[1]);
  pm.hline(3, 12, 13, WOOD[2]);
  pm.rect(4, 16, 1, 5, WOOD[0]); pm.rect(11, 16, 1, 5, WOOD[0]);
  pm.hline(4, 11, 19, WOOD[0]);
  // acordeón vallenato rojo
  pm.rect(1, 4, 4, 9, C(0xc82020));
  pm.rect(11, 4, 4, 9, C(0xc82020));
  pm.vline(1, 4, 12, C(0xe85a4a));
  for (let y = 5; y < 12; y += 2) pm.set(13, y, C(0xf4f0e0));
  for (let y = 5; y < 12; y += 2) pm.set(2, y, C(0xf4f0e0));
  pm.rect(5, 5, 6, 7, C(0x2a2a3a));
  for (let x = 5; x < 11; x += 2) pm.vline(x, 5, 11, C(0xc8c8d8));
  pm.hline(5, 10, 5, C(0x5a5a6a));
  pm.hline(1, 14, 4, CHROME[2]);
  return fin(pm, l, [8, 20.5, 6, 1]);
};

const carrielPared: Draw = () => {
  const pm = new Pixmap(16, 32), l: Pt[] = [];
  nail(pm, 8, 5);
  pm.line(8, 6, 3, 13, 1, C(0x4a2a14));
  pm.line(8, 6, 12, 13, 1, C(0x4a2a14));
  const leather = R(0x3e2410, 0x6a3e1c, 0x9a6232);
  pm.rect(2, 13, 12, 11, leather[1]);
  pm.vline(2, 13, 23, leather[2]);
  pm.vline(13, 13, 23, leather[0]);
  pm.hline(2, 13, 23, leather[0]);
  // solapa de piel de tigrillo y hebillas
  pm.polygon([[2, 13], [14, 13], [12, 19], [4, 19]], C(0xd8a050));
  for (const [x, y] of [[5, 14], [9, 15], [7, 17], [11, 14]] as const) { pm.set(x, y, C(0x2a1a10)); pm.set(x + 1, y, C(0x6a4020)); }
  pm.rect(7, 19, 2, 2, BRASS[1]); pm.set(7, 19, BRASS[2]);
  pm.set(4, 21, BRASS[1]); pm.set(11, 21, BRASS[1]);
  pm.outline(INK);
  return { pm, lights: l };
};

const sombreroPared: Draw = () => {
  const pm = new Pixmap(16, 32), l: Pt[] = [];
  nail(pm, 8, 6);
  const straw = R(0xc8b890, 0xece4cc, 0xfaf6ea);
  pm.ellipse(8, 16, 7, 3, straw[1]);
  pm.ellipse(8, 17, 6, 2, straw[0]);
  pm.rect(4, 9, 8, 7, straw[1]);
  pm.ellipse(8, 9, 4, 1.5, straw[1]);
  pm.vline(4, 9, 15, straw[2]);
  pm.vline(11, 9, 15, straw[0]);
  pm.rect(4, 13, 8, 2, C(0x1a1414));
  for (let x = 5; x < 11; x += 2) pm.set(x, 11, straw[0]);
  pm.set(8, 8, C(0x1a1414, 120));
  pm.outline(INK);
  return { pm, lights: l };
};

const ventana: Draw = () => {
  const pm = new Pixmap(16, 32), l: Pt[] = [];
  // noche afuera: estrellas, luna y montaña
  pm.rect(3, 6, 10, 15, C(0x14204a));
  pm.rect(3, 6, 10, 5, C(0x0e1638));
  pm.polygon([[3, 18], [7, 14], [10, 16], [13, 13], [13, 21], [3, 21]], C(0x0a1224));
  for (const [x, y] of [[4, 8], [9, 7], [6, 11], [11, 10]] as const) pm.set(x, y, C(0xf8f4c0));
  pm.rect(10, 7, 2, 2, C(0xf8f0d0)); pm.set(10, 7, C(0x14204a));
  // marco y reja de madera
  pm.rectOutline(2, 5, 12, 17, WOOD[1]);
  pm.hline(2, 13, 5, WOOD[2]);
  for (const x of [5, 8, 11]) pm.vline(x, 6, 20, WOOD[0]);
  pm.hline(3, 12, 13, WOOD[0]);
  // cortinas de flores
  for (const [x0, x1] of [[1, 3], [12, 14]] as const) {
    pm.rect(x0, 4, x1 - x0 + 1, 15, C(0xe8d8b0));
    for (let y = 6; y < 18; y += 3) pm.set(x0 + 1, y, C(0xd84040));
    pm.set(x0, 18, C(0xc8b890));
  }
  pm.hline(0, 15, 4, WOOD_D[1]);
  // alféizar
  pm.rect(1, 22, 14, 2, WOOD[1]);
  pm.hline(1, 14, 22, WOOD[2]);
  pm.outline(INK);
  return { pm, lights: l };
};

const reloj: Draw = (f) => {
  const pm = new Pixmap(16, 32), l: Pt[] = [];
  nail(pm, 8, 2);
  box(pm, 3, 4, 10, 22, WOOD_D);
  pm.ellipse(8, 4, 5, 2, WOOD_D[1]);
  pm.set(8, 2, WOOD_D[2]);
  // carátula
  pm.circle(8, 9, 3.5, C(0xf4ecd8));
  pm.set(8, 6, C(0x2a2a2a)); pm.set(11, 9, C(0x2a2a2a)); pm.set(5, 9, C(0x2a2a2a)); pm.set(8, 12, C(0x2a2a2a));
  pm.vline(8, 7, 9, C(0x1a1a1a));
  pm.hline(8, 10, 9, C(0x1a1a1a));
  // puerta de vidrio con péndulo
  pm.rect(5, 14, 6, 10, C(0x3a2214));
  const px = f ? 9 : 7;
  pm.line(8, 14, px, 20, 1, BRASS[0]);
  pm.circle(px + 0.5, 21, 1.5, BRASS[1]);
  pm.set(px, 20, BRASS[2]);
  pm.line(5, 22, 9, 14, 1, C(0xffffff, 50));
  pm.rect(4, 26, 8, 2, WOOD_D[1]);
  pm.outline(INK);
  return { pm, lights: l };
};

const tapete: Draw = () => {
  const pm = new Pixmap(32, 16), l: Pt[] = [];
  const rings = [0x8a2a2a, 0xe0a030, 0x2a7a4a, 0xc84a2a, 0x3a5ab0, 0xf0d080];
  rings.forEach((c, i) => pm.ellipse(16, 8, 14.5 - i * 2.2, 6.5 - i * 1.05, C(c)));
  for (let x = 4; x < 28; x += 3) pm.set(x, 8, C(0x000000, 50));
  pm.outline(C(0x3a1a12));
  return { pm, lights: l };
};

const chimenea: Draw = (f) => {
  const pm = new Pixmap(32, 46), l: Pt[] = [];
  // tiro y cuerpo de piedra
  pm.rect(8, 1, 16, 14, STONE[1]);
  pm.rect(2, 14, 28, 30, STONE[1]);
  const rnd = seededRandom(91);
  for (let y = 2; y < 44; y += 4) {
    const x0 = y < 14 ? 8 : 2, x1 = y < 14 ? 23 : 29;
    pm.hline(x0, x1, y, STONE[0]);
    for (let x = x0 + ((y >> 2) % 2) * 3; x < x1; x += 6) pm.vline(x, y, y + 3, STONE[0]);
    pm.set(x0 + 1 + Math.floor(rnd() * (x1 - x0 - 2)), y + 1, STONE[2]);
  }
  pm.vline(2, 14, 43, STONE[2]);
  pm.vline(29, 14, 43, STONE[0]);
  // repisa con velas y un retrato
  pm.rect(1, 18, 30, 3, WOOD[1]);
  pm.hline(1, 30, 18, WOOD[2]);
  pm.hline(1, 30, 20, WOOD[0]);
  pm.rect(5, 15, 1, 3, C(0xf4ecd8)); flame(pm, 5, 14, f);
  pm.rect(26, 15, 1, 3, C(0xf4ecd8)); flame(pm, 26, 14, f + 1);
  box(pm, 13, 11, 6, 7, BRASS);
  pm.rect(14, 12, 4, 5, C(0x8a7a6a));
  pm.ellipse(16, 14, 1.2, 1.5, C(0xd8b090));
  // hogar con fuego
  pm.rect(7, 25, 18, 17, C(0x1a0e0a));
  pm.ellipse(16, 25, 9, 4, C(0x1a0e0a));
  fire(pm, 9, 40, 14, 11, f);
  pm.line(9, 41, 22, 38, 2, WOOD[0]);
  pm.line(22, 41, 10, 38, 1, WOOD[1]);
  pm.rect(4, 42, 24, 2, STONE[2]);
  l.push([16, 34], [5, 13], [26, 13]);
  return fin(pm, l, [16, 44.5, 15, 1.2]);
};

const escoba: Draw = () => {
  const pm = new Pixmap(16, 28), l: Pt[] = [];
  pm.line(11, 1, 7, 18, 1, WOOD_L[1]);
  pm.set(11, 1, WOOD_L[2]);
  // escoba de millo amarrada
  pm.polygon([[5, 18], [9, 18], [12, 26], [2, 26]], C(0xd8b850));
  for (let x = 3; x < 12; x += 2) pm.line(7, 19, x, 26, 1, C(0xb8983a));
  pm.hline(5, 9, 18, C(0xc82020));
  pm.hline(4, 10, 20, C(0xc82020));
  return fin(pm, l, [7, 26.5, 6, 1]);
};

const gallina: Draw = (f) => {
  const pm = new Pixmap(16, 16), l: Pt[] = [];
  const brown = R(0x6a2e14, 0x9a4a20, 0xc8763a);
  pm.vline(6, 12, 14, C(0xe0a020)); pm.vline(9, 12, 14, C(0xe0a020));
  pm.set(5, 14, C(0xe0a020)); pm.set(10, 14, C(0xe0a020));
  // cola, cuerpo y ala
  pm.polygon([[2, 10], [1, 4], [3, 3], [5, 8]], C(0x1e2a24));
  pm.set(2, 4, C(0x3a6a4a));
  pm.ellipse(7, 9.5, 5, 3.5, brown[1]);
  pm.ellipse(6, 8, 3, 1.5, brown[2]);
  pm.ellipse(7, 10, 3, 2, brown[0]);
  pm.set(5, 10, brown[2]);
  // cabeza: arriba (f=0) o picoteando (f=1)
  const hx = f ? 12 : 11, hy = f ? 11 : 5;
  if (!f) pm.rect(10, 6, 2, 3, brown[1]);
  pm.ellipse(hx, hy, 2, 2, brown[1]);
  pm.set(hx - 1, hy - 2, C(0xd82020)); pm.set(hx, hy - 2, C(0xd82020)); pm.set(hx, hy - 3, C(0xd82020));
  pm.set(hx + 2, hy, C(0xf0b020)); pm.set(hx + 2, hy + 1, f ? C(0xf0b020) : C(0, 0));
  pm.set(hx + 1, hy + 2, C(0xd82020));
  pm.set(hx + 1, hy - 1, INK);
  if (f) for (const x of [13, 14]) pm.set(x, 14, C(0xe8d070));
  return fin(pm, l, [7, 14.5, 5, 1]);
};

const lampara: Draw = (f) => {
  const pm = new Pixmap(16, 26), l: Pt[] = [];
  // mesita
  pm.rect(3, 15, 10, 3, WOOD[1]);
  pm.hline(3, 12, 15, WOOD[2]);
  pm.rect(4, 18, 1, 6, WOOD[0]); pm.rect(11, 18, 1, 6, WOOD[0]);
  // lámpara de petróleo con caperuza de vidrio
  pm.ellipse(8, 13, 3.5, 2, BRASS[1]);
  pm.set(6, 12, BRASS[2]);
  pm.rect(7, 10, 2, 2, BRASS[0]);
  pm.ellipse(8, 7, 2.5, 3, C(0xfff0b0, 220));
  pm.rect(7, 2, 2, 3, C(0xe8f0f0, 200));
  pm.set(8, 7 - f, FIRE[2]); pm.set(8, 8, FIRE[1]);
  pm.set(7 + f, 6, FIRE[3]);
  l.push([8, 7]);
  return fin(pm, l, [8, 24.5, 6, 1]);
};

const DRAW: Record<FurnitureKind, Draw> = {
  barra, mesa_cantina: mesaCantina, silla, rockola, estante_botellas: estanteBotellas, mesa_billar: mesaBillar,
  canasta_cerveza: canastaCerveza, bombillos_pared: bombillosPared,
  fogon_lena: fogonLena, olla, mesa_comedor: mesaComedor, mecedora, hamaca, cama, baul, radio, tv_vieja: tvVieja,
  nevera, planta, matera,
  sagrado_corazon: sagradoCorazon, cuadro_paisaje: cuadroPaisaje, virgen, altar, banca_iglesia: bancaIglesia,
  pulpito, velas,
  mostrador, estante_tienda: estanteTienda, costales, racimo_platano: racimoPlatano, tiple, guitarra, acordeon,
  carriel_pared: carrielPared, sombrero_pared: sombreroPared,
  ventana, reloj, tapete, chimenea, escoba, gallina, lampara,
};

const cache = new Map<string, Built>();

function make(kind: FurnitureKind, frame: number): Built {
  const f = FURNITURE_ANIMATED.has(kind) ? frame & 1 : 0;
  const key = `${kind}:${f}`;
  let b = cache.get(key);
  if (!b) {
    b = DRAW[kind](f);
    cache.set(key, b);
  }
  return b;
}

/** dibujo a 16 px/baldosa, alineado abajo-centro a su huella; los colgados de pared van alineados a la pared del fondo */
export function buildFurniture(kind: FurnitureKind, frame = 0): Pixmap {
  return make(kind, frame).pm.clone();
}

/** puntos (x, y) del Pixmap con lámpara, vela, fuego o rockola, para ponerles halo de luz */
export function furnitureLights(kind: FurnitureKind): [number, number][] {
  return make(kind, 0).lights.map(([x, y]) => [x, y]);
}
