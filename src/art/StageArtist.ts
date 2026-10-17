import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config/game-config';
import { Pixmap, hexToRgba, seededRandom, type Rgba } from './PixelPainter';

/**
 * Escenarios procedimentales dirigidos por tema. Capas (todas con el mismo tamaño en todos los temas):
 *  sky (fija) - clouds (0.1) - far (0.25) - river (0.4, 3 frames) - mid (0.6) - ground (1.0) - fore (1.2) - mist (0.8)
 */

export const STAGE_LAYER_WIDTH = 640;

export type StageId = 'ribera' | 'llanos' | 'laguna' | 'pantano' | 'infierno' | 'pueblo';
export const STAGE_IDS: StageId[] = ['ribera', 'llanos', 'laguna', 'pantano', 'infierno', 'pueblo'];

export type AmbientKind = 'fly' | 'ember' | 'leaf' | 'drop' | 'none';

export interface StageTheme {
  id: StageId;
  name: string;
  subtitle: string;
  /** Bandas de cielo de arriba a abajo (hasta y=150). */
  sky: number[];
  stars: number;
  moon: { x: number; y: number; r: number; color: number; light: number } | null;
  sun: { x: number; y: number; r: number; color: number; glow: number } | null;
  clouds: { c1: Rgba; c2: Rgba; line: Rgba };
  far: { kind: 'mountains' | 'flat' | 'hills' | 'town' | 'hacienda'; color: number; color2: number; window?: number };
  water: { kind: 'river' | 'lagoon' | 'swamp' | 'plain' | 'field' | 'street'; bands: number[]; glint: number; glintDark: number; reflect: number | null };
  mid: { kind: 'jungle' | 'palms' | 'frailejones' | 'mangrove' | 'cane' | 'houses'; dark: number; mid: number; light: number; soil: number; accent: number };
  ground: { kind: 'soil' | 'dry' | 'mud' | 'ash' | 'cobble'; soil: number; soilD: number; soilL: number; grass: number; grassL: number; water: number };
  fore: { kind: 'rocks' | 'grass' | 'reeds' | 'embers' | 'posts'; c1: number; c2: number };
  mist: { color: Rgba; color2: Rgba; alpha: number };
  ambient: AmbientKind;
  ambientTint: number;
  lightning: boolean;
}

const rgba = (hex: number, a: number): Rgba => {
  const c = hexToRgba(hex);
  return [c[0], c[1], c[2], a];
};

