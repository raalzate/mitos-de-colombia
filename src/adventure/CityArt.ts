import { Pixmap, hexToRgba, seededRandom, type Rgba } from '../art/PixelPainter';

/**
 * Medellín de noche dibujada en código: ladrillo a la vista, metro elevado, Botero, Comuna 13,
 * fondas con bombillos y pólvora. Mismo estilo que TownArt: 16 px por baldosa, contorno y 2–3 tonos.
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
const CONCRETE = R(0x76726c, 0xa6a29a, 0xd2cec4);
const IRON = R(0x14141c, 0x2c2c38, 0x50505e);
const LEAF = R(0x174a22, 0x2a7a34, 0x58b048);
const BRONZE = R(0x3a2212, 0x7a4c26, 0xb27a3e);
const BRICK = R(0x7a2e1a, 0xb4542e, 0xd87a4a);
const BRICK_TONES = [0xa84a2a, 0xb4542e, 0xc2643a, 0x9a3e24, 0xbc5c34, 0xb04e2c];
const MORTAR = C(0x7a3a26);
const METRO = R(0x0c5434, 0x16905a, 0x52c486);
const GLASS_TOP = C(0xfff4b0);
const GLASS_MID = C(0xffcc4c);
const GLASS_BOT = C(0xe88a28);
const TV: [Rgba, Rgba, Rgba] = [C(0xe0f4ff), C(0x92c8f4), C(0x5a8ce0)];
const TRIM: Record<string, Ramp> = {
  azul: R(0x1c3c78, 0x2c64b0, 0x5a94d8),
  verde: R(0x16502a, 0x24803e, 0x4cb060),
  roja: R(0x6a1418, 0xa82428, 0xd85048),
  amarilla: R(0x9a6a10, 0xd8a020, 0xf8d050),
  cafe: R(0x3e2410, 0x6a3e1c, 0x9a6232),
  vino: R(0x4a1024, 0x7a1c3a, 0xa83a58),
  naranja: R(0x8a3a10, 0xe0701c, 0xf8a050),
  turquesa: R(0x10605a, 0x1ca89a, 0x5ad8c8),
  rosa: R(0x8a2050, 0xe0508a, 0xf890b8),
  morado: R(0x3a1a5a, 0x6a3aa0, 0x9a6ad0),
};
const PARTY = [0xff4040, 0x40e060, 0xffe040, 0x40a0ff, 0xff60e0, 0xff9a30];

// ---------- fuente 3×5 para letreros ----------
const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', ' ': '000000000000000',
  '1': '010110010010111', '3': '110001010001110', '!': '010010010000010',
};

function text(pm: Pixmap, s: string, x: number, y: number, c: Rgba): void {
  for (const ch of s) {
    const g = FONT[ch] ?? FONT[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') pm.set(x + (i % 3), y + Math.floor(i / 3), c);
    x += 4;
  }
}
const textWidth = (s: string) => s.length * 4 - 1;

/** Letras dobles (2×) con sombra, para murales y avisos grandes. */
function bigText(pm: Pixmap, s: string, x: number, y: number, c: Rgba, shadow: Rgba): void {
  for (const ch of s) {
    const g = FONT[ch] ?? FONT[' '];
    for (let i = 0; i < 15; i++) {
      if (g[i] !== '1') continue;
      const gx = x + (i % 3) * 2, gy = y + Math.floor(i / 3) * 2;
      pm.rect(gx + 1, gy + 1, 2, 2, shadow);
    }
    for (let i = 0; i < 15; i++) if (g[i] === '1') pm.rect(x + (i % 3) * 2, y + Math.floor(i / 3) * 2, 2, 2, c);
    x += 8;
  }
}

/** Letrero con texto centrado. */
function signboard(pm: Pixmap, cx: number, y: number, s: string, board: Ramp, ink: Rgba, pad = 3): void {
  const w = textWidth(s) + pad * 2;
  const x = Math.round(cx - w / 2);
  pm.rect(x, y, w, 9, board[1]);
  pm.hline(x, x + w - 1, y, board[2]);
  pm.hline(x, x + w - 1, y + 8, board[0]);
  pm.rectOutline(x - 1, y - 1, w + 2, 11, INK);
  text(pm, s, x + pad, y + 2, ink);
}

/** Aviso luminoso: fondo oscuro, letras de neón con halo y bombillitos en el borde. */
function neonSign(pm: Pixmap, cx: number, y: number, s: string, glow: Rgba, core: Rgba, lights: Pt[], bulbs = true): void {
  const w = textWidth(s) + 8;
  const x = Math.round(cx - w / 2);
  pm.rect(x, y, w, 11, C(0x1c1426));
  pm.rectOutline(x - 1, y - 1, w + 2, 13, INK);
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]] ?? FONT[' '];
    for (let k = 0; k < 15; k++) {
      if (g[k] !== '1') continue;
      const gx = x + 4 + i * 4 + (k % 3), gy = y + 3 + Math.floor(k / 3);
      pm.set(gx + 1, gy, [glow[0], glow[1], glow[2], 110]);
      pm.set(gx, gy + 1, [glow[0], glow[1], glow[2], 110]);
    }
  }
  text(pm, s, x + 4, y + 3, core);
  if (bulbs) {
    for (let bx = x + 1; bx < x + w - 1; bx += 3) { pm.set(bx, y, C(0xfff0a0)); pm.set(bx, y + 10, C(0xfff0a0)); }
  }
  lights.push([Math.round(cx), y + 5]);
}

function erase(pm: Pixmap, x: number, y: number): void {
  if (!pm.inBounds(x, y)) return;
  const i = (y * pm.width + x) * 4;
  pm.data[i] = pm.data[i + 1] = pm.data[i + 2] = pm.data[i + 3] = 0;
}

// ---------- piezas de arquitectura (copiadas de TownArt) ----------

function wall(pm: Pixmap, x: number, y: number, w: number, h: number, ramp: Ramp, seed: number): void {
  const rnd = seededRandom(seed);
  pm.rect(x, y, w, h, ramp[1]);
  for (let i = 0; i < (w * h) / 22; i++) {
    pm.set(x + Math.floor(rnd() * w), y + Math.floor(rnd() * h), ramp[rnd() < 0.7 ? 0 : 2]);
  }
  pm.vline(x, y, y + h - 1, ramp[2]);
  pm.vline(x + w - 1, y, y + h - 1, ramp[0]);
  pm.rect(x, y, w, 3, C(0x000000, 60));
}

function zocalo(pm: Pixmap, x: number, bottom: number, w: number, h: number, ramp: Ramp): void {
  pm.rect(x, bottom - h + 1, w, h, ramp[1]);
  pm.hline(x, x + w - 1, bottom - h + 1, ramp[2]);
  pm.hline(x, x + w - 1, bottom - h + 2, ramp[0]);
  pm.hline(x, x + w - 1, bottom, ramp[0]);
}

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
      const q = rnd();
      if (q < 0.12) pm.rect(x + 1, y + 1, 5, 2, q < 0.05 ? C(0x4a6a2c, 150) : C(0x5a1c12, 110));
    }
  }
  pm.hline(x0 + inset, x0 + w - inset - 1, y0, C(0x5a1c12));
  pm.hline(x0 + inset, x0 + w - inset - 1, y0 + 1, C(0xe88a60));
  pm.line(x0, y0 + h, x0 + inset, y0, 1, C(0x5a1c12));
  pm.line(x0 + w - 1, y0 + h, x0 + w - 1 - inset, y0, 1, C(0x5a1c12));
  pm.hline(x0, x0 + w - 1, y0 + h, C(0x3a160c));
  pm.hline(x0, x0 + w - 1, y0 + h + 1, WOOD[0]);
  for (let x = x0 + 2; x < x0 + w - 2; x += 5) pm.rect(x, y0 + h + 1, 2, 2, WOOD[1]);
}

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
  pm.rect(x - 3, bottom, w + 6, 1, STONE[0]);
}

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

function cross(pm: Pixmap, cx: number, top: number, size: number, c: Rgba): void {
  pm.rect(cx - 1, top, 2, size, c);
  pm.rect(cx - Math.floor(size / 3), top + Math.floor(size / 4), Math.floor(size / 3) * 2 + 1, 2, c);
}

/** Bombillos de colores colgados en catenaria; `phase` alterna cuáles brillan. */
function bulbString(pm: Pixmap, x0: number, x1: number, y: number, sag: number, lights: Pt[], phase = 0, step = 6): void {
  let k = 0;
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0);
    const yy = Math.round(y + sag * 4 * t * (1 - t));
    pm.set(x, yy, INK);
    if ((x - x0) % step === 3) {
      const on = (k + phase) % 2 === 0;
      const col = PARTY[k % PARTY.length];
      pm.rect(x, yy + 1, 2, 2, on ? C(col) : C(col, 255));
      if (on) pm.set(x, yy + 1, C(0xffffff));
      else pm.rect(x, yy + 1, 2, 2, C(0x000000, 90));
      if (k % 2 === 0) lights.push([x, yy + 2]);
      k++;
    }
  }
}

// ---------- piezas de ciudad ----------

/** Muro de ladrillo a la vista: hiladas de 2 px con junta, tonos variados y alguna mancha de humedad. */
function brickWall(pm: Pixmap, x: number, y: number, w: number, h: number, seed: number): void {
  const rnd = seededRandom(seed);
  pm.rect(x, y, w, h, MORTAR);
  for (let row = 0, yy = y; yy < y + h; yy += 3, row++) {
    const off = row % 2 ? 3 : 0;
    for (let xx = x - off; xx < x + w; xx += 6) {
      const x0 = Math.max(x, xx), x1 = Math.min(x + w - 1, xx + 4);
      if (x1 < x0) continue;
      const c = C(BRICK_TONES[Math.floor(rnd() * BRICK_TONES.length)]);
      pm.rect(x0, yy, x1 - x0 + 1, Math.min(2, y + h - yy), c);
      if (rnd() < 0.35) pm.set(x0, yy, BRICK[2]);
    }
  }
  pm.vline(x, y, y + h - 1, BRICK[2]);
  pm.vline(x + w - 1, y, y + h - 1, BRICK[0]);
  for (let k = 0; k < Math.floor((w * h) / 900); k++) {
    const px = x + 2 + Math.floor(rnd() * (w - 8)), py = y + 2 + Math.floor(rnd() * (h - 8));
    pm.rect(px, py, 4, 3 + Math.floor(rnd() * 4), C(0x3a1a10, 50));
  }
}

/** Placa de concreto entre pisos. */
function slab(pm: Pixmap, x: number, y: number, w: number): void {
  pm.hline(x, x + w - 1, y, CONCRETE[2]);
  pm.hline(x, x + w - 1, y + 1, CONCRETE[1]);
  pm.hline(x, x + w - 1, y + 2, C(0x000000, 70));
}

type WinMode = 0 | 1 | 2;
const CURTAINS = [0xe86090, 0x50b060, 0xf0a030, 0x7a60c8, 0xd84040, 0x40a0c8];

/** Ventana de aluminio de apartamento: 0 cálida, 1 televisor azul, 2 apagada. */
function aptWindow(pm: Pixmap, x: number, y: number, w: number, h: number, mode: WinMode, lights: Pt[], curtain = 0): void {
  pm.rect(x - 1, y - 1, w + 2, h + 2, C(0x3a3a44));
  if (mode === 2) {
    pm.rect(x, y, w, h, C(0x26304a));
    pm.line(x + 1, y + h - 2, x + 3, y + 1, 1, C(0x4a5a7a));
  } else {
    const g = mode === 0 ? [GLASS_TOP, GLASS_MID, GLASS_BOT] : TV;
    for (let j = 0; j < h; j++) pm.hline(x, x + w - 1, y + j, g[j < h * 0.3 ? 0 : j < h * 0.7 ? 1 : 2]);
    const cc = C(CURTAINS[curtain % CURTAINS.length]);
    const cw = Math.max(2, Math.floor(w / 3));
    pm.rect(x, y, cw, h, cc);
    pm.vline(x + cw - 1, y, y + h - 1, C(0x000000, 60));
    if (curtain % 3 === 1) pm.rect(x + w - cw, y, cw, h, cc);
    lights.push([x + Math.floor(w / 2), y + Math.floor(h / 2)]);
  }
  pm.vline(x + Math.floor(w / 2), y, y + h - 1, C(0x9aa0aa));
  pm.hline(x - 1, x + w, y - 1, C(0xc8ccd4));
  pm.hline(x - 2, x + w + 1, y + h + 1, CONCRETE[2]);
  pm.hline(x - 2, x + w + 1, y + h + 2, CONCRETE[0]);
}

/** Balconcito de reja con matas. */
function ironBalcony(pm: Pixmap, x: number, y: number, w: number, flowers: number): void {
  pm.rect(x, y, w, 2, CONCRETE[1]);
  pm.hline(x, x + w - 1, y, CONCRETE[2]);
  pm.rect(x, y + 2, w, 2, C(0x000000, 70));
  for (let bx = x; bx < x + w; bx += 2) pm.vline(bx, y - 5, y - 1, IRON[1]);
  pm.hline(x, x + w - 1, y - 6, IRON[2]);
  pm.hline(x, x + w - 1, y - 5, IRON[1]);
  for (let px = x + 1; px < x + w - 3; px += 6) {
    pm.ellipse(px + 1.5, y - 6, 2.5, 2, LEAF[1]);
    pm.set(px + 1, y - 7, LEAF[2]);
    pm.set(px + 2, y - 7, C(flowers));
    pm.set(px, y - 6, C(flowers));
  }
}

/** Tanque de agua negro (o azul) de azotea. */
function waterTank(pm: Pixmap, cx: number, bottom: number, blue = false): void {
  const body = blue ? R(0x123a7a, 0x2058b0, 0x5a8ad8) : R(0x14141a, 0x2c2c34, 0x55555f);
  pm.rect(cx - 5, bottom - 9, 10, 9, body[1]);
  pm.vline(cx - 5, bottom - 9, bottom - 1, body[2]);
  pm.vline(cx + 4, bottom - 9, bottom - 1, body[0]);
  pm.hline(cx - 5, cx + 4, bottom - 5, body[0]);
  pm.ellipse(cx, bottom - 9, 5, 2, body[2]);
  pm.ellipse(cx, bottom - 9, 2, 1, body[0]);
}

/** Matera grande con planta (azoteas, tiendas). */
function potPlant(pm: Pixmap, cx: number, bottom: number, flower: number): void {
  pm.rect(cx - 3, bottom - 3, 6, 3, C(0xb05a2c));
  pm.hline(cx - 3, cx + 2, bottom - 3, C(0xd07a40));
  pm.ellipse(cx, bottom - 6, 4, 3.5, LEAF[0]);
  pm.ellipse(cx - 1, bottom - 7, 2.5, 2, LEAF[1]);
  pm.set(cx - 2, bottom - 8, LEAF[2]);
  pm.set(cx + 1, bottom - 8, C(flower)); pm.set(cx + 2, bottom - 6, C(flower)); pm.set(cx - 2, bottom - 5, C(flower));
}

/** Toldo a rayas. */
function awning(pm: Pixmap, x: number, y: number, w: number, a: number, b: number): void {
  for (let i = 0; i < w; i++) {
    const on = Math.floor(i / 3) % 2 === 0;
    pm.vline(x + i, y, y + 3, on ? C(a) : C(b));
    pm.set(x + i, y + 4 + ((i >> 1) % 2), on ? C(a) : C(b));
  }
  pm.hline(x, x + w - 1, y, C(0xffffff, 110));
  pm.rect(x, y + 6, w, 2, C(0x000000, 60));
}

