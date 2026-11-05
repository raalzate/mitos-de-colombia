import { Pixmap, hexToRgba, type Rgba } from './PixelPainter';

/**
 * Vida del fondo: figuritas dibujadas por código (TC-02) que pasan por detrás de la pelea.
 * Cada tipo es una tira de fotogramas; el ancla de cada fotograma es el centro de su borde de abajo
 * (los pies, la línea del agua o el vientre del pájaro). Todo mira a la derecha: el volteo lo hace el sprite.
 */

export type LifeKind =
  | 'garza' | 'garzaPerch' | 'bird' | 'crow' | 'crowPerch' | 'parrot' | 'toucan' | 'condor' | 'bat' | 'swallow'
  | 'pigeon' | 'owl' | 'duck' | 'fish' | 'caiman' | 'frog' | 'rabbit' | 'butterfly' | 'monkey'
  | 'cattle' | 'rider' | 'deer' | 'bear' | 'dog' | 'cat' | 'mule' | 'canoe' | 'raft'
  | 'ruana' | 'peon' | 'peonFar' | 'mourner' | 'walker' | 'walkerB' | 'walkerC' | 'walkerD' | 'woodcutter' | 'vendor'
  | 'rider13' | 'rider13b' | 'rider13c'
  | 'peeker' | 'bartender' | 'dancers' | 'jukebox' | 'picker' | 'kids' | 'graffiti' | 'kite';

export interface LifeArt {
  w: number;
  h: number;
  /** fotogramas de la tira */
  n: number;
  draw: (pm: Pixmap, f: number) => void;
  /** animación principal (andar, aletear, remar...) */
  go: number[];
  /** quieto (posado, pastando, mirando) */
  idle?: number[];
  /** fotogramas por segundo de la animación principal */
  fps: number;
  /** fotogramas en los que el bicho avanza (saltos de rana o mico); por defecto, todos */
  moveOn?: number[];
}

const C = (hex: number): Rgba => hexToRgba(hex);
/** Píxel que brilla con luz propia (ojos, velas, ventanas): la bruma de la lejanía no lo apaga. */
export const EMISSIVE_ALPHA = 254;
const glowPx = (pm: Pixmap, x: number, y: number, hex: number): void => {
  x |= 0;
  y |= 0;
  if (!pm.inBounds(x, y)) return;
  const [r, g, b] = hexToRgba(hex);
  const i = (y * pm.width + x) * 4;
  pm.data[i] = r;
  pm.data[i + 1] = g;
  pm.data[i + 2] = b;
  pm.data[i + 3] = EMISSIVE_ALPHA;
};
const px = (pm: Pixmap, x: number, y: number, hex: number): void => pm.set(x, y, C(hex));
const rect = (pm: Pixmap, x: number, y: number, w: number, h: number, hex: number): void => pm.rect(x, y, w, h, C(hex));
const ln = (pm: Pixmap, x0: number, y0: number, x1: number, y1: number, hex: number): void => pm.line(x0, y0, x1, y1, 1, C(hex));

/* ------------------------------------------------------------------ */
/* Gente                                                               */
/* ------------------------------------------------------------------ */

interface Body {
  skin: number;
  shirt: number;
  pants: number;
  hair?: number;
  hat?: 'sombrero' | 'cap' | 'scarf' | 'none';
  hatC?: number;
  /** ruana: tapa el torso y los brazos */
  ruana?: number;
  /** falda o vestido hasta la rodilla */
  dress?: number;
  carry?: 'buckets' | 'basket' | 'sack' | 'flowers' | 'wood' | 'none';
  /** cabeza gacha (doliente, cargador) */
  stoop?: boolean;
}

interface Pose {
  /** desplazamiento del pie de adelante y del de atrás respecto a la cadera */
  legA: number;
  legB: number;
  /** mano de adelante y de atrás (desplazamiento x) */
  armA: number;
  armB: number;
  bob: number;
  /** brazo de adelante levantado (0 = caído, 1 = horizontal, 2 = arriba) */
  reach?: number;
}

/** Persona de perfil de unos 16-20 px, mirando a la derecha, con los pies en (cx, base). */
function person(pm: Pixmap, cx: number, base: number, b: Body, pose: Pose, H = 17): void {
  // los de la capa media (21 px o más) van con cabeza y tronco de 4 px y piernas de 2
  const big = H >= 21 ? 1 : 0;
  const k = H / 17;
  const p: Pose = { ...pose, legA: Math.round(pose.legA * k), legB: Math.round(pose.legB * k), armA: Math.round(pose.armA * k), armB: Math.round(pose.armB * k) };
  const headH = 3 + big;
  const legH = Math.round(H * 0.42);
  const top = base - H + p.bob;
  const hip = base - legH + p.bob;
  const sh = top + headH + 1;
  const dark = shadeHex(b.pants, 0.7);
  // piernas: la de atrás más oscura
  ln(pm, cx, hip, cx + p.legB, base - 1, dark);
  if (big) ln(pm, cx + 1, hip, cx + 1 + p.legB, base - 1, dark);
  ln(pm, cx, hip, cx + p.legA, base - 1, b.pants);
  if (big) ln(pm, cx + 1, hip, cx + 1 + p.legA, base - 1, b.pants);
  px(pm, cx + p.legB + 1 + big, base - 1, 0x1a1210);
  px(pm, cx + p.legA + 1 + big, base - 1, 0x1a1210);
  // brazo de atrás
  if (!b.ruana) ln(pm, cx, sh + 1, cx + p.armB, hip, shadeHex(b.shirt, 0.7));
  // torso
  rect(pm, cx - 1, sh, 3 + big, hip - sh + 1, b.shirt);
  if (b.dress) pm.polygon([[cx - 2, hip - 1], [cx + 3 + big, hip - 1], [cx + 4 + big * 2, hip + 4 + big * 2], [cx - 2 - big, hip + 4 + big * 2]], C(b.dress));
  if (b.ruana) {
    pm.polygon([[cx - 1, sh - 1], [cx + 2 + big, sh - 1], [cx + 4 + big * 2, hip + 1], [cx - 3 - big, hip + 1]], C(b.ruana));
    for (let y = sh + 1; y <= hip; y += 2) px(pm, cx, y, shadeHex(b.ruana, 1.3));
  }
  // carga
  switch (b.carry) {
    case 'buckets':
      rect(pm, cx + p.armA - 1, hip + 1, 3, 3, 0x6a6a72);
      rect(pm, cx + p.armB - 1, hip + 1, 3, 3, 0x4a4a52);
      px(pm, cx + p.armA, hip + 1, 0x8ab0d0);
      break;
    case 'basket':
      rect(pm, cx - 4, sh + 1, 3, 4, 0x8a6a3a);
      px(pm, cx - 4, sh + 1, 0xb08a4a);
      px(pm, cx - 3, sh + 3, 0x5a3a1a);
      break;
    case 'sack':
      pm.ellipse(cx - 2, sh, 3, 2, C(0xb0a080));
      break;
    case 'wood':
      ln(pm, cx - 4, sh, cx + 3, sh - 2, 0x6a4a2a);
      ln(pm, cx - 4, sh + 1, cx + 3, sh - 1, 0x5a3a20);
      break;
    case 'flowers':
      px(pm, cx + p.armA + 1, hip - 2, 0xd03040);
      px(pm, cx + p.armA + 2, hip - 3, 0xf0c020);
      px(pm, cx + p.armA + 1, hip - 3, 0x3a7a3a);
      break;
    default:
      break;
  }
  // brazo de adelante
  if (!b.ruana || p.reach) {
    const r = p.reach ?? 0;
    const hx = r === 2 ? cx + 2 : r === 1 ? cx + 4 : cx + p.armA;
    const hy = r === 2 ? sh - 3 : r === 1 ? sh + 1 : hip;
    ln(pm, cx, sh + 1, hx, hy, b.ruana ?? b.shirt);
    px(pm, hx, hy, b.skin);
  }
  // cabeza
  const hx = cx + (b.stoop ? 1 : 0);
  const hy = top + (b.stoop ? 1 : 0);
  rect(pm, hx - 1, hy, 3 + big, headH, b.skin);
  px(pm, hx + 2 + big, hy + 1 + big, b.skin);
  if (big) px(pm, hx + 2, hy + 1, 0x1a1210);
  rect(pm, hx - 1, hy, 3 + big, 1, b.hair ?? 0x1a1210);
  px(pm, hx - 1, hy + 1, b.hair ?? 0x1a1210);
  switch (b.hat) {
    case 'sombrero':
      rect(pm, hx - 3 - big, hy, 7 + big * 2, 1, b.hatC ?? 0xd8ccb0);
      rect(pm, hx - 1, hy - 2, 3 + big, 2, b.hatC ?? 0xd8ccb0);
      px(pm, hx - 1, hy - 1, 0x1a1210);
      px(pm, hx + 1, hy - 1, 0x1a1210);
      break;
    case 'cap':
      rect(pm, hx - 1, hy - 1, 3 + big, 1, b.hatC ?? 0xc02020);
      rect(pm, hx + 1 + big, hy, 2, 1, b.hatC ?? 0xc02020);
      break;
    case 'scarf':
      rect(pm, hx - 2, hy - 1, 4, 2, b.hatC ?? 0x101014);
      rect(pm, hx - 2, hy + 1, 2, 3, b.hatC ?? 0x101014);
      break;
    default:
      break;
  }
}