export const STAGES: Record<StageId, StageTheme> = {
  ribera: {
    id: 'ribera',
    name: 'Ribera de los Antiguos',
    subtitle: 'Río Magdalena - medianoche',
    sky: [0x0a0818, 0x100c24, 0x171032, 0x1f1640, 0x2a1c4a, 0x3a2452, 0x4a2c56, 0x5c3a58],
    stars: 70,
    moon: { x: 300, y: 42, r: 17, color: 0xe8d8a8, light: 0xfff4c8 },
    sun: null,
    clouds: { c1: [70, 52, 96, 170], c2: [96, 72, 120, 150], line: [50, 38, 72, 140] },
    far: { kind: 'mountains', color: 0x2c1e48, color2: 0x1c1434 },
    water: { kind: 'river', bands: [0x24305a, 0x1e2a50, 0x1a2446, 0x161e3a], glint: 0x5a6a9a, glintDark: 0x3c4a78, reflect: 0x9a8c78 },
    mid: { kind: 'jungle', dark: 0x121c1e, mid: 0x1a2c26, light: 0x24402e, soil: 0x2a2018, accent: 0x3a2c20 },
    ground: { kind: 'soil', soil: 0x3c2c20, soilD: 0x2a1e16, soilL: 0x56402c, grass: 0x2e5c2a, grassL: 0x3f7a34, water: 0x24305a },
    fore: { kind: 'rocks', c1: 0x202026, c2: 0x30303a },
    mist: { color: [190, 200, 230, 40], color2: [220, 230, 250, 36], alpha: 0.85 },
    ambient: 'fly',
    ambientTint: 0xffffff,
    lightning: false,
  },
  llanos: {
    id: 'llanos',
    name: 'Llanos del Silbón',
    subtitle: 'Sabana de Casanare - ocaso con tormenta',
    sky: [0x160a1e, 0x2a1028, 0x44182e, 0x642432, 0x863634, 0xa85030, 0xc87034, 0xe4984a],
    stars: 12,
    moon: null,
    sun: { x: 250, y: 118, r: 22, color: 0xffd070, glow: 0xffa040 },
    clouds: { c1: [90, 40, 60, 190], c2: [140, 70, 70, 160], line: [60, 24, 40, 160] },
    far: { kind: 'flat', color: 0x3a1828, color2: 0x24101c },
    water: { kind: 'plain', bands: [0x6a4a24, 0x5a3e1e, 0x4a3418, 0x3a2a14], glint: 0x8a6a30, glintDark: 0x4a3418, reflect: null },
    mid: { kind: 'palms', dark: 0x1c0e14, mid: 0x2e1a1c, light: 0x4a2c22, soil: 0x3a2814, accent: 0x5a3c20 },
    ground: { kind: 'dry', soil: 0x5a4020, soilD: 0x3e2c16, soilL: 0x7a5a2c, grass: 0x7a6428, grassL: 0x9a8434, water: 0x4a3418 },
    fore: { kind: 'grass', c1: 0x140c0c, c2: 0x22140e },
    mist: { color: [220, 170, 120, 30], color2: [240, 200, 150, 26], alpha: 0.7 },
    ambient: 'none',
    ambientTint: 0xffffff,
    lightning: true,
  },
  laguna: {
    id: 'laguna',
    name: 'Laguna de Iguaque',
    subtitle: 'Páramo de Boyacá - amanecer',
    sky: [0x0a0e20, 0x101a30, 0x182840, 0x203a50, 0x2c4c60, 0x3c6070, 0x5a8088, 0x7aa0a0],
    stars: 30,
    moon: { x: 90, y: 36, r: 9, color: 0xd8e0e8, light: 0xf4f8ff },
    sun: null,
    clouds: { c1: [120, 150, 170, 150], c2: [170, 200, 215, 130], line: [90, 120, 140, 120] },
    far: { kind: 'mountains', color: 0x1c2c3c, color2: 0x2a3c4c },
    water: { kind: 'lagoon', bands: [0x2c6070, 0x245262, 0x1c4454, 0x163848], glint: 0xa0d8e0, glintDark: 0x4a8898, reflect: 0xc8e8f0 },
    mid: { kind: 'frailejones', dark: 0x1e3028, mid: 0x2e4838, light: 0x4c6a48, soil: 0x3a3a2c, accent: 0xc8c080 },
    ground: { kind: 'soil', soil: 0x3c3a2c, soilD: 0x2a2820, soilL: 0x56523c, grass: 0x4c6a3c, grassL: 0x6a8a4c, water: 0x2c6070 },
    fore: { kind: 'rocks', c1: 0x161c22, c2: 0x28303a },
    mist: { color: [200, 220, 240, 50], color2: [230, 240, 250, 40], alpha: 0.8 },
    ambient: 'leaf',
    ambientTint: 0xc8d8a0,
    lightning: false,
  },
  pantano: {
    id: 'pantano',
    name: 'Ciénaga del Caimán',
    subtitle: 'Depresión Momposina - noche cerrada',
    sky: [0x050806, 0x0a120c, 0x101c12, 0x142418, 0x1a2c1c, 0x203420, 0x2a3e26, 0x344a2c],
    stars: 40,
    moon: { x: 120, y: 56, r: 26, color: 0xa8c890, light: 0xd8f0b8 },
    sun: null,
    clouds: { c1: [30, 50, 36, 180], c2: [50, 74, 54, 150], line: [20, 34, 24, 150] },
    far: { kind: 'hills', color: 0x0c160e, color2: 0x142018 },
    water: { kind: 'swamp', bands: [0x2a4a30, 0x224028, 0x1a3420, 0x142a18], glint: 0x7ab070, glintDark: 0x3c5c3c, reflect: 0x9ac890 },
    mid: { kind: 'mangrove', dark: 0x060a06, mid: 0x101c10, light: 0x2a3c20, soil: 0x1e1c10, accent: 0x2e2a16 },
    ground: { kind: 'mud', soil: 0x2a2416, soilD: 0x1a160c, soilL: 0x3c3420, grass: 0x2e4a24, grassL: 0x3e5c2c, water: 0x1e3a24 },
    fore: { kind: 'reeds', c1: 0x0a100a, c2: 0x162016 },
    mist: { color: [150, 200, 150, 50], color2: [190, 230, 180, 40], alpha: 0.9 },
    ambient: 'fly',
    ambientTint: 0xa0ff80,
    lightning: false,
  },
  infierno: {
    id: 'infierno',
    name: 'Cañaduzal en Llamas',
    subtitle: 'Hacienda antioqueña - noche de incendio',
    sky: [0x0a0204, 0x1c0606, 0x300a08, 0x48100a, 0x60180c, 0x7c2410, 0xa03414, 0xc84c18],
    stars: 0,
    moon: null,
    sun: null,
    clouds: { c1: [40, 14, 12, 200], c2: [70, 26, 18, 170], line: [24, 8, 8, 170] },
    far: { kind: 'hacienda', color: 0x1a0606, color2: 0x2a0c08, window: 0xffb040 },
    water: { kind: 'field', bands: [0x3a1408, 0x2c1006, 0x200c04, 0x160804], glint: 0xff8030, glintDark: 0x8a3010, reflect: null },
    mid: { kind: 'cane', dark: 0x1a0806, mid: 0x2e1208, light: 0x4a2010, soil: 0x241008, accent: 0xff9030 },
    ground: { kind: 'ash', soil: 0x241008, soilD: 0x140804, soilL: 0x3a1a0c, grass: 0x3a1c0c, grassL: 0x5a2c10, water: 0x3a1408 },
    fore: { kind: 'embers', c1: 0x0c0404, c2: 0x1c0a06 },
    mist: { color: [70, 30, 20, 80], color2: [110, 50, 30, 60], alpha: 1 },
    ambient: 'ember',
    ambientTint: 0xffffff,
    lightning: false,
  },
  pueblo: {
    id: 'pueblo',
    name: 'Callejón del Sombrerón',
    subtitle: 'Pueblo colonial antioqueño - luna llena',
    sky: [0x06060e, 0x0a0a18, 0x101022, 0x16162c, 0x1c1c36, 0x242440, 0x2c2c4a, 0x363654],
    stars: 90,
    moon: { x: 200, y: 34, r: 19, color: 0xe0e0e8, light: 0xffffff },
    sun: null,
    clouds: { c1: [50, 50, 80, 150], c2: [76, 76, 110, 130], line: [36, 36, 60, 130] },
    far: { kind: 'town', color: 0x14142a, color2: 0x1c1c34, window: 0xf0c060 },
    water: { kind: 'street', bands: [0x2c2838, 0x282434, 0x242030, 0x201c2a], glint: 0x3c3848, glintDark: 0x1c1826, reflect: null },
    mid: { kind: 'houses', dark: 0x2a2030, mid: 0x4a3a40, light: 0x6a5a58, soil: 0x2c2830, accent: 0xffc868 },
    ground: { kind: 'cobble', soil: 0x3a3640, soilD: 0x2a2630, soilL: 0x4c4852, grass: 0x34303c, grassL: 0x403c48, water: 0x2c2838 },
    fore: { kind: 'posts', c1: 0x0c0a10, c2: 0x1a1620 },
    mist: { color: [200, 200, 230, 28], color2: [220, 220, 245, 24], alpha: 0.8 },
    ambient: 'none',
    ambientTint: 0xffffff,
    lightning: false,
  },
};

