import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config/game-config';
import { Pixmap, hexToRgba, seededRandom, type Rgba } from './PixelPainter';

/**
 * Escenarios procedimentales dirigidos por tema. Capas (todas con el mismo tamaño en todos los temas):
 *  sky (fija) - clouds (0.1) - far (0.25) - river (0.4, 3 frames) - mid (0.6) - ground (1.0) - fore (1.2) - mist (0.8)
 */

export const STAGE_LAYER_WIDTH = 640;

export type StageId =
  | 'ribera' | 'llanos' | 'laguna' | 'pantano' | 'infierno' | 'pueblo'
  | 'selva' | 'cantina' | 'cementerio';
export const STAGE_IDS: StageId[] = ['ribera', 'llanos', 'laguna', 'pantano', 'infierno', 'pueblo', 'selva', 'cantina', 'cementerio'];

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
  /** interior: el "cielo" es la pared del fondo (la luna se ve por la ventana) */
  interior?: boolean;
  clouds: { c1: Rgba; c2: Rgba; line: Rgba };
  far: { kind: 'mountains' | 'flat' | 'hills' | 'town' | 'hacienda' | 'cordillera' | 'shelves' | 'chapel'; color: number; color2: number; window?: number };
  water: { kind: 'river' | 'lagoon' | 'swamp' | 'plain' | 'field' | 'street' | 'thicket' | 'bar' | 'vaults'; bands: number[]; glint: number; glintDark: number; reflect: number | null };
  mid: { kind: 'jungle' | 'palms' | 'frailejones' | 'mangrove' | 'cane' | 'houses' | 'guadual' | 'tavern' | 'graves'; dark: number; mid: number; light: number; soil: number; accent: number };
  ground: { kind: 'soil' | 'dry' | 'mud' | 'ash' | 'cobble' | 'trail' | 'planks'; soil: number; soilD: number; soilL: number; grass: number; grassL: number; water: number };
  fore: { kind: 'rocks' | 'grass' | 'reeds' | 'embers' | 'posts' | 'ferns' | 'chairs' | 'crosses'; c1: number; c2: number };
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
  selva: {
    id: 'selva',
    name: 'Monte de la Patasola',
    subtitle: 'Selva antioqueña - noche de niebla',
    sky: [0x04070a, 0x07100f, 0x0a1714, 0x0e1f19, 0x12281e, 0x173023, 0x1d3a28, 0x26442e],
    stars: 26,
    moon: { x: 292, y: 62, r: 13, color: 0xc8dcc0, light: 0xeef8e4 },
    sun: null,
    clouds: { c1: [40, 60, 56, 170], c2: [60, 84, 76, 140], line: [26, 40, 38, 150] },
    far: { kind: 'cordillera', color: 0x0e1c1a, color2: 0x16282a },
    water: { kind: 'thicket', bands: [0x0a140e, 0x0c1810, 0x0e1c12, 0x0a1610], glint: 0xd8ff70, glintDark: 0x8ab040, reflect: null },
    mid: { kind: 'guadual', dark: 0x07100a, mid: 0x1c3420, light: 0x3a6438, soil: 0x1a140c, accent: 0x6a8a50 },
    ground: { kind: 'trail', soil: 0x2a2014, soilD: 0x1a140c, soilL: 0x4a3a24, grass: 0x1e3a1c, grassL: 0x2e5428, water: 0x1c2a22 },
    fore: { kind: 'ferns', c1: 0x050a06, c2: 0x0c180e },
    mist: { color: [170, 200, 180, 60], color2: [200, 225, 205, 48], alpha: 1 },
    ambient: 'fly',
    ambientTint: 0xd8ff70,
    lightning: false,
  },
  cantina: {
    id: 'cantina',
    name: 'Cantina La Última Copa',
    subtitle: 'Pueblo antioqueño - rockola a medianoche',
    sky: [0x1a0e0a, 0x24140c, 0x2c1a10, 0x341e12, 0x3a2214, 0x40261a, 0x462a1c, 0x4c2e1e],
    stars: 0,
    moon: { x: 306, y: 45, r: 7, color: 0xe8e0c0, light: 0xfff8e0 },
    sun: null,
    interior: true,
    clouds: { c1: [150, 140, 130, 22], c2: [180, 170, 160, 18], line: [120, 110, 100, 12] },
    far: { kind: 'shelves', color: 0x241208, color2: 0x4a2c16, window: 0xffd080 },
    water: { kind: 'bar', bands: [0xa06a38, 0x5a3418, 0x4a2a14, 0x341c0c], glint: 0xffe0a0, glintDark: 0xc89040, reflect: null },
    mid: { kind: 'tavern', dark: 0x1a0e08, mid: 0x3a2414, light: 0x6a4424, soil: 0x2a1a10, accent: 0xffc870 },
    ground: { kind: 'planks', soil: 0x4a2e18, soilD: 0x2e1c0e, soilL: 0x5a3a20, grass: 0x5a3a1e, grassL: 0x7a5230, water: 0x2a1a0e },
    fore: { kind: 'chairs', c1: 0x0c0604, c2: 0x1e120a },
    mist: { color: [190, 170, 150, 26], color2: [210, 195, 175, 20], alpha: 0.6 },
    ambient: 'fly',
    ambientTint: 0xffd8a0,
    lightning: false,
  },
  cementerio: {
    id: 'cementerio',
    name: 'Cementerio de las Ánimas',
    subtitle: 'Camposanto del pueblo - noche de difuntos',
    sky: [0x05040c, 0x0a0816, 0x100c20, 0x16122a, 0x1c1834, 0x241e3c, 0x2c2444, 0x3a2c4c],
    stars: 60,
    moon: { x: 84, y: 66, r: 22, color: 0xd0d0e0, light: 0xf4f4ff },
    sun: null,
    clouds: { c1: [60, 56, 84, 150], c2: [90, 86, 116, 120], line: [40, 36, 60, 130] },
    far: { kind: 'chapel', color: 0x100c1c, color2: 0x1c1830, window: 0xf0b050 },
    water: { kind: 'vaults', bands: [0x7a7a94, 0x5a5a74, 0x4c4c64, 0x3a3a50], glint: 0xffd070, glintDark: 0xff8030, reflect: null },
    mid: { kind: 'graves', dark: 0x0c0a14, mid: 0x3e3e52, light: 0x72728a, soil: 0x1c1a20, accent: 0xc8c8d8 },
    ground: { kind: 'soil', soil: 0x2a2620, soilD: 0x1c1914, soilL: 0x3e382c, grass: 0x26301e, grassL: 0x34422a, water: 0x22263a },
    fore: { kind: 'crosses', c1: 0x07060c, c2: 0x12101a },
    mist: { color: [180, 190, 220, 58], color2: [210, 215, 240, 46], alpha: 0.8 },
    ambient: 'fly',
    ambientTint: 0x9fd0ff,
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

function paintMoon(pm: Pixmap, moon: NonNullable<StageTheme['moon']>): void {
  const { x: mx, y: my, r, color, light } = moon;
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

/** Curva colgante entre dos ganchos (guirnaldas, bejucos). */
function sag(x: number, x0: number, x1: number, y0: number, depth: number): number {
  const u = (x - x0) / (x1 - x0);
  return y0 + depth * 4 * u * (1 - u);
}

/** Pared del fondo de la cantina: tablas, zócalo pintado, ventana con luna, reloj, almanaque y guirnaldas. */
function buildCantinaWall(t: StageTheme): Pixmap {
  const pm = new Pixmap(GAME_WIDTH, GAME_HEIGHT);
  const rnd = seededRandom(31);
  const boards = [0x3a2214, 0x40261a, 0x351f12].map((c) => hexToRgba(c));
  const seam = hexToRgba(0x1c0f08);
  for (let x = 0; x < GAME_WIDTH; x += 12) {
    pm.rect(x, 0, 12, GAME_HEIGHT, boards[(x / 12) % 3]);
    pm.vline(x, 0, GAME_HEIGHT, seam);
    for (let k = 0; k < 4; k++) {
      const vx = x + 3 + Math.floor(rnd() * 7);
      const vy = rnd() * GAME_HEIGHT;
      pm.vline(vx, vy, vy + 6 + rnd() * 18, [90, 56, 30, 70]);
    }
  }
  // zócalo pintado de verde con filete
  pm.rect(0, 112, GAME_WIDTH, GAME_HEIGHT - 112, hexToRgba(0x1c3a2c));
  pm.dither(0, 112, GAME_WIDTH, GAME_HEIGHT - 112, hexToRgba(0x16301f), 1);
  pm.rect(0, 110, GAME_WIDTH, 3, hexToRgba(0x8a5a2a));
  pm.hline(0, GAME_WIDTH, 110, hexToRgba(0xb07a3a));
  // techo y vigas
  pm.rect(0, 0, GAME_WIDTH, 9, hexToRgba(0x120804));
  for (let x = 6; x < GAME_WIDTH; x += 64) {
    pm.rect(x, 0, 10, 15, hexToRgba(0x1a0e08));
    pm.hline(x, x + 9, 14, hexToRgba(0x3a2214));
  }
  // ventana a la calle, de noche, con la luna
  const wx = 292;
  const wy = 32;
  pm.rect(wx - 4, wy - 4, 60, 56, hexToRgba(0x140a06));
  const night = [0x080a1c, 0x0c1024, 0x10162c, 0x161c34];
  for (let i = 0; i < 4; i++) pm.rect(wx, wy + i * 12, 52, 12, hexToRgba(night[i]));
  for (let i = 0; i < 8; i++) pm.set(wx + 3 + Math.floor(rnd() * 46), wy + 2 + Math.floor(rnd() * 20), hexToRgba(0xc8c0e0));
  if (t.moon) paintMoon(pm, t.moon);
  // tejados del frente al otro lado de la calle
  pm.polygon([[wx, wy + 48], [wx, wy + 36], [wx + 18, wy + 30], [wx + 34, wy + 36], [wx + 52, wy + 32], [wx + 52, wy + 48]], hexToRgba(0x06060e));
  pm.rect(wx + 8, wy + 40, 3, 4, hexToRgba(0xf0c060));
  pm.rect(wx + 38, wy + 41, 3, 3, hexToRgba(0xf0c060));
  pm.rect(wx + 25, wy, 2, 48, hexToRgba(0x2a160c));
  pm.rect(wx, wy + 23, 52, 2, hexToRgba(0x2a160c));
  pm.rect(wx - 4, wy + 48, 60, 3, hexToRgba(0x5a3418));
  // cortina de cuadros a un lado
  for (let y = wy - 4; y < wy + 46; y++) {
    for (let x = wx + 40; x < wx + 58; x++) {
      const check = (Math.floor(x / 3) + Math.floor(y / 3)) % 2 === 0;
      pm.set(x, y, hexToRgba(check ? 0x8a1c1c : 0xc8b8a0));
    }
  }
  pm.vline(wx + 40, wy - 4, wy + 46, hexToRgba(0x4a0c0c));
  // reloj de pared
  const [ckx, cky] = [42, 62];
  pm.circle(ckx, cky, 10, hexToRgba(0x2a160c));
  pm.circle(ckx, cky, 8, hexToRgba(0xe0d4b0));
  pm.line(ckx, cky, ckx, cky - 6, 1, hexToRgba(0x1a0e08));
  pm.line(ckx, cky, ckx + 4, cky + 2, 1, hexToRgba(0x1a0e08));
  for (let a = 0; a < 12; a++) pm.set(ckx + Math.cos((a * Math.PI) / 6) * 7, cky + Math.sin((a * Math.PI) / 6) * 7, hexToRgba(0x5a4a3a));
  // almanaque viejo con la reina del aguardiente
  pm.rect(78, 36, 28, 40, hexToRgba(0xd8ccb0));
  pm.rect(80, 38, 24, 20, hexToRgba(0xb02a28));
  pm.circle(92, 45, 4, hexToRgba(0xe0a880));
  pm.rect(88, 49, 8, 9, hexToRgba(0xf0d040));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) pm.rect(81 + c * 4, 61 + r * 3, 2, 1, hexToRgba(0x6a5a4a));
  pm.rect(91, 34, 2, 2, hexToRgba(0x8a8a8a));
  // espejo con marco y escudo de equipo al centro
  pm.rect(170, 40, 46, 30, hexToRgba(0x6a4424));
  pm.rect(172, 42, 42, 26, hexToRgba(0x2c2a30));
  for (let i = 0; i < 6; i++) pm.line(176 + i * 7, 66, 184 + i * 7, 44, 1, [200, 200, 220, 40]);
  pm.rect(232, 44, 14, 18, hexToRgba(0x0a6a3a));
  pm.rect(234, 46, 10, 6, hexToRgba(0xf0f0f0));
  pm.rect(234, 52, 10, 8, hexToRgba(0x0a6a3a));
  pm.hline(234, 243, 55, hexToRgba(0xf0f0f0));
  // banderines tricolor
  const flag = [0xf8d030, 0x2040a0, 0xc02020].map((c) => hexToRgba(c));
  for (let span = 0; span < GAME_WIDTH; span += 128) {
    let k = 0;
    for (let x = span; x < span + 128; x++) pm.set(x, sag(x, span, span + 128, 10, 10), hexToRgba(0x2a2420));
    for (let x = span + 6; x < span + 124; x += 9) {
      const y = Math.round(sag(x, span, span + 128, 10, 10));
      pm.polygon([[x - 3, y], [x + 3, y], [x, y + 6]], flag[k++ % 3]);
    }
  }
  // bombillos de colores con su resplandor
  const bulbs = [0xff5050, 0x50ff70, 0xffd040, 0x50a0ff, 0xff70d0].map((c) => hexToRgba(c));
  for (let span = -32; span < GAME_WIDTH; span += 96) {
    for (let x = span; x < span + 96; x++) pm.set(x, sag(x, span, span + 96, 26, 14), hexToRgba(0x1a1410));
    let k = Math.abs(span) % 5;
    for (let x = span + 8; x < span + 92; x += 12) {
      const y = Math.round(sag(x, span, span + 96, 26, 14));
      const c = bulbs[k++ % 5];
      pm.dither(x - 4, y - 2, 9, 9, [c[0], c[1], c[2], 60], x);
      pm.rect(x - 1, y + 1, 3, 3, c);
      pm.set(x, y + 1, hexToRgba(0xffffff));
      pm.set(x, y, hexToRgba(0x2a2420));
    }
  }
  return pm;
}

export function buildSky(t: StageTheme): Pixmap {
  if (t.interior) return buildCantinaWall(t);
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
  if (t.moon) paintMoon(pm, t.moon);
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
    case 'cordillera': {
      // montañas empinadas de Antioquia con bancos de niebla entre filos
      const back = hexToRgba(0x1e3432);
      const ridge = (base: number, a: number, b: number, ph: number, c: Rgba) => {
        const pts: [number, number][] = [[0, h]];
        for (let x = 0; x <= STAGE_LAYER_WIDTH; x += 8) {
          pts.push([x, base + Math.sin(x * a + ph) * 14 + Math.sin(x * b) * 6 + rnd() * 3]);
        }
        pts.push([STAGE_LAYER_WIDTH, h]);
        pm.polygon(pts, c);
      };
      ridge(32, 0.019, 0.071, 0, back);
      pm.dither(0, 40, STAGE_LAYER_WIDTH, 12, [170, 200, 190, 46], 0);
      pm.rect(0, 50, STAGE_LAYER_WIDTH, 6, [170, 200, 190, 30]);
      ridge(56, 0.027, 0.09, 2, c2);
      // palmas de cera asomando sobre el filo
      for (let i = 0; i < 7; i++) {
        const x = 30 + i * 92 + rnd() * 30;
        const base = 58 + Math.sin(x * 0.027 + 2) * 14;
        const top = base - 22 - rnd() * 10;
        pm.vline(x, top, base, c2);
        for (let a = -3; a <= 3; a++) pm.line(x, top, x + a * 3, top - 3 + Math.abs(a) * 2, 1, c2);
      }
      pm.dither(0, 66, STAGE_LAYER_WIDTH, 10, [170, 200, 190, 40], 1);
      // bosque cercano: copas redondas y yarumos plateados
      pm.rect(0, 84, STAGE_LAYER_WIDTH, h - 84, c1);
      for (let x = 0; x < STAGE_LAYER_WIDTH; x += 7) pm.circle(x + rnd() * 4, 82 + rnd() * 5, 5 + rnd() * 5, c1);
      const silver = hexToRgba(0x5a7a70);
      for (let i = 0; i < 9; i++) {
        const x = 20 + i * 72 + rnd() * 20;
        const top = 64 + rnd() * 8;
        pm.vline(x, top, 86, silver);
        for (const d of [-1, 1]) {
          pm.line(x, top + 6, x + d * 6, top + 1, 1, silver);
          for (let a = 0; a < 5; a++) pm.line(x + d * 6, top + 1, x + d * 6 + (a - 2) * 2, top - 2 + Math.abs(a - 2), 1, silver);
        }
      }
      break;
    }
    case 'shelves': {
      // contrabarra: paneles de madera, espejos y repisas con botellas
      const sh0 = 16;
      pm.rect(0, sh0, STAGE_LAYER_WIDTH, 94 - sh0, c1);
      const shelf = hexToRgba(t.far.color2);
      const edge = hexToRgba(0x7a4a24);
      const mirror = hexToRgba(0x2a2628);
      for (let bay = 0; bay < STAGE_LAYER_WIDTH; bay += 120) {
        pm.rect(bay + 8, sh0 + 4, 104, 70, mirror);
        for (let k = 0; k < 7; k++) pm.line(bay + 14 + k * 15, 88, bay + 30 + k * 15, sh0 + 6, 1, [220, 200, 180, 22]);
        pm.rect(bay, sh0, 8, 94 - sh0, shelf);
        pm.vline(bay + 1, sh0, 94, edge);
      }
      // licorera: aguardiente (tapa roja), ron, guaro verde, whisky
      const kinds = [
        { body: [150, 180, 170, 210] as Rgba, label: 0xc82020, cap: 0xd02020, w: 4, h: 14 },
        { body: hexToRgba(0x7a3c10), label: 0xf0d040, cap: 0x2a1408, w: 5, h: 12 },
        { body: hexToRgba(0x1e5a2a), label: 0xe8e0c8, cap: 0xc8a040, w: 4, h: 15 },
        { body: hexToRgba(0x9a5a18), label: 0x202020, cap: 0x101010, w: 6, h: 11 },
      ];
      for (const sy of [38, 62, 86]) {
        pm.rect(0, sy, STAGE_LAYER_WIDTH, 3, shelf);
        pm.hline(0, STAGE_LAYER_WIDTH, sy, edge);
        pm.hline(0, STAGE_LAYER_WIDTH, sy + 3, hexToRgba(0x120804));
        let x = 2 + rnd() * 4;
        while (x < STAGE_LAYER_WIDTH - 6) {
          if (x % 120 < 9) { x += 9; continue; }
          const b = kinds[Math.floor(rnd() * kinds.length)];
          const bh = b.h - Math.floor(rnd() * 3);
          const top = sy - bh;
          pm.rect(x, top + 4, b.w, bh - 4, b.body);
          pm.rect(x + Math.floor(b.w / 2) - 1, top, 2, 4, b.body);
          pm.rect(x + Math.floor(b.w / 2) - 1, top - 1, 2, 1, hexToRgba(b.cap));
          pm.rect(x, top + 8, b.w, 3, hexToRgba(b.label));
          pm.vline(x, top + 4, sy - 1, [255, 240, 210, 90]);
          x += b.w + 1 + Math.floor(rnd() * 3);
        }
      }
      // puerta de vaivén hacia la calle oscura
      const dx = 392;
      pm.rect(dx - 4, 0, 46, 94, hexToRgba(0x120804));
      for (let y = 4; y < 94; y++) pm.hline(dx, dx + 37, y, hexToRgba(y < 40 ? 0x080a18 : y < 70 ? 0x0a0e1e : 0x101424));
      pm.dither(dx + 22, 4, 14, 14, [255, 210, 120, 70], 0);
      pm.rect(dx + 28, 8, 3, 3, hexToRgba(0xffe0a0));
      pm.vline(dx + 29, 11, 70, hexToRgba(0x04040a));
      pm.polygon([[dx, 70], [dx + 12, 60], [dx + 26, 64], [dx + 37, 58], [dx + 37, 94], [dx, 94]], hexToRgba(0x05050c));
      for (let x = dx + 2; x < dx + 37; x += 5) pm.set(x, 88, hexToRgba(0x2a2a3a));
      for (const side of [0, 19]) {
        pm.rect(dx + side, 34, 18, 30, hexToRgba(0x5a3418));
        for (let k = 2; k < 18; k += 3) pm.vline(dx + side + k, 36, 62, hexToRgba(0x3a200e));
        pm.hline(dx + side, dx + side + 17, 34, hexToRgba(0x8a5a2a));
      }
      break;
    }
    case 'chapel': {
      // loma con capilla, cipreses y el pueblo dormido a lo lejos
      const pts: [number, number][] = [[0, h]];
      for (let x = 0; x <= STAGE_LAYER_WIDTH; x += 6) {
        const hill = 22 * Math.exp(-(((x - 320) / 130) ** 2));
        pts.push([x, 88 - hill + Math.sin(x * 0.04) * 2]);
      }
      pts.push([STAGE_LAYER_WIDTH, h]);
      pm.polygon(pts, c1);
      const win = hexToRgba(t.far.window ?? 0xf0b050);
      for (let i = 0; i < 9; i++) {
        const x = 10 + i * 22 + rnd() * 6;
        const w = 12 + rnd() * 8;
        const top = 80 + rnd() * 4;
        pm.rect(x, top, w, 90 - top, c2);
        pm.polygon([[x - 1, top], [x + w / 2, top - 4], [x + w + 1, top]], c2);
        if (rnd() > 0.5) pm.rect(x + 3, top + 3, 2, 2, win);
      }
      const wall = hexToRgba(0x3a3650);
      const cx = 320;
      pm.rect(cx - 26, 46, 52, 22, wall);
      pm.polygon([[cx - 30, 47], [cx, 32], [cx + 30, 47]], hexToRgba(0x241e30));
      pm.rect(cx + 18, 22, 14, 46, wall);
      pm.polygon([[cx + 16, 23], [cx + 25, 8], [cx + 34, 23]], hexToRgba(0x241e30));
      pm.vline(cx + 25, 2, 8, wall);
      pm.hline(cx + 22, cx + 28, 4, wall);
      pm.rect(cx + 22, 28, 6, 7, hexToRgba(0x0c0a14));
      pm.vline(cx - 1, 54, 67, hexToRgba(0x0c0a14));
      pm.rect(cx - 5, 56, 10, 12, hexToRgba(0x0c0a14));
      pm.circle(cx, 41, 2.5, win);
      pm.rect(cx - 18, 52, 4, 6, win);
      pm.vline(cx - 26, 46, 67, [200, 200, 230, 60]);
      const cypress = (x: number, base: number, ch: number) => {
        pm.polygon([[x - 4, base], [x - 3, base - ch * 0.6], [x, base - ch], [x + 3, base - ch * 0.6], [x + 4, base]], hexToRgba(0x07060e));
      };
      for (const [x, ch] of [[262, 30], [278, 38], [368, 34], [384, 26], [180, 22], [470, 26], [560, 30], [60, 20]] as const) {
        const base = 88 - 22 * Math.exp(-(((x - 320) / 130) ** 2)) + 2;
        cypress(x, base, ch);
      }
      break;
    }
  }
  return pm;
}