/** Ciclo de paso en 6 fotogramas: contacto, bajada, paso, contacto contrario... */
const WALK6: Pose[] = [
  { legA: 3, legB: -3, armA: -2, armB: 2, bob: 0 },
  { legA: 2, legB: -1, armA: -1, armB: 1, bob: 1 },
  { legA: 0, legB: 0, armA: 0, armB: 0, bob: 0 },
  { legA: -3, legB: 3, armA: 2, armB: -2, bob: 0 },
  { legA: -1, legB: 2, armA: 1, armB: -1, bob: 1 },
  { legA: 0, legB: 0, armA: 0, armB: 0, bob: 0 },
];
const STAND: Pose = { legA: 1, legB: -1, armA: 0, armB: 0, bob: 0 };

function walker(b: Body, H = 17, fps = 8): LifeArt {
  return {
    w: H + 2, h: H + 4, n: 6, fps, go: [0, 1, 2, 3, 4, 5],
    draw: (pm, f) => person(pm, Math.floor(H / 2) - 1, pm.height, b, WALK6[f], H),
  };
}

/** Figurita lejana (8-9 px): cabeza, cuerpo y dos piernas que se cruzan. */
function tinyPerson(pm: Pixmap, cx: number, base: number, f: number, body: number, head: number, hat: number | null, load: number | null): void {
  const legs = [[-1, 1], [0, 0], [1, -1], [0, 0]][f % 4];
  const bob = f % 2 === 1 ? 0 : 0;
  px(pm, cx + legs[0], base - 1, 0x141014);
  px(pm, cx + legs[1], base - 1, 0x141014);
  px(pm, cx, base - 2, 0x241c20);
  rect(pm, cx - 1, base - 6 + bob, 2, 4, body);
  px(pm, cx, base - 7 + bob, head);
  px(pm, cx - 1, base - 7 + bob, head);
  if (hat !== null) rect(pm, cx - 2, base - 8 + bob, 4, 1, hat);
  if (load !== null) {
    px(pm, cx - 2, base - 3, load);
    px(pm, cx + 1, base - 3, load);
  }
}

/* ------------------------------------------------------------------ */
/* Pájaros                                                             */
/* ------------------------------------------------------------------ */

/** Pájaro visto de lejos: dos alas en "m" que suben y bajan. */
function flapper(w: number, body: number, wing: number, fps: number, extra?: (pm: Pixmap, f: number) => void): LifeArt {
  const h = 6;
  const tips = [0, 2, 5, 3];
  return {
    w, h, n: 4, fps, go: [0, 1, 2, 3],
    draw: (pm, f) => {
      const cx = Math.floor(w / 2);
      const cy = 3;
      const ty = tips[f];
      const half = Math.floor(w / 2);
      const jy = Math.round((cy + ty) / 2) - (f === 2 ? 0 : 1);
      ln(pm, cx, cy, cx - Math.ceil(half / 2), jy, wing);
      ln(pm, cx - Math.ceil(half / 2), jy, cx - half, ty, wing);
      ln(pm, cx, cy, cx + Math.ceil(half / 2), jy, wing);
      ln(pm, cx + Math.ceil(half / 2), jy, cx + half, ty, wing);
      px(pm, cx, cy, body);
      px(pm, cx + 1, cy, body);
      extra?.(pm, f);
    },
  };
}

/** Garza blanca de perfil, cuello recogido, patas largas atrás y aleteo lento. */
const GARZA: LifeArt = {
  w: 15, h: 9, n: 4, fps: 5, go: [0, 1, 2, 3],
  draw: (pm, f) => {
    const white = 0xe8ece8;
    const shade = 0xb0b8b8;
    ln(pm, 0, 5, 4, 5, 0x2a2420); // patas
    rect(pm, 4, 4, 6, 2, white);
    rect(pm, 9, 3, 2, 2, white); // cuello recogido
    rect(pm, 11, 3, 1, 1, white);
    px(pm, 12, 3, 0xe0b030);
    px(pm, 13, 3, 0xe0b030);
    const tip = [0, 2, 8, 5][f];
    pm.polygon([[5, 4], [9, 4], [6 + (f === 2 ? 1 : 0), tip]], C(f === 2 ? shade : white));
    ln(pm, 7, 4, 5, tip, shade);
  },
};