export interface StageLayers {
  sky: Pixmap;
  clouds: Pixmap;
  far: Pixmap;
  river: Pixmap[];
  mid: Pixmap;
  ground: Pixmap;
  fore: Pixmap;
  mist: Pixmap;
}

/* ------------------------------------------------------------------ */
/* Cielo                                                               */
/* ------------------------------------------------------------------ */

export function buildSky(t: StageTheme): Pixmap {
  const pm = new Pixmap(GAME_WIDTH, GAME_HEIGHT);
  const bandH = Math.ceil(150 / t.sky.length);
  for (let i = 0; i < t.sky.length; i++) {
    pm.rect(0, i * bandH, GAME_WIDTH, bandH, hexToRgba(t.sky[i]));
    if (i > 0) pm.dither(0, i * bandH, GAME_WIDTH, 3, hexToRgba(t.sky[i - 1]), i);
  }
  pm.rect(0, 150, GAME_WIDTH, GAME_HEIGHT - 150, hexToRgba(t.sky[t.sky.length - 1]));
  const rnd = seededRandom(2024 + t.id.length);
  for (let i = 0; i < t.stars; i++) {
    const x = Math.floor(rnd() * GAME_WIDTH);
    const y = Math.floor(rnd() * 100);
    const bright = rnd() > 0.7;
    pm.set(x, y, hexToRgba(bright ? 0xfff8e0 : 0x9088b0));
    if (bright && rnd() > 0.6) {
      pm.set(x + 1, y, hexToRgba(0x8078a0));
      pm.set(x, y + 1, hexToRgba(0x8078a0));
    }
  }
  if (t.moon) {
    const { x: mx, y: my, r, color, light } = t.moon;
    pm.circle(mx, my, r, hexToRgba(color));
    pm.circle(mx - 1, my - 1, r - 2, hexToRgba(light));
    pm.circle(mx - r * 0.3, my - r * 0.25, r * 0.18, hexToRgba(color));
    pm.circle(mx + r * 0.25, my + r * 0.3, r * 0.12, hexToRgba(color));
    pm.circle(mx + r * 0.35, my - r * 0.35, r * 0.09, hexToRgba(color));
    pm.circle(mx - r * 0.1, my + r * 0.4, r * 0.09, hexToRgba(color));
    for (let rr = r + 2; rr < r + 7; rr++) {
      for (let a = 0; a < 360; a += 3) {
        const x = Math.round(mx + Math.cos((a * Math.PI) / 180) * rr);
        const y = Math.round(my + Math.sin((a * Math.PI) / 180) * rr);
        if ((x + y) % 2 === 0) pm.set(x, y, [255, 240, 200, 50]);
      }
    }
  }
  if (t.sun) {
    const { x, y, r, color, glow } = t.sun;
    for (let rr = r + 14; rr > r; rr -= 2) {
      const a = Math.round(90 - ((rr - r) / 14) * 80);
      for (let ang = 0; ang < 360; ang += 2) {
        const px = Math.round(x + Math.cos((ang * Math.PI) / 180) * rr);
        const py = Math.round(y + Math.sin((ang * Math.PI) / 180) * rr);
        if ((px + py) % 2 === 0) pm.set(px, py, rgba(glow, a));
      }
    }
    pm.circle(x, y, r, hexToRgba(glow));
    pm.circle(x, y, r - 3, hexToRgba(color));
    // bandas de calima que cruzan el sol
    for (let i = 0; i < 4; i++) pm.hline(x - r - 10, x + r + 10, y - 6 + i * 5, rgba(t.sky[t.sky.length - 2], 150));
  }
  return pm;
}

export function buildClouds(t: StageTheme): Pixmap {
  const pm = new Pixmap(STAGE_LAYER_WIDTH, 90);
  const rnd = seededRandom(88);
  for (let i = 0; i < 9; i++) {
    const x = rnd() * STAGE_LAYER_WIDTH;
    const y = 15 + rnd() * 55;
    const w = 30 + rnd() * 50;
    for (let k = 0; k < 5; k++) {
      const cx = x + (k / 4) * w;
      const r = 5 + rnd() * 6;
      pm.ellipse(cx, y, r * 1.6, r * 0.7, t.clouds.c1);
      pm.ellipse(cx, y - 2, r * 1.2, r * 0.5, t.clouds.c2);
    }
    pm.hline(x - 4, x + w + 4, y + 3, t.clouds.line);
  }
  return pm;
}

/* ------------------------------------------------------------------ */
/* Lejanía                                                             */
/* ------------------------------------------------------------------ */