/** Local comercial de primer piso: vidriera encendida con mercancía. */
function shopFront(pm: Pixmap, x: number, y: number, w: number, h: number, lights: Pt[], seed: number): void {
  const rnd = seededRandom(seed);
  pm.rect(x - 1, y - 1, w + 2, h + 2, C(0x3a3a44));
  pm.rect(x, y, w, h, C(0xffd870));
  pm.rect(x, y, w, 3, C(0xfff4c0));
  pm.rect(x, y + h - 3, w, 3, C(0xe8a040));
  for (let s = y + 4; s < y + h - 3; s += 4) {
    pm.hline(x + 1, x + w - 2, s + 2, C(0x8a5a2a));
    for (let i = x + 1; i < x + w - 2; i += 2) if (rnd() < 0.7) pm.rect(i, s, 1, 2, C(PARTY[Math.floor(rnd() * PARTY.length)]));
  }
  pm.vline(x + Math.floor(w / 2), y, y + h - 1, C(0x9aa0aa));
  const n = Math.max(1, Math.round(w / 12));
  for (let i = 0; i < n; i++) lights.push([x + Math.floor(((i + 0.5) * w) / n), y + Math.floor(h / 2)]);
}

/** Puerta de edificio: reja metálica con portería iluminada. */
function lobbyDoor(pm: Pixmap, cx: number, bottom: number, w: number, h: number, lights: Pt[]): void {
  const x = Math.round(cx - w / 2), y = bottom - h + 1;
  pm.rect(x - 2, y - 2, w + 4, h + 2, CONCRETE[0]);
  pm.rect(x, y, w, h, C(0xfff0b0));
  pm.rect(x, y + h - 6, w, 6, C(0xe0b060));
  pm.rect(x + 2, y + 5, 3, 6, C(0x4a3020, 180));
  for (let bx = x + 1; bx < x + w; bx += 2) pm.vline(bx, y, bottom, IRON[1]);
  pm.hline(x, x + w - 1, y + Math.floor(h / 2), IRON[1]);
  pm.rect(x - 3, bottom, w + 6, 1, CONCRETE[0]);
  lights.push([x + Math.floor(w / 2), y + 4]);
}

/** Antena de televisión. */
function antenna(pm: Pixmap, x: number, bottom: number, h: number): void {
  pm.vline(x, bottom - h, bottom, IRON[2]);
  for (let k = 0; k < 3; k++) pm.hline(x - 3 + k, x + 3 - k, bottom - h + 1 + k * 2, IRON[2]);
}

/** Azotea plana vista desde arriba con pretil. */
function flatRoof(pm: Pixmap, x: number, y: number, w: number, h: number, seed: number): void {
  const rnd = seededRandom(seed);
  pm.rect(x, y, w, h, CONCRETE[1]);
  for (let i = 0; i < (w * h) / 10; i++) pm.set(x + Math.floor(rnd() * w), y + Math.floor(rnd() * h), CONCRETE[rnd() < 0.6 ? 0 : 2]);
  pm.rect(x, y, w, 2, CONCRETE[2]);
  pm.rect(x, y + h - 3, w, 3, BRICK[1]);
  pm.hline(x, x + w - 1, y + h - 3, BRICK[2]);
  pm.vline(x, y, y + h - 1, CONCRETE[2]);
  pm.vline(x + w - 1, y, y + h - 1, CONCRETE[0]);
}

/** Ventana gótica en punta. */
function gothicWindow(pm: Pixmap, x: number, y: number, w: number, h: number, lights: Pt[], frame: Ramp): void {
  const cx = x + w / 2;
  pm.polygon([[x - 2, y + h + 1], [x - 2, y + 3], [cx, y - 4], [x + w + 2, y + 3], [x + w + 2, y + h + 1]], frame[1]);
  pm.polygon([[x, y + h], [x, y + 3], [cx, y - 2], [x + w, y + 3], [x + w, y + h]], GLASS_MID);
  pm.polygon([[x, y + 6], [x, y + 3], [cx, y - 2], [x + w, y + 3], [x + w, y + 6]], GLASS_TOP);
  pm.rect(x, y + h - 3, w, 3, GLASS_BOT);
  pm.vline(Math.floor(cx), y - 1, y + h - 1, frame[0]);
  pm.hline(x, x + w - 1, y + Math.floor(h / 2), frame[0]);
  pm.line(x - 2, y + 3, cx, y - 4, 1, frame[2]);
  pm.rect(x - 3, y + h + 1, w + 6, 2, frame[2]);
  lights.push([Math.floor(cx) + 1, y + Math.floor(h / 2) + 2]);
}

/** Banderines de colores en zigzag. */
function bunting(pm: Pixmap, x0: number, x1: number, y: number, sag: number): void {
  let k = 0;
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0);
    const yy = Math.round(y + sag * 4 * t * (1 - t));
    pm.set(x, yy, C(0xe8e0d0));
    if ((x - x0) % 5 === 1 && x + 3 <= x1) {
      pm.polygon([[x, yy + 1], [x + 4, yy + 1], [x + 2, yy + 5]], C(PARTY[k % PARTY.length]));
      k++;
    }
  }
}

// ---------- edificios ----------

export type CityBuildingKind =
  | 'ladrillo_bajo' | 'ladrillo_alto' | 'coltejer' | 'estacion_metro' | 'palacio_cultura'
  | 'pueblito_iglesia' | 'pueblito_casa' | 'casa_comuna' | 'terminal' | 'fonda' | 'teatro' | 'tienda_esquina';

export const CITY_BUILDING_FOOTPRINT: Record<CityBuildingKind, [number, number]> = {
  ladrillo_bajo: [5, 4],
  ladrillo_alto: [6, 4],
  coltejer: [4, 4],
  estacion_metro: [8, 4],
  palacio_cultura: [8, 5],
  pueblito_iglesia: [5, 5],
  pueblito_casa: [5, 3],
  casa_comuna: [5, 4],
  terminal: [8, 4],
  fonda: [6, 4],
  teatro: [6, 5],
  tienda_esquina: [4, 3],
};

export const CITY_BUILDING_NAME: Record<CityBuildingKind, string | null> = {
  ladrillo_bajo: null,
  ladrillo_alto: 'EDIFICIO LOS GUAYACANES',
  coltejer: 'EDIFICIO COLTEJER',
  estacion_metro: 'ESTACIÓN PARQUE BERRÍO',
  palacio_cultura: 'PALACIO DE LA CULTURA RAFAEL URIBE URIBE',
  pueblito_iglesia: 'IGLESIA DEL PUEBLITO PAISA',
  pueblito_casa: null,
  casa_comuna: null,
  terminal: 'TERMINAL DEL NORTE',
  fonda: 'FONDA LA ARRIERA',
  teatro: 'TEATRO PABLO TOBÓN URIBE',
  tienda_esquina: 'TIENDA LA ESQUINA',
};

interface Built { pm: Pixmap; lights: Pt[] }

function canvasFor(kind: CityBuildingKind, height: number): Pixmap {
  const [w, h] = CITY_BUILDING_FOOTPRINT[kind];
  return new Pixmap(w * 16, Math.max(h * 16, height));
}

/** Edificio de apartamentos en ladrillo: locales abajo, pisos con balcones, azotea con tanques. */
function brickBlock(kind: CityBuildingKind, upper: number, seed: number): Built {
  const FH = 20, GH = 26, ROOF = 12, TOP = 12;
  const pm = canvasFor(kind, TOP + ROOF + upper * FH + GH);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const rnd = seededRandom(seed);
  const ry = H - GH - upper * FH - ROOF;
  flatRoof(pm, 2, ry, W - 4, ROOF, seed + 1);
  const wy = ry + ROOF;
  brickWall(pm, 2, wy, W - 4, H - 2 - wy, seed);
  // columnas de concreto en las esquinas
  for (const cx of [2, W - 5]) {
    pm.rect(cx, wy, 3, H - 2 - wy, CONCRETE[1]);
    pm.vline(cx, wy, H - 3, CONCRETE[2]);
    pm.vline(cx + 2, wy, H - 3, CONCRETE[0]);
  }
  const cols = Math.max(2, Math.floor((W - 12) / 18));
  const step = (W - 12) / cols;
  for (let f = 0; f < upper; f++) {
    const fy = wy + f * FH;
    slab(pm, 2, fy, W - 4);
    for (let c = 0; c < cols; c++) {
      const wx = Math.round(8 + c * step + (step - 11) / 2);
      const r = rnd();
      const mode: WinMode = r < 0.62 ? 0 : r < 0.85 ? 1 : 2;
      aptWindow(pm, wx, fy + 5, 11, 9, mode, lights, Math.floor(rnd() * 12));
      if (rnd() < 0.4) ironBalcony(pm, wx - 2, fy + 18, 15, PARTY[Math.floor(rnd() * PARTY.length)]);
    }
  }
  // primer piso: locales y portería
  const gy = H - GH;
  slab(pm, 2, gy, W - 4);
  const half = Math.floor((W - 30) / 2);
  shopFront(pm, 7, gy + 9, half - 6, 12, lights, seed + 3);
  awning(pm, 5, gy + 4, half - 2, 0xc82828, 0xf4f0e8);
  shopFront(pm, W - half - 1, gy + 9, half - 6, 12, lights, seed + 4);
  awning(pm, W - half - 3, gy + 4, half - 2, 0x24803e, 0xf8e070);
  lobbyDoor(pm, W / 2, H - 2, 10, 17, lights);
  pm.rect(2, H - 2, W - 4, 1, CONCRETE[0]);
  // azotea: tanques, matas, antena y ropa tendida
  waterTank(pm, 12, ry + 8);
  waterTank(pm, W - 16, ry + 7, true);
  potPlant(pm, 26, ry + 9, 0xf04860);
  potPlant(pm, W - 30, ry + 9, 0xf8e048);
  antenna(pm, W / 2 + 4, ry + 6, 14);
  pm.line(30, ry + 2, W - 34, ry + 2, 1, C(0xd8d8d8));
  const clothes = [0xe04040, 0x40a0e0, 0xf8f8f8, 0xf0c030, 0x60c060];
  for (let i = 0; i < 5; i++) pm.rect(32 + i * Math.floor((W - 70) / 5), ry + 3, 3, 4 + (i % 2), C(clothes[i]));
  pm.outline(INK);
  return { pm, lights };
}

function buildColtejer(): Built {
  const pm = canvasFor('coltejer', 250);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const bx0 = 14, bx1 = 49, top = 70;
  const facade = R(0x8a8478, 0xc4bcac, 0xe6e0d2);
  // fuste de la torre
  pm.rect(bx0, top, bx1 - bx0 + 1, H - top, facade[1]);
  const rnd = seededRandom(77);
  for (let y = top + 4; y < H - 30; y += 6) {
    pm.hline(bx0, bx1, y, facade[2]);
    for (let x = bx0 + 2; x < bx1 - 2; x += 5) {
      const r = rnd();
      const c = r < 0.55 ? GLASS_MID : r < 0.7 ? GLASS_TOP : r < 0.82 ? TV[1] : C(0x2a3248);
      pm.rect(x, y + 1, 4, 4, c);
      pm.set(x, y + 1, r < 0.82 ? GLASS_TOP : C(0x4a5a7a));
      if (r < 0.82 && (x + y) % 3 === 0) lights.push([x + 2, y + 3]);
    }
  }
  // costillas verticales y sombra del lado derecho
  for (const x of [bx0, bx0 + 1, bx1 - 1, bx1]) pm.vline(x, top, H - 30, facade[x < 30 ? 2 : 0]);
  pm.rect(32, top, bx1 - 31, H - top - 30, C(0x000000, 45));
  // la aguja: punta en forma de aguja de coser con su ojo
  const needle = R(0x7a8088, 0xb8bec6, 0xeef2f6);
  pm.polygon([[bx0, top + 1], [bx0 + 2, top - 26], [bx0 + 9, top - 50], [31, H - 250 + 2], [33, H - 250 + 2], [bx1 - 8, top - 50], [bx1 - 1, top - 26], [bx1 + 1, top + 1]], needle[1]);
  pm.polygon([[bx0, top + 1], [bx0 + 2, top - 26], [bx0 + 9, top - 50], [31, 2], [32, 2], [32, top + 1]], needle[2]);
  for (let y = 6; y < top; y += 4) for (let x = bx0; x <= bx1; x++) if (pm.alpha(x, y)) pm.set(x, y, C(0x000000, 30));
  pm.line(32, 4, 32, top, 1, needle[0]);
  for (let y = 30; y < top; y++) for (let x = 29; x <= 35; x++) {
    const dx = (x + 0.5 - 32) / 3.2, dy = (y + 0.5 - 44) / 11;
    if (dx * dx + dy * dy <= 1) erase(pm, x, y);
  }
  pm.hline(bx0 - 1, bx1 + 1, top, needle[2]);
  pm.hline(bx0 - 1, bx1 + 1, top + 1, needle[0]);
  // luz de balizaje y reflectores en la aguja
  pm.rect(31, 0, 2, 2, C(0xff3030));
  pm.set(31, 0, C(0xffc0c0));
  lights.push([31, 1]);
  for (const [lx, ly] of [[20, 52], [44, 52], [26, 26], [38, 26]] as const) {
    pm.set(lx, ly, C(0xfff8e0)); pm.set(lx, ly + 1, C(0xffe8a0));
    lights.push([lx, ly]);
  }
  // podio con locales
  const py = H - 30;
  pm.rect(2, py, W - 4, 28, CONCRETE[1]);
  pm.hline(2, W - 3, py, CONCRETE[2]);
  slab(pm, 2, py + 4, W - 4);
  shopFront(pm, 5, py + 10, 16, 14, lights, 71);
  shopFront(pm, W - 21, py + 10, 16, 14, lights, 72);
  pm.rect(25, py + 8, 14, 18, C(0xfff0b0));
  pm.rect(25, py + 8, 14, 3, C(0xffffe0));
  for (let x = 25; x < 39; x += 4) pm.vline(x, py + 8, H - 3, C(0x5a6070));
  pm.rectOutline(24, py + 7, 16, 20, C(0x3a3a44));
  lights.push([32, py + 16]);
  signboard(pm, W / 2, py - 11, 'COLTEJER', R(0x1c3c78, 0x2c64b0, 0x5a94d8), C(0xffffff), 2);
  pm.outline(INK);
  return { pm, lights };
}