/* ------------------------------------------------------------------ */
/* Agua / franja media lejana (3 fotogramas)                          */
/* ------------------------------------------------------------------ */

/** Franja media de los escenarios sin agua: maleza con cocuyos, barra de la cantina, muro de bóvedas. */
function buildBand(t: StageTheme): Pixmap[] {
  const frames: Pixmap[] = [];
  const h = 44;
  const W = STAGE_LAYER_WIDTH;
  const b = t.water.bands.map((c) => hexToRgba(c));
  for (let f = 0; f < 3; f++) {
    const pm = new Pixmap(W, h);
    const rnd = seededRandom(404);
    if (t.water.kind === 'thicket') {
      for (let y = 0; y < h; y++) pm.hline(0, W, y, b[y < 10 ? 0 : y < 24 ? 1 : y < 36 ? 2 : 3]);
      // hojas grandes (bijao, plátano) y helechos
      for (let i = 0; i < 70; i++) {
        const x = rnd() * W;
        const y = 4 + rnd() * (h - 6);
        const c = hexToRgba([0x10241a, 0x163020, 0x0c1c12][i % 3]);
        pm.ellipse(x, y, 4 + rnd() * 7, 2 + rnd() * 2, c);
        pm.hline(x - 3, x + 3, y, hexToRgba(0x1e3c26));
      }
      for (let i = 0; i < 30; i++) {
        const x = rnd() * W;
        const y = 10 + rnd() * 30;
        for (let k = 0; k < 6; k++) pm.line(x + k * 2, y - k, x + k * 2 + 2, y - k + 3, 1, hexToRgba(0x24442a));
      }
      // cocuyos que se prenden y apagan
      for (let i = 0; i < 46; i++) {
        const x = rnd() * W;
        const y = 2 + rnd() * (h - 4);
        if ((i + f) % 3 === 0) continue;
        const c = hexToRgba((i + f) % 3 === 1 ? t.water.glint : t.water.glintDark);
        pm.set(x, y, c);
        pm.set(x - 1, y, [c[0], c[1], c[2], 70]);
        pm.set(x + 1, y, [c[0], c[1], c[2], 70]);
        pm.set(x, y - 1, [c[0], c[1], c[2], 70]);
        pm.set(x, y + 1, [c[0], c[1], c[2], 70]);
      }
    } else if (t.water.kind === 'bar') {
      // mostrador: cubierta, frente con tableros y baranda de bronce
      pm.rect(0, 0, W, 6, b[0]);
      pm.hline(0, W, 0, hexToRgba(0xc89060));
      pm.hline(0, W, 5, hexToRgba(0x2a1608));
      pm.rect(0, 6, W, h - 6, b[2]);
      for (let x = 0; x < W; x += 40) {
        pm.rect(x, 6, 5, h - 6, b[1]);
        pm.rect(x + 9, 10, 27, 22, b[3]);
        pm.hline(x + 9, x + 35, 10, hexToRgba(0x241208));
        pm.vline(x + 9, 10, 31, hexToRgba(0x241208));
        pm.hline(x + 9, x + 35, 31, hexToRgba(0x6a4220));
        pm.vline(x + 35, 10, 31, hexToRgba(0x6a4220));
        pm.rect(x + 14, 15, 17, 12, b[2]);
      }
      pm.rect(0, 36, W, 2, hexToRgba(0xb08838));
      pm.hline(0, W, 36, hexToRgba(0xf0d080));
      for (let x = 20; x < W; x += 80) pm.rect(x, 38, 2, 4, hexToRgba(0x6a5020));
      // reflejos de los bombillos en la cubierta (titilan)
      const glow = [0xff5050, 0x50ff70, 0xffd040, 0x50a0ff, 0xff70d0];
      for (let i = 0; i < 26; i++) {
        const x = (i * 47 + 11) % W;
        if ((i + f) % 3 === 2) continue;
        pm.hline(x, x + 2, 2, rgba(glow[i % 5], 170));
      }
      for (let i = 0; i < 12; i++) {
        const x = (i * 97 + f * 3) % W;
        pm.hline(x, x + 3, 36, hexToRgba((i + f) % 2 ? t.water.glint : t.water.glintDark));
      }
    } else {
      // muro de bóvedas encalado con lápidas, flores y velas
      pm.rect(0, 0, W, h, b[1]);
      pm.rect(0, 0, W, 4, b[0]);
      pm.hline(0, W, 4, b[3]);
      const flowers = [0xd02030, 0xf0c020, 0xf0f0f0, 0xe060a0].map((c) => hexToRgba(c));
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < W / 20; col++) {
          const x = col * 20 + 3;
          const y = 7 + row * 12;
          if (col % 16 === 15) continue;
          const roll = rnd();
          if (roll < 0.12) {
            pm.rect(x, y, 15, 10, hexToRgba(0x14121c));
            continue;
          }
          pm.rect(x, y, 15, 10, b[0]);
          pm.hline(x, x + 14, y + 9, b[3]);
          pm.vline(x + 14, y, y + 9, b[3]);
          pm.vline(x + 7, y + 2, y + 6, b[2]);
          pm.hline(x + 6, x + 8, y + 3, b[2]);
          if (roll > 0.55) {
            for (let k = 0; k < 3; k++) pm.set(x + 2 + k * 2 + Math.floor(rnd() * 2), y + 8 - (k % 2), flowers[Math.floor(rnd() * 4)]);
          }
          if (roll > 0.8) {
            pm.vline(x + 12, y + 6, y + 8, hexToRgba(0xf0ead0));
            const lit = (col + row + f) % 4 !== 0;
            if (lit) {
              pm.set(x + 12, y + 5, hexToRgba((col + f) % 2 ? t.water.glint : t.water.glintDark));
              pm.dither(x + 10, y + 3, 5, 5, rgba(t.water.glint, 60), 0);
            }
          }
        }
      }
      // arco de entrada al fondo
      for (let col = 0; col < W / 20; col += 16) {
        const x = col * 20 + 15 * 20 + 1;
        pm.rect(x, 10, 18, h - 10, hexToRgba(0x07060c));
        pm.ellipse(x + 9, 10, 9, 6, hexToRgba(0x07060c));
      }
      pm.dither(0, h - 6, W, 6, rgba(0x14121c, 140), 0);
    }
    frames.push(pm);
  }
  return frames;
}