export function buildFar(t: StageTheme): Pixmap {
  const h = 120;
  const pm = new Pixmap(STAGE_LAYER_WIDTH, h);
  const rnd = seededRandom(13);
  const c1 = hexToRgba(t.far.color);
  const c2 = hexToRgba(t.far.color2);
  switch (t.far.kind) {
    case 'mountains': {
      const ridge: [number, number][] = [[0, h]];
      for (let x = 0; x <= STAGE_LAYER_WIDTH; x += 16) {
        ridge.push([x, 55 + Math.sin(x * 0.015) * 14 + Math.sin(x * 0.05) * 6 + rnd() * 4]);
      }
      ridge.push([STAGE_LAYER_WIDTH, h]);
      pm.polygon(ridge, c1);
      if (t.id === 'laguna') {
        // picos nevados más altos detrás
        for (let i = 0; i < 6; i++) {
          const x = 40 + i * 110 + rnd() * 30;
          const top = 20 + rnd() * 14;
          pm.polygon([[x - 46, 70], [x, top], [x + 50, 72]], c2);
          pm.polygon([[x - 10, top + 14], [x, top], [x + 11, top + 15], [x + 4, top + 10], [x - 3, top + 12]], hexToRgba(0xc8d8e0));
        }
      }
      const tree: [number, number][] = [[0, h]];
      for (let x = 0; x <= STAGE_LAYER_WIDTH; x += 6) {
        const base = 82 + Math.sin(x * 0.03) * 5;
        const spike = rnd() > 0.5 ? rnd() * 14 : rnd() * 4;
        tree.push([x, base - spike]);
        tree.push([x + 3, base - spike * 0.4]);
      }
      tree.push([STAGE_LAYER_WIDTH, h]);
      pm.polygon(tree, c2);
      for (let i = 0; i < 10; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        const top = 60 + rnd() * 12;
        pm.vline(x, top, 95, c2);
        for (let a = -2; a <= 2; a++) pm.line(x, top, x + a * 6, top - 6 + Math.abs(a) * 4, 1, c2);
      }
      break;
    }
    case 'flat': {
      // horizonte plano con morichales dispersos
      pm.rect(0, 78, STAGE_LAYER_WIDTH, h - 78, c1);
      pm.rect(0, 84, STAGE_LAYER_WIDTH, h - 84, c2);
      for (let i = 0; i < 16; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        const top = 58 + rnd() * 12;
        pm.vline(x, top, 80, c2);
        for (let a = -3; a <= 3; a++) pm.line(x, top, x + a * 4, top - 7 + Math.abs(a) * 3, 1, c2);
      }
      for (let i = 0; i < 40; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        pm.ellipse(x, 79, 4 + rnd() * 8, 2 + rnd() * 2, c2);
      }
      break;
    }
    case 'hills': {
      const ridge: [number, number][] = [[0, h]];
      for (let x = 0; x <= STAGE_LAYER_WIDTH; x += 10) ridge.push([x, 70 + Math.sin(x * 0.02) * 8 + rnd() * 3]);
      ridge.push([STAGE_LAYER_WIDTH, h]);
      pm.polygon(ridge, c1);
      for (let i = 0; i < 30; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        const y = 66 + rnd() * 10;
        pm.ellipse(x, y, 8 + rnd() * 10, 6 + rnd() * 6, c2);
        pm.vline(x, y + 4, y + 20, c2);
      }
      break;
    }
    case 'hacienda': {
      pm.rect(0, 80, STAGE_LAYER_WIDTH, h - 80, c1);
      // casa grande ardiendo en el centro + cercas
      const hx = 300;
      pm.polygon([[hx - 70, 82], [hx - 70, 52], [hx - 40, 36], [hx + 40, 36], [hx + 70, 52], [hx + 70, 82]], c2);
      pm.rect(hx - 60, 54, 120, 28, c1);
      pm.polygon([[hx - 74, 54], [hx - 40, 34], [hx + 40, 34], [hx + 74, 54]], c2);
      const win = hexToRgba(t.far.window ?? 0xffb040);
      for (let i = 0; i < 5; i++) pm.rect(hx - 50 + i * 24, 60, 8, 10, win);
      pm.rect(hx - 6, 64, 12, 18, win);
      pm.rect(hx + 20, 20, 10, 16, c2);
      pm.polygon([[hx + 18, 20], [hx + 25, 10], [hx + 32, 20]], c2);
      for (let i = 0; i < 12; i++) {
        const fx = hx - 66 + i * 12;
        const fh = 8 + rnd() * 16;
        pm.polygon([[fx - 4, 36], [fx + 4, 36], [fx + 1, 36 - fh]], rgba(0xff6a20, 220));
        pm.polygon([[fx - 2, 36], [fx + 2, 36], [fx, 36 - fh * 0.55]], rgba(0xffd060, 220));
      }
      for (let x = 0; x < STAGE_LAYER_WIDTH; x += 22) {
        pm.vline(x, 74, 82, c2);
        pm.hline(x, x + 22, 76, c2);
      }
      break;
    }
    case 'town': {
      pm.rect(0, 76, STAGE_LAYER_WIDTH, h - 76, c1);
      const win = hexToRgba(t.far.window ?? 0xf0c060);
      let x = 0;
      while (x < STAGE_LAYER_WIDTH) {
        const w = 26 + rnd() * 40;
        const top = 52 + rnd() * 16;
        pm.rect(x, top, w, 80 - top, c1);
        pm.polygon([[x - 2, top], [x + w / 2, top - 8 - rnd() * 4], [x + w + 2, top]], c2);
        for (let k = 4; k < w - 6; k += 10) if (rnd() > 0.55) pm.rect(x + k, top + 6, 3, 4, win);
        x += w + 3;
      }
      // iglesia con torre
      const cx = 330;
      pm.rect(cx - 30, 42, 60, 40, c2);
      pm.rect(cx - 8, 14, 16, 30, c2);
      pm.polygon([[cx - 10, 14], [cx, 2], [cx + 10, 14]], c2);
      pm.vline(cx, -2, 4, c2);
      pm.hline(cx - 2, cx + 2, 0, c2);
      pm.rect(cx - 3, 22, 6, 8, win);
      pm.rect(cx - 20, 60, 6, 10, win);
      pm.rect(cx + 14, 60, 6, 10, win);
      break;
    }
  }
  return pm;
}