function buildPalacio(): Built {
  const pm = canvasFor('palacio_cultura', 140);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const dark = C(0x4a4752), light = C(0xd2ccc0);
  const frame = R(0x8a8478, 0xd8d2c4, 0xf4f0e6);
  const checker = (x: number, y: number, w: number, h: number) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const bx = Math.floor((x + i) / 4), by = Math.floor((y + j) / 3);
      pm.set(x + i, y + j, (bx + by) % 2 ? dark : light);
    }
    pm.vline(x, y, y + h - 1, C(0xffffff, 90));
    pm.vline(x + w - 1, y, y + h - 1, C(0x000000, 90));
  };
  const slate = R(0x1e2230, 0x343a4e, 0x5a6278);
  // tejado de pizarra detrás
  pm.polygon([[4, 58], [10, 44], [W - 10, 44], [W - 4, 58]], slate[1]);
  for (let y = 47; y < 58; y += 3) pm.hline(8, W - 9, y, slate[0]);
  pm.hline(10, W - 11, 44, slate[2]);
  // alas
  checker(4, 58, W - 8, H - 60);
  pm.hline(3, W - 4, 58, frame[2]);
  pm.hline(3, W - 4, 59, frame[0]);
  pm.hline(3, W - 4, 92, frame[2]);
  pm.hline(3, W - 4, 93, frame[0]);
  // torreones de esquina con chapiteles
  for (const tx of [2, W - 20]) {
    checker(tx, 40, 18, H - 42);
    pm.polygon([[tx - 1, 41], [tx + 9, 16], [tx + 19, 41]], slate[1]);
    pm.polygon([[tx - 1, 41], [tx + 9, 16], [tx + 9, 41]], slate[2]);
    pm.vline(tx + 9, 10, 16, IRON[2]);
    pm.circle(tx + 9, 11, 1.5, C(0xf0c040));
    pm.hline(tx - 1, tx + 18, 41, frame[2]);
    gothicWindow(pm, tx + 6, 50, 6, 12, lights, frame);
  }
  // pabellón central con cúpula
  const cx0 = 46, cx1 = W - 47;
  checker(cx0, 34, cx1 - cx0 + 1, H - 36);
  pm.hline(cx0 - 1, cx1 + 1, 34, frame[2]);
  pm.hline(cx0 - 1, cx1 + 1, 35, frame[0]);
  for (let y = 0; y < 22; y++) {
    const r = Math.sqrt(1 - ((y - 22) / 22) ** 2) * 17;
    for (let x = Math.round(W / 2 - r); x < Math.round(W / 2 + r); x++) {
      const bx = Math.floor((x - W / 2) / 4 + 10), by = Math.floor(y / 3);
      pm.set(x, 12 + y, (bx + by) % 2 ? dark : light);
    }
  }
  pm.ellipse(W / 2 - 6, 22, 4, 6, C(0xffffff, 70));
  pm.rect(W / 2 - 3, 4, 6, 8, frame[1]);
  pm.vline(W / 2 - 3, 4, 11, frame[2]);
  pm.rect(W / 2 - 1, 6, 2, 4, GLASS_MID);
  lights.push([W / 2, 8]);
  pm.polygon([[W / 2 - 4, 4], [W / 2, -2], [W / 2 + 4, 4]], slate[1]);
  cross(pm, W / 2, 0, 5, C(0xf0c040));
  // pináculos sobre el pabellón
  for (const px of [cx0, cx1 - 2]) {
    pm.rect(px, 26, 3, 8, frame[1]);
    pm.polygon([[px - 1, 27], [px + 1.5, 20], [px + 4, 27]], frame[2]);
  }
  // ventanas góticas
  gothicWindow(pm, W / 2 - 8, 44, 6, 14, lights, frame);
  gothicWindow(pm, W / 2 + 2, 44, 6, 14, lights, frame);
  for (const wx of [26, 36, W - 42, W - 32]) gothicWindow(pm, wx, 68, 6, 16, lights, frame);
  for (const wx of [26, 36, W - 42, W - 32]) gothicWindow(pm, wx, 102, 6, 18, lights, frame);
  gothicWindow(pm, W / 2 - 4, 72, 8, 14, lights, frame);
  // portada principal
  const dx = W / 2 - 9, dy = H - 30;
  pm.polygon([[dx - 3, H - 3], [dx - 3, dy + 6], [W / 2, dy - 6], [dx + 21, dy + 6], [dx + 21, H - 3]], frame[1]);
  pm.polygon([[dx, H - 3], [dx, dy + 6], [W / 2, dy - 3], [dx + 18, dy + 6], [dx + 18, H - 3]], C(0xffb848));
  pm.polygon([[dx, dy + 10], [dx, dy + 6], [W / 2, dy - 3], [dx + 18, dy + 6], [dx + 18, dy + 10]], C(0xffe8a0));
  pm.vline(W / 2, dy, H - 3, C(0x6a3a20));
  pm.rect(dx + 3, H - 12, 3, 9, C(0x3a2418, 200));
  pm.rect(dx + 12, H - 13, 3, 10, C(0x3a2418, 200));
  lights.push([W / 2 - 4, dy + 8]);
  // escalinata
  pm.rect(dx - 8, H - 3, 34, 3, STONE[1]);
  pm.hline(dx - 8, dx + 25, H - 3, STONE[2]);
  // faroles de la plaza
  for (const lx of [20, W - 22]) {
    pm.rect(lx, H - 14, 2, 12, IRON[1]);
    pm.rect(lx - 1, H - 18, 4, 4, C(0xffe070));
    pm.set(lx, H - 17, C(0xfffbd0));
    pm.hline(lx - 1, lx + 2, H - 19, IRON[1]);
    lights.push([lx + 1, H - 16]);
  }
  pm.outline(INK);
  return { pm, lights };
}

function buildEstacion(): Built {
  const pm = canvasFor('estacion_metro', 108);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const deck = 50;
  // pilares
  for (const px of [8, W / 2 - 5, W - 18]) {
    pm.rect(px, deck + 10, 10, H - deck - 12, CONCRETE[1]);
    pm.vline(px, deck + 10, H - 3, CONCRETE[2]);
    pm.vline(px + 9, deck + 10, H - 3, CONCRETE[0]);
    pm.rect(px - 2, deck + 10, 14, 3, CONCRETE[2]);
  }
  // vestíbulo de taquillas encendido
  pm.rect(20, H - 26, 40, 24, C(0xe8eef0));
  pm.rect(22, H - 24, 36, 14, C(0xfff4c8));
  pm.rect(22, H - 24, 36, 3, C(0xffffff));
  for (let x = 22; x < 58; x += 6) pm.vline(x, H - 24, H - 11, C(0x7a8a90));
  pm.rect(26, H - 19, 3, 6, C(0x30405a, 200));
  pm.rect(42, H - 20, 3, 7, C(0x5a3020, 200));
  for (const tx of [26, 34, 42, 50]) { pm.rect(tx, H - 9, 4, 6, IRON[2]); pm.set(tx + 1, H - 9, C(0x40ff80)); }
  lights.push([28, H - 18], [40, H - 18], [52, H - 18]);
  // escaleras al andén
  for (let i = 0; i < 18; i++) {
    const sx = 72 + i * 2, sy = H - 4 - i * 2;
    pm.rect(sx, sy, 3, H - 2 - sy, CONCRETE[0]);
    pm.hline(sx, sx + 2, sy, CONCRETE[2]);
  }
  pm.line(72, H - 10, 108, deck + 2, 1, METRO[2]);
  pm.line(73, H - 9, 109, deck + 3, 1, METRO[0]);
  // tablero del viaducto con franja verde
  pm.rect(2, deck, W - 4, 11, C(0xeceae4));
  pm.hline(2, W - 3, deck, C(0xffffff));
  pm.rect(2, deck + 6, W - 4, 3, METRO[1]);
  pm.hline(2, W - 3, deck + 6, METRO[2]);
  pm.rect(2, deck + 11, W - 4, 2, C(0x000000, 90));
  // andén con baranda de vidrio y gente esperando
  pm.rect(4, deck - 16, W - 8, 16, C(0x3a4250));
  pm.rect(4, deck - 16, W - 8, 10, C(0xfff0c0));
  pm.rect(4, deck - 16, W - 8, 3, C(0xffffe8));
  const people = [[14, 0xd04040], [22, 0x3060c0], [44, 0xf0c030], [70, 0x40a050], [92, 0xe060a0], [104, 0x8040c0]] as const;
  for (const [px, c] of people) {
    pm.circle(px, deck - 11, 2, C(0x3a2418));
    pm.rect(px - 2, deck - 9, 5, 6, C(c));
  }
  pm.rect(4, deck - 6, W - 8, 6, C(0x9ad0e0, 170));
  pm.hline(4, W - 5, deck - 6, C(0xd8f4ff));
  for (let x = 4; x < W - 4; x += 12) pm.vline(x, deck - 6, deck - 1, IRON[2]);
  for (let x = 10; x < W - 6; x += 20) lights.push([x, deck - 13]);
  // cubierta curva blanca
  for (const px of [6, W / 2 - 1, W - 8]) pm.rect(px, deck - 30, 2, 14, C(0xc8ccd0));
  for (let x = 0; x < W; x++) {
    const t = (x - W / 2) / (W / 2);
    const y0 = Math.round(16 + 8 * t * t);
    pm.vline(x, y0, y0 + 6, C(0xf4f6f8));
    pm.set(x, y0, C(0xffffff));
    pm.set(x, y0 + 6, C(0x9aa4ac));
    pm.set(x, y0 + 7, METRO[1]);
  }
  for (let x = 6; x < W - 6; x += 14) {
    const t = (x - W / 2) / (W / 2);
    const y0 = Math.round(16 + 8 * t * t);
    pm.rect(x, y0 + 8, 3, 1, C(0xfff8d0));
  }
  // aviso del metro
  const sx = W / 2 - 22;
  pm.rect(sx, 2, 44, 12, METRO[1]);
  pm.hline(sx, sx + 43, 2, METRO[2]);
  pm.hline(sx, sx + 43, 13, METRO[0]);
  pm.rectOutline(sx - 1, 1, 46, 14, INK);
  pm.circle(sx + 7, 8, 4, C(0xffffff));
  pm.line(sx + 5, 10, sx + 9, 6, 1, METRO[1]);
  text(pm, 'METRO', sx + 15, 5, C(0xffffff));
  pm.vline(W / 2 - 10, 14, 17, C(0xc8ccd0));
  pm.vline(W / 2 + 10, 14, 17, C(0xc8ccd0));
  lights.push([W / 2, 8]);
  pm.outline(INK);
  return { pm, lights };
}

function buildPueblitoIglesia(): Built {
  const pm = canvasFor('pueblito_iglesia', 150);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const gold = C(0xf0c040);
  const fy = H - 52;
  // nave
  clayRoof(pm, 6, 60, W - 12, fy - 60, 4, CLAY, 3);
  wall(pm, 6, fy, W - 12, 50, WHITE_WALL, 91);
  zocalo(pm, 6, H - 2, W - 12, 7, TRIM.azul);
  // frontón
  pm.polygon([[5, fy + 2], [W / 2, fy - 14], [W - 5, fy + 2]], WHITE_WALL[1]);
  pm.line(5, fy + 1, W / 2, fy - 14, 1, WHITE_WALL[0]);
  pm.line(W / 2, fy - 14, W - 6, fy + 1, 1, WHITE_WALL[0]);
  pm.hline(6, W - 7, fy + 2, WHITE_WALL[0]);
  // torre campanario central
  const tx = W / 2 - 11, tw = 22, ty = 36;
  wall(pm, tx, ty, tw, fy - ty + 2, WHITE_WALL, 92);
  pm.hline(tx - 1, tx + tw, ty + 26, WHITE_WALL[2]);
  pm.hline(tx - 1, tx + tw, ty + 27, WHITE_WALL[0]);
  pm.ellipse(tx + tw / 2, ty + 10, 5, 5, C(0x2a2020));
  pm.rect(tx + tw / 2 - 5, ty + 10, 10, 9, C(0x2a2020));
  pm.ellipse(tx + tw / 2, ty + 13, 3, 3, C(0xc89030));
  pm.rect(tx + tw / 2 - 4, ty + 15, 8, 2, C(0xc89030));
  pm.set(tx + tw / 2 - 2, ty + 12, C(0xf8e080));
  // reloj
  pm.circle(tx + tw / 2, ty + 34, 5, TRIM.azul[1]);
  pm.circle(tx + tw / 2, ty + 34, 4, C(0xfff8e0));
  pm.vline(tx + tw / 2, ty + 31, ty + 34, INK);
  pm.hline(tx + tw / 2, tx + tw / 2 + 2, ty + 34, INK);
  lights.push([tx + tw / 2, ty + 33]);
  // cúpula de teja y cruz
  pm.ellipse(tx + tw / 2, ty, 12, 9, CLAY[1]);
  pm.ellipse(tx + tw / 2 - 3, ty - 3, 4, 3, CLAY[2]);
  for (let k = -8; k <= 8; k += 4) pm.line(tx + tw / 2 + k * 0.5, ty - 8, tx + tw / 2 + k, ty, 1, CLAY[0]);
  pm.rect(tx - 1, ty, tw + 2, 2, WHITE_WALL[2]);
  pm.hline(tx - 1, tx + tw, ty + 2, WHITE_WALL[0]);
  cross(pm, tx + tw / 2, ty - 20, 10, gold);
  // puerta azul, ventanas y faroles
  door(pm, W / 2, H - 2, 14, 24, TRIM.azul, lights, true);
  for (const wx of [14, W - 22]) litWindow(pm, wx, fy + 18, 8, 13, TRIM.azul, lights, { shutters: false, bars: false, arch: true });
  wallLamp(pm, 12, fy + 8, lights);
  wallLamp(pm, W - 15, fy + 8, lights);
  for (const fx of [10, W - 16]) flowerPot(pm, fx, H - 14, 0xe83050);
  pm.outline(INK);
  return { pm, lights };
}

function buildPueblitoCasa(): Built {
  const pm = canvasFor('pueblito_casa', 92);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const wy = H - 58;
  wall(pm, 2, wy, W - 4, 57, WHITE_WALL, 101);
  zocalo(pm, 2, H - 2, W - 4, 7, TRIM.roja);
  clayRoof(pm, 1, 2, W - 2, wy - 2, 5, CLAY, 4);
  // segundo piso: balcón corrido de colores con materas colgantes
  const upY = wy + 9;
  litWindow(pm, 9, upY, 10, 12, TRIM.azul, lights, { shutters: false });
  litWindow(pm, W / 2 - 5, upY, 10, 12, TRIM.amarilla, lights, { shutters: false });
  litWindow(pm, W - 19, upY, 10, 12, TRIM.verde, lights, { shutters: false });
  balcony(pm, 4, upY + 16, W - 8, TRIM.turquesa);
  const flowers = [0xe83050, 0xf8e048, 0xf060c0, 0xff8030, 0xf8f8f8];
  for (let i = 0; i < 6; i++) flowerPot(pm, 6 + i * 12, upY + 6, flowers[i % flowers.length]);
  for (let i = 0; i < 5; i++) {
    const hx = 10 + i * 14;
    pm.vline(hx, upY + 19, upY + 21, INK);
    pm.ellipse(hx, upY + 23, 3, 2, LEAF[1]);
    pm.set(hx - 1, upY + 22, C(flowers[(i + 2) % 5]));
    pm.set(hx + 1, upY + 24, C(flowers[(i + 3) % 5]));
    pm.vline(hx - 2, upY + 24, upY + 26, LEAF[0]);
  }
  // primer piso: puerta roja y ventanas con postigos de colores
  const lowY = H - 21;
  litWindow(pm, 11, lowY, 9, 11, TRIM.verde, lights);
  litWindow(pm, W - 20, lowY, 9, 11, TRIM.azul, lights);
  door(pm, W / 2, H - 2, 12, 19, TRIM.roja, lights);
  wallLamp(pm, W / 2 + 10, wy + 32, lights);
  pm.outline(INK);
  return { pm, lights };
}

