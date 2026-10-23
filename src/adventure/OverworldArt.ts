import { Pixmap, hexToRgba, seededRandom } from '../art/PixelPainter';

/** Baldosas y adornos dibujados en código para lo que no vino de PixelLab (agua, hierba alta, puente…). */

const C = (h: number, a = 255) => hexToRgba(h, a);

/** Hierba alta: matojos oscuros con brillo, sobre transparencia (se pinta encima de la hierba). */
export function buildTallGrass(frame: number): Pixmap {
  const pm = new Pixmap(16, 16);
  const dark = C(0x1e6a28), mid = C(0x2f8f34), light = C(0x6cc84a);
  for (const [bx, by] of [[0, 2], [8, 2], [4, 9], [12, 9], [0, 13], [8, 13]] as const) {
    const sway = frame && by < 9 ? 1 : 0;
    for (let i = 0; i < 4; i++) {
      const x = bx + i * 2 - (i > 1 ? 1 : 0);
      const top = by + (i === 1 || i === 2 ? 0 : 2);
      pm.vline(x + (top === by ? sway : 0), top, Math.min(15, by + 6), mid);
    }
    pm.hline(bx, Math.min(15, bx + 6), Math.min(15, by + 5), dark);
    pm.hline(bx, Math.min(15, bx + 6), Math.min(15, by + 6), dark);
    pm.set(bx + 2 + sway, by, light);
    pm.set(bx + 4 + sway, by, light);
  }
  return pm;
}

/** Río: dos fotogramas de ondas. La orilla se marca con espuma donde arriba no hay agua. */
export function buildWater(frame: number, shoreTop: boolean, shoreBottom: boolean): Pixmap {
  const pm = new Pixmap(16, 16);
  pm.rect(0, 0, 16, 16, C(0x2f6fc8));
  const rnd = seededRandom(7);
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(rnd() * 12), y = Math.floor(rnd() * 14);
    pm.hline((x + frame * 2) % 13, ((x + frame * 2) % 13) + 3, y, C(0x6aa8f0));
  }
  pm.dither(0, 8, 16, 8, C(0x24589f), frame);
  if (shoreTop) { pm.hline(0, 15, 0, C(0xe8f4ff)); pm.dither(0, 1, 16, 2, C(0xb0d4f8), frame); }
  if (shoreBottom) { pm.hline(0, 15, 15, C(0x1a3f78)); pm.hline(0, 15, 14, C(0x1f4c90)); }
  return pm;
}

export function buildBridge(): Pixmap {
  const pm = new Pixmap(16, 16);
  pm.rect(0, 0, 16, 16, C(0x9a6a3a));
  for (let y = 0; y < 16; y += 4) { pm.hline(0, 15, y, C(0x5c3a1c)); pm.hline(1, 14, y + 1, C(0xc08a50)); }
  pm.vline(0, 0, 15, C(0x4a2c14)); pm.vline(15, 0, 15, C(0x4a2c14));
  pm.vline(1, 0, 15, C(0x7a4c24)); pm.vline(14, 0, 15, C(0x7a4c24));
  return pm;
}

export function buildFlowers(): Pixmap {
  const pm = new Pixmap(16, 16);
  for (const [x, y, c] of [[3, 3, 0xf04860], [11, 5, 0xf8e048], [6, 11, 0xf8f8f8], [13, 12, 0xf04860]] as const) {
    pm.set(x, y - 1, C(c)); pm.set(x - 1, y, C(c)); pm.set(x + 1, y, C(c)); pm.set(x, y + 1, C(c));
    pm.set(x, y, C(0xf8c020));
  }
  return pm;
}

export function buildSign(): Pixmap {
  const pm = new Pixmap(16, 16);
  pm.rect(7, 9, 2, 7, C(0x5c3a1c));
  pm.rect(2, 2, 12, 8, C(0xb07c44));
  pm.rectOutline(2, 2, 12, 8, C(0x3a2410));
  pm.hline(4, 11, 4, C(0x6a4424)); pm.hline(4, 9, 6, C(0x6a4424));
  return pm;
}

/** Árbol de repuesto si no hay imagen generada. */
export function buildTree(): Pixmap {
  const pm = new Pixmap(32, 40);
  pm.rect(13, 26, 6, 12, C(0x6a4424));
  pm.ellipse(16, 16, 14, 13, C(0x1e6a28));
  pm.ellipse(14, 13, 10, 9, C(0x2f8f34));
  pm.ellipse(12, 10, 5, 4, C(0x6cc84a));
  pm.outline(C(0x10200c));
  return pm;
}