/* ------------------------------------------------------------------ */
/* Agua / franja media lejana (3 fotogramas)                          */
/* ------------------------------------------------------------------ */

export function buildRiver(t: StageTheme): Pixmap[] {
  const frames: Pixmap[] = [];
  const h = 44;
  const rnd = seededRandom(404);
  const glints: { x: number; y: number; w: number }[] = [];
  for (let i = 0; i < 90; i++) glints.push({ x: rnd() * STAGE_LAYER_WIDTH, y: 4 + rnd() * (h - 8), w: 2 + Math.floor(rnd() * 5) });
  const animated = t.water.kind === 'river' || t.water.kind === 'lagoon' || t.water.kind === 'swamp' || t.water.kind === 'field';
  for (let f = 0; f < 3; f++) {
    const pm = new Pixmap(STAGE_LAYER_WIDTH, h);
    for (let y = 0; y < h; y++) {
      const b = t.water.bands;
      const c = y < 6 ? b[0] : y < 18 ? b[1] : y < 32 ? b[2] : b[3];
      pm.hline(0, STAGE_LAYER_WIDTH, y, hexToRgba(c));
    }
    if (t.water.reflect !== null) {
      const rx = t.moon ? t.moon.x : 300;
      for (let y = 0; y < h; y++) {
        const w = 10 + Math.sin(y * 0.4 + f) * 4;
        pm.dither(rx - w / 2, y, w, 1, hexToRgba(t.water.reflect), y + f);
      }
    }
    const shift = animated ? f * 2 : 0;
    for (const g of glints) {
      const x = (g.x + shift) % STAGE_LAYER_WIDTH;
      const y = g.y + (animated && (f + Math.floor(g.x)) % 2 === 0 ? 0 : 1);
      pm.hline(x, x + g.w, y, hexToRgba(y < 14 ? t.water.glint : t.water.glintDark));
    }
    if (t.water.kind === 'swamp') {
      // nenúfares
      for (let i = 0; i < 24; i++) {
        const x = (i * 53 + 17) % STAGE_LAYER_WIDTH;
        const y = 8 + ((i * 29) % (h - 14));
        pm.ellipse(x, y, 4, 2, hexToRgba(0x3c6a34));
        pm.set(x + 1, y - 1, hexToRgba(0x6a9a50));
      }
    }
    if (t.water.kind === 'field') {
      // brasas que titilan entre la caña quemada
      for (let i = 0; i < 40; i++) {
        const x = (i * 37 + f * 5) % STAGE_LAYER_WIDTH;
        const y = 6 + ((i * 13 + f * 3) % (h - 10));
        pm.set(x, y, hexToRgba((i + f) % 3 === 0 ? 0xffd060 : 0xff6020));
      }
    }
    if (t.water.kind === 'street') {
      // muro lejano de tapia con ventanas iluminadas
      pm.rect(0, 0, STAGE_LAYER_WIDTH, 20, hexToRgba(0x3a3448));
      for (let x = 0; x < STAGE_LAYER_WIDTH; x += 48) {
        pm.rect(x + 14, 4, 8, 10, hexToRgba(0x1c1826));
        if ((x / 48) % 3 === 0) pm.rect(x + 15, 5, 6, 8, hexToRgba(0xf0c060));
      }
      pm.hline(0, STAGE_LAYER_WIDTH, 20, hexToRgba(0x5a5468));
    }
    if (t.water.kind === 'plain') {
      for (let i = 0; i < 120; i++) {
        const x = (i * 41 + 7) % STAGE_LAYER_WIDTH;
        const y = 4 + ((i * 17) % (h - 8));
        pm.vline(x, y - 2, y, hexToRgba(0x8a6a30));
      }
    }
    frames.push(pm);
  }
  return frames;
}

/* ------------------------------------------------------------------ */
/* Capa media                                                          */
/* ------------------------------------------------------------------ */