/** Casita de la Comuna 13: pared pintada o ladrillo, losa con tanque, ventanita y puerta. */
function comunaHouse(pm: Pixmap, x: number, y: number, w: number, h: number, ramp: Ramp | null, seed: number, lights: Pt[], mural = false): void {
  if (ramp) wall(pm, x, y, w, h, ramp, seed);
  else brickWall(pm, x, y, w, h, seed);
  slab(pm, x - 1, y - 3, w + 2);
  if (mural) {
    pm.ellipse(x + 9, y + 12, 6, 7, C(0xf8c030));
    pm.ellipse(x + 9, y + 12, 4, 5, C(0xf06030));
    pm.rect(x + 7, y + 10, 1, 2, INK); pm.rect(x + 11, y + 10, 1, 2, INK);
    pm.hline(x + 7, x + 11, y + 15, C(0xffffff));
    for (let k = 0; k < 4; k++) pm.line(x + 16 + k * 3, y + h - 3, x + 18 + k * 3, y + 4, 1, C(PARTY[(k + seed) % PARTY.length]));
    wallLamp(pm, x + 9, y, lights);
  } else {
    const r = seed % 3;
    aptWindow(pm, x + 4, y + 5, 8, 7, r === 2 ? 1 : 0, lights, seed);
  }
  const dx = x + w - 10;
  pm.rect(dx, y + h - 13, 7, 13, C(0x5a3a28));
  pm.rect(dx + 1, y + h - 12, 5, 12, TRIM[['azul', 'verde', 'roja', 'morado'][seed % 4]][1]);
  pm.set(dx + 4, y + h - 6, C(0xf0c840));
}

function buildCasaComuna(): Built {
  const pm = canvasFor('casa_comuna', 124);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  // ladera de tierra roja y muro de contención
  const earth = R(0x6a2a14, 0x9a4a28, 0xc06a3c);
  pm.polygon([[2, H - 2], [2, 40], [W - 2, 18], [W - 2, H - 2]], earth[1]);
  const rnd = seededRandom(131);
  for (let i = 0; i < 160; i++) {
    const x = 2 + Math.floor(rnd() * (W - 4)), y = 20 + Math.floor(rnd() * (H - 22));
    if (pm.alpha(x, y)) pm.set(x, y, earth[rnd() < 0.6 ? 0 : 2]);
  }
  for (let i = 0; i < 14; i++) {
    const x = 4 + Math.floor(rnd() * (W - 8)), y = 30 + Math.floor(rnd() * 60);
    if (pm.alpha(x, y)) { pm.set(x, y, LEAF[1]); pm.set(x + 1, y - 1, LEAF[2]); }
  }
  // tercer nivel
  comunaHouse(pm, 6, 38, 30, 24, R(0x3a7a2a, 0x6ac040, 0xa0e070), 6, lights);
  comunaHouse(pm, 40, 30, 34, 26, null, 7, lights);
  waterTank(pm, 14, 34);
  waterTank(pm, 64, 26, true);
  // segundo nivel
  comunaHouse(pm, 2, 70, 34, 24, R(0x7a2a7a, 0xb050b8, 0xd890e0), 9, lights, true);
  comunaHouse(pm, 40, 66, 36, 26, R(0x1a6a7a, 0x30b0c0, 0x80e0e8), 10, lights);
  potPlant(pm, 30, 66, 0xf8e048);
  // primer nivel
  comunaHouse(pm, 2, H - 26, 40, 24, R(0xb05a10, 0xf09030, 0xf8c070), 11, lights);
  comunaHouse(pm, 46, H - 28, 32, 26, R(0xa8205a, 0xe84a8a, 0xf890b8), 12, lights, true);
  // escalera de concreto con baranda y farol
  for (let i = 0; i < 10; i++) {
    const sx = 38 + (i % 2), sy = H - 30 - i * 4;
    pm.rect(sx, sy, 6, 3, CONCRETE[1]);
    pm.hline(sx, sx + 5, sy, CONCRETE[2]);
  }
  pm.line(37, H - 30, 37, H - 70, 1, C(0xe0c020));
  pm.rect(44, 92, 2, 10, IRON[1]);
  pm.rect(43, 89, 4, 3, C(0xffe070));
  lights.push([44, 90]);
  // tendedero entre casas
  pm.line(8, 64, 34, 66, 1, C(0xd8d8d8));
  for (let i = 0; i < 4; i++) pm.rect(11 + i * 6, 65, 3, 4, C([0xe04040, 0x40a0e0, 0xf0c030, 0xf8f8f8][i]));
  pm.outline(INK);
  return { pm, lights };
}

function buildTerminal(): Built {
  const pm = canvasFor('terminal', 92);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const roofY = 22;
  flatRoof(pm, 2, roofY, W - 4, 10, 141);
  // valla del techo
  for (const px of [24, W - 26]) pm.rect(px, 14, 2, 10, IRON[2]);
  const label = 'TERMINAL DEL NORTE';
  const bw = textWidth(label) + 12;
  const bx = Math.round(W / 2 - bw / 2);
  pm.rect(bx, 2, bw, 13, C(0x1c3c78));
  pm.rect(bx + 1, 3, bw - 2, 11, C(0x2c64b0));
  pm.hline(bx + 1, bx + bw - 2, 3, C(0x5a94d8));
  text(pm, label, bx + 6, 6, C(0xffffff));
  for (let x = bx + 2; x < bx + bw - 2; x += 4) pm.set(x, 1, C(0xfff0a0));
  lights.push([W / 2, 8], [bx + 10, 8], [bx + bw - 10, 8]);
  // fachada: cinta de ventanas
  const fy = roofY + 10;
  pm.rect(2, fy, W - 4, H - fy - 2, C(0xd8d2c4));
  pm.vline(2, fy, H - 3, C(0xf4f0e6));
  pm.vline(W - 3, fy, H - 3, C(0x8a8478));
  pm.rect(6, fy + 4, W - 12, 12, C(0x3a3a44));
  for (let x = 7; x < W - 7; x += 8) {
    pm.rect(x, fy + 5, 7, 10, GLASS_MID);
    pm.rect(x, fy + 5, 7, 3, GLASS_TOP);
    lights.push([x + 3, fy + 9]);
  }
  // reloj
  pm.circle(W / 2, fy + 10, 6, C(0x2c64b0));
  pm.circle(W / 2, fy + 10, 5, C(0xffffff));
  pm.vline(W / 2, fy + 6, fy + 10, INK);
  pm.hline(W / 2, W / 2 + 3, fy + 10, INK);
  // marquesina con columnas
  const my = fy + 20;
  pm.rect(1, my, W - 2, 4, C(0xece8e0));
  pm.hline(1, W - 2, my, C(0xffffff));
  pm.rect(1, my + 4, W - 2, 2, C(0x2c64b0));
  pm.rect(1, my + 6, W - 2, 3, C(0x000000, 80));
  for (let x = 8; x < W - 8; x += 16) pm.rect(x, my + 7, 3, 1, C(0xfff8d0));
  for (const px of [4, 34, W - 37, W - 7]) {
    pm.rect(px, my + 6, 3, H - my - 8, CONCRETE[1]);
    pm.vline(px, my + 6, H - 3, CONCRETE[2]);
  }
  // planta baja: taquillas iluminadas y puertas de vidrio
  const gy = my + 9;
  shopFront(pm, 9, gy + 2, 22, H - gy - 6, lights, 143);
  shopFront(pm, W - 32, gy + 2, 22, H - gy - 6, lights, 144);
  pm.rect(40, gy, W - 80, H - gy - 2, C(0xfff4c8));
  pm.rect(40, gy, W - 80, 3, C(0xffffff));
  for (let x = 40; x < W - 40; x += 8) pm.vline(x, gy, H - 3, C(0x5a6070));
  pm.rect(48, gy + 5, 3, 8, C(0x30405a, 200));
  pm.rect(70, gy + 4, 3, 9, C(0x6a2a20, 200));
  pm.rect(76, gy + 8, 6, 5, C(0x2a7a34, 220));
  lights.push([W / 2, gy + 6]);
  pm.rect(2, H - 2, W - 4, 1, CONCRETE[0]);
  pm.outline(INK);
  return { pm, lights };
}

function buildFonda(): Built {
  const pm = canvasFor('fonda', 100);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const wy = H - 62;
  wall(pm, 2, wy, W - 4, 61, R(0xc8a070, 0xf0d098, 0xfaecc8), 151);
  zocalo(pm, 2, H - 2, W - 4, 8, TRIM.roja);
  clayRoof(pm, 1, 2, W - 2, wy - 2, 5, CLAY, 5);
  // balcón de chambrana pintado
  const upY = wy + 9;
  for (const wx of [21, W - 31]) litWindow(pm, wx, upY, 10, 12, TRIM.verde, lights, { shutters: false });
  balcony(pm, 4, upY + 16, W - 8, TRIM.roja);
  for (let i = 0; i < 7; i++) flowerPot(pm, 7 + i * 13, upY + 6, PARTY[i % PARTY.length]);
  // banderas de Colombia y de Antioquia
  const flagAt = (x: number, y: number, cols: number[]) => {
    pm.hline(x - 1, x + 13, y - 1, WOOD[0]);
    const band = Math.floor(12 / cols.length);
    cols.forEach((c, i) => {
      for (let k = 0; k < 13; k++) pm.vline(x + k, y + i * band + (k % 4 < 2 ? 0 : 1), y + (i + 1) * band - 1 + (k % 4 < 2 ? 0 : 1), C(c));
    });
  };
  flagAt(4, upY - 2, [0xf8d020, 0xf8d020, 0x2048a8, 0xd02028]);
  flagAt(W - 17, upY - 2, [0xf4f4f4, 0xf4f4f4, 0x24803e, 0x24803e]);
  // bombillos y banderines
  bulbString(pm, 3, W - 4, wy + 1, 4, lights);
  bunting(pm, 4, W - 5, wy + 36, 4);
  neonSign(pm, W / 2, upY, 'FONDA', C(0xff60c0), C(0xfff0ff), lights);
  // puertas abiertas: luz naranja y gente bailando
  const dx = W / 2 - 11, dy = H - 22;
  pm.rect(dx - 2, dy - 2, 26, 22, C(0x5a3a28));
  pm.rect(dx, dy, 22, 20, C(0xffa040));
  pm.rect(dx, dy, 22, 6, C(0xffe090));
  for (const [px, c] of [[dx + 5, 0xc02040], [dx + 11, 0x2a2a6a], [dx + 17, 0xf0f0f0]] as const) {
    pm.circle(px, dy + 7, 2, C(0x3a2418, 230));
    pm.polygon([[px - 3, dy + 19], [px - 1, dy + 9], [px + 2, dy + 9], [px + 4, dy + 19]], C(c, 230));
  }
  pm.line(dx + 7, dy + 10, dx + 9, dy + 8, 1, C(0x3a2418, 230));
  lights.push([dx + 11, dy + 4]);
  // ventanas bajas y mesitas con aguardiente
  litWindow(pm, 9, H - 23, 11, 11, TRIM.amarilla, lights);
  litWindow(pm, W - 20, H - 23, 11, 11, TRIM.amarilla, lights);
  for (const tx of [4, W - 16]) {
    pm.rect(tx, H - 8, 12, 2, C(0xe8e0d0));
    pm.rect(tx + 2, H - 6, 2, 4, C(0xa8a49c));
    pm.rect(tx + 8, H - 6, 2, 4, C(0xa8a49c));
    pm.rect(tx + 4, H - 12, 2, 4, C(0x9ad0e8, 220));
    pm.set(tx + 4, H - 13, C(0xc82020));
  }
  pm.outline(INK);
  return { pm, lights };
}

function buildTeatro(): Built {
  const pm = canvasFor('teatro', 116);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  // caja escénica detrás
  brickWall(pm, 18, 8, W - 36, 30, 161);
  pm.rect(18, 4, W - 36, 5, CONCRETE[1]);
  pm.hline(18, W - 19, 4, CONCRETE[2]);
  // fachada de ladrillo con marco de concreto
  const fy = 34;
  brickWall(pm, 2, fy, W - 4, H - fy - 2, 162);
  pm.rect(2, fy, W - 4, 4, CONCRETE[2]);
  pm.hline(2, W - 3, fy + 4, CONCRETE[0]);
  const fx0 = 16, fx1 = W - 17;
  pm.rect(fx0, fy + 8, fx1 - fx0 + 1, H - fy - 10, CONCRETE[2]);
  pm.rect(fx0 + 3, fy + 11, fx1 - fx0 - 5, H - fy - 13, C(0x3a2a30));
  // ventanal alto con telón rojo
  pm.rect(fx0 + 5, fy + 13, fx1 - fx0 - 9, 22, C(0xffd070));
  pm.rect(fx0 + 5, fy + 13, fx1 - fx0 - 9, 4, C(0xfff0b0));
  for (let x = fx0 + 5; x < fx0 + 14; x++) pm.vline(x, fy + 13, fy + 34, C(x % 2 ? 0xb01828 : 0xd83040));
  for (let x = fx1 - 13; x < fx1 - 4; x++) pm.vline(x, fy + 13, fy + 34, C(x % 2 ? 0xb01828 : 0xd83040));
  pm.hline(fx0 + 5, fx1 - 5, fy + 13, C(0xf0c040));
  for (let x = fx0 + 18; x < fx1 - 16; x += 4) pm.vline(x, fy + 26, fy + 34, C(0x2a1a20, 180));
  lights.push([W / 2, fy + 20], [fx0 + 10, fy + 24], [fx1 - 10, fy + 24]);
  // marquesina con bombillos
  const my = fy + 38;
  pm.rect(fx0 - 6, my, fx1 - fx0 + 13, 12, C(0x2a1a2a));
  pm.rectOutline(fx0 - 6, my, fx1 - fx0 + 13, 12, C(0xf0c040));
  for (let x = fx0 - 5; x < fx1 + 6; x += 2) { pm.set(x, my, C(0xfff4c0)); pm.set(x, my + 11, C(0xfff4c0)); }
  text(pm, 'TEATRO', W / 2 - 11, my + 4, C(0xffe070));
  pm.rect(fx0 - 6, my + 12, fx1 - fx0 + 13, 2, C(0x000000, 90));
  lights.push([W / 2, my + 6], [fx0 - 3, my + 6], [fx1 + 3, my + 6]);
  // vestíbulo con alfombra roja y carteleras
  const ly = my + 14;
  pm.rect(fx0 + 4, ly, fx1 - fx0 - 7, H - ly - 2, C(0xfff0c0));
  pm.rect(fx0 + 4, ly, fx1 - fx0 - 7, 3, C(0xffffff));
  pm.rect(W / 2 - 5, ly + 6, 10, H - ly - 8, C(0xc82030));
  for (let x = fx0 + 4; x < fx1 - 3; x += 8) pm.vline(x, ly, H - 3, C(0x6a5a50));
  lights.push([W / 2, ly + 4], [fx0 + 10, ly + 8], [fx1 - 10, ly + 8]);
  for (const [px, c] of [[4, 0x2c64b0], [W - 12, 0x24803e]] as const) {
    pm.rect(px, ly - 4, 8, 13, C(0x3a3a44));
    pm.rect(px + 1, ly - 3, 6, 11, C(c));
    pm.circle(px + 4, ly + 1, 2, C(0xf8e070));
    pm.hline(px + 2, px + 5, ly + 5, C(0xffffff));
    lights.push([px + 4, ly + 2]);
  }
  // macetas a la entrada
  potPlant(pm, fx0 + 1, H - 2, 0xe83050);
  potPlant(pm, fx1 - 1, H - 2, 0xe83050);
  pm.outline(INK);
  return { pm, lights };
}