export function buildRiver(t: StageTheme): Pixmap[] {
  if (t.water.kind === 'thicket' || t.water.kind === 'bar' || t.water.kind === 'vaults') return buildBand(t);
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
    case 'guadual':
      paintGuadual(pm, t, rnd);
      break;
    case 'tavern':
      paintTavern(pm, t, rnd);
      break;
    case 'graves':
      paintGraves(pm, t, rnd);
      break;
  }
  return pm;
}

/** Monte antioqueño: guaduales, una ceiba, yarumos plateados, helechos de palo y bejucos. */
function paintGuadual(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const h = pm.height;
  const W = pm.width;
  const dark = hexToRgba(t.mid.dark);
  const mid = hexToRgba(t.mid.mid);
  const light = hexToRgba(t.mid.light);
  const accent = hexToRgba(t.mid.accent);
  // bejucos colgando entre los árboles
  for (let x0 = -40; x0 < W; x0 += 90 + Math.floor(rnd() * 40)) {
    const x1 = x0 + 70 + rnd() * 60;
    const y0 = 6 + rnd() * 16;
    const d = 14 + rnd() * 18;
    for (let x = x0; x < x1; x++) pm.set(x, sag(x, x0, x1, y0, d), mid);
    for (let k = 0; k < 3; k++) {
      const lx = x0 + rnd() * (x1 - x0);
      const ly = sag(lx, x0, x1, y0, d);
      const len = 16 + rnd() * 40;
      for (let y = ly; y < ly + len; y++) pm.set(lx + Math.sin(y * 0.3) * 1.2, y, dark);
      pm.ellipse(lx, ly + len, 2, 1.5, mid);
    }
  }
  // ceiba con estribos
  const cx = 330;
  pm.polygon([[cx - 16, h], [cx + 16, h], [cx + 9, 16], [cx - 9, 16]], dark);
  pm.polygon([[cx - 44, h], [cx - 14, h - 40], [cx - 10, h]], dark);
  pm.polygon([[cx + 46, h], [cx + 13, h - 36], [cx + 10, h]], dark);
  pm.polygon([[cx - 26, h], [cx - 8, h - 60], [cx - 4, h]], dark);
  pm.line(cx - 6, h, cx - 4, 18, 1, mid);
  pm.line(cx + 5, h - 10, cx + 6, 30, 1, [60, 80, 64, 120]);
  for (let k = 0; k < 9; k++) {
    const ex = cx + (k - 4) * 15 + rnd() * 6;
    const ey = 4 + Math.abs(k - 4) * 2 + rnd() * 4;
    pm.ellipse(ex, ey, 18 + rnd() * 8, 6 + rnd() * 3, k % 2 ? dark : mid);
    pm.ellipse(ex - 4, ey - 3, 7, 2, light);
  }
  for (const d of [-1, 1]) pm.line(cx, 20, cx + d * 40, 6, 3, dark);
  // guaduales: cañas que se arquean, con nudos y follaje plumoso
  for (const gx of [70, 200, 470, 600]) {
    for (let k = 0; k < 13; k++) {
      const bx = gx + (k - 6) * 3 + rnd() * 2;
      const lean = (k - 6) * 3.2 + (rnd() - 0.5) * 6;
      const top = 2 + rnd() * 14;
      let px = bx;
      let py = h - 9;
      const steps = 14;
      for (let i = 1; i <= steps; i++) {
        const u = i / steps;
        const nx = bx + lean * u * u * 2.2;
        const ny = h - 9 - (h - 9 - top) * u;
        pm.line(px, py, nx, ny, 2, k % 3 === 0 ? light : mid);
        pm.set(px - 1, py, dark);
        if (i % 2 === 0) pm.hline(nx - 1, nx + 1, ny, accent);
        if (u > 0.45) {
          for (const d of [-1, 1]) {
            pm.line(nx, ny, nx + d * (4 + rnd() * 5), ny + 3 + rnd() * 4, 1, rnd() > 0.5 ? light : mid);
            pm.line(nx, ny + 2, nx + d * (2 + rnd() * 4), ny + 6 + rnd() * 3, 1, mid);
          }
        }
        px = nx;
        py = ny;
      }
    }
  }
  // yarumos de hojas plateadas
  const silver = hexToRgba(0x9ab4a8);
  const silverD = hexToRgba(0x5a7a70);
  for (const yx of [128, 548]) {
    const top = 14 + rnd() * 6;
    pm.line(yx, h - 9, yx, top + 12, 2, hexToRgba(0x6a7a70));
    for (const [d, len] of [[-1, 18], [1, 16], [0, 0]] as const) {
      const ex = yx + d * len;
      const ey = top + (d === 0 ? 0 : 6);
      pm.line(yx, top + 16, ex, ey, 1, hexToRgba(0x6a7a70));
      for (let a = 0; a < 7; a++) {
        const ang = Math.PI + (a / 6) * Math.PI;
        pm.line(ex, ey, ex + Math.cos(ang) * 6, ey + Math.sin(ang) * 4 + 4, 1, a % 2 ? silver : silverD);
      }
    }
  }
  // helechos de palo
  for (const fx of [262, 418, 20]) {
    const top = 40 + rnd() * 8;
    pm.line(fx, h - 9, fx + 2, top, 2, dark);
    for (let a = 0; a < 8; a++) {
      const dir = a % 2 ? 1 : -1;
      const len = 10 + (a >> 1) * 3;
      let px = fx + 2;
      let py = top;
      for (let i = 1; i <= 6; i++) {
        const nx = fx + 2 + dir * (len * i) / 6;
        const ny = top - 4 + ((i * i) / 36) * 12 + (a >> 1) * 2 - 4;
        pm.line(px, py, nx, ny, 1, mid);
        pm.set(nx, ny + 1, light);
        px = nx;
        py = ny;
      }
    }
  }
  // sotobosque
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W;
    pm.ellipse(x, h - 12, 5 + rnd() * 9, 3 + rnd() * 3, i % 3 === 0 ? mid : dark);
  }
}