/** Casa de repuesto: paredes de bahareque blancas, tejado de barro a cuatro aguas y zócalo. */
export function buildHouse(): Pixmap {
  const pm = new Pixmap(80, 76);
  const tile = C(0xb8442c), tileD = C(0x8a2c1c), tileL = C(0xd86848);
  pm.rect(6, 36, 68, 38, C(0xf0ece0));
  pm.rect(6, 64, 68, 10, C(0x5a7a9a));
  pm.hline(6, 73, 64, C(0x3a5068));
  pm.polygon([[2, 38], [12, 6], [68, 6], [78, 38]], tile);
  for (let y = 10; y < 38; y += 5) {
    const inset = Math.round(((38 - y) / 32) * 10);
    pm.hline(2 + inset, 77 - inset, y, tileD);
    for (let x = 4 + inset + (y % 2) * 3; x < 76 - inset; x += 6) pm.vline(x, y + 1, Math.min(37, y + 4), tileD);
  }
  pm.hline(12, 67, 6, tileL);
  pm.hline(2, 77, 38, C(0x5c2010));
  pm.rect(56, 0, 7, 10, C(0x8a8078));
  pm.rect(34, 50, 12, 24, C(0x7a4c24));
  pm.vline(40, 50, 73, C(0x5c3a1c));
  pm.set(43, 62, C(0xf8d048));
  for (const wx of [14, 54]) {
    pm.rect(wx, 46, 12, 10, C(0x4a78b8));
    pm.rectOutline(wx - 1, 45, 14, 12, C(0x2a7a3a));
    pm.vline(wx + 6, 46, 55, C(0x2a7a3a));
    pm.hline(wx, wx + 11, 51, C(0x2a7a3a));
  }
  pm.outline(C(0x201010));
  return pm;
}

/** Burbuja de «!» o «!!» sobre la cabeza. */
export function buildBubble(text: '!' | '!!' | '...'): Pixmap {
  const pm = new Pixmap(14, 14);
  pm.rect(1, 0, 12, 11, C(0xf8f8f8));
  pm.rectOutline(0, 0, 14, 11, C(0x202020));
  pm.polygon([[4, 10], [8, 10], [5, 13]], C(0xf8f8f8));
  pm.set(4, 11, C(0x202020)); pm.set(5, 13, C(0x202020)); pm.set(7, 11, C(0x202020));
  const red = C(0xd82020);
  if (text === '...') for (const x of [3, 6, 9]) pm.rect(x, 7, 2, 2, C(0x202020));
  else for (const x of text === '!' ? [6] : [4, 8]) { pm.rect(x, 2, 2, 5, red); pm.rect(x, 8, 2, 1, red); }
  return pm;
}

export function buildShadow(w: number): Pixmap {
  const pm = new Pixmap(w, 6);
  pm.ellipse(w / 2, 3, w / 2 - 1, 2, C(0x000000, 90));
  return pm;
}

/** Perro criollo de repuesto (sur, este, norte): café con blanco, orejas caídas. */
export function buildDog(): Pixmap {
  const sheet = new Pixmap(144, 48);
  const brown = C(0x8a5a2c), dark = C(0x5a3818), white = C(0xf0e8d8), nose = C(0x201010), ink = C(0x1a0c06);
  const south = new Pixmap(48, 48);
  south.ellipse(24, 34, 9, 8, brown);
  south.ellipse(24, 37, 5, 5, white);
  south.ellipse(24, 22, 8, 7, brown);
  south.ellipse(24, 25, 4, 3, white);
  south.rect(15, 18, 3, 8, dark); south.rect(30, 18, 3, 8, dark);
  south.set(21, 21, ink); south.set(27, 21, ink); south.rect(23, 25, 2, 2, nose);
  for (const x of [18, 28]) south.rect(x, 40, 3, 5, brown);
  south.outline(ink);
  const east = new Pixmap(48, 48);
  east.ellipse(22, 33, 11, 6, brown);
  east.ellipse(22, 36, 7, 3, white);
  east.ellipse(33, 25, 6, 5, brown);
  east.rect(36, 26, 5, 3, white); east.set(40, 26, nose);
  east.rect(29, 21, 3, 7, dark); east.set(34, 23, ink);
  east.line(11, 30, 7, 24, 2, brown);
  for (const x of [14, 18, 26, 30]) east.rect(x, 37, 2, 7, brown);
  east.outline(ink);
  const north = new Pixmap(48, 48);
  north.ellipse(24, 32, 9, 9, brown);
  north.ellipse(24, 22, 7, 6, brown);
  north.rect(16, 19, 3, 7, dark); north.rect(29, 19, 3, 7, dark);
  north.line(24, 40, 24, 45, 2, brown);
  for (const x of [17, 29]) north.rect(x, 39, 3, 5, brown);
  north.outline(ink);
  [south, east, north].forEach((f, i) => sheet.blit(f, i * 48, 0));
  return sheet;
}

export type HorseKind = 'lucero' | 'negro';

/** Patas en cada fotograma del galope: [trasera lejos, trasera cerca], [delantera lejos, delantera cerca], grados desde la vertical (+ = adelante). */
const GALLOP: [[number, number], [number, number]][] = [
  [[30, 12], [-12, 38]],
  [[5, -12], [28, 12]],
  [[-30, -45], [8, -18]],
  [[-8, 18], [-38, -22]],
];
export const HORSE_GALLOP_FIRST = 3;
export const HORSE_GALLOP_FRAMES = GALLOP.length;