function buildTienda(): Built {
  const pm = canvasFor('tienda_esquina', 86);
  const lights: Pt[] = [];
  const W = pm.width, H = pm.height;
  const ry = 8;
  flatRoof(pm, 2, ry, W - 4, 10, 171);
  waterTank(pm, 12, ry + 7);
  potPlant(pm, W - 12, ry + 9, 0xf04860);
  const wy = ry + 10;
  brickWall(pm, 2, wy, W - 4, H - 2 - wy, 172);
  // segundo piso
  aptWindow(pm, 8, wy + 5, 12, 10, 0, lights, 3);
  aptWindow(pm, W - 20, wy + 5, 12, 10, 1, lights, 1);
  ironBalcony(pm, 6, wy + 19, 16, 0xf8e048);
  slab(pm, 2, wy + 21, W - 4);
  // local abierto con mostrador y estantes
  const sy = wy + 38;
  const sx = 5, sw = W - 10, sh = H - 4 - sy;
  pm.rect(sx - 1, sy - 1, sw + 2, sh + 2, C(0x3a3a44));
  pm.rect(sx, sy, sw, sh, C(0xffd870));
  pm.rect(sx, sy, sw, 3, C(0xfff4c0));
  const rnd = seededRandom(173);
  for (let s = sy + 4; s < sy + 14; s += 4) {
    pm.hline(sx + 1, sx + sw - 2, s + 2, C(0x8a5a2a));
    for (let i = sx + 1; i < sx + sw - 2; i += 2) if (rnd() < 0.8) pm.rect(i, s, 1, 2, C(PARTY[Math.floor(rnd() * PARTY.length)]));
  }
  // mostrador con vitrina de pandequesos
  pm.rect(sx + 2, H - 13, sw - 4, 9, C(0x2c64b0));
  pm.rect(sx + 3, H - 12, sw - 6, 4, C(0xd8f0ff));
  for (let i = 0; i < 6; i++) pm.circle(sx + 6 + i * 8, H - 10, 1.5, C(0xe8b048));
  pm.hline(sx + 2, sx + sw - 3, H - 13, C(0x5a94d8));
  // termo de tinto y tendero
  pm.rect(sx + 6, sy + 13, 4, 6, C(0xc82020));
  pm.circle(W / 2 + 6, sy + 12, 2.5, C(0x6a4430));
  pm.rect(W / 2 + 3, sy + 15, 7, 5, C(0xf4f4f4));
  lights.push([W / 2, sy + 8]);
  // aviso TINTO pintado
  signboard(pm, W / 2, wy + 24, 'TINTO', R(0x8a1414, 0xc82020, 0xf04a3a), C(0xffffff), 4);
  lights.push([W / 2, wy + 28]);
  awning(pm, 3, sy - 3, W - 6, 0xf8d020, 0x2c64b0);
  wallLamp(pm, 8, wy + 25, lights);
  wallLamp(pm, W - 10, wy + 25, lights);
  pm.outline(INK);
  return { pm, lights };
}

const buildingCache = new Map<CityBuildingKind, Built>();

function makeBuilding(kind: CityBuildingKind): Built {
  let b = buildingCache.get(kind);
  if (b) return b;
  switch (kind) {
    case 'ladrillo_bajo': b = brickBlock(kind, 2, 201); break;
    case 'ladrillo_alto': b = brickBlock(kind, 5, 202); break;
    case 'coltejer': b = buildColtejer(); break;
    case 'estacion_metro': b = buildEstacion(); break;
    case 'palacio_cultura': b = buildPalacio(); break;
    case 'pueblito_iglesia': b = buildPueblitoIglesia(); break;
    case 'pueblito_casa': b = buildPueblitoCasa(); break;
    case 'casa_comuna': b = buildCasaComuna(); break;
    case 'terminal': b = buildTerminal(); break;
    case 'fonda': b = buildFonda(); break;
    case 'teatro': b = buildTeatro(); break;
    default: b = buildTienda();
  }
  buildingCache.set(kind, b);
  return b;
}

/** ancho = w*16; alto >= h*16 (techos y torres sobresalen arriba); se alinea por abajo, puerta abajo al centro */
export function buildCityBuilding(kind: CityBuildingKind): Pixmap {
  return makeBuilding(kind).pm.clone();
}

/** ventanas, avisos y faroles encendidos, en píxeles del Pixmap */
export function cityBuildingLights(kind: CityBuildingKind): [number, number][] {
  return makeBuilding(kind).lights.map(([x, y]) => [x, y]);
}

// ---------- adornos ----------

export type CityPropKind =
  | 'botero_gorda' | 'botero_caballo' | 'botero_gato' | 'metro_via' | 'metro_pilar' | 'metro_tren'
  | 'metrocable' | 'torre_cable' | 'grafiti' | 'taxi' | 'jeep' | 'buseta' | 'puesto_fruta' | 'puesto_arepas'
  | 'silleta' | 'poste' | 'guayacan' | 'palmera' | 'banca' | 'tarima' | 'bombillos' | 'castillo_polvora'
  | 'kiosko' | 'escalera_electrica' | 'fuente_ciudad' | 'semaforo';

export const CITY_PROP_FOOTPRINT: Record<CityPropKind, [number, number]> = {
  botero_gorda: [2, 2], botero_caballo: [3, 2], botero_gato: [2, 1],
  metro_via: [4, 1], metro_pilar: [1, 1], metro_tren: [6, 2],
  metrocable: [2, 1], torre_cable: [2, 1], grafiti: [4, 1],
  taxi: [2, 1], jeep: [3, 2], buseta: [4, 2],
  puesto_fruta: [2, 1], puesto_arepas: [2, 1], silleta: [1, 1],
  poste: [1, 1], guayacan: [2, 2], palmera: [1, 1], banca: [2, 1],
  tarima: [5, 3], bombillos: [4, 1], castillo_polvora: [2, 2],
  kiosko: [3, 3], escalera_electrica: [2, 3], fuente_ciudad: [3, 3], semaforo: [1, 1],
};

/** Altura (px sobre el suelo) del tablero del viaducto: el tren se dibuja con sus ruedas aquí. */
const VIA_DECK = 44;

/** Silueta Botero: rellena con bronce y le da volumen con brillo arriba-izquierda. */
function bronzeShade(pm: Pixmap, cx: number, cy: number, rx: number, ry: number): void {
  pm.ellipse(cx, cy, rx, ry, BRONZE[1]);
  pm.ellipse(cx + rx * 0.25, cy + ry * 0.25, rx * 0.75, ry * 0.75, BRONZE[0]);
  pm.ellipse(cx + rx * 0.05, cy + ry * 0.05, rx * 0.8, ry * 0.8, BRONZE[1]);
  pm.ellipse(cx - rx * 0.35, cy - ry * 0.35, rx * 0.3, ry * 0.3, BRONZE[2]);
  pm.set(Math.round(cx - rx * 0.4), Math.round(cy - ry * 0.45), C(0xf0c890));
}

function plinth(pm: Pixmap, x: number, w: number, bottom: number, h: number): void {
  pm.rect(x, bottom - h + 1, w, h, STONE[1]);
  pm.hline(x, x + w - 1, bottom - h + 1, STONE[2]);
  pm.vline(x + w - 1, bottom - h + 1, bottom, STONE[0]);
  pm.hline(x, x + w - 1, bottom, STONE[0]);
}

/** Parte rolliza de una escultura: borde oscuro que la separa de lo de atrás y volumen. */
function bronzePart(pm: Pixmap, cx: number, cy: number, rx: number, ry: number): void {
  pm.ellipse(cx, cy, rx + 0.9, ry + 0.9, BRONZE[0]);
  bronzeShade(pm, cx, cy, rx, ry);
}

function propBoteroGorda(): Pixmap {
  const pm = new Pixmap(32, 56);
  const H = pm.height;
  plinth(pm, 3, 26, H - 1, 7);
  const b = H - 8;
  // pies chiquitos y pantorrillas
  pm.rect(10, b - 2, 4, 2, BRONZE[0]); pm.rect(18, b - 2, 4, 2, BRONZE[0]);
  bronzePart(pm, 12.5, b - 6, 2.6, 4);
  bronzePart(pm, 19.5, b - 6, 2.6, 4);
  // caderas y muslos enormes
  bronzePart(pm, 16, b - 14, 11.5, 6.5);
  pm.vline(16, b - 12, b - 9, BRONZE[0]);
  // brazos colgando con manitos
  bronzePart(pm, 5.5, b - 24, 3.2, 7);
  bronzePart(pm, 26.5, b - 24, 3.2, 7);
  pm.ellipse(5, b - 16, 1.8, 1.5, BRONZE[1]); pm.ellipse(27, b - 16, 1.8, 1.5, BRONZE[1]);
  // barriga, pecho y hombros
  bronzePart(pm, 16, b - 22, 9, 6);
  bronzePart(pm, 16, b - 30, 8.5, 4.5);
  bronzePart(pm, 12.5, b - 27, 3.4, 3);
  bronzePart(pm, 19.5, b - 27, 3.4, 3);
  pm.set(16, b - 20, BRONZE[0]);
  // cuello y cabecita con moño
  pm.rect(14, b - 37, 4, 3, BRONZE[1]);
  bronzePart(pm, 16, b - 40, 3.6, 4);
  bronzePart(pm, 16, b - 46, 2.4, 2);
  pm.set(15, b - 40, BRONZE[0]); pm.set(17, b - 40, BRONZE[0]);
  pm.hline(15, 17, b - 38, BRONZE[0]);
  pm.outline(INK);
  return pm;
}

function propBoteroCaballo(): Pixmap {
  const pm = new Pixmap(48, 46);
  const H = pm.height;
  plinth(pm, 2, 44, H - 1, 7);
  const b = H - 8;
  // patas de atrás (sombra) y de adelante
  for (const lx of [12, 33]) { pm.rect(lx, b - 14, 4, 14, BRONZE[0]); pm.rect(lx - 1, b - 2, 6, 2, IRON[1]); }
  for (const lx of [8, 29]) { bronzePart(pm, lx + 2, b - 8, 2.3, 6.5); pm.rect(lx - 1, b - 2, 6, 2, IRON[2]); }
  // cola
  pm.line(5, b - 26, 3, b - 14, 2, BRONZE[0]);
  // anca, barriga y pecho
  bronzePart(pm, 12, b - 22, 9, 8);
  bronzePart(pm, 22, b - 20, 12, 8);
  bronzePart(pm, 33, b - 23, 8, 8);
  // cuello grueso y cabeza pequeña inclinada
  pm.polygon([[32, b - 30], [36, b - 40], [43, b - 38], [41, b - 24]], BRONZE[0]);
  pm.polygon([[33, b - 30], [37, b - 39], [42, b - 37], [40, b - 25]], BRONZE[1]);
  pm.line(36, b - 39, 33, b - 30, 1, BRONZE[2]);
  bronzePart(pm, 42, b - 36, 3, 3);
  bronzePart(pm, 44.5, b - 32, 2, 2.6);
  pm.set(42, b - 37, INK);
  pm.set(45, b - 31, BRONZE[0]);
  pm.polygon([[38, b - 39], [39, b - 43], [41, b - 39]], BRONZE[1]);
  pm.outline(INK);
  return pm;
}

function propBoteroGato(): Pixmap {
  const pm = new Pixmap(32, 32);
  const H = pm.height;
  plinth(pm, 3, 26, H - 1, 5);
  const b = H - 6;
  // cola enroscada
  pm.line(26, b - 2, 29, b - 10, 2, BRONZE[0]);
  pm.set(29, b - 11, BRONZE[2]);
  bronzePart(pm, 17, b - 8, 10, 7.5);
  for (const px of [10, 16]) bronzePart(pm, px, b - 1.5, 2.6, 1.6);
  bronzePart(pm, 11, b - 16, 6, 5.5);
  pm.polygon([[6, b - 19], [6, b - 25], [10, b - 21]], BRONZE[1]);
  pm.polygon([[12, b - 21], [15, b - 25], [16, b - 19]], BRONZE[1]);
  pm.set(9, b - 17, INK); pm.set(13, b - 17, INK);
  pm.set(11, b - 15, BRONZE[0]);
  pm.hline(4, 7, b - 15, BRONZE[2]); pm.hline(15, 18, b - 15, BRONZE[2]);
  pm.outline(INK);
  return pm;
}

function propMetroVia(): Pixmap {
  const pm = new Pixmap(64, VIA_DECK + 30);
  const H = pm.height;
  const top = H - VIA_DECK - 14;
  pm.rect(0, top + 4, 64, 10, C(0xd8d4cc));
  pm.hline(0, 63, top + 4, C(0xf4f0e8));
  pm.rect(0, top + 9, 64, 2, METRO[1]);
  pm.rect(0, top + 12, 64, 2, C(0x8a867e));
  // rieles y parapeto
  pm.rect(0, top, 64, 4, C(0x6a6660));
  pm.hline(0, 63, top + 1, C(0xc8ccd4));
  pm.hline(0, 63, top + 3, C(0xc8ccd4));
  for (let x = 2; x < 64; x += 5) pm.vline(x, top, top + 3, C(0x4a4038));
  for (let x = 0; x < 64; x += 16) pm.vline(x, top + 4, top + 13, C(0xa8a49c));
  // catenaria eléctrica
  for (const px of [8, 40]) {
    pm.rect(px, top - 14, 2, 14, IRON[2]);
    pm.hline(px - 2, px + 6, top - 12, IRON[2]);
  }
  pm.hline(0, 63, top - 10, C(0x3a3a44));
  pm.outline(INK);
  // sombra en el suelo: así se lee que el viaducto va elevado
  pm.rect(0, H - 6, 64, 5, C(0x000000, 60));
  return pm;
}

function propMetroPilar(): Pixmap {
  const pm = new Pixmap(16, VIA_DECK + 30);
  const H = pm.height;
  const top = H - VIA_DECK - 1;
  pm.rect(1, top, 14, 5, C(0xd8d4cc));
  pm.hline(1, 14, top, C(0xf4f0e8));
  pm.rect(4, top + 5, 8, H - top - 6, CONCRETE[1]);
  pm.vline(4, top + 5, H - 2, CONCRETE[2]);
  pm.vline(11, top + 5, H - 2, CONCRETE[0]);
  pm.rect(4, top + 18, 8, 3, METRO[1]);
  pm.rect(2, H - 3, 12, 2, CONCRETE[0]);
  pm.ellipse(8, H - 2, 7, 1.5, C(0x000000, 60));
  // grafiti pequeño en la base
  pm.rect(5, H - 14, 3, 3, C(0xf060c0));
  pm.rect(8, H - 12, 3, 3, C(0x40e0e0));
  pm.outline(INK);
  return pm;
}