/** Garza parada en el agua: mira, estira el cuello y pica. */
const GARZA_PERCH: LifeArt = {
  w: 9, h: 15, n: 4, fps: 2, go: [0, 1, 0, 2, 3, 0], idle: [0, 1, 0, 2, 3, 0],
  draw: (pm, f) => {
    const white = 0xe8ece8;
    ln(pm, 3, 14, 3, 9, 0x2a2420);
    ln(pm, 5, 14, 4, 9, 0x2a2420);
    pm.ellipse(4, 7, 3, 2, C(white));
    px(pm, 1, 8, 0xb0b8b8);
    const neck = ([[5, 2], [6, 0], [5, 4], [7, 9]] as [number, number][])[f];
    ln(pm, 5, 6, neck[0], neck[1] + 1, white);
    px(pm, neck[0], neck[1], white);
    px(pm, neck[0] + 1, neck[1], 0xe0b030);
    px(pm, neck[0] + 2, neck[1] + (f === 3 ? 1 : 0), 0xe0b030);
  },
};

const CONDOR: LifeArt = {
  w: 21, h: 7, n: 4, fps: 2, go: [0, 1, 2, 1],
  draw: (pm, f) => {
    const blk = 0x14141a;
    const lift = [0, 1, 2][f % 3];
    const cx = 10;
    ln(pm, cx, 4, 3, 3 - lift + 1, blk);
    ln(pm, cx, 4, 17, 3 - lift + 1, blk);
    ln(pm, cx, 5, 4, 4 - lift + 1, blk);
    ln(pm, cx, 5, 16, 4 - lift + 1, blk);
    // plumas de la punta abiertas como dedos
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) px(pm, cx + s * (8 + k), 2 - lift + (k % 2) + 1, blk);
    rect(pm, cx - 1, 4, 3, 2, blk);
    px(pm, cx + 2, 4, 0xe8e8e0); // collar blanco
    px(pm, cx + 3, 4, 0x8a5050);
    for (const s of [-1, 1]) px(pm, cx + s * 5, 4 - Math.round(lift / 2) + 1, 0xc8c8c8);
  },
};

const BAT: LifeArt = {
  w: 9, h: 5, n: 4, fps: 14, go: [0, 1, 2, 1],
  draw: (pm, f) => {
    const c = 0x0c0a10;
    rect(pm, 4, 2, 2, 2, c);
    px(pm, 4, 1, c);
    px(pm, 5, 1, c);
    const tip = [0, 2, 4][f % 3];
    ln(pm, 4, 2, 0, tip, c);
    ln(pm, 5, 2, 8, tip, c);
    px(pm, 2, Math.min(4, tip + 1), c);
    px(pm, 6, Math.min(4, tip + 1), c);
  },
};

/** Cuervo/golero posado (0-2) y su vuelo (3-6) en la misma tira. */
const CROW_PERCH: LifeArt = {
  w: 9, h: 7, n: 7, fps: 3, go: [3, 4, 5, 6], idle: [0, 0, 1, 0, 2, 0],
  draw: (pm, f) => {
    const blk = 0x101014;
    if (f < 3) {
      pm.ellipse(4, 4, 2.5, 1.6, C(blk));
      rect(pm, 1, 4, 2, 1, blk); // cola
      const hx = f === 1 ? 4 : 6;
      rect(pm, hx, 1, 2, 2, blk);
      px(pm, f === 1 ? hx - 1 : hx + 2, 2, 0x3a3a40);
      if (f === 2) px(pm, hx + 2, 1, 0x3a3a40);
      px(pm, 3, 6, 0x3a3030);
      px(pm, 5, 6, 0x3a3030);
      return;
    }
    flapper(9, blk, blk, 10).draw(pm, f - 3);
  },
};

/** Paloma de la plaza: pica el suelo (0-2) y sale volando (3-6). */
const PIGEON: LifeArt = {
  w: 9, h: 6, n: 7, fps: 10, go: [3, 4, 5, 6], idle: [0, 1, 0, 2, 0, 0],
  draw: (pm, f) => {
    const grey = 0x8a8a98;
    if (f < 3) {
      pm.ellipse(4, 4, 2.5, 1.5, C(grey));
      px(pm, 2, 3, 0x6a6a78);
      px(pm, 1, 4, 0x5a5a68);
      const head: [number, number] = f === 1 ? [7, 4] : f === 2 ? [6, 1] : [6, 2];
      rect(pm, head[0], head[1], 2, 2, 0x7a7a8a);
      px(pm, head[0], head[1] + 1, 0x4a8a7a);
      px(pm, head[0] + 2, head[1] + 1, 0xc0a080);
      px(pm, 4, 5, 0xc06060);
      return;
    }
    flapper(9, grey, 0xa0a0b0, 12).draw(pm, f - 3);
  },
};

const OWL: LifeArt = {
  w: 7, h: 9, n: 3, fps: 2, go: [0], idle: [0, 0, 0, 1, 0, 2, 2, 0],
  draw: (pm, f) => {
    const brown = 0x6a5038;
    pm.ellipse(3.5, 5.5, 2.5, 3, C(brown));
    rect(pm, 1, 1, 5, 4, 0x8a6a48);
    px(pm, 1, 0, brown);
    px(pm, 5, 0, brown);
    if (f === 1) {
      rect(pm, 2, 2, 1, 1, brown);
      rect(pm, 4, 2, 1, 1, brown);
    } else {
      const d = f === 2 ? -1 : 0;
      glowPx(pm, 2 + d, 2, 0xf0c030);
      glowPx(pm, 4 + d, 2, 0xf0c030);
    }
    px(pm, 3, 3, 0xd0a040);
    for (let y = 5; y < 8; y++) px(pm, 3 + (y % 2), y, 0xa88a60);
    px(pm, 2, 8, 0x3a2a20);
    px(pm, 4, 8, 0x3a2a20);
  },
};

const DUCK: LifeArt = {
  w: 9, h: 6, n: 2, fps: 2, go: [0, 1],
  draw: (pm, f) => {
    const y = 4 + f * 0;
    pm.ellipse(4, y, 3, 1.5, C(0x6a5a40));
    px(pm, 1, y - 1, 0x4a3a2a);
    rect(pm, 6, y - 3 + f, 2, 2, 0x2a5a3a);
    px(pm, 8, y - 2 + f, 0xd0a030);
    px(pm, 5, y - 1, 0xd8d0c0);
    for (let x = 1; x < 8; x += 2) px(pm, x + f, 5, 0x8aa0b0);
  },
};

/* ------------------------------------------------------------------ */
/* Agua                                                                */
/* ------------------------------------------------------------------ */