/** Interior de cantina: columnas, lámparas colgantes, rockola, mesas con botellas y butacos. */
function paintTavern(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const h = pm.height;
  const dark = hexToRgba(t.mid.dark);
  const mid = hexToRgba(t.mid.mid);
  const light = hexToRgba(t.mid.light);
  const warm = t.mid.accent;
  // luz de las lámparas (debajo de todo lo demás)
  const lamps = [216, 436, 620];
  for (const lx of lamps) {
    for (let y = 30; y < h - 10; y++) {
      const half = 6 + (y - 30) * 0.45;
      pm.dither(lx - half, y, half * 2, 1, rgba(warm, 26), y);
    }
  }
  for (const px of [100, 320, 540]) {
    pm.rect(px - 4, 0, 8, h - 8, dark);
    pm.vline(px - 3, 0, h - 9, mid);
    pm.line(px - 4, 16, px - 18, 0, 2, dark);
    pm.line(px + 4, 16, px + 18, 0, 2, dark);
  }
  for (const lx of lamps) {
    pm.vline(lx, 0, 24, hexToRgba(0x0c0806));
    pm.polygon([[lx - 3, 24], [lx + 3, 24], [lx + 9, 31], [lx - 9, 31]], hexToRgba(0x1e5a3a));
    pm.hline(lx - 8, lx + 8, 30, hexToRgba(0x2e7a4c));
    pm.rect(lx - 2, 31, 5, 2, hexToRgba(0xfff0b0));
  }
  // rockola con el arco de luces
  const rx = 164;
  const top = 44;
  pm.dither(rx - 22, top - 14, 44, 70, [255, 120, 190, 36], 0);
  pm.rect(rx - 14, top + 6, 28, h - 10 - top - 6, hexToRgba(0x3a1c22));
  const arc = [0xff9a30, 0xff5aa0, 0x60ffa0, 0xffe060];
  arc.forEach((c, i) => pm.ellipse(rx, top + 8, 14 - i * 2, 12 - i * 2, hexToRgba(c)));
  pm.ellipse(rx, top + 8, 6, 4, hexToRgba(0x2a1418));
  pm.rect(rx - 10, top + 14, 20, 12, hexToRgba(0x1a0e14));
  pm.circle(rx, top + 20, 4, hexToRgba(0x080608));
  pm.set(rx, top + 20, hexToRgba(0xff5aa0));
  for (let k = 0; k < 5; k++) pm.rect(rx - 9 + k * 4, top + 28, 2, 2, hexToRgba(arc[k % 4]));
  pm.rect(rx - 11, top + 32, 22, 22, hexToRgba(0x5a3a28));
  for (let gx = rx - 9; gx < rx + 10; gx += 3) pm.vline(gx, top + 34, top + 52, hexToRgba(0x2a160e));
  pm.vline(rx - 14, top + 8, h - 11, hexToRgba(0xff9a30));
  pm.vline(rx + 13, top + 8, h - 11, hexToRgba(0xff9a30));
  // mesas con botellas de cerveza y copitas, y sus sillas
  const table = (x: number) => {
    const ty = h - 32;
    for (const d of [-1, 1]) {
      const cx = x + d * 22;
      pm.rect(cx - 5, ty + 8, 10, 2, mid);
      pm.vline(cx - 5 * d, ty - 8, ty + 21, mid);
      pm.vline(cx + 4 * d, ty + 10, ty + 21, mid);
      for (let y = ty - 6; y < ty + 8; y += 4) pm.hline(cx - 5 * d, cx - 2 * d, y, light);
    }
    pm.ellipse(x, ty, 18, 3, light);
    pm.hline(x - 16, x + 16, ty - 2, hexToRgba(0x8a5a30));
    pm.vline(x, ty + 3, ty + 20, dark);
    pm.ellipse(x, ty + 21, 7, 1.5, dark);
    for (let i = 0; i < 4; i++) {
      const bx = x - 10 + i * 6 + Math.floor(rnd() * 2);
      pm.rect(bx, ty - 9, 3, 7, hexToRgba(0x6a3010));
      pm.rect(bx + 1, ty - 12, 1, 3, hexToRgba(0x6a3010));
      pm.set(bx, ty - 7, hexToRgba(0xffd080));
      pm.rect(bx, ty - 6, 3, 2, hexToRgba(0xe8e0c0));
    }
    pm.rect(x + 12, ty - 4, 2, 2, [220, 230, 230, 200]);
  };
  table(270);
  table(490);
  // butacos frente al mostrador
  for (const sx of [360, 396, 590, 30]) {
    pm.ellipse(sx, h - 36, 6, 2, light);
    pm.line(sx - 4, h - 35, sx - 6, h - 10, 1, mid);
    pm.line(sx + 4, h - 35, sx + 6, h - 10, 1, mid);
    pm.line(sx, h - 35, sx, h - 10, 1, dark);
    pm.hline(sx - 5, sx + 5, h - 20, mid);
  }
}