function propMetroTren(f: number, l: Pt[]): Pixmap {
  const pm = new Pixmap(96, 36);
  const H = pm.height;
  for (const cx0 of [1, 49]) {
    const w = 46;
    pm.rect(cx0, 4, w, H - 10, C(0xf0f2f4));
    pm.hline(cx0, cx0 + w - 1, 4, C(0xffffff));
    pm.rect(cx0, 2, w, 3, C(0xc8ccd0));
    pm.rect(cx0, H - 13, w, 4, METRO[1]);
    pm.hline(cx0, cx0 + w - 1, H - 13, METRO[2]);
    pm.rect(cx0, H - 9, w, 3, C(0x9aa0a8));
    // ventanas iluminadas con pasajeros
    for (let i = 0; i < 4; i++) {
      const wx = cx0 + 4 + i * 11;
      pm.rect(wx, 8, 8, 9, C(0xfff4c8));
      pm.rect(wx, 8, 8, 2, C(0xffffff));
      if ((i + cx0) % 3 !== 0) { pm.circle(wx + 4, 13, 1.5, C(0x3a2418)); pm.rect(wx + 2, 15, 5, 2, C(PARTY[(i + cx0) % PARTY.length])); }
      pm.rectOutline(wx - 1, 7, 10, 11, C(0x3a4050));
      if (i % 2 === 0) l.push([wx + 4, 11]);
    }
    pm.rect(cx0 + w - 3, 8, 2, 13, C(0x9aa0a8));
    // bogies
    for (const bx of [cx0 + 8, cx0 + w - 10]) {
      pm.circle(bx, H - 4, 3, C(0x1a1a1e));
      pm.circle(bx + 4, H - 4, 3, C(0x1a1a1e));
      pm.set(bx, H - 4, C(0x8a8a94)); pm.set(bx + 4, H - 4, C(0x8a8a94));
    }
  }
  pm.rect(47, 8, 2, 16, C(0x3a3a44));
  // cabina con faro, luz de destino que parpadea
  pm.rect(89, 8, 6, 8, C(0x30485a));
  pm.rect(93, H - 13, 3, 3, C(0xfffbd0));
  l.push([94, H - 12]);
  pm.rect(4, 5, 10, 2, f ? C(0xff9a30) : C(0x40ff80));
  pm.rect(52, 5, 10, 2, f ? C(0x40ff80) : C(0xff9a30));
  pm.set(90, 6, f ? C(0xff3030) : C(0x601010));
  // pantógrafos
  for (const px of [20, 70]) {
    pm.line(px, 2, px + 4, -2 + 2, 1, IRON[2]);
    pm.hline(px + 2, px + 8, 0, IRON[2]);
  }
  pm.outline(INK);
  return pm;
}

function propMetrocable(f: number, l: Pt[]): Pixmap {
  const pm = new Pixmap(32, 40);
  // cable inclinado
  pm.line(0, 6, 31, 1, 1, C(0x2a2a30));
  // brazo y cabina
  pm.rect(15, 3, 2, 9, C(0x5a5a62));
  pm.rect(13, 2, 6, 3, C(0x3a3a44));
  pm.rect(5, 12, 22, 22, C(0xe8ecf0));
  pm.rect(5, 12, 22, 3, C(0xc82838));
  pm.hline(5, 26, 12, C(0xf05a5a));
  pm.rect(5, 30, 22, 4, C(0xc82838));
  pm.rect(7, 16, 18, 12, C(0xfff0b0));
  pm.rect(7, 16, 18, 3, C(0xffffe0));
  pm.vline(16, 16, 27, C(0x9aa0a8));
  pm.circle(11, 22, 1.5, C(0x3a2418)); pm.rect(9, 24, 4, 4, C(0x40a0e0));
  pm.circle(21, 21, 1.5, C(0x3a2418)); pm.rect(19, 23, 4, 5, C(0xf0c030));
  pm.vline(26, 12, 33, C(0x9aa0a8));
  pm.vline(5, 12, 33, C(0xffffff));
  pm.set(16, 35, f ? C(0x40ff80) : C(0x106030));
  l.push([16, 20]);
  pm.outline(INK);
  return pm;
}

function propTorreCable(l: Pt[]): Pixmap {
  const pm = new Pixmap(32, 96);
  const H = pm.height;
  const steel = R(0x4a525a, 0x8a929a, 0xc0c8d0);
  // fuste tubular que se angosta
  pm.polygon([[11, H - 4], [14, 18], [18, 18], [21, H - 4]], steel[1]);
  pm.polygon([[11, H - 4], [14, 18], [16, 18], [16, H - 4]], steel[2]);
  for (let y = 26; y < H - 6; y += 12) pm.hline(13, 19, y, steel[0]);
  pm.rect(9, H - 5, 14, 4, CONCRETE[1]);
  pm.hline(9, 22, H - 5, CONCRETE[2]);
  // cabezal con poleas
  pm.rect(1, 12, 30, 5, C(0xe8c020));
  pm.hline(1, 30, 12, C(0xf8e870));
  pm.hline(1, 30, 16, C(0x9a7a10));
  for (const px of [3, 26]) {
    pm.circle(px + 1.5, 10, 3, C(0x3a3a44));
    pm.circle(px + 1.5, 10, 1, C(0x9aa0a8));
  }
  pm.line(0, 7, 31, 7, 1, C(0x2a2a30));
  // baliza roja
  pm.rect(15, 3, 2, 3, C(0xff3030));
  pm.set(15, 3, C(0xffc0c0));
  l.push([15, 4]);
  pm.outline(INK);
  return pm;
}

function propGrafiti(l: Pt[]): Pixmap {
  const pm = new Pixmap(64, 44);
  const H = pm.height;
  wall(pm, 1, 6, 62, H - 8, R(0x8a8478, 0xb8b0a0, 0xd8d0c0), 301);
  pm.rect(1, 3, 62, 3, CONCRETE[2]);
  // mural: fondo de franjas y sol
  const bands = [0x2a2a7a, 0x6a2a9a, 0xd8306a, 0xf08030, 0xf8d040];
  bands.forEach((c, i) => pm.rect(2, 8 + i * 6, 60, 6, C(c)));
  pm.circle(46, 18, 9, C(0xf8e870));
  pm.circle(46, 18, 7, C(0xffa030));
  for (let a = 0; a < 8; a++) pm.line(46 + Math.cos(a * 0.785) * 10, 18 + Math.sin(a * 0.785) * 10, 46 + Math.cos(a * 0.785) * 13, 18 + Math.sin(a * 0.785) * 13, 1, C(0xf8e870));
  // cara con sombrero vueltiao y pájaro
  pm.ellipse(14, 22, 7, 8, C(0x8a5030));
  pm.ellipse(14, 14, 11, 3, C(0xf4ecd0));
  pm.rect(9, 10, 10, 4, C(0xf4ecd0));
  pm.hline(9, 18, 12, C(0x1a1a1a));
  pm.rect(11, 20, 2, 2, C(0xffffff)); pm.rect(16, 20, 2, 2, C(0xffffff));
  pm.set(12, 21, INK); pm.set(17, 21, INK);
  pm.hline(12, 16, 26, C(0xf06060));
  pm.polygon([[26, 12], [32, 10], [36, 14], [30, 15]], C(0x40e0e0));
  pm.set(33, 11, INK);
  // letras COMUNA 13 a doble tamaño
  bigText(pm, '13', 24, 22, C(0xffffff), C(0x1a1a3a));
  text(pm, 'COMUNA', 36, 32, C(0x7af0ff));
  // goteras de aerosol
  for (const dx of [6, 20, 34, 52]) pm.vline(dx, 38, 40, C(PARTY[dx % PARTY.length]));
  // farol arriba
  pm.rect(30, 0, 4, 3, C(0x302018));
  pm.rect(31, 1, 2, 2, C(0xffe070));
  l.push([32, 2]);
  pm.outline(INK);
  return pm;
}

function propTaxi(l: Pt[]): Pixmap {
  const pm = new Pixmap(40, 24);
  const Y = R(0xb08010, 0xf8c818, 0xfff080);
  pm.polygon([[1, 17], [2, 10], [8, 9], [12, 3], [27, 3], [32, 9], [38, 10], [39, 17]], Y[1]);
  pm.hline(9, 30, 3, Y[2]);
  pm.hline(2, 38, 10, Y[2]);
  pm.rect(1, 15, 38, 3, Y[0]);
  // vidrios
  pm.polygon([[10, 9], [13, 5], [19, 5], [19, 9]], C(0x5a8ab0));
  pm.polygon([[21, 9], [21, 5], [26, 5], [30, 9]], C(0x5a8ab0));
  pm.set(14, 6, C(0xc0e0f0)); pm.set(22, 6, C(0xc0e0f0));
  pm.vline(20, 4, 16, Y[0]);
  // franja de cuadritos y aviso TAXI
  for (let x = 4; x < 36; x += 2) pm.set(x, 13, (x / 2) % 2 ? INK : C(0xffffff));
  pm.rect(16, 0, 8, 3, C(0xfff8d0));
  pm.hline(16, 23, 0, C(0xffffff));
  l.push([20, 1]);
  // faros
  pm.rect(37, 11, 2, 2, C(0xfffbd0));
  pm.rect(1, 11, 2, 2, C(0xff3030));
  l.push([38, 12]);
  for (const wx of [9, 31]) {
    pm.circle(wx, 19, 4, C(0x1a1a1e));
    pm.circle(wx, 19, 2, C(0x8a8a94));
  }
  pm.outline(INK);
  return pm;
}

function propJeep(l: Pt[]): Pixmap {
  const pm = new Pixmap(48, 46);
  const H = pm.height;
  const body = R(0x6a1418, 0xb02428, 0xe05048);
  // carga: bultos de café, racimos de plátano, canasto
  const sacks: [number, number][] = [[4, 10], [13, 8], [22, 10], [8, 2], [18, 1]];
  for (const [sx, sy] of sacks) {
    pm.rect(sx, sy, 9, 8, C(0xc8b080));
    pm.hline(sx, sx + 8, sy, C(0xe8d4a8));
    pm.hline(sx + 1, sx + 7, sy + 4, C(0x24803e));
    pm.hline(sx, sx + 8, sy + 7, C(0x8a7450));
    pm.rectOutline(sx - 1, sy - 1, 11, 10, INK);
  }
  pm.ellipse(34, 12, 5, 6, C(0xe8c830));
  for (let y = 7; y < 18; y += 2) pm.hline(30, 38, y, C(0xc8a020));
  pm.set(33, 8, C(0xfff080));
  pm.ellipse(28, 4, 4, 3, C(0x6a9a30));
  pm.ellipse(27, 3, 2, 1, C(0x9ac850));
  pm.vline(34, 5, 6, C(0x4a6a2a));
  // carrocería Willys
  pm.rect(2, 19, 34, 14, body[1]);
  pm.hline(2, 35, 19, body[2]);
  pm.rect(2, 30, 34, 3, body[0]);
  pm.rect(36, 23, 10, 10, body[1]);
  pm.hline(36, 45, 23, body[2]);
  for (let y = 25; y < 32; y += 2) pm.hline(41, 45, y, C(0x3a3a44));
  // parabrisas y conductor
  pm.rect(33, 12, 2, 11, C(0x3a3a44));
  pm.rect(34, 13, 3, 9, C(0x8ac0e0, 180));
  pm.circle(31, 19, 2, C(0x6a4430));
  pm.ellipse(31, 16, 4, 1.5, C(0xf4ecd0));
  // faro y guardabarros
  pm.circle(44, 26, 1.5, C(0xfffbd0));
  l.push([44, 26]);
  pm.rect(2, 22, 2, 2, C(0xff4040));
  for (const wx of [10, 38]) {
    pm.ellipse(wx, 34, 7, 3, body[0]);
    pm.circle(wx, 39, 6, C(0x1a1a1e));
    pm.circle(wx, 39, 3, C(0xc8c8d0));
    pm.circle(wx, 39, 1, C(0x5a5a62));
  }
  pm.rect(0, H - 1, 48, 1, C(0x000000, 60));
  pm.outline(INK);
  return pm;
}

function propBuseta(l: Pt[]): Pixmap {
  const pm = new Pixmap(64, 44);
  const H = pm.height;
  pm.rect(2, 6, 60, 30, C(0xf4f4ee));
  pm.hline(2, 61, 6, C(0xffffff));
  pm.rect(2, 4, 58, 3, C(0xe0e0d8));
  // franjas de colores
  pm.rect(2, 26, 60, 2, C(0xe02828));
  pm.rect(2, 28, 60, 2, C(0xf8c818));
  pm.rect(2, 30, 60, 2, C(0x24803e));
  pm.rect(2, 33, 60, 3, C(0xb8b8b0));
  // ventanas con pasajeros
  for (let i = 0; i < 5; i++) {
    const wx = 5 + i * 10;
    pm.rect(wx, 10, 8, 11, C(0xfff0b0));
    pm.rect(wx, 10, 8, 3, C(0xffffe0));
    if (i % 2 === 0) { pm.circle(wx + 4, 16, 2, C(0x3a2418)); pm.rect(wx + 1, 18, 6, 3, C(PARTY[i])); }
    pm.rectOutline(wx - 1, 9, 10, 13, C(0x3a4050));
    if (i % 2 === 1) l.push([wx + 4, 14]);
  }
  // parabrisas y letrero de ruta
  pm.rect(55, 10, 6, 14, C(0x5a8ab0));
  pm.set(56, 11, C(0xc0e0f0));
  pm.rect(10, 0, 26, 5, C(0x1a1a1e));
  text(pm, 'CENTRO', 11, 0, C(0xffa030));
  l.push([23, 2]);
  pm.rect(60, 24, 3, 3, C(0xfffbd0));
  l.push([61, 25]);
  pm.rect(1, 24, 2, 3, C(0xff3030));
  for (const wx of [14, 50]) {
    pm.circle(wx, 38, 5, C(0x1a1a1e));
    pm.circle(wx, 38, 2.5, C(0xc8c8d0));
  }
  pm.rect(0, H - 1, 64, 1, C(0x000000, 60));
  pm.outline(INK);
  return pm;
}

function stallCart(pm: Pixmap, x: number, w: number, bottom: number, umbrella: [number, number]): void {
  // sombrilla a gajos
  const cx = x + w / 2;
  for (let i = -14; i <= 14; i++) {
    const y0 = Math.round(4 + Math.abs(i) * 0.45);
    pm.vline(cx + i, y0, 10, Math.floor((i + 14) / 4) % 2 ? C(umbrella[0]) : C(umbrella[1]));
  }
  pm.hline(cx - 14, cx + 14, 10, C(0x000000, 60));
  pm.vline(cx, 2, 4, IRON[2]);
  pm.vline(cx, 11, bottom - 10, IRON[2]);
  // carrito
  pm.rect(x, bottom - 14, w, 8, C(0x2c64b0));
  pm.hline(x, x + w - 1, bottom - 14, C(0x5a94d8));
  pm.rect(x, bottom - 8, w, 2, C(0x1c3c78));
  for (const wx of [x + 4, x + w - 5]) {
    pm.circle(wx, bottom - 3, 3, C(0x1a1a1e));
    pm.set(wx, bottom - 3, C(0x9aa0a8));
  }
}