/** Bocachico que salta: aro, sale, arco, cae, salpica. */
const FISH: LifeArt = {
  w: 13, h: 14, n: 7, fps: 12, go: [0, 1, 2, 3, 4, 5, 6],
  draw: (pm, f) => {
    const silver = 0xb8c4c8;
    const foam = 0xd8e4ec;
    const fish = (x: number, y: number, tilt: number) => {
      ln(pm, x - 2, y + tilt, x + 2, y - tilt, silver);
      px(pm, x - 3, y + tilt - 1, silver);
      px(pm, x - 3, y + tilt + 1, silver);
      px(pm, x + 1, y - tilt, 0x2a3a40);
    };
    if (f === 0 || f === 6) {
      pm.hline(3, 9, 13, C(foam));
      px(pm, 6, 12, foam);
      return;
    }
    if (f === 1) { fish(5, 10, 1); pm.hline(3, 7, 13, C(foam)); px(pm, 4, 11, foam); }
    if (f === 2) fish(6, 5, 1);
    if (f === 3) fish(7, 3, 0);
    if (f === 4) fish(8, 6, -1);
    if (f === 5) { fish(9, 11, -1); pm.hline(6, 12, 13, C(foam)); px(pm, 8, 12, foam); px(pm, 11, 11, foam); }
  },
};

/** Ojos del caimán que asoman y se hunden. */
const CAIMAN: LifeArt = {
  w: 17, h: 6, n: 7, fps: 3, go: [0, 1, 2, 3, 2, 3, 4, 5, 6],
  draw: (pm, f) => {
    const back = 0x2a3a24;
    const rip = 0x5a7a60;
    const up = [0, 1, 2, 2, 2, 1, 0][f];
    if (f === 0 || f === 6) {
      pm.hline(2, 14, 5, C(rip));
      return;
    }
    pm.hline(1, 15, 5, C(rip));
    if (up >= 1) {
      rect(pm, 3, 5 - up, 3, up, back);
      rect(pm, 11, 5 - up, 3, up, back);
      rect(pm, 6, 4, 5, 1, back);
    }
    if (up === 2 && f !== 3) {
      glowPx(pm, 4, 3, 0xe0c030);
      glowPx(pm, 12, 3, 0xe0c030);
    }
    if (f === 3) {
      px(pm, 4, 3, 0x1a2414);
      px(pm, 12, 3, 0x1a2414);
    }
  },
};

const CANOE: LifeArt = {
  w: 26, h: 13, n: 4, fps: 3, go: [0, 1, 2, 3],
  draw: (pm, f) => {
    const hull = 0x3a2416;
    pm.polygon([[1, 9], [25, 9], [22, 12], [4, 12]], C(hull));
    pm.hline(1, 25, 9, C(0x5a3a22));
    pm.hline(4, 22, 12, C(0x6a8090));
    // pescador sentado con sombrero
    const cx = 13;
    rect(pm, cx - 1, 5, 3, 4, 0xc8c0a8);
    rect(pm, cx - 1, 2, 3, 3, 0x8a5a3a);
    rect(pm, cx - 3, 2, 7, 1, 0xd8ccb0);
    rect(pm, cx - 1, 0, 3, 2, 0xd8ccb0);
    // canalete: atrás, entra al agua, empuja, sale
    const paddle: [number, number, number, number][] = [[cx + 4, 3, cx + 7, 12], [cx + 2, 4, cx + 2, 12], [cx, 4, cx - 4, 12], [cx + 2, 3, cx + 5, 9]];
    const [x0, y0, x1, y1] = paddle[f];
    ln(pm, x0, y0, x1, y1, 0x8a6a40);
    ln(pm, cx, 6, x0, y0, 0xc8c0a8);
    if (f === 1 || f === 2) px(pm, x1 + (f === 2 ? -1 : 1), 12, 0xd8e4ec);
    // red enrollada en la proa
    rect(pm, 20, 8, 3, 1, 0x8a8a78);
  },
};

/** Balsa de guadua con el balsero empujando con la vara. */
const RAFT: LifeArt = {
  w: 24, h: 18, n: 4, fps: 2, go: [0, 1, 2, 3],
  draw: (pm, f) => {
    for (let x = 1; x < 23; x += 2) rect(pm, x, 15, 2, 2, x % 4 === 1 ? 0x8a7a40 : 0x6a5a30);
    pm.hline(0, 23, 17, C(0xd8e4ec));
    const lean = [0, 1, 2, 1][f];
    const cx = 12;
    person(pm, cx, 15, { skin: 0x8a5a3a, shirt: 0xd0c8b0, pants: 0x3a3a48, hat: 'sombrero' }, { legA: 2, legB: -2, armA: 3, armB: 2, bob: 0, reach: 1 }, 14);
    ln(pm, cx + 2 + lean, 2, cx - 4 + lean * 2, 17, 0x8a6a40);
  },
};

/* ------------------------------------------------------------------ */
/* Bichos de tierra                                                    */
/* ------------------------------------------------------------------ */

const FROG: LifeArt = {
  w: 9, h: 8, n: 4, fps: 6, go: [0, 0, 0, 1, 2, 3], moveOn: [2, 3],
  draw: (pm, f) => {
    const g = 0x4a7a30;
    const dy = [0, 0, -3, -1][f];
    const by = 7 + dy;
    if (f === 1) {
      pm.ellipse(4, by - 1, 2.5, 1.2, C(g));
    } else if (f === 2) {
      ln(pm, 1, by + 1, 6, by - 2, g);
      ln(pm, 2, by + 1, 7, by - 2, g);
      px(pm, 0, by + 2, g);
    } else {
      pm.ellipse(4, by - 1.5, 2.5, 1.5, C(g));
      px(pm, 1, by, g);
      px(pm, 7, by, g);
    }
    glowPx(pm, f === 2 ? 6 : 5, by - (f === 2 ? 3 : 3), 0xd8d040);
  },
};

const RABBIT: LifeArt = {
  w: 9, h: 9, n: 4, fps: 7, go: [0, 0, 1, 2, 3], idle: [0, 0, 0, 0], moveOn: [2, 3],
  draw: (pm, f) => {
    const c = 0x8a7a68;
    const dy = [0, 0, -2, -1][f];
    const by = 8 + dy;
    pm.ellipse(3.5, by - 2, 2.5, 2, C(c));
    rect(pm, 5, by - 4, 2, 2, c);
    px(pm, 5, by - 6, c);
    px(pm, 5, by - 5, c);
    px(pm, f === 1 ? 6 : 4, by - 6, 0x6a5a4a);
    px(pm, 1, by - 3, 0xd8d0c8);
    if (f === 2) ln(pm, 1, by - 1, 0, by + 1, c);
    else px(pm, 3, by, c);
    px(pm, 6, by - 3, 0x101010);
  },
};

const BUTTERFLY: LifeArt = {
  w: 5, h: 4, n: 2, fps: 10, go: [0, 1],
  draw: (pm, f) => {
    const blue = 0x40a0e8;
    if (f === 0) {
      rect(pm, 0, 0, 2, 2, blue);
      rect(pm, 3, 0, 2, 2, blue);
      px(pm, 1, 2, 0x2a70b0);
      px(pm, 3, 2, 0x2a70b0);
    } else {
      rect(pm, 1, 0, 1, 2, 0x2a70b0);
      rect(pm, 3, 0, 1, 2, 0x2a70b0);
    }
    pm.vline(2, 0, 3, C(0x101010));
  },
};