export function buildMid(t: StageTheme): Pixmap {
  const h = 110;
  const pm = new Pixmap(STAGE_LAYER_WIDTH, h);
  const rnd = seededRandom(7);
  const dark = hexToRgba(t.mid.dark);
  const mid = hexToRgba(t.mid.mid);
  const light = hexToRgba(t.mid.light);
  const soil = hexToRgba(t.mid.soil);
  const accent = hexToRgba(t.mid.accent);
  pm.rect(0, h - 10, STAGE_LAYER_WIDTH, 10, soil);
  for (let x = 0; x < STAGE_LAYER_WIDTH; x += 3) pm.set(x, h - 10 + (x % 2), accent);

  switch (t.mid.kind) {
    case 'jungle': {
      for (let i = 0; i < 8; i++) {
        const x = 20 + i * 80 + rnd() * 30;
        const top = 10 + rnd() * 20;
        const trunkW = 5 + rnd() * 4;
        pm.polygon([[x - trunkW, h], [x + trunkW, h], [x + trunkW * 0.5, top + 20], [x - trunkW * 0.5, top + 20]], dark);
        pm.polygon([[x - trunkW - 10, h], [x - trunkW, h - 16], [x - trunkW, h]], dark);
        pm.polygon([[x + trunkW + 8, h], [x + trunkW, h - 12], [x + trunkW, h]], dark);
        for (let k = 0; k < 7; k++) {
          const cx = x + (rnd() - 0.5) * 50;
          const cy = top + rnd() * 18;
          pm.ellipse(cx, cy, 10 + rnd() * 10, 6 + rnd() * 5, k % 3 === 0 ? mid : dark);
          if (k % 2 === 0) pm.ellipse(cx - 3, cy - 3, 5, 3, light);
        }
        for (let k = 0; k < 2; k++) {
          const lx = x + (rnd() - 0.5) * 40;
          pm.vline(lx, top + 20, top + 40 + rnd() * 30, mid);
        }
      }
      for (let i = 0; i < 24; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        const top = 30 + rnd() * 30;
        pm.vline(x, top, h - 8, i % 2 === 0 ? mid : light);
        for (let y = top; y < h - 8; y += 9) pm.set(x, y, dark);
        pm.line(x, top, x + 4, top - 6, 1, light);
        pm.line(x, top + 2, x - 4, top - 3, 1, light);
      }
      for (let i = 0; i < 30; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        pm.ellipse(x, h - 12, 6 + rnd() * 8, 3 + rnd() * 3, i % 2 === 0 ? mid : light);
      }
      break;
    }
    case 'palms': {
      // palmas de moriche altas y delgadas, con copa en abanico
      for (let i = 0; i < 11; i++) {
        const x = 20 + i * 58 + rnd() * 24;
        const top = 4 + rnd() * 16;
        const lean = (rnd() - 0.5) * 10;
        pm.line(x, h - 8, x + lean, top + 10, 3, dark);
        pm.line(x + 1, h - 8, x + lean + 1, top + 10, 1, mid);
        for (let a = -3; a <= 3; a++) {
          const ex = x + lean + a * 7;
          const ey = top + 2 + Math.abs(a) * 5;
          pm.line(x + lean, top + 10, ex, ey, 2, dark);
          pm.line(ex, ey, ex + Math.sign(a || 1) * 3, ey + 7, 1, mid);
        }
        pm.ellipse(x + lean, top + 12, 5, 3, mid);
      }
      for (let i = 0; i < 70; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        const gh = 6 + rnd() * 14;
        pm.line(x, h - 9, x + (rnd() - 0.5) * 4, h - 9 - gh, 1, i % 3 === 0 ? light : mid);
      }
      // arbusto chaparro
      for (let i = 0; i < 12; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        pm.ellipse(x, h - 14, 8 + rnd() * 8, 4 + rnd() * 3, dark);
        pm.ellipse(x - 2, h - 16, 4 + rnd() * 4, 2 + rnd() * 2, mid);
      }
      break;
    }
    case 'frailejones': {
      // frailejones: tallo grueso con roseta de hojas y flor amarilla
      for (let i = 0; i < 26; i++) {
        const x = 8 + i * 25 + rnd() * 14;
        const sh = 14 + rnd() * 40;
        const top = h - 10 - sh;
        pm.line(x, h - 9, x, top, 4, dark);
        pm.vline(x + 1, top, h - 9, mid);
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          pm.line(x, top, x + Math.cos(ang) * 8, top + Math.sin(ang) * 4 - 3, 2, a % 2 === 0 ? light : mid);
        }
        pm.ellipse(x, top - 1, 4, 2.5, light);
        if (i % 3 === 0) pm.circle(x + 2, top - 6, 1.5, accent);
      }
      // pajonal de fondo
      for (let i = 0; i < 90; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        pm.line(x, h - 9, x + (rnd() - 0.5) * 3, h - 14 - rnd() * 8, 1, i % 2 === 0 ? mid : light);
      }
      // rocas con musgo
      for (let i = 0; i < 8; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        pm.ellipse(x, h - 12, 10 + rnd() * 8, 5 + rnd() * 3, hexToRgba(0x303a40));
        pm.ellipse(x - 2, h - 15, 5, 2, light);
      }
      break;
    }
    case 'mangrove': {
      // ciénaga: árboles muertos y retorcidos, raíces zancudas sobre el agua y musgo colgante
      for (let i = 0; i < 9; i++) {
        const x = 30 + i * 70 + rnd() * 20;
        const top = 2 + rnd() * 14;
        const lean = (rnd() - 0.5) * 16;
        pm.line(x, h - 26, x + lean, top + 14, 5, dark);
        pm.line(x + 1, h - 26, x + lean + 1, top + 20, 1, mid);
        // ramas desnudas
        for (let b = 0; b < 4; b++) {
          const by = top + 14 + b * 9;
          const bx = x + lean * ((by - top) / 60);
          const dir = b % 2 === 0 ? 1 : -1;
          pm.line(bx, by, bx + dir * (12 + rnd() * 14), by - 8 - rnd() * 8, 2, dark);
          pm.line(bx + dir * 10, by - 7, bx + dir * (16 + rnd() * 6), by - 2 + rnd() * 6, 1, dark);
        }
        // raíces zancudas
        for (let r = 0; r < 6; r++) {
          const dx = (r - 2.5) * 8;
          pm.line(x, h - 28, x + dx * 1.6, h - 4, 2, dark);
          pm.line(x + dx * 1.6, h - 4, x + dx * 1.6, h, 2, dark);
        }
        // musgo colgante (barba de viejo)
        for (let k = 0; k < 5; k++) {
          const lx = x + (rnd() - 0.5) * 40;
          const ly = top + 16 + rnd() * 10;
          pm.vline(lx, ly, ly + 14 + rnd() * 24, light);
          pm.vline(lx + 1, ly + 4, ly + 10 + rnd() * 14, mid);
        }
      }
      // juncos y totoras en la orilla
      for (let i = 0; i < 60; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        const gh = 10 + rnd() * 16;
        pm.line(x, h - 9, x + (rnd() - 0.5) * 3, h - 9 - gh, 1, i % 2 === 0 ? mid : light);
        if (i % 4 === 0) pm.ellipse(x, h - 10 - gh, 1.5, 3, hexToRgba(0x4a3a20));
      }
      // ojos brillando entre la maleza
      for (let i = 0; i < 4; i++) {
        const x = 60 + i * 150 + rnd() * 40;
        pm.rect(x, h - 20, 2, 1, hexToRgba(0xe0ff60));
        pm.rect(x + 5, h - 20, 2, 1, hexToRgba(0xe0ff60));
      }
      break;
    }
    case 'cane': {
      // cañaduzal: tallos altos con hojas, varios ardiendo
      for (let i = 0; i < 90; i++) {
        const x = (i * 7.2 + rnd() * 4) % STAGE_LAYER_WIDTH;
        const top = 14 + rnd() * 30;
        pm.vline(x, top, h - 9, i % 3 === 0 ? light : mid);
        for (let y = top; y < h - 9; y += 11) pm.set(x, y, dark);
        pm.line(x, top, x + 5, top - 8, 1, light);
        pm.line(x, top + 3, x - 5, top - 5, 1, mid);
        pm.line(x, top + 8, x + 6, top + 3, 1, mid);
      }
      for (let i = 0; i < 18; i++) {
        const fx = rnd() * STAGE_LAYER_WIDTH;
        const fh = 16 + rnd() * 30;
        const fy = 20 + rnd() * 30;
        pm.polygon([[fx - 5, fy + 10], [fx + 5, fy + 10], [fx + 2, fy + 10 - fh], [fx - 1, fy + 10 - fh * 0.6], [fx - 3, fy + 10 - fh * 0.8]], rgba(0xff5a10, 230));
        pm.polygon([[fx - 2, fy + 10], [fx + 3, fy + 10], [fx + 1, fy + 10 - fh * 0.5]], rgba(0xffc840, 230));
      }
      pm.dither(0, 0, STAGE_LAYER_WIDTH, 30, [40, 14, 10, 120], 0);
      break;
    }
    case 'houses': {
      // fachadas coloniales con balcones, puertas y faroles
      let x = -10;
      let k = 0;
      while (x < STAGE_LAYER_WIDTH + 20) {
        const w = 70 + rnd() * 50;
        const top = 18 + rnd() * 14;
        const wall = [hexToRgba(0x6a5a58), hexToRgba(0x5a4a60), hexToRgba(0x6a5848), hexToRgba(0x4e4a5a)][k % 4];
        pm.rect(x, top, w, h - 10 - top, wall);
        pm.rect(x - 3, top - 6, w + 6, 8, dark); // alero
        for (let tx = x - 3; tx < x + w + 3; tx += 4) pm.set(tx, top - 6, mid); // tejas
        pm.rect(x, h - 24, w, 14, mid); // zócalo
        // puerta
        const dx = x + 10 + rnd() * (w - 30);
        pm.rect(dx, h - 40, 14, 30, dark);
        pm.rect(dx + 2, h - 38, 10, 26, hexToRgba(0x2e2228));
        pm.rect(dx + 1, h - 40, 12, 2, accent);
        // ventanas con reja + balcón
        for (let wx = x + 8; wx < x + w - 16; wx += 26) {
          if (Math.abs(wx - dx) < 16) continue;
          pm.rect(wx, top + 10, 12, 14, dark);
          if (rnd() > 0.5) pm.rect(wx + 2, top + 12, 8, 10, accent);
          pm.rect(wx - 2, top + 22, 16, 3, mid);
          for (let b = 0; b < 16; b += 3) pm.vline(wx - 2 + b, top + 14, top + 22, dark);
        }
        // farol
        if (k % 2 === 0) {
          pm.rect(x + w - 8, top + 14, 3, 5, accent);
          pm.rect(x + w - 9, top + 12, 5, 2, dark);
          pm.set(x + w - 7, top + 19, dark);
          pm.dither(x + w - 16, top + 10, 20, 14, [255, 200, 100, 60], 0);
        }
        x += w + 2;
        k++;
      }
      break;
    }
  }
  return pm;
}