function propPuestoFruta(l: Pt[]): Pixmap {
  const pm = new Pixmap(32, 38);
  const H = pm.height;
  stallCart(pm, 3, 26, H - 1, [0xf8d020, 0x24803e]);
  // frutas: mango, piña, papaya, sandía en tajadas
  pm.rect(4, H - 18, 24, 4, C(0x9a6a3a));
  for (let i = 0; i < 5; i++) pm.ellipse(6 + i * 2.5, H - 19, 1.8, 1.5, C(0xf0a020));
  pm.ellipse(19, H - 21, 2.5, 3.5, C(0xd8a030));
  pm.rect(18, H - 26, 3, 3, C(0x2a8a34));
  pm.polygon([[22, H - 18], [27, H - 18], [24.5, H - 23]], C(0xe83a3a));
  pm.hline(22, 26, H - 18, C(0x2a8a34));
  pm.ellipse(12, H - 21, 2.5, 1.5, C(0xf87030));
  pm.set(12, H - 21, C(0x2a1a10));
  // bombillo colgado
  pm.vline(16, 11, 13, INK);
  pm.rect(15, 13, 2, 2, C(0xfff4b0));
  l.push([16, 14]);
  pm.outline(INK);
  return pm;
}

function propPuestoArepas(l: Pt[]): Pixmap {
  const pm = new Pixmap(32, 38);
  const H = pm.height;
  stallCart(pm, 3, 26, H - 1, [0xe02828, 0xf4f0e8]);
  // parrilla con carbón encendido, arepas y chorizos
  pm.rect(4, H - 18, 24, 4, C(0x2a2a30));
  pm.rect(5, H - 17, 22, 2, C(0xf05a10));
  for (let x = 6; x < 27; x += 3) pm.set(x, H - 17, C(0xffd040));
  pm.hline(4, 27, H - 19, C(0x8a8a94));
  for (const ax of [8, 14]) { pm.ellipse(ax, H - 20, 2.5, 1.2, C(0xf0d890)); pm.set(ax - 1, H - 21, C(0xfff0c0)); }
  for (const cx of [20, 23]) pm.rect(cx, H - 21, 2, 2, C(0xa83020));
  // humo
  pm.circle(12, H - 25, 1.5, C(0xe8e8e8, 110));
  pm.circle(15, H - 28, 2, C(0xe8e8e8, 90));
  pm.vline(16, 11, 13, INK);
  pm.rect(15, 13, 2, 2, C(0xfff4b0));
  l.push([16, 14], [16, H - 17]);
  pm.outline(INK);
  return pm;
}

function propSilleta(): Pixmap {
  const pm = new Pixmap(24, 34);
  const H = pm.height;
  // marco de madera de la silleta
  pm.rect(3, 6, 2, H - 7, WOOD[1]);
  pm.rect(19, 6, 2, H - 7, WOOD[1]);
  pm.hline(3, 20, H - 6, WOOD[2]);
  pm.rect(3, H - 6, 18, 2, WOOD[1]);
  // tapete de flores en anillos
  const rings = [0xe83050, 0xf8e048, 0xf8f8f8, 0xf060c0, 0xff8030, 0x8040c8];
  for (let i = 0; i < rings.length; i++) pm.ellipse(12, 14, 10 - i * 1.6, 10 - i * 1.6, C(rings[i]));
  const rnd = seededRandom(401);
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * 9;
    const x = Math.round(12 + Math.cos(a) * r), y = Math.round(14 + Math.sin(a) * r);
    pm.set(x, y, rnd() < 0.5 ? C(0xffffff, 160) : C(0x000000, 50));
  }
  for (const [x, y] of [[2, 12], [22, 14], [8, 4], [16, 5], [4, 20], [20, 21]] as const) pm.ellipse(x, y, 2, 1.5, LEAF[1]);
  pm.circle(12, 14, 1.5, C(0xfff4b0));
  pm.outline(INK);
  return pm;
}

function propPoste(l: Pt[]): Pixmap {
  const pm = new Pixmap(16, 60);
  const H = pm.height;
  pm.rect(4, H - 4, 6, 3, CONCRETE[1]);
  pm.rect(5, 8, 3, H - 11, C(0x7a828a));
  pm.vline(5, 8, H - 4, C(0xb0b8c0));
  pm.line(7, 9, 12, 4, 1, C(0x7a828a));
  // luminaria de sodio
  pm.rect(9, 3, 7, 3, C(0x3a3a44));
  pm.rect(10, 6, 5, 2, C(0xffd060));
  pm.hline(10, 14, 7, C(0xfff4b0));
  l.push([12, 7]);
  // afiche pegado
  pm.rect(4, 30, 5, 6, C(0xf8e048));
  pm.hline(5, 7, 32, C(0xc82020));
  pm.outline(INK);
  return pm;
}

function propGuayacan(): Pixmap {
  const pm = new Pixmap(44, 60);
  const H = pm.height;
  const gold = R(0xb07a08, 0xf0c018, 0xfff070);
  // pétalos caídos en el suelo
  const rnd = seededRandom(501);
  for (let i = 0; i < 40; i++) {
    const x = 6 + Math.floor(rnd() * 32), y = H - 6 + Math.floor(rnd() * 5);
    pm.set(x, y, gold[rnd() < 0.5 ? 1 : 2]);
  }
  // tronco torcido con ramas
  pm.polygon([[19, H - 3], [21, 34], [24, 34], [25, H - 3]], C(0x5a3e2a));
  pm.vline(20, 36, H - 4, C(0x7a5a3e));
  pm.line(22, 36, 12, 24, 2, C(0x5a3e2a));
  pm.line(23, 36, 33, 22, 2, C(0x5a3e2a));
  pm.ellipse(22, H - 2, 6, 1.5, C(0x000000, 60));
  // copa amarilla de flores
  for (const [cx, cy, rx, ry] of [[22, 20, 18, 14], [11, 24, 9, 7], [33, 22, 9, 8], [22, 10, 12, 8]] as const) pm.ellipse(cx, cy, rx, ry, gold[0]);
  for (let i = 0; i < 260; i++) {
    const x = 3 + Math.floor(rnd() * 38), y = 2 + Math.floor(rnd() * 34);
    if (!pm.alpha(x, y)) continue;
    const yy = y - 2 + Math.floor(rnd() * 2);
    pm.set(x, y, yy < 16 ? gold[2] : gold[1]);
    if (rnd() < 0.3) pm.set(x + 1, y, gold[2]);
  }
  pm.ellipse(16, 12, 5, 3, C(0xfff8b0, 140));
  pm.outline(INK);
  return pm;
}

function propPalmera(): Pixmap {
  const pm = new Pixmap(36, 74);
  const H = pm.height, cx = 18;
  // tallo liso gris, panzón al medio, con capitel verde (palma real)
  for (let y = 18; y < H - 1; y++) {
    const t = (y - 18) / (H - 19);
    const half = 1.5 + Math.sin(t * Math.PI) * 1.2;
    const x0 = Math.round(cx - half), x1 = Math.round(cx + half);
    pm.hline(x0, x1, y, C(0xa8a49a));
    pm.set(x0, y, C(0xd8d4ca));
    pm.set(x1, y, C(0x6a665e));
    if (y % 6 === 0) pm.hline(x0, x1, y, C(0x8a867e));
  }
  pm.rect(cx - 2, 12, 5, 9, C(0x4a8a30));
  pm.vline(cx - 2, 12, 20, C(0x7ac050));
  const frond = (ang: number, len: number, droop: number) => {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    for (let t = 0; t < len; t++) {
      const x = cx + 0.5 + dx * t, y = 12 + dy * t + (t * t * droop) / len;
      if (t > 1) {
        pm.line(x, y, x - dy * 3, y + 3, 1, LEAF[0]);
        pm.line(x, y, x + dy * 3, y + 3, 1, LEAF[1]);
      }
      pm.set(Math.round(x), Math.round(y), C(0x9ac860));
    }
  };
  for (const [a, l, d] of [[-2.9, 16, 1.4], [-0.25, 16, 1.4], [-2.3, 14, 0.8], [-0.85, 14, 0.8], [-1.57, 11, 0.2], [-3.4, 12, 2], [0.25, 12, 2]] as const) frond(a, l, d);
  pm.outline(INK);
  return pm;
}

function propBanca(): Pixmap {
  const pm = new Pixmap(32, 22);
  const green = R(0x0e4a2a, 0x18804a, 0x40b070);
  for (const x of [4, 26]) { pm.rect(x, 12, 2, 9, IRON[1]); pm.set(x - 1, 20, IRON[1]); pm.set(x + 2, 20, IRON[1]); }
  for (const y of [2, 6]) { pm.rect(2, y, 28, 3, green[1]); pm.hline(2, 29, y, green[2]); pm.hline(2, 29, y + 2, green[0]); }
  pm.rect(1, 11, 30, 4, green[1]); pm.hline(1, 30, 11, green[2]); pm.hline(1, 30, 14, green[0]);
  for (const x of [5, 26]) pm.vline(x, 1, 11, IRON[1]);
  pm.rect(2, 15, 28, 2, C(0x000000, 60));
  pm.outline(INK);
  return pm;
}

function propTarima(f: number, l: Pt[]): Pixmap {
  const pm = new Pixmap(80, 72);
  const H = pm.height;
  // armazón de luces (truss)
  for (const px of [3, 74]) {
    pm.rect(px, 8, 3, H - 26, C(0x6a6a74));
    for (let y = 10; y < H - 20; y += 4) pm.line(px, y, px + 2, y + 2, 1, C(0xa8a8b4));
  }
  pm.rect(3, 6, 74, 4, C(0x6a6a74));
  for (let x = 4; x < 76; x += 4) pm.line(x, 6, x + 2, 9, 1, C(0xa8a8b4));
  // fondo del escenario con telón y pancarta
  pm.rect(6, 10, 68, H - 28, C(0x2a1a4a));
  for (let x = 6; x < 74; x += 3) pm.vline(x, 10, H - 19, C(0x3a2a6a));
  signboard(pm, 40, 14, 'FERIA DE LAS FLORES', R(0x8a1450, 0xe03080, 0xf870b0), C(0xffffff), 2);
  // focos de colores que cambian con el fotograma
  for (let i = 0; i < 8; i++) {
    const lx = 9 + i * 9;
    const col = PARTY[(i + f * 3) % PARTY.length];
    pm.rect(lx, 9, 4, 3, C(0x1a1a1e));
    pm.rect(lx + 1, 11, 2, 1, C(col));
    if ((i + f) % 2 === 0) {
      pm.polygon([[lx + 1, 12], [lx + 3, 12], [lx + 6 - (i % 3) * 3, H - 20], [lx - 2 - (i % 3), H - 20]], C(col, 60));
      l.push([lx + 2, 11]);
    }
  }
  // músicos: guitarrista y cantante
  for (const [mx, c, hat] of [[30, 0xf0f0f0, true], [50, 0xc82030, false]] as const) {
    pm.circle(mx, H - 34, 3, C(0x6a4430));
    if (hat) pm.ellipse(mx, H - 37, 5, 1.5, C(0xf4ecd0));
    pm.rect(mx - 3, H - 31, 7, 8, C(c));
    pm.rect(mx - 2, H - 23, 2, 4, C(0x2a2a40)); pm.rect(mx + 1, H - 23, 2, 4, C(0x2a2a40));
  }
  pm.ellipse(33, H - 27, 3, 2, C(0xa8703c));
  pm.line(33, H - 27, 40, H - 32, 1, C(0x5a3010));
  pm.vline(55, H - 33, H - 20, IRON[2]);
  pm.set(55, H - 34, C(0x9aa0a8));
  // plataforma y parlantes
  pm.rect(2, H - 19, 76, 8, WOOD[1]);
  pm.hline(2, 77, H - 19, WOOD[2]);
  for (let x = 2; x < 78; x += 8) pm.vline(x, H - 18, H - 12, WOOD[0]);
  pm.rect(2, H - 11, 76, 10, C(0x1a1a1e));
  for (let x = 6; x < 76; x += 6) pm.vline(x, H - 10, H - 2, C(0x3a3a44));
  for (const sx of [0, 68]) {
    pm.rect(sx, H - 34, 12, 16, C(0x22222a));
    pm.circle(sx + 6, H - 29, 3, C(0x5a5a68));
    pm.circle(sx + 6, H - 22, 2, C(0x5a5a68));
    pm.set(sx + 6, H - 29, C(0x1a1a1e));
  }
  // notas musicales
  pm.rect(f ? 18 : 20, H - 46, 1, 4, C(0xfff070));
  pm.rect(f ? 16 : 18, H - 43, 2, 2, C(0xfff070));
  pm.rect(f ? 62 : 60, H - 44, 1, 4, C(0xfff070));
  pm.rect(f ? 60 : 58, H - 41, 2, 2, C(0xfff070));
  pm.outline(INK);
  return pm;
}

function propBombillos(f: number, l: Pt[]): Pixmap {
  const pm = new Pixmap(64, 40);
  const H = pm.height;
  for (const px of [2, 60]) {
    pm.rect(px, 4, 2, H - 5, WOOD[1]);
    pm.vline(px, 4, H - 2, WOOD[2]);
  }
  bulbString(pm, 3, 60, 5, 7, l, f, 5);
  bulbString(pm, 3, 60, 13, 5, l, f + 1, 5);
  pm.outline(INK);
  return pm;
}

function propCastillo(f: number, l: Pt[]): Pixmap {
  const pm = new Pixmap(40, 90);
  const H = pm.height;
  const guadua = R(0x6a6a20, 0xa8a040, 0xd8d070);
  // torre de guadua
  for (const px of [10, 28]) {
    pm.rect(px, 14, 3, H - 15, guadua[1]);
    pm.vline(px, 14, H - 2, guadua[2]);
    for (let y = 20; y < H - 2; y += 10) pm.hline(px, px + 2, y, guadua[0]);
  }
  for (let y = 22; y < H - 4; y += 16) {
    pm.line(12, y, 28, y + 14, 1, guadua[0]);
    pm.line(28, y, 12, y + 14, 1, guadua[0]);
    pm.hline(10, 30, y, guadua[1]);
  }
  // ruedas de pólvora girando
  const wheels: [number, number, number][] = [[20, 18, 7], [20, 44, 6], [20, 68, 5]];
  for (const [wx, wy, r] of wheels) {
    pm.circle(wx, wy, 2, C(0x5a3010));
    for (let a = 0; a < 6; a++) {
      const ang = a * (Math.PI / 3) + f * (Math.PI / 6);
      const ex = wx + Math.cos(ang) * r, ey = wy + Math.sin(ang) * r;
      pm.line(wx, wy, ex, ey, 1, C(0xfff0a0));
      const col = PARTY[(a + f) % PARTY.length];
      for (let k = 1; k <= 3; k++) {
        const sa = ang + k * 0.35;
        pm.set(Math.round(wx + Math.cos(sa) * (r + k)), Math.round(wy + Math.sin(sa) * (r + k)), C(col, 255 - k * 50));
      }
    }
    pm.circle(wx, wy, 1.5, C(0xffffff));
    l.push([wx, wy]);
  }
  // chispas que caen
  const rnd = seededRandom(601 + f);
  for (let i = 0; i < 40; i++) {
    const x = 2 + Math.floor(rnd() * 36), y = 4 + Math.floor(rnd() * (H - 10));
    pm.set(x, y, C(rnd() < 0.5 ? 0xfff4a0 : PARTY[Math.floor(rnd() * PARTY.length)]));
  }
  // cohete arriba
  pm.rect(19, 2 + f * 2, 2, 6, C(0xd02020));
  pm.set(19, 1 + f * 2, C(0xfff0a0));
  pm.outline(INK);
  return pm;
}