/** Mico colgado de un bejuco que se mece (vaivén de 5 posiciones). */
const MONKEY: LifeArt = {
  w: 23, h: 24, n: 5, fps: 4, go: [0, 1, 2, 3, 4, 3, 2, 1],
  draw: (pm, f) => {
    const vine = 0x2a4a20;
    const fur = 0x4a3020;
    const ang = (-30 + f * 15) * (Math.PI / 180);
    const len = 16;
    const ex = 11 + Math.sin(ang) * len;
    const ey = 0 + Math.cos(ang) * len;
    ln(pm, 11, 0, ex, ey, vine);
    // brazo, cuerpo, cola enroscada
    const bx = ex + Math.sin(ang) * 3;
    const by = ey + Math.cos(ang) * 3;
    ln(pm, ex, ey, bx, by, fur);
    pm.ellipse(bx, by + 2, 2, 2.5, C(fur));
    rect(pm, Math.round(bx) - 1, Math.round(by) - 2, 3, 2, 0x5a3a26);
    px(pm, Math.round(bx) + 1, Math.round(by) - 1, 0xc0906a);
    ln(pm, bx - 1, by + 4, bx - 4, by + 6, fur);
    px(pm, bx - 5, by + 5, fur);
    ln(pm, bx, by + 4, bx + 1, by + 6, fur);
  },
};

/** Ganado cebú caminando (sabana): cuerpo claro con giba. */
const CATTLE: LifeArt = {
  w: 14, h: 9, n: 6, fps: 4, go: [0, 1, 2, 3], idle: [4, 4, 5, 4],
  draw: (pm, f) => {
    const body = f % 2 === 0 && f < 4 ? 0xb8b0a0 : 0xb8b0a0;
    const dark = 0x6a6258;
    rect(pm, 3, 2, 8, 4, body);
    rect(pm, 8, 1, 2, 1, body); // giba
    const graze = f >= 4;
    const hy = graze ? 5 : 2;
    rect(pm, 11, hy, 2, 3, body);
    px(pm, 13, hy + 2, dark);
    px(pm, 11, hy - 1, 0xe0d8c8);
    px(pm, 2, 3, dark);
    const legs = graze ? [0, 0, 0, 0] : [[1, -1, -1, 1], [0, 0, 0, 0], [-1, 1, 1, -1], [0, 0, 0, 0]][f];
    const at = [4, 5, 9, 10];
    at.forEach((x, i) => pm.vline(x + legs[i], 6, 8, C(i % 2 ? dark : 0x8a8278)));
  },
};

/** Jinete llanero a caballo, de lejos. */
const RIDER: LifeArt = {
  w: 14, h: 13, n: 4, fps: 8, go: [0, 1, 2, 3],
  draw: (pm, f) => {
    const horse = 0x3a2418;
    const bob = f % 2;
    rect(pm, 3, 6 + bob, 8, 3, horse);
    rect(pm, 10, 4 + bob, 2, 3, horse);
    px(pm, 12, 4 + bob, horse);
    px(pm, 2, 7 + bob, 0x1a100a);
    const legs = [[2, -1, 1, -2], [0, 1, -1, 0], [-2, 1, -1, 2], [0, -1, 1, 0]][f];
    [3, 4, 9, 10].forEach((x, i) => ln(pm, x, 9 + bob, x + legs[i], 12, horse));
    // jinete con sombrero y su soga
    rect(pm, 6, 2 + bob, 2, 4, 0xc8c0a8);
    px(pm, 7, 1 + bob, 0x8a5a3a);
    rect(pm, 5, 0 + bob, 4, 1, 0x2a2018);
    px(pm, 8, 4 + bob, 0x8a5a3a);
  },
};

const DEER: LifeArt = {
  w: 12, h: 11, n: 6, fps: 6, go: [0, 1, 2, 3], idle: [4, 4, 5, 4, 4, 0],
  draw: (pm, f) => {
    const c = 0x8a6a48;
    const graze = f >= 4;
    rect(pm, 3, 4, 6, 3, c);
    px(pm, 3, 4, 0xe8e0d0); // cola blanca
    const hx = graze ? 9 : 9;
    const hy = graze ? 7 : 1;
    ln(pm, 8, 4, hx, hy + 1, c);
    rect(pm, hx, hy, 2, 2, c);
    px(pm, hx + 2, hy + 1, 0x2a2018);
    if (f === 5) px(pm, hx, hy - 1, c);
    else { px(pm, hx, hy - 1, 0x6a5038); px(pm, hx - 1, hy - 2, 0x6a5038); }
    const legs = graze ? [0, 0, 0, 0] : [[1, -1, -1, 1], [0, 0, 0, 0], [-1, 1, 1, -1], [0, 0, 0, 0]][f];
    [3, 4, 7, 8].forEach((x, i) => ln(pm, x, 7, x + legs[i], 10, i % 2 ? 0x5a4430 : c));
  },
};

/** Oso de anteojos andando en cuatro patas. */
const BEAR: LifeArt = {
  w: 16, h: 10, n: 4, fps: 4, go: [0, 1, 2, 3],
  draw: (pm, f) => {
    const c = 0x1a1612;
    const bob = f % 2;
    pm.ellipse(7, 4.5 + bob, 5, 3, C(c));
    rect(pm, 11, 3 + bob, 3, 3, c);
    px(pm, 14, 5 + bob, 0x3a3028);
    px(pm, 11, 2 + bob, c);
    px(pm, 12, 4 + bob, 0xc8b890); // anteojos
    px(pm, 13, 4 + bob, 0xc8b890);
    const legs = [[1, -1, -1, 1], [0, 0, 0, 0], [-1, 1, 1, -1], [0, 0, 0, 0]][f];
    [3, 4, 9, 10].forEach((x, i) => ln(pm, x, 7, x + legs[i], 9, c));
  },
};

/** Perro criollo que cruza la calle; olfatea (4-5). */
const DOG: LifeArt = {
  w: 12, h: 8, n: 6, fps: 10, go: [0, 1, 2, 3], idle: [4, 5, 4, 5, 4, 4],
  draw: (pm, f) => {
    const c = 0x8a6038;
    const sniff = f >= 4;
    rect(pm, 2, 3, 7, 2, c);
    const hy = sniff ? 4 + (f - 4) : 1;
    rect(pm, 8, hy, 2, 2, c);
    px(pm, 10, hy + 1, 0x2a1a10);
    px(pm, 8, hy - 1, 0x5a3a20);
    ln(pm, 2, 3, 0, sniff ? 1 : 2, c); // cola
    const legs = sniff ? [0, 0, 0, 0] : [[1, -1, -1, 1], [0, 0, 0, 0], [-1, 1, 1, -1], [0, 0, 0, 0]][f];
    [2, 3, 7, 8].forEach((x, i) => ln(pm, x, 5, x + legs[i], 7, i % 2 ? 0x5a3a20 : c));
  },
};