/* ------------------------------------------------------------------ */
/* Suelo y primer plano                                                */
/* ------------------------------------------------------------------ */

export function buildGround(t: StageTheme): Pixmap {
  const h = GAME_HEIGHT - GROUND_Y + 40;
  const pm = new Pixmap(STAGE_LAYER_WIDTH, h);
  const rnd = seededRandom(91);
  const g = t.ground;
  const soil = hexToRgba(g.soil);
  const soilD = hexToRgba(g.soilD);
  const soilL = hexToRgba(g.soilL);
  const grass = hexToRgba(g.grass);
  const grassL = hexToRgba(g.grassL);
  const top = 40;
  pm.rect(0, top, STAGE_LAYER_WIDTH, h - top, soil);
  if (g.kind === 'cobble') {
    for (let y = top; y < h; y += 5) {
      for (let x = ((y / 5) % 2) * 5; x < STAGE_LAYER_WIDTH; x += 10) {
        pm.rect(x, y, 9, 4, rnd() > 0.5 ? soilL : soil);
        pm.hline(x, x + 8, y + 4, soilD);
        pm.vline(x + 9, y, y + 4, soilD);
      }
    }
    pm.rect(0, top - 2, STAGE_LAYER_WIDTH, 3, grassL);
    pm.hline(0, STAGE_LAYER_WIDTH, top - 3, soilD);
    return pm;
  }
  pm.rect(0, top - 2, STAGE_LAYER_WIDTH, 4, grass);
  for (let x = 0; x < STAGE_LAYER_WIDTH; x += 2) {
    if (rnd() > 0.5) pm.set(x, top - 3, grassL);
    if (rnd() > 0.6) pm.set(x, top - 4, grass);
    if (g.kind === 'dry' && rnd() > 0.7) pm.vline(x, top - 7, top - 3, grassL);
  }
  for (let i = 0; i < 400; i++) {
    const x = rnd() * STAGE_LAYER_WIDTH;
    const y = top + 3 + rnd() * (h - top - 3);
    pm.set(x, y, rnd() > 0.5 ? soilD : soilL);
  }
  if (g.kind === 'ash') {
    for (let i = 0; i < 50; i++) {
      const x = rnd() * STAGE_LAYER_WIDTH;
      const y = top + 2 + rnd() * 14;
      pm.set(x, y, hexToRgba(rnd() > 0.5 ? 0xff7020 : 0xffc040));
    }
    for (let i = 0; i < 14; i++) {
      const x = rnd() * STAGE_LAYER_WIDTH;
      pm.line(x, top, x + 3 + rnd() * 6, top - 6 - rnd() * 6, 2, soilD);
    }
  } else if (g.kind === 'mud') {
    for (let i = 0; i < 10; i++) {
      const x = rnd() * STAGE_LAYER_WIDTH;
      pm.ellipse(x, top + 6 + rnd() * 8, 10 + rnd() * 12, 2 + rnd() * 2, hexToRgba(g.water));
      pm.hline(x - 4, x + 2, top + 5, hexToRgba(0x4a6a44));
    }
  } else {
    for (let i = 0; i < 24; i++) {
      const x = rnd() * STAGE_LAYER_WIDTH;
      const y = top + 6 + rnd() * 10;
      pm.ellipse(x, y, 2 + rnd() * 3, 1.5 + rnd(), hexToRgba(0x5a5a62));
      pm.set(x - 1, y - 1, hexToRgba(0x8a8a92));
    }
  }
  if (g.kind === 'soil' || g.kind === 'mud') {
    for (let i = 0; i < 6; i++) {
      const x = rnd() * STAGE_LAYER_WIDTH;
      pm.ellipse(x, top - 1, 8 + rnd() * 8, 1.5, hexToRgba(g.water));
    }
  }
  return pm;
}