function propKiosko(l: Pt[]): Pixmap {
  const pm = new Pixmap(48, 60);
  const H = pm.height;
  // base octogonal
  pm.ellipse(24, H - 7, 22, 6, STONE[0]);
  pm.ellipse(24, H - 9, 22, 6, STONE[1]);
  pm.ellipse(24, H - 10, 20, 5, STONE[2]);
  // columnas blancas con baranda
  for (const px of [5, 15, 24, 33, 42]) {
    pm.rect(px - 1, 24, 3, H - 34, WHITE_WALL[1]);
    pm.vline(px - 1, 24, H - 11, WHITE_WALL[2]);
  }
  pm.rect(5, H - 20, 38, 2, WHITE_WALL[1]);
  for (let x = 6; x < 42; x += 2) pm.vline(x, H - 18, H - 13, WHITE_WALL[0]);
  // farolito central
  pm.vline(24, 24, 28, IRON[1]);
  pm.rect(22, 29, 5, 5, C(0xffe070));
  pm.set(23, 30, C(0xfffbd0));
  l.push([24, 31]);
  // techo de teja en pabellón
  pm.polygon([[1, 25], [24, 4], [47, 25]], CLAY[1]);
  for (let y = 8; y < 25; y += 3) {
    const half = ((y - 4) / 21) * 23;
    pm.hline(24 - half + 1, 24 + half - 1, y, CLAY[0]);
    pm.hline(24 - half + 1, 24 + half - 1, y + 1, CLAY[2]);
  }
  pm.polygon([[24, 4], [47, 25], [24, 25]], C(0x000000, 40));
  pm.hline(1, 46, 25, C(0x3a160c));
  // guirnalda de bombillos bajo el alero
  for (let x = 4; x < 45; x += 4) {
    pm.set(x, 27, C(PARTY[(x / 4) % PARTY.length]));
    if (x % 8 === 0) l.push([x, 27]);
  }
  pm.circle(24, 3, 1.5, C(0xf0c040));
  pm.outline(INK);
  return pm;
}

function propEscalera(l: Pt[]): Pixmap {
  const pm = new Pixmap(32, 64);
  const H = pm.height;
  // muro y escalones en diagonal
  pm.polygon([[1, H - 2], [1, H - 14], [30, 16], [30, H - 2]], CONCRETE[0]);
  for (let i = 0; i < 16; i++) {
    const sx = 2 + i * 1.8, sy = H - 14 - i * 2.9;
    pm.rect(sx, sy, 6, 2, C(0x9aa0a8));
    pm.hline(sx, sx + 5, sy, C(0xd0d4d8));
  }
  // pasamanos de caucho negro con vidrio
  pm.line(1, H - 20, 29, 10, 1, C(0x1a1a1e));
  pm.polygon([[1, H - 20], [29, 10], [29, 16], [1, H - 14]], C(0x9ad0e0, 120));
  // techo naranja característico
  pm.polygon([[0, H - 34], [27, 0], [31, 0], [31, 4], [4, H - 30]], C(0xe0701c));
  pm.line(0, H - 34, 27, 0, 1, C(0xf8a050));
  pm.line(4, H - 30, 31, 4, 1, C(0x8a3a10));
  for (const [px, py] of [[4, H - 30], [16, 33], [28, 7]] as const) {
    pm.vline(px, py, py + 22, C(0xc8ccd0));
  }
  // luces bajo el techo
  for (const [lx, ly] of [[8, H - 31], [18, 24], [27, 12]] as const) {
    pm.rect(lx, ly, 2, 1, C(0xfff8d0));
    l.push([lx, ly]);
  }
  pm.outline(INK);
  return pm;
}

function propFuente(f: number, l: Pt[]): Pixmap {
  const pm = new Pixmap(48, 52);
  const H = pm.height;
  const water = R(0x1c4a8a, 0x2f8fd8, 0xa8e0ff);
  pm.ellipse(24, H - 12, 23, 10, CONCRETE[0]);
  pm.ellipse(24, H - 14, 23, 10, CONCRETE[1]);
  pm.ellipse(24, H - 15, 21, 8, CONCRETE[2]);
  pm.ellipse(24, H - 14, 19, 7, water[1]);
  pm.ellipse(24, H - 13, 17, 5, water[0]);
  // luces sumergidas de colores
  const under = [0xff40a0, 0x40e0ff, 0xfff040, 0x60ff80];
  for (let i = 0; i < 4; i++) {
    const ux = 10 + i * 9.5, uy = H - 14 + (i % 2);
    pm.ellipse(ux, uy, 3, 1.5, C(under[(i + f) % 4], 200));
    l.push([Math.round(ux), uy]);
  }
  // chorros verticales (alturas alternan con el fotograma)
  const jets = [10, 17, 24, 31, 38];
  jets.forEach((jx, i) => {
    const h = ((i + f) % 2 ? 22 : 30) - Math.abs(i - 2) * 4;
    const top = H - 15 - h;
    pm.vline(jx, top, H - 15, C(0xd8f0ff, 220));
    pm.vline(jx + 1, top + 2, H - 15, C(0x8ac8f8, 180));
    pm.set(jx - 1, top + 1, C(0xffffff));
    pm.set(jx + 2, top + 1, C(0xffffff));
    pm.set(jx, top - 1, C(0xffffff, 180));
  });
  for (const [x, y] of [[14, H - 12], [30, H - 14], [22, H - 10]] as const) pm.hline(x, x + 3, y, water[2]);
  pm.outline(INK);
  return pm;
}

function propSemaforo(f: number, l: Pt[]): Pixmap {
  const pm = new Pixmap(16, 46);
  const H = pm.height;
  pm.rect(6, 16, 3, H - 18, C(0x3a3a44));
  pm.vline(6, 16, H - 3, C(0x6a6a78));
  pm.rect(4, H - 3, 7, 2, CONCRETE[1]);
  pm.rect(3, 1, 9, 19, C(0x1a1a1e));
  pm.rect(2, 1, 1, 19, C(0xe8c020));
  pm.rect(12, 1, 1, 19, C(0xe8c020));
  const lamps: [number, number, number][] = [[4, 0xff3030, 0x501010], [10, 0xffc020, 0x504010], [16, 0x30ff70, 0x105020]];
  lamps.forEach(([y, on, off], i) => {
    const lit = f ? i === 0 : i === 2;
    pm.circle(7.5, y, 2.5, C(lit ? on : off));
    if (lit) pm.set(7, y - 1, C(0xffffff));
  });
  l.push([7, 4], [7, 16]);
  pm.outline(INK);
  return pm;
}

const ANIMATED: ReadonlySet<CityPropKind> = new Set<CityPropKind>([
  'metro_tren', 'metrocable', 'tarima', 'bombillos', 'castillo_polvora', 'fuente_ciudad', 'semaforo',
]);

interface BuiltProp { pm: Pixmap; lights: Pt[] }
const propCache = new Map<string, BuiltProp>();

function makeProp(kind: CityPropKind, frame: number): BuiltProp {
  const f = ANIMATED.has(kind) ? ((frame % 2) + 2) % 2 : 0;
  const key = `${kind}:${f}`;
  const cached = propCache.get(key);
  if (cached) return cached;
  const l: Pt[] = [];
  const art: Record<CityPropKind, () => Pixmap> = {
    botero_gorda: propBoteroGorda, botero_caballo: propBoteroCaballo, botero_gato: propBoteroGato,
    metro_via: propMetroVia, metro_pilar: propMetroPilar, metro_tren: () => propMetroTren(f, l),
    metrocable: () => propMetrocable(f, l), torre_cable: () => propTorreCable(l), grafiti: () => propGrafiti(l),
    taxi: () => propTaxi(l), jeep: () => propJeep(l), buseta: () => propBuseta(l),
    puesto_fruta: () => propPuestoFruta(l), puesto_arepas: () => propPuestoArepas(l), silleta: propSilleta,
    poste: () => propPoste(l), guayacan: propGuayacan, palmera: propPalmera, banca: propBanca,
    tarima: () => propTarima(f, l), bombillos: () => propBombillos(f, l), castillo_polvora: () => propCastillo(f, l),
    kiosko: () => propKiosko(l), escalera_electrica: () => propEscalera(l), fuente_ciudad: () => propFuente(f, l),
    semaforo: () => propSemaforo(f, l),
  };
  const b = { pm: art[kind](), lights: l };
  propCache.set(key, b);
  return b;
}

/** alineado abajo al centro de su huella; `frame` 0/1 en lo que se anima (bombillos, pólvora, metro, semáforo…) */
export function buildCityProp(kind: CityPropKind, frame = 0): Pixmap {
  return makeProp(kind, frame).pm.clone();
}

export function cityPropLights(kind: CityPropKind): [number, number][] {
  return makeProp(kind, 0).lights.map(([x, y]) => [x, y]);
}

// ---------- suelos ----------

export type CityGround = 'asfalto' | 'anden' | 'ladrillo' | 'cebra' | 'grama' | 'adoquin' | 'tierra_roja';

const GROUND_SEED: Record<CityGround, number> = { asfalto: 1, anden: 2, ladrillo: 3, cebra: 4, grama: 5, adoquin: 6, tierra_roja: 7 };

function speckle(pm: Pixmap, rnd: () => number, n: number, cols: Rgba[]): void {
  for (let i = 0; i < n; i++) pm.set(Math.floor(rnd() * 16), Math.floor(rnd() * 16), cols[Math.floor(rnd() * cols.length)]);
}

function asphalt(pm: Pixmap, rnd: () => number): void {
  pm.rect(0, 0, 16, 16, C(0x3c3e48));
  speckle(pm, rnd, 34, [C(0x4c4e5a), C(0x30323a), C(0x56586a)]);
}

/** baldosa 16×16 que empata por los cuatro lados; `variant` 0..3 da variedad */
export function buildCityGround(kind: CityGround, variant: number): Pixmap {
  const pm = new Pixmap(16, 16);
  const v = ((variant % 4) + 4) % 4;
  const rnd = seededRandom(GROUND_SEED[kind] * 131 + v * 17 + 5);
  switch (kind) {
    case 'asfalto': {
      asphalt(pm, rnd);
      if (v === 1) {
        pm.line(2, 3, 6, 7, 1, C(0x24262c)); pm.line(6, 7, 5, 11, 1, C(0x24262c)); pm.set(7, 8, C(0x24262c));
      } else if (v === 2) {
        pm.circle(8, 8, 5, C(0x24262c));
        pm.circle(8, 8, 4, C(0x55586a));
        for (let y = 5; y < 12; y += 2) pm.hline(5, 11, y, C(0x3a3c48));
        pm.set(6, 6, C(0x7a7c8a));
      } else if (v === 3) {
        pm.ellipse(9, 9, 4, 2.5, C(0x2a2c36));
        pm.set(8, 8, C(0x6a4a8a)); pm.set(10, 9, C(0x3a7a8a));
      }
      break;
    }
    case 'anden': {
      pm.rect(0, 0, 16, 16, C(0xa09c94));
      speckle(pm, rnd, 18, [C(0x8c8880), C(0xb4b0a8)]);
      if (v === 1) pm.rect(8, 0, 8, 8, C(0x98948c));
      for (const k of [0, 8]) {
        pm.hline(0, 15, k, C(0x7a766e)); pm.vline(k, 0, 15, C(0x7a766e));
        pm.hline(0, 15, k + 1, C(0xbcb8b0)); pm.vline(k + 1, 0, 15, C(0xbcb8b0));
      }
      if (v === 2) { pm.line(10, 3, 13, 6, 1, C(0x6a665e)); pm.set(12, 6, C(0x6a665e)); }
      if (v === 3) { pm.set(8, 4, C(0x4caa48)); pm.set(9, 3, C(0x2a7a34)); pm.set(7, 3, C(0x4caa48)); }
      break;
    }
    case 'ladrillo': {
      pm.rect(0, 0, 16, 16, C(0x6a2a1a));
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 4 : 0;
        for (let bx = -8; bx < 16; bx += 8) {
          const x0 = bx + off;
          const c = C(BRICK_TONES[Math.floor(rnd() * BRICK_TONES.length)]);
          for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) {
            const x = (((x0 + i) % 16) + 16) % 16;
            pm.set(x, row * 4 + j, c);
          }
          pm.set(((x0 % 16) + 16) % 16, row * 4, BRICK[2]);
        }
      }
      if (v === 3) { pm.set(5, 6, C(0x3a7a2a)); pm.set(6, 7, C(0x4caa48)); }
      break;
    }
    case 'cebra': {
      asphalt(pm, rnd);
      for (let x = 0; x < 16; x++) {
        if (x % 8 < 2 || x % 8 > 5) continue;
        for (let y = 0; y < 16; y++) pm.set(x, y, rnd() < 0.08 + v * 0.03 ? C(0xb0aea4) : C(0xe8e6dc));
      }
      break;
    }
    case 'grama': {
      pm.rect(0, 0, 16, 16, C(0x2f7a34));
      speckle(pm, rnd, 30, [C(0x266a2c), C(0x3c8c3a), C(0x4ca048)]);
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(rnd() * 15), y = 1 + Math.floor(rnd() * 14);
        pm.set(x, y, C(0x5cb850)); pm.set(x + 1, y - 1, C(0x5cb850));
      }
      if (v === 3) {
        for (const [x, y, c] of [[4, 4, 0xf8e048], [11, 10, 0xf04860], [8, 13, 0xf8f8f8]] as const) {
          pm.set(x, y, C(c)); pm.set(x + 1, y, C(c)); pm.set(x, y - 1, C(0xffffff));
        }
      } else if (v === 2) {
        pm.set(6, 8, C(0xf0c018)); pm.set(12, 3, C(0xf0c018)); pm.set(2, 12, C(0xfff070));
      }
      break;
    }
    case 'adoquin': {
      pm.rect(0, 0, 16, 16, C(0x4a443e));
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 2 : 0;
        for (let col = 0; col < 4; col++) {
          const x0 = col * 4 + off, y0 = row * 4;
          const t = [0x8a8076, 0x9a9086, 0x7a7068, 0xa0968a][Math.floor(rnd() * 4)];
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pm.set((x0 + i) % 16, y0 + j, C(t));
          pm.set(x0 % 16, y0, C(0xb8b0a4));
          pm.set((x0 + 1) % 16, y0, C(0xb8b0a4));
          pm.set((x0 + 2) % 16, y0 + 2, C(0x5e564e));
          pm.set((x0 + 1) % 16, y0 + 2, C(0x6a6258));
        }
      }
      if (v === 2) { pm.set(3, 3, C(0x3a7a2a)); pm.set(11, 7, C(0x3a7a2a)); }
      break;
    }
    case 'tierra_roja': {
      pm.rect(0, 0, 16, 16, C(0xa04e2c));
      speckle(pm, rnd, 40, [C(0x8a4024), C(0xb85e36), C(0xc46a3e), C(0x7a3620)]);
      for (let i = 0; i < 2 + v; i++) {
        const x = Math.floor(rnd() * 15), y = Math.floor(rnd() * 15);
        pm.set(x, y, C(0xc8b4a0)); pm.set(x + 1, y + 1, C(0x6a3020));
      }
      if (v === 3) { pm.set(4, 10, C(0x4caa48)); pm.set(5, 9, C(0x2a7a34)); pm.set(6, 10, C(0x4caa48)); }
      break;
    }
  }
  return pm;
}