/** Gato del tejado: sentado meneando la cola (0-2) y corriendo (3-6). */
const CAT: LifeArt = {
  w: 10, h: 8, n: 7, fps: 12, go: [3, 4, 5, 6], idle: [0, 0, 1, 2, 1, 0],
  draw: (pm, f) => {
    const c = 0x14121a;
    if (f < 3) {
      pm.ellipse(4, 5, 2, 2.5, C(c));
      rect(pm, 4, 1, 3, 2, c);
      px(pm, 4, 0, c);
      px(pm, 6, 0, c);
      glowPx(pm, 6, 2, 0xc0e040);
      const tail = [[1, 7, 0, 4], [1, 7, 0, 5], [1, 7, 1, 3]][f];
      ln(pm, tail[0], tail[1], tail[2], tail[3], c);
      return;
    }
    const k = f - 3;
    rect(pm, 2, 3, 6, 2, c);
    rect(pm, 7, 2, 2, 2, c);
    px(pm, 8, 1, c);
    glowPx(pm, 8, 2, 0xc0e040);
    ln(pm, 2, 3, 0, 1 + (k % 2), c);
    const legs = [[2, -2, -2, 2], [0, 0, 0, 0], [-1, 2, 2, -1], [1, 0, 0, 1]][k];
    [2, 3, 6, 7].forEach((x, i) => ln(pm, x, 5, x + legs[i], 7, c));
  },
};

/** Mula con bultos de café y el arriero que la jala del cabestro. */
const MULE: LifeArt = {
  w: 32, h: 26, n: 4, fps: 6, go: [0, 1, 2, 3],
  draw: (pm, f) => {
    const c = 0x4a3a30;
    const bob = f % 2;
    const o = 4; // la mula va un poco más abajo que el arriero, que es más alto
    rect(pm, 3, 9 + o + bob, 12, 5, c);
    ln(pm, 14, 9 + o + bob, 16, 5 + o + bob, c);
    ln(pm, 15, 9 + o + bob, 17, 5 + o + bob, c);
    rect(pm, 16, 4 + o + bob, 4, 3, c);
    px(pm, 20, 6 + o + bob, 0x2a201a);
    px(pm, 16, 3 + o + bob, c);
    px(pm, 17, 2 + o + bob, c);
    ln(pm, 3, 10 + o + bob, 1, 14 + o + bob, 0x2a201a);
    // bultos de café con su costal
    rect(pm, 4, 5 + o + bob, 5, 5, 0xb0a078);
    rect(pm, 9, 5 + o + bob, 5, 5, 0xa09068);
    px(pm, 6, 7 + o + bob, 0x6a5a40);
    px(pm, 11, 7 + o + bob, 0x6a5a40);
    pm.hline(4, 13, 10 + o + bob, C(0x6a5040));
    const legs = [[2, -1, 1, -2], [0, 1, -1, 0], [-2, 1, -1, 2], [0, -1, 1, 0]][f];
    [4, 6, 12, 14].forEach((x, i) => ln(pm, x, 14 + o + bob, x + legs[i], 25, i % 2 ? 0x2a201a : c));
    // arriero adelante, jalando el cabestro
    person(pm, 26, 26, { skin: 0x8a5a3a, shirt: 0xe8e0d0, pants: 0x3a3440, hat: 'sombrero', carry: 'none' }, { ...WALK6[[0, 2, 3, 5][f]], armB: -3 }, 22);
    ln(pm, 19, 7 + o + bob, 23, 14, 0x6a5040);
  },
};

/* ------------------------------------------------------------------ */
/* Gente que se queda en su sitio                                      */
/* ------------------------------------------------------------------ */

/** Ventana del pueblo: se enciende la vela, alguien se asoma, mira a lado y lado, y se apaga. */
const PEEKER: LifeArt = {
  w: 8, h: 10, n: 6, fps: 3, go: [0, 1, 2, 3, 3, 4, 4, 3, 5, 5, 3, 2, 1, 0],
  draw: (pm, f) => {
    if (f === 0) { rect(pm, 0, 0, 8, 10, 0x1a1420); return; }
    if (f === 1) {
      rect(pm, 0, 0, 8, 10, 0x1a1420);
      for (let y = 0; y < 10; y++) glowPx(pm, 3 + (y % 2), y, 0xa07030);
    } else {
      for (let y = 0; y < 10; y++) for (let x = 0; x < 8; x++) glowPx(pm, x, y, y < 3 ? 0xffd890 : 0xf0b860);
      if (f >= 3) {
        const dx = f === 4 ? -1 : f === 5 ? 1 : 0;
        // silueta de cabeza y hombros a contraluz
        rect(pm, 2 + dx, 2, 4, 4, 0x2a1a18);
        rect(pm, 1, 6, 6, 4, 0x2a1a18);
        px(pm, f === 5 ? 6 : f === 4 ? 1 : 4, 3, 0x6a4030);
      }
      glowPx(pm, 6, 7, 0xffffd0);
    }
    // reja del balcón por delante
    for (const x of [2, 5]) pm.vline(x, 2, 9, C(0x2a2030));
  },
};

/** Cantinero detrás del mostrador secando un vaso. */
const BARTENDER: LifeArt = {
  w: 20, h: 30, n: 4, fps: 4, go: [0, 1, 2, 3, 2, 1],
  draw: (pm, f) => {
    const skin = 0xb07a50;
    const shirt = 0xe0d8c8;
    rect(pm, 6, 11, 8, 19, shirt);
    rect(pm, 6, 16, 8, 14, 0x2a1a14); // chaleco
    rect(pm, 9, 11, 2, 2, 0x8a1c1c); // corbatín
    rect(pm, 7, 3, 6, 7, skin);
    rect(pm, 7, 3, 6, 2, 0x1a1210);
    px(pm, 7, 5, 0x1a1210);
    rect(pm, 9, 8, 4, 1, 0x2a1a14); // bigote
    px(pm, 11, 6, 0x1a1210);
    px(pm, 13, 6, skin);
    // manos con el trapo y el vaso, en círculos
    const hand: [number, number][] = [[14, 19], [15, 16], [14, 15], [13, 17]];
    const [hx, hy] = hand[f];
    pm.line(12, 12, hx, hy, 2, C(shirt));
    pm.line(7, 12, hx - 3, hy + 1, 2, C(shirt));
    rect(pm, hx - 2, hy - 3, 3, 4, 0xc8d8e0); // vaso
    rect(pm, hx - 4, hy, 3, 3, 0xe8e0c0); // trapo
    px(pm, hx, hy - 3, 0xffffff);
  },
};