/**
 * Caballo (sur, este, norte y cuatro de galope de lado), 48 px como los personajes. Lucero: alazán con lucero blanco en la frente
 * y montura de arriero. Negro: el caballo del Sombrerón, de crin larga y ojos rojos.
 */
export function buildHorse(kind: HorseKind): Pixmap {
  const negro = kind === 'negro';
  const coat = C(negro ? 0x1c1820 : 0x8a4a22), shade = C(negro ? 0x0c0a10 : 0x5e3016), light = C(negro ? 0x3a3444 : 0xb06a36);
  const mane = C(negro ? 0x050408 : 0x2a160a), hoof = C(0x141010), ink = C(0x0a0606);
  const eye = negro ? C(0xff2a20) : ink;
  const blaze = C(0xf0ece0), leather = C(0x6a3c1c), blanket = C(0xc8302c), blanketL = C(0xf05a48);

  const side = (legs?: [[number, number], [number, number]]): Pixmap => {
    const east = new Pixmap(48, 48);
    if (!legs) {
      for (const [x, back] of [[11, true], [16, false], [30, true], [35, false]] as const) {
        east.rect(x, 31, 3, 12, back ? shade : coat);
        east.rect(x, 42, 3, 2, hoof);
      }
    } else {
      // cada pata sale de la cadera o del hombro con su ángulo; la del lado de allá, más oscura
      const leg = (hx: number, deg: number, c: typeof coat) => {
        const a = (deg * Math.PI) / 180;
        const fx = Math.round(hx + Math.sin(a) * 12), fy = Math.round(31 + Math.cos(a) * 12);
        east.line(hx, 31, fx, fy, 3, c);
        east.rect(fx - 1, fy - 1, 3, 2, hoof);
      };
      leg(13, legs[0][0], shade); leg(32, legs[1][0], shade);
      leg(17, legs[0][1], coat); leg(36, legs[1][1], coat);
    }
    east.line(10, 24, 5, 37, 3, mane);
    east.ellipse(23, 28, 14, 7, coat);
    east.hline(12, 34, 23, light);
    east.ellipse(23, 33, 10, 2, shade);
    east.polygon([[31, 27], [35, 13], [41, 14], [38, 29]], coat);
    east.polygon([[35, 13], [41, 9], [46, 13], [46, 17], [41, 18]], coat);
    east.rect(43, 15, 3, 3, shade);
    east.polygon([[36, 11], [37, 6], [39, 10]], coat);
    east.line(34, 12, 31, 27, 2, mane);
    if (negro) east.line(33, 14, 29, 30, 2, mane);
    east.set(40, 12, eye);
    if (!negro) {
      east.line(41, 10, 45, 15, 1, blaze);
      east.rect(16, 22, 13, 4, blanket); east.hline(16, 28, 22, blanketL);
      east.rect(18, 20, 9, 2, leather); east.rect(26, 18, 2, 3, leather);
      east.vline(22, 22, 30, leather); east.rect(21, 30, 3, 2, C(0xc0c0c8));
    }
    east.outline(ink);
    return east;
  };
  const east = side();

  const south = new Pixmap(48, 48);
  for (const x of [17, 28]) { south.rect(x, 32, 3, 11, coat); south.rect(x, 42, 3, 2, hoof); }
  south.ellipse(24, 29, 9, 9, coat);
  south.ellipse(24, 31, 6, 6, light);
  south.rect(20, 10, 8, 16, coat);
  south.rect(21, 22, 6, 5, shade);
  south.polygon([[19, 10], [20, 4], [22, 9]], coat); south.polygon([[29, 10], [28, 4], [26, 9]], coat);
  south.rect(22, 7, 4, 4, mane);
  south.set(21, 14, eye); south.set(26, 14, eye);
  if (!negro) {
    south.vline(24, 11, 20, blaze);
    south.rect(15, 24, 18, 3, blanket);
  } else south.rect(19, 9, 2, 12, mane);
  south.outline(ink);

  const north = new Pixmap(48, 48);
  for (const x of [17, 28]) { north.rect(x, 33, 3, 10, shade); north.rect(x, 42, 3, 2, hoof); }
  north.ellipse(24, 28, 10, 10, coat);
  north.rect(20, 9, 8, 14, coat);
  north.polygon([[19, 10], [20, 4], [22, 9]], coat); north.polygon([[29, 10], [28, 4], [26, 9]], coat);
  north.rect(22, 7, 4, 16, mane);
  north.line(24, 36, 24, 45, 3, mane);
  if (!negro) { north.rect(17, 22, 14, 6, blanket); north.rect(19, 20, 10, 4, leather); }
  north.outline(ink);

  const frames = [south, east, north, ...GALLOP.map((g) => side(g))];
  const sheet = new Pixmap(48 * frames.length, 48);
  frames.forEach((f, i) => sheet.blit(f, i * 48, 0));
  return sheet;
}