/** Camposanto: cipreses, mausoleo, ángel de piedra, lápidas, cruces y una verja de hierro. */
function paintGraves(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const h = pm.height;
  const W = pm.width;
  const dark = hexToRgba(t.mid.dark);
  const mid = hexToRgba(t.mid.mid);
  const light = hexToRgba(t.mid.light);
  const pale = hexToRgba(t.mid.accent);
  const cypress = (x: number, top: number, w: number) => {
    pm.polygon([[x - w, h - 9], [x - w * 0.8, top + (h - top) * 0.4], [x, top], [x + w * 0.8, top + (h - top) * 0.4], [x + w, h - 9]], dark);
    for (let y = top + 6; y < h - 12; y += 4) pm.set(x - w * 0.6 * ((y - top) / (h - top)) - 1, y, mid);
  };
  for (const [x, top, w] of [[40, 0, 10], [130, 14, 8], [404, 2, 11], [430, 20, 7], [610, 8, 9]] as const) cypress(x, top, w);
  // mausoleo
  const mx = 520;
  pm.rect(mx - 24, h - 54, 48, 45, mid);
  pm.polygon([[mx - 28, h - 54], [mx, h - 68], [mx + 28, h - 54]], light);
  pm.polygon([[mx - 22, h - 56], [mx, h - 65], [mx + 22, h - 56]], mid);
  pm.vline(mx, h - 78, h - 68, light);
  pm.hline(mx - 3, mx + 3, h - 75, light);
  for (const c of [-18, -12, 12, 18]) pm.vline(mx + c, h - 52, h - 10, light);
  pm.rect(mx - 7, h - 40, 14, 31, dark);
  for (let k = mx - 5; k < mx + 6; k += 3) pm.vline(k, h - 38, h - 10, hexToRgba(0x2a2a36));
  pm.vline(mx - 24, h - 54, h - 10, pale);
  // ángel sobre pedestal
  const ax = 250;
  pm.rect(ax - 7, h - 24, 14, 15, mid);
  pm.hline(ax - 8, ax + 7, h - 24, light);
  pm.polygon([[ax - 3, h - 46], [ax - 16, h - 64], [ax - 9, h - 40]], light);
  pm.polygon([[ax + 3, h - 46], [ax + 15, h - 66], [ax + 9, h - 40]], mid);
  pm.polygon([[ax - 4, h - 48], [ax + 4, h - 48], [ax + 7, h - 25], [ax - 7, h - 25]], light);
  pm.circle(ax, h - 51, 3, light);
  pm.line(ax + 3, h - 46, ax + 5, h - 58, 1, light);
  pm.vline(ax - 5, h - 46, h - 26, pale);
  // lápidas y cruces
  const flowers = [0xd02030, 0xf0c020, 0xf07020].map((c) => hexToRgba(c));
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W;
    if (Math.abs(x - mx) < 32 || Math.abs(x - ax) < 14) continue;
    const kind = i % 3;
    if (kind === 0) {
      const w = 8 + rnd() * 5;
      const th = 10 + rnd() * 8;
      pm.rect(x - w / 2, h - 9 - th, w, th, mid);
      pm.ellipse(x, h - 9 - th, w / 2, 3, mid);
      pm.vline(x - w / 2, h - 9 - th, h - 10, light);
      pm.hline(x - 2, x + 2, h - 5 - th, dark);
    } else {
      const ch = 14 + rnd() * 14;
      const lean = (rnd() - 0.5) * 6;
      const wood = kind === 1 ? hexToRgba(0x3a2a20) : light;
      pm.line(x, h - 9, x + lean, h - 9 - ch, 2, wood);
      const by = h - 9 - ch * 0.72;
      pm.line(x + lean * 0.7 - 5, by, x + lean * 0.7 + 5, by, 1, wood);
    }
    if (rnd() > 0.5) pm.set(x + 2, h - 10, flowers[i % 3]);
  }
  // verja de hierro alrededor de una tumba
  for (let x = 300; x < 360; x += 4) {
    pm.vline(x, h - 22, h - 9, dark);
    pm.set(x, h - 23, mid);
  }
  pm.hline(300, 356, h - 19, dark);
  pm.hline(300, 356, h - 12, dark);
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
  if (g.kind === 'planks') {
    // tablado de madera con juntas, clavos y manchas de trago
    for (let y = top; y < h; y += 6) {
      pm.rect(0, y, STAGE_LAYER_WIDTH, 6, (y / 6) % 2 ? soil : soilL);
      pm.hline(0, STAGE_LAYER_WIDTH, y + 5, soilD);
      let x = Math.floor(rnd() * 40);
      while (x < STAGE_LAYER_WIDTH) {
        pm.vline(x, y, y + 5, soilD);
        pm.set(x + 2, y + 2, hexToRgba(0x8a7a6a));
        x += 40 + Math.floor(rnd() * 50);
      }
      for (let k = 0; k < 14; k++) {
        const vx = rnd() * STAGE_LAYER_WIDTH;
        pm.hline(vx, vx + 4 + rnd() * 10, y + 1 + Math.floor(rnd() * 3), [20, 10, 4, 50]);
      }
    }
    for (let i = 0; i < 10; i++) pm.ellipse(rnd() * STAGE_LAYER_WIDTH, top + 8 + rnd() * 20, 5 + rnd() * 8, 1.5 + rnd(), [20, 10, 4, 70]);
    pm.rect(0, top - 3, STAGE_LAYER_WIDTH, 3, grassL);
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
  } else if (g.kind === 'trail') {
    // hojarasca, raíces y la trocha pisada (con huellas de un solo pie)
    const litter = [0x5a3418, 0x7a4a20, 0x3a2a14, 0x2a3a1c].map((c) => hexToRgba(c));
    for (let i = 0; i < 520; i++) pm.set(rnd() * STAGE_LAYER_WIDTH, top + 2 + rnd() * (h - top - 2), litter[i % 4]);
    for (let x = 0; x < STAGE_LAYER_WIDTH; x++) {
      const y = top + 9 + Math.sin(x * 0.02) * 2;
      pm.dither(x, y, 1, 8, soilL, 0);
    }
    for (let x = 30; x < STAGE_LAYER_WIDTH; x += 46) {
      const y = top + 11 + Math.sin(x * 0.02) * 2;
      pm.ellipse(x, y, 2, 1.2, soilD);
      pm.set(x - 2, y - 1, soilD);
    }
    for (let i = 0; i < 9; i++) {
      const x = rnd() * STAGE_LAYER_WIDTH;
      const y = top + 3 + rnd() * 16;
      for (let k = 0; k < 18; k++) pm.set(x + k, y + Math.sin(k * 0.4) * 1.5, soilD);
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
    case 'ferns': {
      // frondas de helecho y hojas anchas a contraluz
      for (let i = 0; i < 16; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        const len = 18 + rnd() * 20;
        const dir = rnd() > 0.5 ? 1 : -1;
        let px = x;
        let py = h;
        for (let k = 1; k <= 10; k++) {
          const u = k / 10;
          const nx = x + dir * len * u;
          const ny = h - len * 1.1 * Math.sin(u * 2.4) * 0.9;
          pm.line(px, py, nx, ny, 1, c1);
          if (k < 9) {
            pm.line(nx, ny, nx - dir * 2, ny - 4 + u * 2, 1, i % 2 ? c2 : c1);
            pm.line(nx, ny, nx + dir * 2, ny + 3, 1, c1);
          }
          px = nx;
          py = ny;
        }
      }
      for (let i = 0; i < 6; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        pm.polygon([[x, h], [x - 10, h - 16], [x - 4, h - 30], [x + 6, h - 18]], c1);
        pm.line(x, h, x - 3, h - 26, 1, c2);
      }
      break;
    }
    case 'chairs': {
      // respaldos de silla, canasta de cerveza y botellas vacías en el piso
      for (const x of [70, 300, 520]) {
        pm.rect(x - 9, h - 40, 3, 40, c1);
        pm.rect(x + 7, h - 40, 3, 40, c1);
        for (const y of [h - 38, h - 31, h - 24]) pm.rect(x - 8, y, 17, 3, c2);
      }
      for (const x of [180, 430]) {
        pm.rect(x - 12, h - 14, 24, 14, c2);
        for (let k = -10; k < 12; k += 4) {
          pm.rect(x + k, h - 22, 2, 8, c1);
          pm.rect(x + k, h - 24, 1, 2, c1);
        }
      }
      for (const x of [240, 610]) {
        pm.polygon([[x, h], [x + 3, h - 3], [x + 14, h - 4], [x + 14, h - 1]], c1);
      }
      break;
    }
    case 'crosses': {
      for (let i = 0; i < 110; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        pm.line(x, h, x + (rnd() - 0.5) * 6, h - 6 - rnd() * 14, 1, i % 3 === 0 ? c2 : c1);
      }
      for (const x of [90, 350, 580]) {
        pm.rect(x - 1, h - 30, 3, 30, c1);
        pm.rect(x - 7, h - 24, 15, 3, c1);
      }
      for (let x = 180; x < 250; x += 5) {
        pm.vline(x, h - 26, h, c1);
        pm.polygon([[x - 1, h - 26], [x, h - 30], [x + 1, h - 26]], c1);
      }
      pm.hline(178, 250, h - 22, c1);
      pm.hline(178, 250, h - 8, c1);
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