/** Pareja bailando cumbia: vaivén y vuelta. */
const DANCERS: LifeArt = {
  w: 26, h: 27, n: 4, fps: 5, go: [0, 1, 2, 1, 0, 3],
  draw: (pm, f) => {
    const him: Body = { skin: 0x9a6a44, shirt: 0xe8e0d0, pants: 0x2a2a34, hat: 'sombrero' };
    const her: Body = { skin: 0xb07a50, shirt: 0xd03040, pants: 0xb07a50, dress: 0xd03040, hair: 0x101010 };
    const sway = [0, 1, 0, -1][f];
    person(pm, 8 + sway, 27, him, { legA: 2 + sway, legB: -1, armA: 3, armB: -1, bob: f % 2, reach: 1 }, 24);
    if (f === 3) {
      // vuelta: ella de frente con la falda abierta
      pm.polygon([[12, 18], [19, 18], [22, 24], [9, 24]], C(0xd03040));
      rect(pm, 14, 8, 4, 10, 0xd03040);
      rect(pm, 14, 4, 4, 4, 0xb07a50);
      rect(pm, 14, 4, 4, 1, 0x101010);
      ln(pm, 15, 9, 12, 3, 0xb07a50);
      ln(pm, 14, 24, 14, 26, 0xb07a50);
      ln(pm, 17, 24, 17, 26, 0xb07a50);
      return;
    }
    const pm2 = new Pixmap(26, 27);
    person(pm2, 8 - sway, 27, her, { legA: 1, legB: -2 - sway, armA: 2, armB: 0, bob: (f + 1) % 2, reach: 1 }, 22);
    pm.blit(pm2, -2, 0, true);
  },
};

/** Cliente frente a la rockola: escoge la canción y se mece. */
const JUKEBOX_FAN: LifeArt = {
  w: 16, h: 27, n: 4, fps: 3, go: [0, 0, 1, 1, 0, 2, 3, 2, 3, 2, 3],
  draw: (pm, f) => {
    const b: Body = { skin: 0x9a6a44, shirt: 0x3a5a8a, pants: 0x2a2420, hat: 'cap', hatC: 0x1a1a1a };
    const sway = f === 2 ? -1 : f === 3 ? 1 : 0;
    person(pm, 7 + sway, 27, b, { ...STAND, armA: f === 0 ? 1 : 0, reach: f === 1 ? 1 : 0, bob: 0 }, 24);
  },
};

/** Recolector de café: cesta a la cintura, la mano sube a la rama y baja. */
const PICKER: LifeArt = {
  w: 18, h: 27, n: 4, fps: 3, go: [0, 1, 2, 1, 0, 0, 3, 0],
  draw: (pm, f) => {
    const b: Body = { skin: 0x8a5a3a, shirt: 0xc8b8a0, pants: 0x3a3440, hat: 'sombrero', carry: 'basket' };
    person(pm, 7, 27, b, { ...STAND, reach: f === 1 ? 1 : f === 2 ? 2 : 0, bob: f === 3 ? 1 : 0 }, 23);
    if (f === 2) px(pm, 10, 4, 0xc02020); // grano rojo en la mano
    if (f === 3) px(pm, 4, 9, 0xc02020); // a la coca
  },
};

/** Dos pelados jugando fútbol con un balón que va y viene. */
const KIDS: LifeArt = {
  w: 34, h: 20, n: 4, fps: 5, go: [0, 1, 2, 3],
  draw: (pm, f) => {
    const a: Body = { skin: 0x8a5a3a, shirt: 0xf0d030, pants: 0x2040a0 };
    const b: Body = { skin: 0x6a4028, shirt: 0xd02020, pants: 0x2a2a2a, hat: 'cap', hatC: 0x2040a0 };
    const kickA = f === 0;
    const kickB = f === 2;
    person(pm, 6, 20, a, kickA ? { legA: 4, legB: -1, armA: -2, armB: 2, bob: 0 } : { ...STAND, bob: f % 2 }, 16);
    const pm2 = new Pixmap(34, 20);
    person(pm2, 6, 20, b, kickB ? { legA: 4, legB: -1, armA: -2, armB: 2, bob: 0 } : { ...STAND, bob: (f + 1) % 2 }, 16);
    pm.blit(pm2, 0, 0, true);
    const ball: [number, number][] = [[12, 18], [16, 12], [20, 18], [16, 13]];
    const [bx, by] = ball[f];
    rect(pm, bx, by, 2, 2, 0xf0f0f0);
    px(pm, bx, by, 0x202020);
  },
};

/** Grafitero pintando con aerosol: el brazo va y viene y deja una nube de color. */
const GRAFFITI: LifeArt = {
  w: 20, h: 27, n: 4, fps: 4, go: [0, 1, 2, 3, 2, 1],
  draw: (pm, f) => {
    const b: Body = { skin: 0x7a4a2a, shirt: 0x2a2a30, pants: 0x3a4a6a, hat: 'cap', hatC: 0xf06020 };
    person(pm, 7, 27, b, { ...STAND, reach: f === 3 ? 2 : 1 }, 24);
    const tip: [number, number] = f === 3 ? [10, 3] : [12, 8 + (f % 2)];
    rect(pm, tip[0], tip[1], 1, 2, 0xd0d0d0);
    const colors = [0x40e0d0, 0xf040a0, 0xf0d040, 0x60f060];
    for (let k = 0; k < 4; k++) glowPx(pm, tip[0] + 2 + (k % 2) + (f % 2), tip[1] - 1 + k, colors[(k + f) % 4]);
  },
};

/** Cometa de papel con la cola meciéndose; el hilo baja hacia la loma. */
const KITE: LifeArt = {
  w: 11, h: 20, n: 3, fps: 3, go: [0, 1, 2, 1],
  draw: (pm, f) => {
    const sky = [0xe04040, 0xf0d040, 0x4080e0];
    pm.polygon([[5, 0], [9, 4], [5, 9], [1, 4]], C(sky[0]));
    pm.polygon([[5, 0], [9, 4], [5, 4]], C(sky[1]));
    pm.polygon([[1, 4], [5, 4], [5, 9]], C(sky[2]));
    pm.vline(5, 0, 9, C(0x3a2a20));
    pm.hline(1, 9, 4, C(0x3a2a20));
    for (let k = 0; k < 9; k++) {
      const x = 5 + Math.round(Math.sin(k * 0.8 + f * 1.4) * 1.5);
      px(pm, x, 10 + k, k % 3 === 0 ? 0xf0f0f0 : 0xe04040);
    }
    // hilo
    for (let k = 0; k < 6; k++) px(pm, 4 - k, 6 + k * 2, 0xc8c0b0);
  },
};

/** Pasajero de la escalera eléctrica: quieto, mirando el barrio, se mece un poquito. */
function rider13(b: Body): LifeArt {
  return {
    w: 10, h: 20, n: 2, fps: 1, go: [0, 1],
    draw: (pm, f) => person(pm, 4, 20, b, { ...STAND, bob: f }, 16),
  };
}