export function buildForeground(t: StageTheme): Pixmap {
  const h = 48;
  const pm = new Pixmap(STAGE_LAYER_WIDTH, h);
  const rnd = seededRandom(123);
  const c1 = hexToRgba(t.fore.c1);
  const c2 = hexToRgba(t.fore.c2);
  switch (t.fore.kind) {
    case 'rocks': {
      for (let i = 0; i < 7; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        const w = 14 + rnd() * 22;
        const hh = 8 + rnd() * 12;
        pm.polygon([[x - w / 2, h], [x - w / 3, h - hh], [x + w / 4, h - hh - 3], [x + w / 2, h]], c1);
        pm.line(x - w / 3, h - hh, x + w / 4, h - hh - 3, 1, c2);
      }
      for (let i = 0; i < 10; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        const w = 20 + rnd() * 30;
        pm.line(x, h, x + w * 0.4, h - 6 - rnd() * 6, 3, c1);
        pm.line(x + w * 0.4, h - 6, x + w, h, 2, c1);
      }
      for (let i = 0; i < 60; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        pm.line(x, h, x + (rnd() - 0.5) * 6, h - 6 - rnd() * 8, 1, c2);
      }
      break;
    }
    case 'grass':
    case 'reeds': {
      const tall = t.fore.kind === 'reeds';
      for (let i = 0; i < 140; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        const gh = (tall ? 14 : 8) + rnd() * (tall ? 26 : 16);
        pm.line(x, h, x + (rnd() - 0.5) * 8, h - gh, tall && i % 4 === 0 ? 2 : 1, i % 3 === 0 ? c2 : c1);
        if (tall && i % 5 === 0) pm.ellipse(x + (rnd() - 0.5) * 8, h - gh - 2, 1.5, 4, c2);
      }
      break;
    }
    case 'embers': {
      for (let i = 0; i < 9; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        const w = 10 + rnd() * 14;
        pm.polygon([[x - w / 2, h], [x - w / 3, h - 6 - rnd() * 10], [x + w / 3, h - 8 - rnd() * 8], [x + w / 2, h]], c1);
        pm.set(x, h - 5, hexToRgba(0xff8030));
        pm.set(x + 2, h - 8, hexToRgba(0xffc040));
      }
      for (let i = 0; i < 60; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        pm.line(x, h, x + (rnd() - 0.5) * 4, h - 4 - rnd() * 10, 1, i % 3 === 0 ? c2 : c1);
      }
      break;
    }
    case 'posts': {
      for (let i = 0; i < 5; i++) {
        const x = 40 + i * 140 + rnd() * 30;
        pm.rect(x - 2, h - 44, 4, 44, c1);
        pm.rect(x - 6, h - 48, 12, 6, c1);
        pm.rect(x - 4, h - 46, 8, 3, hexToRgba(0xffc868));
      }
      for (let i = 0; i < 4; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        pm.ellipse(x, h - 6, 8, 7, c1);
        pm.ellipse(x, h - 12, 7, 3, c2);
      }
      break;
    }
  }
  return pm;
}

export function buildMistLayer(t: StageTheme): Pixmap {
  const pm = new Pixmap(256, 40);
  const rnd = seededRandom(555);
  for (let i = 0; i < 14; i++) {
    const x = rnd() * 256;
    const y = 12 + rnd() * 18;
    pm.ellipse(x, y, 20 + rnd() * 24, 5 + rnd() * 5, t.mist.color);
    pm.ellipse(x + 6, y - 2, 12 + rnd() * 12, 3 + rnd() * 3, t.mist.color2);
  }
  const wrap = pm.clone();
  pm.blit(wrap, -256, 0);
  pm.blit(wrap, 256, 0);
  return pm;
}

export function buildStage(theme: StageTheme = STAGES.ribera): StageLayers {
  return {
    sky: buildSky(theme),
    clouds: buildClouds(theme),
    far: buildFar(theme),
    river: buildRiver(theme),
    mid: buildMid(theme),
    ground: buildGround(theme),
    fore: buildForeground(theme),
    mist: buildMistLayer(theme),
  };
}