/** Vendedor ambulante empujando el carrito con sombrilla de colores. */
const VENDOR: LifeArt = {
  w: 36, h: 28, n: 6, fps: 8, go: [0, 1, 2, 3, 4, 5],
  draw: (pm, f) => {
    person(pm, 7, 28, { skin: 0x8a5a3a, shirt: 0xe0e0e0, pants: 0x2a2a34, hat: 'cap', hatC: 0xe0e0e0 }, { ...WALK6[f], armA: 5, armB: 5 }, 23);
    // carrito
    rect(pm, 16, 16, 18, 7, 0xc0c4c8);
    rect(pm, 17, 17, 16, 3, 0xf0a020); // mango biche
    for (const x of [19, 23, 27, 31]) px(pm, x, 17, 0x60b030);
    ln(pm, 14, 17, 16, 18, 0x8a8a8a);
    const spoke = f % 3;
    pm.circle(25, 25, 2.6, C(0x2a2a2a));
    px(pm, 25 + [-1, 0, 1][spoke], 25 + [0, -1, 0][spoke], 0x8a8a8a);
    // sombrilla
    pm.vline(25, 6, 16, C(0x6a6a6a));
    const um = [0xe04040, 0xf0f0f0, 0x3070d0, 0xf0d030];
    for (let k = 0; k < 4; k++) pm.polygon([[15 + k * 5, 8], [20 + k * 5, 8], [25, 1]], C(um[k]));
  },
};

/* ------------------------------------------------------------------ */
/* Catálogo                                                            */
/* ------------------------------------------------------------------ */

export const LIFE_ART: Record<LifeKind, LifeArt> = {
  garza: GARZA,
  garzaPerch: { ...GARZA_PERCH },
  bird: flapper(7, 0x1a1a22, 0x24242c, 10),
  swallow: flapper(7, 0x101830, 0x1a2040, 16),
  crow: flapper(9, 0x101014, 0x101014, 9),
  crowPerch: CROW_PERCH,
  parrot: flapper(7, 0x30a040, 0x30a040, 12, (pm, f) => {
    px(pm, 3, 3, 0xd03030);
    px(pm, 4, 3, 0xf0d040);
    if (f === 2) px(pm, 1, 4, 0x2060c0);
  }),
  toucan: flapper(9, 0x101010, 0x141414, 8, (pm) => {
    px(pm, 5, 3, 0xf0f0e0);
    px(pm, 6, 2, 0xf09020);
    px(pm, 7, 2, 0xf09020);
    px(pm, 7, 3, 0xd03020);
  }),
  condor: CONDOR,
  bat: BAT,
  pigeon: PIGEON,
  owl: OWL,
  duck: DUCK,
  fish: FISH,
  caiman: CAIMAN,
  frog: FROG,
  rabbit: RABBIT,
  butterfly: BUTTERFLY,
  monkey: MONKEY,
  cattle: CATTLE,
  rider: RIDER,
  deer: DEER,
  bear: BEAR,
  dog: DOG,
  cat: CAT,
  mule: MULE,
  canoe: CANOE,
  raft: RAFT,
  ruana: walker({ skin: 0x9a6a44, shirt: 0xe0d8c8, pants: 0x2a2a34, hat: 'sombrero', ruana: 0x5a3a2a }, 24, 7),
  peon: walker({ skin: 0x8a5a3a, shirt: 0xc8b898, pants: 0x3a3440, hat: 'sombrero', carry: 'buckets' }, 23, 14),
  peonFar: {
    w: 7, h: 10, n: 4, fps: 10, go: [0, 1, 2, 3],
    draw: (pm, f) => tinyPerson(pm, 3, 10, f, 0x2a1a14, 0x1a100c, 0x2a1a14, 0x2a2a30),
  },
  mourner: walker({ skin: 0xa07a5a, shirt: 0x141418, pants: 0x141418, dress: 0x141418, hat: 'scarf', carry: 'flowers', stoop: true }, 22, 4),
  walker: walker({ skin: 0xb07a50, shirt: 0x5a7aa0, pants: 0x2a2a34 }, 24, 8),
  walkerB: walker({ skin: 0x8a5a3a, shirt: 0xd8d0c0, pants: 0x3a3440, hat: 'sombrero' }, 24, 7),
  walkerC: walker({ skin: 0xc09070, shirt: 0xa03040, pants: 0xc09070, dress: 0xa03040, hair: 0x2a1a10 }, 22, 9),
  walkerD: walker({ skin: 0x7a4a2a, shirt: 0x30303a, pants: 0x4a5a7a, hat: 'cap', hatC: 0xe0e0e0 }, 24, 8),
  woodcutter: walker({ skin: 0x8a5a3a, shirt: 0x6a4a3a, pants: 0x2a3028, hat: 'sombrero', carry: 'wood', stoop: true }, 23, 6),
  vendor: VENDOR,
  rider13: rider13({ skin: 0xa06a44, shirt: 0xe0a030, pants: 0x2a3050, hat: 'cap', hatC: 0x202020 }),
  rider13b: rider13({ skin: 0xc09070, shirt: 0x40a090, pants: 0xc09070, dress: 0x40a090, hair: 0x101010 }),
  rider13c: rider13({ skin: 0x7a4a2a, shirt: 0xf0f0f0, pants: 0x2a2a2a }),
  peeker: PEEKER,
  bartender: BARTENDER,
  dancers: DANCERS,
  jukebox: JUKEBOX_FAN,
  picker: PICKER,
  kids: KIDS,
  graffiti: GRAFFITI,
  kite: KITE,
};

/* ------------------------------------------------------------------ */
/* Lejanía                                                             */
/* ------------------------------------------------------------------ */

export function shadeHex(hex: number, k: number): number {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
  const b = Math.min(255, Math.round((hex & 255) * k));
  return (r << 16) | (g << 8) | b;
}

/**
 * Perspectiva aérea: cada píxel se acerca al color del aire (`haze`) en `k` (0..1) y pierde algo de saturación.
 * Los píxeles con luz propia (ojos, ventanas, velas) se respetan.
 */
export function hazeFrames(frames: Pixmap[], haze: number, k: number): void {
  const [hr, hg, hb] = hexToRgba(haze);
  for (const pm of frames) {
    const d = pm.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      if (d[i + 3] === EMISSIVE_ALPHA) {
        d[i + 3] = 255;
        continue;
      }
      const grey = (d[i] + d[i + 1] + d[i + 2]) / 3;
      for (let c = 0; c < 3; c++) {
        const desat = d[i + c] + (grey - d[i + c]) * k * 0.6;
        d[i + c] = Math.round(desat + ([hr, hg, hb][c] - desat) * k);
      }
      d[i + 3] = 255;
    }
  }
}

/** Dibuja los fotogramas de un tipo de vida. */
export function drawLife(art: LifeArt): Pixmap[] {
  const out: Pixmap[] = [];
  for (let f = 0; f < art.n; f++) {
    const pm = new Pixmap(art.w, art.h);
    art.draw(pm, f);
    out.push(pm);
  }
  return out;
}
