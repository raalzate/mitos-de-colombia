import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config/game-config';
import { Pixmap, hexToRgba, seededRandom, type Rgba } from './PixelPainter';

/**
 * Escenarios procedimentales dirigidos por tema. Capas (todas con el mismo tamaño en todos los temas):
 *  sky (fija) - clouds (0.1) - far (0.25) - river (0.4, 3 frames) - mid (0.6) - ground (1.0) - fore (1.2) - mist (0.8)
 */

export const STAGE_LAYER_WIDTH = 640;

export type StageId =
  | 'ribera' | 'llanos' | 'laguna' | 'pantano' | 'infierno' | 'pueblo'
  | 'selva' | 'robledal' | 'cantina' | 'cementerio'
  | 'puente' | 'cafetal' | 'paramo' | 'botero' | 'comuna13';
export const STAGE_IDS: StageId[] = [
  'ribera', 'llanos', 'laguna', 'pantano', 'infierno', 'pueblo', 'selva', 'robledal', 'cantina', 'cementerio',
  'puente', 'cafetal', 'paramo', 'botero', 'comuna13',
];

export type AmbientKind = 'fly' | 'ember' | 'leaf' | 'drop' | 'none';

export interface StageTheme {
  id: StageId;
  name: string;
  subtitle: string;
  /** Bandas de cielo de arriba a abajo (hasta y=150). */
  sky: number[];
  stars: number;
  /** Vía Láctea: banda diagonal de estrellas (cielos despejados de alta montaña) */
  milkyWay?: boolean;
  moon: { x: number; y: number; r: number; color: number; light: number } | null;
  sun: { x: number; y: number; r: number; color: number; glow: number } | null;
  /** interior: el "cielo" es la pared del fondo (la luna se ve por la ventana) */
  interior?: boolean;
  clouds: { c1: Rgba; c2: Rgba; line: Rgba };
  far: { kind: 'mountains' | 'flat' | 'hills' | 'town' | 'hacienda' | 'cordillera' | 'shelves' | 'chapel' | 'canyon' | 'coffeehills' | 'peaks' | 'city' | 'barrio'; color: number; color2: number; window?: number };
  water: { kind: 'river' | 'lagoon' | 'swamp' | 'plain' | 'field' | 'street' | 'thicket' | 'bar' | 'vaults' | 'rapids' | 'coffee' | 'bog' | 'fountain' | 'rooftops'; bands: number[]; glint: number; glintDark: number; reflect: number | null };
  mid: { kind: 'jungle' | 'palms' | 'frailejones' | 'mangrove' | 'cane' | 'houses' | 'guadual' | 'tavern' | 'graves' | 'bridge' | 'trapiche' | 'paramo' | 'sculptures' | 'graffiti'; dark: number; mid: number; light: number; soil: number; accent: number };
  ground: { kind: 'soil' | 'dry' | 'mud' | 'ash' | 'cobble' | 'trail' | 'planks' | 'deck' | 'moss' | 'tiles' | 'concrete'; soil: number; soilD: number; soilL: number; grass: number; grassL: number; water: number };
  fore: { kind: 'rocks' | 'grass' | 'reeds' | 'embers' | 'posts' | 'ferns' | 'chairs' | 'crosses' | 'ropes' | 'plantain' | 'frailejon' | 'benches' | 'railing'; c1: number; c2: number };
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
  robledal: {
    id: 'robledal',
    name: 'Monte Puro',
    subtitle: 'Robledal de niebla - montaña arriba',
    sky: [0x06080e, 0x0a0e16, 0x10161e, 0x161e26, 0x1e282e, 0x283236, 0x323c3c, 0x3c4642],
    stars: 12,
    moon: { x: 112, y: 54, r: 16, color: 0xd8dccc, light: 0xf4f6ea },
    sun: null,
    clouds: { c1: [120, 132, 136, 150], c2: [150, 160, 162, 120], line: [80, 90, 96, 140] },
    far: { kind: 'mountains', color: 0x141c22, color2: 0x1e282c },
    water: { kind: 'thicket', bands: [0x101810, 0x121c14, 0x0e1610, 0x0c120e], glint: 0xc8e0b0, glintDark: 0x6a8a60, reflect: null },
    mid: { kind: 'jungle', dark: 0x0a120c, mid: 0x24342a, light: 0x4a6448, soil: 0x1e1a12, accent: 0x8aa078 },
    ground: { kind: 'trail', soil: 0x2e2a1c, soilD: 0x1c1a12, soilL: 0x46402a, grass: 0x2a4026, grassL: 0x3e5a34, water: 0x1e2a26 },
    fore: { kind: 'rocks', c1: 0x0a0e0c, c2: 0x182220 },
    mist: { color: [190, 205, 205, 82], color2: [220, 230, 228, 64], alpha: 1 },
    ambient: 'leaf',
    ambientTint: 0xb8c8a0,
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
  puente: {
    id: 'puente',
    name: 'Puente Colgante del Cauca',
    subtitle: 'Cañón del río Cauca - madrugada de crecida',
    sky: [0x05080e, 0x0a1018, 0x101a24, 0x162430, 0x1e2e3a, 0x283a44, 0x34464c, 0x425250],
    stars: 46,
    moon: { x: 238, y: 30, r: 15, color: 0xd8e0d8, light: 0xf6fbf4 },
    sun: null,
    clouds: { c1: [56, 74, 84, 170], c2: [86, 104, 112, 140], line: [34, 46, 54, 150] },
    far: { kind: 'canyon', color: 0x1c262c, color2: 0x223038 },
    water: { kind: 'rapids', bands: [0x2a4048, 0x22363e, 0x1c2e34, 0x16262a], glint: 0xe8f4f4, glintDark: 0x8ab0b8, reflect: 0xb8c8c0 },
    mid: { kind: 'bridge', dark: 0x0c1012, mid: 0x3c3a38, light: 0x6e685e, soil: 0x24180e, accent: 0xffc060 },
    ground: { kind: 'deck', soil: 0x4a3420, soilD: 0x22160c, soilL: 0x6a4c2c, grass: 0x5a4028, grassL: 0x86643a, water: 0x0e161a },
    fore: { kind: 'ropes', c1: 0x0a0806, c2: 0x3a2a18 },
    mist: { color: [200, 220, 228, 52], color2: [226, 238, 242, 42], alpha: 0.9 },
    ambient: 'leaf',
    ambientTint: 0x8aa878,
    lightning: false,
  },
  cafetal: {
    id: 'cafetal',
    name: 'Trapiche del Cafetal',
    subtitle: 'Eje cafetero - aguacero de medianoche',
    sky: [0x05070a, 0x090d10, 0x0d1316, 0x11191c, 0x162020, 0x1c2826, 0x23302c, 0x2b3832],
    stars: 0,
    moon: null,
    sun: null,
    clouds: { c1: [34, 44, 46, 230], c2: [52, 64, 64, 210], line: [18, 24, 26, 210] },
    far: { kind: 'coffeehills', color: 0x101a14, color2: 0x18261c, window: 0xffc060 },
    water: { kind: 'coffee', bands: [0x14241a, 0x112016, 0x0d1a12, 0x0a140e], glint: 0xd02828, glintDark: 0x9ab4c4, reflect: null },
    mid: { kind: 'trapiche', dark: 0x0a100c, mid: 0x223424, light: 0x3e6036, soil: 0x24180e, accent: 0xff7a20 },
    ground: { kind: 'mud', soil: 0x2e2216, soilD: 0x1c140c, soilL: 0x44321e, grass: 0x24401e, grassL: 0x34582a, water: 0x2a3a40 },
    fore: { kind: 'plantain', c1: 0x040705, c2: 0x0e1a10 },
    mist: { color: [150, 170, 172, 52], color2: [180, 198, 200, 40], alpha: 0.9 },
    ambient: 'drop',
    ambientTint: 0xa8c4d4,
    lightning: true,
  },
  paramo: {
    id: 'paramo',
    name: 'Páramo de Sumapaz',
    subtitle: 'Cundinamarca - helada bajo la Vía Láctea',
    sky: [0x03050c, 0x070b18, 0x0b1224, 0x111a30, 0x18233a, 0x212e44, 0x2c3a4e, 0x3a4858],
    stars: 150,
    milkyWay: true,
    moon: { x: 58, y: 28, r: 8, color: 0xd0d8e8, light: 0xf4f8ff },
    sun: null,
    clouds: { c1: [90, 104, 130, 110], c2: [130, 144, 170, 90], line: [60, 70, 96, 90] },
    far: { kind: 'peaks', color: 0x141c28, color2: 0x1e2a38 },
    water: { kind: 'bog', bands: [0x283226, 0x222c24, 0x1c261f, 0x161f1a], glint: 0xd8e8ff, glintDark: 0x6a84a8, reflect: null },
    mid: { kind: 'paramo', dark: 0x1c1a14, mid: 0x5a6a5a, light: 0x9eae96, soil: 0x24261e, accent: 0xe8c840 },
    ground: { kind: 'moss', soil: 0x2c2a20, soilD: 0x1c1c16, soilL: 0x454030, grass: 0x56603e, grassL: 0x8a9470, water: 0x26364a },
    fore: { kind: 'frailejon', c1: 0x090b09, c2: 0x1c2018 },
    mist: { color: [196, 212, 236, 64], color2: [226, 236, 250, 50], alpha: 1 },
    ambient: 'fly',
    ambientTint: 0xd8ecff,
    lightning: false,
  },
  botero: {
    id: 'botero',
    name: 'Plaza de las Esculturas',
    subtitle: 'Centro de Medellín - domingo a medianoche',
    sky: [0x060818, 0x0b0e24, 0x111430, 0x191a3c, 0x241e46, 0x36244c, 0x502c4c, 0x703a48],
    stars: 18,
    moon: { x: 64, y: 30, r: 10, color: 0xe0d8c8, light: 0xfffaf0 },
    sun: null,
    clouds: { c1: [86, 58, 86, 140], c2: [120, 82, 104, 110], line: [56, 38, 64, 120] },
    far: { kind: 'city', color: 0x10122a, color2: 0x1a1c3a, window: 0xffd070 },
    water: { kind: 'fountain', bands: [0x4a4452, 0x403a48, 0x36323e, 0x2c2834], glint: 0xc8ecff, glintDark: 0x6aa0c8, reflect: null },
    mid: { kind: 'sculptures', dark: 0x1a120e, mid: 0x4a3424, light: 0xb08850, soil: 0x3a3640, accent: 0xffd890 },
    ground: { kind: 'tiles', soil: 0x585260, soilD: 0x3a3644, soilL: 0x6c6676, grass: 0x7a7486, grassL: 0x9a94a6, water: 0x2a2838 },
    fore: { kind: 'benches', c1: 0x08070c, c2: 0x1e1a26 },
    mist: { color: [210, 170, 170, 22], color2: [230, 196, 190, 18], alpha: 0.6 },
    ambient: 'fly',
    ambientTint: 0xffe2a0,
    lightning: false,
  },
  comuna13: {
    id: 'comuna13',
    name: 'Escaleras de la Comuna 13',
    subtitle: 'San Javier, Medellín - grafitis y luces',
    sky: [0x07051a, 0x0d0926, 0x150d30, 0x201138, 0x30153e, 0x461b40, 0x622440, 0x80323e],
    stars: 34,
    moon: { x: 326, y: 38, r: 12, color: 0xe8d8c8, light: 0xfff8ec },
    sun: null,
    clouds: { c1: [80, 46, 80, 140], c2: [116, 70, 100, 110], line: [50, 30, 58, 120] },
    far: { kind: 'barrio', color: 0x2a1a1c, color2: 0x3a2420, window: 0xffc860 },
    water: { kind: 'rooftops', bands: [0x5a3026, 0x4a281f, 0x3c201a, 0x2e1814], glint: 0xffd070, glintDark: 0x70a0ff, reflect: null },
    mid: { kind: 'graffiti', dark: 0x16121a, mid: 0x5a5460, light: 0x7a7480, soil: 0x34303a, accent: 0xff8a20 },
    ground: { kind: 'concrete', soil: 0x4a4650, soilD: 0x302c36, soilL: 0x5e5a64, grass: 0xe0b020, grassL: 0xf0d060, water: 0x24222a },
    fore: { kind: 'railing', c1: 0x08070a, c2: 0x26222a },
    mist: { color: [190, 150, 190, 20], color2: [220, 180, 210, 16], alpha: 0.5 },
    ambient: 'fly',
    ambientTint: 0xffc890,
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

/** Matriz de Bayer 4x4 para degradados con tramado ordenado (sin bandas planas). */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x: number, y: number): number => BAYER4[((y & 3) << 2) | (x & 3)];

/** Degradado vertical tramado entre los colores de la paleta (cada píxel es uno de ellos). */
function ditherGradient(pm: Pixmap, x0: number, y0: number, w: number, h: number, colors: number[]): void {
  const pal = colors.map((c) => hexToRgba(c));
  const n = pal.length - 1;
  for (let y = 0; y < h; y++) {
    const p = n <= 0 ? 0 : (y / Math.max(1, h - 1)) * n;
    const i = Math.min(n, Math.floor(p));
    const frac = p - i;
    for (let x = 0; x < w; x++) pm.set(x0 + x, y0 + y, frac > bayer(x0 + x, y0 + y) && i < n ? pal[i + 1] : pal[i]);
  }
}

/** Resplandor radial tramado: denso al centro, se deshace hacia el borde. */
function glow(pm: Pixmap, cx: number, cy: number, r: number, color: number, alpha = 90, squash = 1): void {
  const [cr, cg, cb] = hexToRgba(color);
  const ry = r * squash;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot((x - cx) / r, (y - cy) / ry);
      if (d >= 1) continue;
      const k = (1 - d) * (1 - d);
      if (k * 1.6 > bayer(x, y)) pm.set(x, y, [cr, cg, cb, Math.round(alpha * (0.35 + 0.65 * k))]);
    }
  }
}

/** Vía Láctea: banda diagonal de polvo de estrellas con una franja oscura. */
function paintMilkyWay(pm: Pixmap, rnd: () => number): void {
  const at = (x: number) => 112 - x * 0.24;
  for (let x = 0; x < GAME_WIDTH; x++) {
    const c = at(x);
    for (let y = Math.floor(c - 16); y < c + 16; y++) {
      const d = Math.abs(y - c) / 16;
      if ((1 - d) * 0.5 > bayer(x, y)) pm.set(x, y, [120, 130, 180, 26]);
    }
  }
  for (let i = 0; i < 520; i++) {
    const x = rnd() * GAME_WIDTH;
    const off = (rnd() + rnd() + rnd() - 1.5) * 14;
    const y = at(x) + off;
    pm.set(x, y, rnd() > 0.85 ? [255, 250, 230, 230] : [170, 180, 220, 140]);
  }
  for (let x = 0; x < GAME_WIDTH; x += 1) {
    const y = at(x) + Math.sin(x * 0.05) * 3 + 2;
    if (rnd() > 0.3) pm.set(x, y, [8, 10, 20, 160]);
    if (rnd() > 0.5) pm.set(x, y + 1, [8, 10, 20, 110]);
  }
}

export function buildSky(t: StageTheme): Pixmap {
  if (t.interior) return buildCantinaWall(t);
  const pm = new Pixmap(GAME_WIDTH, GAME_HEIGHT);
  ditherGradient(pm, 0, 0, GAME_WIDTH, 150, t.sky);
  pm.rect(0, 150, GAME_WIDTH, GAME_HEIGHT - 150, hexToRgba(t.sky[t.sky.length - 1]));
  const rnd = seededRandom(2024 + t.id.length);
  if (t.milkyWay) paintMilkyWay(pm, seededRandom(77));
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
    case 'canyon':
      paintCanyon(pm, t, rnd);
      break;
    case 'coffeehills':
      paintCoffeeHills(pm, t, rnd);
      break;
    case 'peaks':
      paintPeaks(pm, t, rnd);
      break;
    case 'city':
      paintCity(pm, t, rnd);
      break;
    case 'barrio':
      paintBarrio(pm, t, rnd);
      break;
  }
  return pm;
}

/** Cañón del Cauca: dos paredes de roca con estratos, cascada y filos lejanos entre la bruma. */
function paintCanyon(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const W = pm.width;
  const h = pm.height;
  const c1 = hexToRgba(t.far.color);
  const c2 = hexToRgba(t.far.color2);
  // filos lejanos, aguas arriba
  const back: [number, number][] = [[0, h]];
  for (let x = 0; x <= W; x += 8) back.push([x, 46 + Math.sin(x * 0.02) * 8 + Math.sin(x * 0.07) * 3]);
  back.push([W, h]);
  pm.polygon(back, hexToRgba(0x2c3c44));
  pm.dither(0, 50, W, 30, [150, 170, 175, 40], 0);
  const mid: [number, number][] = [[0, h]];
  for (let x = 0; x <= W; x += 6) mid.push([x, 64 + Math.sin(x * 0.03 + 1) * 6 + rnd() * 3]);
  mid.push([W, h]);
  pm.polygon(mid, c2);
  pm.dither(0, 70, W, 12, [150, 170, 175, 34], 1);
  // paredes del cañón a lado y lado
  const wall = (x0: number, x1: number, dir: 1 | -1) => {
    const wp = new Pixmap(W, h);
    const outer = dir === 1 ? x0 : x1;
    const inner = dir === 1 ? x1 : x0;
    const pts: [number, number][] = [[outer, h]];
    // cresta irregular arriba, de afuera hacia el filo
    for (let i = 0; i <= 8; i++) {
      const x = outer + ((inner - outer) * i) / 8;
      pts.push([x, 2 + rnd() * 10 + (i / 8) * 6]);
    }
    const face: [number, number][] = [];
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      face.push([inner + dir * (u * u * 30 + (rnd() - 0.5) * 8 - (i % 3 === 0 ? 6 : 0)), 16 + u * (h - 26)]);
    }
    pts.push(...face, [face[face.length - 1][0], h]);
    wp.polygon(pts, c1);
    // estratos y grietas, solo sobre la roca
    for (let y = 8; y < h - 4; y += 4 + Math.floor(rnd() * 4)) {
      const wave = rnd() * 6;
      for (let x = Math.min(outer, inner) - 40; x < Math.max(outer, inner) + 40; x++) {
        const yy = Math.round(y + Math.sin(x * 0.08 + wave) * 1.5);
        if ((x + yy) % 4 !== 0 && wp.alpha(x, yy) > 0) wp.set(x, yy, [58, 72, 80, 150]);
      }
    }
    for (let k = 0; k < 10; k++) {
      let cx = outer + (inner - outer) * rnd();
      let cy = 10 + rnd() * 40;
      for (let j = 0; j < 20; j++) {
        if (wp.alpha(cx, cy) > 0) wp.set(cx, cy, [6, 10, 12, 200]);
        cx += (rnd() - 0.5) * 2;
        cy += 1;
      }
    }
    // borde iluminado por la luna (filo y cresta)
    for (let i = 1; i < pts.length - 2; i++) wp.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 1, [120, 140, 150, 170]);
    // matas colgadas en las cornisas
    for (let k = 0; k < 10; k++) {
      const [ex, ey] = face[Math.floor(rnd() * (face.length - 1))];
      wp.ellipse(ex - dir * 4, ey + 2, 4 + rnd() * 4, 2 + rnd() * 2, hexToRgba(0x0e1a14));
      wp.ellipse(ex - dir * 5, ey + 1, 2, 1, hexToRgba(0x24402c));
    }
    for (let x = Math.min(outer, inner); x < Math.max(outer, inner); x += 3) {
      for (let y = 0; y < 20; y++) {
        if (wp.alpha(x, y) > 0) {
          wp.ellipse(x, y + 1, 3, 2, hexToRgba(0x10201a));
          break;
        }
      }
    }
    pm.blit(wp, 0, 0);
  };
  wall(40, 196, 1);
  wall(420, 600, -1);
  // cascada en la pared izquierda
  for (let y = 18; y < 96; y++) {
    const x = 150 + Math.sin(y * 0.2) * 0.8;
    pm.set(x, y, [200, 220, 225, 200]);
    if (y % 3 === 0) pm.set(x + 1, y, [160, 190, 200, 140]);
  }
  pm.dither(144, 92, 14, 6, [220, 235, 240, 110], 0);
  pm.dither(0, h - 24, W, 24, [10, 16, 20, 120], 0);
}

/** Lomas cafeteras: surcos de café en curva de nivel, plataneras, palma de cera y la finca con balcón. */
function paintCoffeeHills(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const W = pm.width;
  const h = pm.height;
  const c1 = hexToRgba(t.far.color);
  const c2 = hexToRgba(t.far.color2);
  const hill = (base: number, amp: number, freq: number, ph: number) => (x: number) => base - amp * Math.abs(Math.sin(x * freq + ph));
  const back = hill(52, 34, 0.009, 0.4);
  const front = hill(86, 26, 0.013, 1.9);
  const poly = (f: (x: number) => number, c: Rgba) => {
    const pts: [number, number][] = [[0, h]];
    for (let x = 0; x <= W; x += 4) pts.push([x, f(x)]);
    pts.push([W, h]);
    pm.polygon(pts, c);
  };
  poly(back, hexToRgba(0x0e1612));
  // surcos de café siguiendo la loma de atrás
  for (let row = 4; row < 60; row += 5) {
    for (let x = 0; x < W; x += 3) {
      const y = back(x) + row + Math.sin(x * 0.05 + row) * 1.5;
      if (y < h && (x + row) % 6 !== 0) pm.set(x, y, [36, 56, 40, 200]);
    }
  }
  pm.dither(0, 40, W, 30, [120, 140, 150, 28], 0);
  poly(front, c1);
  for (let row = 3; row < 40; row += 4) {
    for (let x = 0; x < W; x += 2) {
      const y = front(x) + row + Math.sin(x * 0.04 + row * 0.7) * 2;
      if (y < h && (x * 7 + row) % 5 !== 0) pm.set(x, y, hexToRgba((x + row) % 4 ? 0x1c3022 : 0x24402a));
    }
  }
  // plataneras y guamos en el filo
  const plantain = (x: number, y: number, s: number, c: Rgba) => {
    pm.line(x, y, x, y - 10 * s, 2, c);
    for (const [dx, dy] of [[-7, -2], [7, -3], [-5, 4], [6, 3], [0, -6]] as const) {
      pm.line(x, y - 10 * s, x + dx * s, y - 10 * s + dy * s, 2, c);
      pm.line(x + dx * s, y - 10 * s + dy * s, x + dx * s * 1.2, y - 10 * s + dy * s + 3 * s, 1, c);
    }
  };
  for (let i = 0; i < 16; i++) {
    const x = rnd() * W;
    plantain(x, front(x) + 2, 0.8 + rnd() * 0.5, c2);
  }
  for (let i = 0; i < 6; i++) {
    const x = rnd() * W;
    const y = front(x);
    pm.ellipse(x, y - 8, 12 + rnd() * 6, 5, c2);
    pm.vline(x, y - 6, y + 2, c2);
  }
  // palma de cera solitaria
  const px = 470;
  const pb = back(px);
  pm.vline(px, pb - 36, pb + 4, hexToRgba(0x2a3830));
  for (let a = -3; a <= 3; a++) pm.line(px, pb - 36, px + a * 4, pb - 40 + Math.abs(a) * 3, 1, hexToRgba(0x2a3830));
  // la finca: paredes encaladas, techo de teja y balcón con chambrana de colores
  const fx = 300;
  const fy = front(fx) + 4;
  const win = hexToRgba(t.far.window ?? 0xffc060);
  pm.rect(fx - 26, fy - 18, 52, 18, hexToRgba(0x6e6e62));
  pm.polygon([[fx - 32, fy - 17], [fx - 20, fy - 27], [fx + 20, fy - 27], [fx + 32, fy - 17]], hexToRgba(0x4a1c12));
  for (let x = fx - 28; x < fx + 30; x += 3) pm.vline(x, fy - 25, fy - 18, [30, 10, 6, 140]);
  pm.hline(fx - 30, fx + 30, fy - 10, hexToRgba(0x9a2420));
  for (let x = fx - 28; x <= fx + 28; x += 3) pm.vline(x, fy - 9, fy - 6, hexToRgba(x % 2 ? 0x1e6a3a : 0x9a2420));
  pm.hline(fx - 30, fx + 30, fy - 6, hexToRgba(0x1e6a3a));
  for (const wx of [fx - 18, fx - 4, fx + 12]) {
    pm.rect(wx, fy - 16, 5, 5, win);
    glow(pm, wx + 2, fy - 13, 9, t.far.window ?? 0xffc060, 50);
  }
  pm.rect(fx - 2, fy - 5, 5, 5, hexToRgba(0x2a1a10));
  // cortinas de aguacero sobre las lomas
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W;
    const y = rnd() * (h - 20);
    pm.line(x, y, x - 2, y + 6, 1, [150, 170, 180, 34]);
  }
}

/** Páramo: crestas de roca con escarcha y una laguna glaciar que refleja las estrellas. */
function paintPeaks(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const W = pm.width;
  const h = pm.height;
  const c1 = hexToRgba(t.far.color);
  const c2 = hexToRgba(t.far.color2);
  const frost = hexToRgba(0x8a9cb4);
  const ridgePts = (base: number, jag: number): [number, number][] => {
    const pts: [number, number][] = [[0, h]];
    let y = base;
    for (let x = 0; x <= W; x += 5) {
      y = Math.max(base - jag, Math.min(base + jag * 0.4, y + (rnd() - 0.5) * jag * 0.6));
      pts.push([x, y]);
    }
    pts.push([W, h]);
    return pts;
  };
  // cordillera de atrás: picos afilados, cara iluminada hacia la luna y escarcha arriba
  const peaks = Array.from({ length: 11 }, (_, i) => ({ x: i * 64 + rnd() * 40, hgt: 18 + rnd() * 26, slope: 0.6 + rnd() * 0.5 }));
  const ridge = new Float32Array(W + 1);
  for (let x = 0; x <= W; x++) {
    let top = 50;
    for (const p of peaks) top = Math.min(top, 50 - p.hgt + Math.abs(x - p.x) * p.slope);
    ridge[x] = top + Math.sin(x * 0.7) * 0.8 + Math.sin(x * 0.23) * 1.5;
  }
  const lit = hexToRgba(0x2c3a4e);
  const snow = hexToRgba(0x6a7c96);
  const snowL = hexToRgba(0xa8b8d0);
  for (let x = 0; x < W; x++) {
    const r = Math.round(ridge[x]);
    const facing = ridge[x + 1] > ridge[x];
    for (let y = r; y < h; y++) {
      const depth = y - r;
      let c = facing ? lit : c2;
      if (depth < 14 && y < 40 && (14 - depth) / 14 > bayer(x, y) * (facing ? 0.9 : 1.6)) c = facing && depth < 3 ? snowL : snow;
      pm.set(x, y, c);
    }
    // canaletas de nieve bajando por la cara
    if (x % 7 === 0 && facing) for (let k = 0; k < 8; k++) pm.set(x + (k >> 2), r + 4 + k, snow);
  }
  pm.dither(0, 46, W, 18, [150, 170, 200, 30], 0);
  const front = ridgePts(66, 14);
  pm.polygon(front, c1);
  for (let i = 1; i < front.length - 2; i += 2) pm.set(front[i][0], front[i][1], hexToRgba(0x4a5a70));
  // laguna glaciar con estrellas reflejadas
  const lx = 330;
  pm.ellipse(lx, 92, 70, 6, hexToRgba(0x1a2638));
  pm.ellipse(lx, 91, 66, 4, hexToRgba(0x24344c));
  for (let i = 0; i < 30; i++) pm.set(lx - 60 + rnd() * 120, 89 + rnd() * 5, [200, 214, 240, 200]);
  pm.hline(lx - 64, lx + 64, 87, [150, 170, 200, 120]);
  // morrenas y piedras sueltas
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W;
    const y = 80 + rnd() * 30;
    pm.ellipse(x, y, 3 + rnd() * 4, 1.5 + rnd() * 2, c2);
    pm.set(x - 1, y - 1, frost);
  }
}

/** Valle de Medellín de noche: montañas llenas de luces, torres, palacio ajedrezado y el metro elevado. */
function paintCity(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const W = pm.width;
  const h = pm.height;
  const c1 = hexToRgba(t.far.color);
  const c2 = hexToRgba(t.far.color2);
  const win = t.far.window ?? 0xffd070;
  // laderas del valle, encendidas de casitas
  const slope = (x: number) => 26 + Math.sin(x * 0.011 + 0.6) * 14 + Math.sin(x * 0.043) * 4;
  const pts: [number, number][] = [[0, h]];
  for (let x = 0; x <= W; x += 4) pts.push([x, slope(x)]);
  pts.push([W, h]);
  pm.polygon(pts, hexToRgba(0x0c0e22));
  const lights = [0xffc060, 0xffe4a0, 0xff9a50, 0xf0f0ff].map((c) => hexToRgba(c));
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W;
    const top = slope(x) + 2;
    const y = top + Math.pow(rnd(), 0.6) * (80 - top);
    pm.set(x, y, lights[i % 7 === 0 ? 3 : i % 5 === 0 ? 2 : i % 2]);
  }
  pm.dither(0, 50, W, 30, [255, 170, 110, 18], 0);
  // torres del centro
  let x = 0;
  while (x < W) {
    const w = 10 + Math.floor(rnd() * 16);
    const top = 44 + Math.floor(rnd() * 34);
    pm.rect(x, top, w, h - top, rnd() > 0.5 ? c1 : c2);
    for (let wy = top + 3; wy < 100; wy += 4) {
      for (let wx = x + 2; wx < x + w - 2; wx += 3) if (rnd() > 0.72) pm.rect(wx, wy, 1, 2, hexToRgba(rnd() > 0.15 ? win : 0xb0d0ff));
    }
    x += w + 1 + Math.floor(rnd() * 6);
  }
  // la aguja: torre alta de remate en punta con baliza roja
  const nx = 400;
  pm.rect(nx - 7, 16, 14, h - 16, c2);
  pm.polygon([[nx - 7, 17], [nx, -4], [nx + 7, 17]], c2);
  pm.vline(nx - 6, 16, h, [70, 76, 120, 160]);
  for (let wy = 20; wy < 100; wy += 3) for (let wx = nx - 5; wx < nx + 6; wx += 2) if (rnd() > 0.6) pm.set(wx, wy, hexToRgba(win));
  pm.set(nx, -2, hexToRgba(0xff3030));
  glow(pm, nx, 0, 4, 0xff3030, 120);
  // palacio gótico de franjas blancas y negras (genérico)
  const gx = 210;
  for (let y = 40; y < h; y++) {
    for (let px = gx - 34; px < gx + 34; px++) {
      const check = (Math.floor((px - gx) / 3) + Math.floor(y / 3)) % 2 === 0;
      pm.set(px, y, hexToRgba(check ? 0x5a5872 : 0x14142a));
    }
  }
  for (const tx of [gx - 34, gx - 6, gx + 28]) {
    pm.rect(tx, 28, 6, 14, hexToRgba(0x3a3854));
    pm.polygon([[tx - 1, 29], [tx + 3, 18], [tx + 7, 29]], hexToRgba(0x3a3854));
  }
  pm.polygon([[gx - 12, 41], [gx, 22], [gx + 12, 41]], hexToRgba(0x2a2844));
  for (const wx of [gx - 24, gx - 12, gx + 8, gx + 20]) {
    pm.rect(wx, 54, 4, 9, hexToRgba(0x0a0a18));
    pm.set(wx + 1, 55, hexToRgba(win));
  }
  // metro elevado con el tren pasando
  pm.rect(0, 86, W, 4, hexToRgba(0x2e3048));
  pm.hline(0, W, 86, hexToRgba(0x5a5c78));
  for (let px = 12; px < W; px += 44) pm.rect(px, 90, 4, h - 90, hexToRgba(0x22243a));
  const tx = 440;
  pm.rect(tx, 78, 96, 8, hexToRgba(0x8a8ea8));
  pm.hline(tx, tx + 95, 78, hexToRgba(0xc8ccdc));
  for (let k = tx + 3; k < tx + 92; k += 6) pm.rect(k, 80, 4, 3, hexToRgba(0xfff0b0));
  for (const cut of [tx + 31, tx + 63]) pm.vline(cut, 78, 85, hexToRgba(0x2e3048));
  glow(pm, tx + 48, 82, 40, 0xfff0b0, 26, 0.3);
}

/** Ladera de la Comuna 13: casas de ladrillo apiladas loma arriba, ventanas encendidas y tanques en las terrazas. */
function paintBarrio(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const W = pm.width;
  const h = pm.height;
  const win = hexToRgba(t.far.window ?? 0xffc860);
  const tv = hexToRgba(0x7aa8ff);
  const walls = [0x3a2420, 0x452a22, 0x32201e, 0x2c2a36, 0x3c3220, 0x2a3638, 0x4a2a2e].map((c) => hexToRgba(c));
  const top = (x: number) => 6 + 26 * (0.5 + 0.5 * Math.sin(x * 0.008 - 0.7)) + Math.sin(x * 0.05) * 3;
  // lomo de la montaña detrás
  const pts: [number, number][] = [[0, h]];
  for (let x = 0; x <= W; x += 4) pts.push([x, top(x) - 8]);
  pts.push([W, h]);
  pm.polygon(pts, hexToRgba(0x0e0c1a));
  for (let row = 0; row < 16; row++) {
    let x = -Math.floor(rnd() * 10);
    while (x < W) {
      const w = 8 + Math.floor(rnd() * 12);
      const hh = 7 + Math.floor(rnd() * 4);
      const base = top(x + w / 2) + row * 7;
      if (base < h) {
        const c = walls[Math.floor(rnd() * walls.length)];
        const shade = Math.min(1, 0.55 + row * 0.04);
        const wc: Rgba = [Math.round(c[0] * shade), Math.round(c[1] * shade), Math.round(c[2] * shade), 255];
        pm.rect(x, base - hh, w, hh + 2, wc);
        pm.hline(x, x + w - 1, base - hh, [wc[0] + 24, wc[1] + 18, wc[2] + 16, 255]);
        for (let wx = x + 2; wx < x + w - 2; wx += 4) {
          const r = rnd();
          if (r > 0.62) pm.rect(wx, base - hh + 3, 2, 2, r > 0.95 ? tv : win);
        }
        if (rnd() > 0.8) pm.rect(x + w - 4, base - hh - 3, 3, 3, hexToRgba(0x1a2a50));
      }
      x += w + (rnd() > 0.8 ? 2 : 0);
    }
  }
  // cables de luz cruzando la ladera
  for (let k = 0; k < 4; k++) {
    const y0 = 20 + k * 18;
    for (let x = 0; x < W; x++) pm.set(x, sag(x % 160, 0, 160, y0, 6), [10, 8, 14, 160]);
  }
  pm.dither(0, 0, W, 24, [160, 100, 140, 24], 0);
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
    } else if (t.water.kind !== 'vaults') {
      paintBandExtra(pm, t, f);
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

/** Franjas animadas de los escenarios nuevos (fotograma f de 3). */
function paintBandExtra(pm: Pixmap, t: StageTheme, f: number): void {
  const W = pm.width;
  const h = pm.height;
  const rnd = seededRandom(909);
  const b = t.water.bands;
  const glint = hexToRgba(t.water.glint);
  const glintD = hexToRgba(t.water.glintDark);
  switch (t.water.kind) {
    case 'rapids': {
      // río crecido allá abajo: corriente rápida, piedras y espuma que avanza
      ditherGradient(pm, 0, 0, W, h, b);
      if (t.water.reflect !== null && t.moon) {
        for (let y = 2; y < h; y += 2) pm.dither(t.moon.x + 40 - 6 + Math.sin(y + f * 2) * 3, y, 12, 1, rgba(t.water.reflect, 120), y + f);
      }
      for (let i = 0; i < 150; i++) {
        const y = 2 + rnd() * (h - 4);
        const speed = 3 + (y / h) * 5;
        const x = (rnd() * W + f * speed) % W;
        const w = 2 + rnd() * 7;
        pm.hline(x, x + w, y, i % 3 === 0 ? glint : glintD);
        if (i % 4 === 0) pm.set(x + w + 1, y - 1, glintD);
      }
      for (let i = 0; i < 12; i++) {
        const x = 20 + i * 53 + rnd() * 20;
        const y = 10 + rnd() * 26;
        const r = 4 + rnd() * 5;
        pm.ellipse(x, y, r, r * 0.55, hexToRgba(0x10181a));
        pm.hline(x - r + 2, x + r - 3, y - r * 0.55, hexToRgba(0x4a5a5c));
        // espuma que revienta contra la piedra
        for (let k = 0; k < 7; k++) {
          const a = ((k + f * 2) / 7) * Math.PI - Math.PI / 2;
          pm.set(x - r - 1 + Math.cos(a) * 2, y + Math.sin(a) * r * 0.6, glint);
        }
        for (let k = 0; k < 4; k++) pm.hline(x + r + k * 3 + f, x + r + k * 3 + f + 2, y + ((k + f) % 3) - 1, glintD);
      }
      pm.dither(0, 0, W, 3, [200, 220, 225, 50], f);
      break;
    }
    case 'coffee': {
      // surcos de café con granos rojos y amarillos, y el aguacero cayendo
      ditherGradient(pm, 0, 0, W, h, b);
      const leaf = [0x0e1e12, 0x16301a, 0x1e3e22].map((c) => hexToRgba(c));
      for (const [ry, s] of [[8, 0.7], [20, 0.85], [33, 1]] as const) {
        for (let x = -6; x < W + 6; x += 9 * s) {
          const bx = x + rnd() * 3;
          pm.ellipse(bx, ry, 6 * s, 5 * s, leaf[0]);
          pm.ellipse(bx - 1, ry - 1, 4.5 * s, 3.5 * s, leaf[1]);
          pm.ellipse(bx - 2, ry - 2, 2 * s, 1.5 * s, leaf[2]);
          for (let k = 0; k < 3; k++) {
            if (rnd() > 0.55) pm.set(bx - 3 + rnd() * 6, ry - 1 + rnd() * 4, hexToRgba(rnd() > 0.25 ? t.water.glint : 0xe0b020));
          }
        }
      }
      for (let i = 0; i < 170; i++) {
        const x = rnd() * W;
        const y = (rnd() * (h + 10) + f * 5) % (h + 6) - 6;
        pm.line(x, y, x - 1, y + 4, 1, [170, 196, 210, 130]);
      }
      for (let i = 0; i < 18; i++) {
        const x = rnd() * W;
        const r = 1 + ((i + f) % 3);
        pm.ellipse(x, h - 2, r * 1.6, r * 0.5, [150, 180, 200, 90]);
      }
      break;
    }
    case 'bog': {
      // turbera: charquitos que reflejan estrellas, cojines de musgo y escarcha que brilla
      ditherGradient(pm, 0, 0, W, h, b);
      for (let i = 0; i < 26; i++) {
        const x = rnd() * W;
        const y = 6 + rnd() * (h - 12);
        const rx = 6 + rnd() * 12;
        pm.ellipse(x, y, rx, rx * 0.22 + 1, hexToRgba(0x121c2c));
        pm.hline(x - rx + 2, x + rx - 2, y - rx * 0.22, hexToRgba(0x3a4c6a));
        for (let k = 0; k < 3; k++) {
          const gx = x - rx * 0.6 + rnd() * rx * 1.2;
          if ((i + k + f) % 3 !== 0) pm.set(gx, y, glint);
        }
      }
      for (let i = 0; i < 60; i++) {
        const x = rnd() * W;
        const y = 4 + rnd() * (h - 6);
        pm.ellipse(x, y, 3 + rnd() * 3, 1.5 + rnd(), hexToRgba(i % 2 ? 0x3a4a30 : 0x2e3c28));
        pm.set(x - 1, y - 1, hexToRgba(0x6a7a58));
      }
      // frailejoncitos lejanos
      for (let i = 0; i < 30; i++) {
        const x = rnd() * W;
        const y = 4 + rnd() * 20;
        pm.vline(x, y, y + 4, hexToRgba(0x1c1a14));
        pm.hline(x - 1, x + 1, y - 1, hexToRgba(0x7a8a74));
      }
      for (let i = 0; i < 70; i++) {
        const sx = rnd() * W;
        const sy = rnd() * h;
        if ((i + f) % 3 !== 0) pm.set(sx, sy, (i + f) % 3 === 1 ? glint : glintD);
      }
      break;
    }
    case 'fountain': {
      // la plaza al fondo: baldosas, la pila con chorros que suben y caen, y charcos de luz de las farolas
      ditherGradient(pm, 0, 0, W, h, b);
      for (let y = 4; y < h; y += 6) pm.hline(0, W, y, hexToRgba(0x2a2632));
      for (let x = 0; x < W; x += 14) pm.vline(x, 0, h, [36, 32, 44, 120]);
      for (const lx of [60, 180, 470, 590]) glow(pm, lx, 30, 26, 0xffd890, 46, 0.4);
      for (const fx of [320]) {
        pm.ellipse(fx, 34, 46, 8, hexToRgba(0x6a6676));
        pm.ellipse(fx, 33, 42, 6, hexToRgba(0x1a3a52));
        pm.hline(fx - 44, fx + 44, 27, hexToRgba(0x8a8696));
        for (let k = 0; k < 20; k++) pm.set(fx - 38 + ((k * 13 + f * 5) % 76), 32 + ((k + f) % 3), glint);
        // pilar central con plato
        pm.rect(fx - 3, 14, 6, 18, hexToRgba(0x5a5666));
        pm.ellipse(fx, 14, 12, 2, hexToRgba(0x7a7686));
        // chorros en arco (avanzan con el fotograma)
        for (const dir of [-1, 1]) {
          for (let k = 0; k < 14; k++) {
            const u = ((k + f * 0.33) / 14) % 1;
            const x = fx + dir * (4 + u * 32);
            const y = 10 - Math.sin(u * Math.PI) * 9 + u * 20;
            pm.set(x, y, k % 2 ? glint : glintD);
            pm.set(x, y + 1, [200, 230, 255, 90]);
          }
        }
        for (let k = 0; k < 8; k++) pm.set(fx + ((k * 3 + f) % 5) - 2, 2 + ((k * 5 + f * 3) % 12), glint);
      }
      break;
    }
    case 'rooftops': {
      // terrazas de más abajo: losas con varillas, ropa colgada y ventanas que titilan (televisores)
      ditherGradient(pm, 0, 0, W, h, b);
      let x = 0;
      let k = 0;
      while (x < W) {
        const w = 18 + Math.floor(rnd() * 26);
        const top = 2 + Math.floor(rnd() * 14);
        const wall = hexToRgba([0x5a3026, 0x4a2e2a, 0x62402a, 0x3a3a46][k % 4]);
        pm.rect(x, top, w, h - top, wall);
        pm.hline(x, x + w - 1, top, hexToRgba(0x7a4a36));
        for (let r = top + 4; r < h; r += 3) pm.hline(x, x + w - 1, r, [20, 10, 8, 50]);
        for (let v = 0; v < 3; v++) pm.vline(x + 3 + v * 6, top - 4, top, hexToRgba(0x2a1e1a));
        for (let wx = x + 4; wx < x + w - 5; wx += 9) {
          const lit = (Math.floor(wx * 0.37) + f * (k % 3)) % 4;
          const c = k % 5 === 2 ? (lit < 2 ? glintD : hexToRgba(0x3a5aa0)) : lit === 0 ? hexToRgba(0x1a1014) : glint;
          pm.rect(wx, top + 7, 4, 5, c);
          if (lit !== 0) pm.dither(wx - 2, top + 5, 8, 9, [c[0], c[1], c[2], 50], f);
        }
        if (k % 3 === 0) {
          // tendedero con ropa de colores
          for (let cx = x + 2; cx < x + w - 2; cx++) pm.set(cx, top - 3 + Math.round(sag(cx, x + 2, x + w - 2, 0, 2)), hexToRgba(0x2a2420));
          const clothes = [0xe04040, 0x40a0e0, 0xf0d040, 0xf0f0f0];
          for (let cx = x + 5, n = 0; cx < x + w - 5; cx += 5, n++) pm.rect(cx + (f === 1 ? 1 : 0), top - 2, 3, 4, hexToRgba(clothes[(n + k) % 4]));
        }
        x += w + 1;
        k++;
      }
      break;
    }
  }
}

const BAND_KINDS = new Set<StageTheme['water']['kind']>(['thicket', 'bar', 'vaults', 'rapids', 'coffee', 'bog', 'fountain', 'rooftops']);

export function buildRiver(t: StageTheme): Pixmap[] {
  if (BAND_KINDS.has(t.water.kind)) return buildBand(t);
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

/**
 * Dónde quedaron las ventanas y los aleros de las fachadas del pueblo (coordenadas de la capa media),
 * para que la vida del fondo (gente asomada, gatos en el tejado) caiga justo encima. Se llena al pintar.
 */
export const HOUSE_ANCHORS: { windows: [number, number][]; roofs: [number, number, number][] } = { windows: [], roofs: [] };

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
      HOUSE_ANCHORS.windows.length = 0;
      HOUSE_ANCHORS.roofs.length = 0;
      let x = -10;
      let k = 0;
      while (x < STAGE_LAYER_WIDTH + 20) {
        const w = 70 + rnd() * 50;
        const top = 18 + rnd() * 14;
        const wall = [hexToRgba(0x6a5a58), hexToRgba(0x5a4a60), hexToRgba(0x6a5848), hexToRgba(0x4e4a5a)][k % 4];
        pm.rect(x, top, w, h - 10 - top, wall);
        // pañete viejo: sombra del alero, manchas de humedad y desconchones
        pm.dither(x, top + 2, w, 4, [10, 8, 16, 90], 0);
        for (let y = h - 40; y < h - 24; y++) if ((y - h + 40) / 16 > bayer(x, y)) pm.dither(x, y, w, 1, [20, 16, 24, 60], y);
        for (let s = 0; s < 3; s++) {
          const sx = x + rnd() * (w - 8);
          const sy = top + 8 + rnd() * 30;
          pm.ellipse(sx, sy, 3 + rnd() * 3, 2, [0, 0, 0, 40]);
          pm.set(sx + 1, sy - 1, [255, 255, 255, 30]);
        }
        pm.rect(x - 3, top - 6, w + 6, 8, dark); // alero
        HOUSE_ANCHORS.roofs.push([x, x + w, top - 6]);
        for (let tx = x - 3; tx < x + w + 3; tx += 2) pm.set(tx, top + 1, [0, 0, 0, 120]);
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
          HOUSE_ANCHORS.windows.push([wx, top + 10]);
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
    case 'bridge':
      paintBridge(pm, t, rnd);
      break;
    case 'trapiche':
      paintTrapiche(pm, t, rnd);
      break;
    case 'paramo':
      paintParamo(pm, t, rnd);
      break;
    case 'sculptures':
      paintSculptures(pm, t, rnd);
      break;
    case 'graffiti':
      paintGraffiti(pm, t, rnd);
      break;
  }
  return pm;
}

/** Puente colgante: torres de piedra con arco, cables maestros, péndolas, faroles y la baranda de enfrente. */
function paintBridge(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const h = pm.height;
  const W = pm.width;
  const dark = hexToRgba(t.mid.dark);
  const mid = hexToRgba(t.mid.mid);
  const light = hexToRgba(t.mid.light);
  const wood = hexToRgba(t.mid.soil);
  const rope = hexToRgba(0x2a2420);
  // el tablero se ve desde adentro: la franja de abajo se borra para que asome el río por las rendijas
  for (let i = (h - 10) * W * 4; i < pm.data.length; i++) pm.data[i] = 0;
  const towers = [96, 548];
  const deckY = h - 14;
  // barrancos con monte a lado y lado (detrás de las torres)
  for (const [x0, x1] of [[0, 130], [516, W]] as const) {
    const pts: [number, number][] = [[x0, h]];
    for (let x = x0; x <= x1; x += 6) pts.push([x, 40 + rnd() * 10 + (x0 === 0 ? (x / 130) * 30 : ((W - x) / 124) * 30)]);
    pts.push([x1, h]);
    pm.polygon(pts, hexToRgba(0x10181a));
    for (let k = 0; k < 14; k++) {
      const x = x0 + rnd() * (x1 - x0);
      pm.ellipse(x, 44 + rnd() * 40, 8 + rnd() * 8, 5 + rnd() * 4, hexToRgba(k % 2 ? 0x14261c : 0x1c3424));
    }
  }
  // cables maestros (dos, el de atrás más oscuro) y péndolas
  for (const [off, c] of [[-3, dark], [0, rope]] as const) {
    for (let x = towers[0]; x <= towers[1]; x++) pm.set(x, sag(x, towers[0], towers[1], 10 + off, 62), c);
    for (let x = 0; x < towers[0]; x++) pm.set(x, 10 + off + (towers[0] - x) * 0.5, c);
    for (let x = towers[1]; x < W; x++) pm.set(x, 10 + off + (x - towers[1]) * 0.5, c);
  }
  for (let x = towers[0] + 8; x < towers[1]; x += 8) {
    const y = sag(x, towers[0], towers[1], 10, 62);
    pm.vline(x, y, deckY, [30, 26, 24, 220]);
  }
  // tablero lejano: viga y baranda
  pm.rect(0, deckY, W, 4, wood);
  pm.hline(0, W, deckY, hexToRgba(0x5a4028));
  for (let x = 0; x < W; x += 6) pm.vline(x, deckY - 8, deckY, rope);
  pm.hline(0, W, deckY - 8, rope);
  pm.hline(0, W, deckY - 4, [42, 36, 30, 200]);
  // faroles colgados de las péndolas
  for (const lx of [176, 264, 380, 468]) {
    const y = sag(lx, towers[0], towers[1], 10, 62) + 6;
    pm.vline(lx, y - 6, y, rope);
    pm.rect(lx - 2, y, 5, 6, hexToRgba(0x1a1410));
    pm.rect(lx - 1, y + 1, 3, 4, hexToRgba(t.mid.accent));
    glow(pm, lx, y + 3, 16, t.mid.accent, 70);
  }
  // torres de piedra con arco de paso
  for (const tx of towers) {
    pm.rect(tx - 16, 4, 32, h - 4, mid);
    pm.rect(tx - 18, 2, 36, 5, light);
    pm.rect(tx - 14, -2, 28, 4, mid);
    for (let y = 8; y < h; y += 5) {
      pm.hline(tx - 16, tx + 15, y, dark);
      for (let x = tx - 16 + ((y / 5) % 2) * 4; x < tx + 16; x += 8) pm.vline(x, y, y + 4, dark);
    }
    for (let y = 30; y < h; y++) {
      const half = y < 40 ? Math.sqrt(Math.max(0, 81 - (40 - y) * (40 - y))) : 9;
      for (let x = Math.floor(tx - half); x < tx + half; x++) {
        const i = (y * W + x) * 4;
        pm.data[i + 3] = 0;
      }
    }
    pm.vline(tx - 16, 4, h, light);
    pm.vline(tx + 15, 4, h, dark);
    pm.set(tx - 4, 14, hexToRgba(0x0a0a0a));
    pm.set(tx + 3, 14, hexToRgba(0x0a0a0a));
  }
  // cuerdas de la baranda cercana se ven entre las torres
  for (let x = 0; x < W; x += 3) if (rnd() > 0.5) pm.set(x, deckY + 3, hexToRgba(0x7a5a34));
}

/** Trapiche bajo el aguacero: ramada de guadua con teja, hornilla encendida, paila humeante y molino. */
function paintTrapiche(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const h = pm.height;
  const W = pm.width;
  const dark = hexToRgba(t.mid.dark);
  const mid = hexToRgba(t.mid.mid);
  const light = hexToRgba(t.mid.light);
  const fire = t.mid.accent;
  const guadua = hexToRgba(0x6a6a34);
  const guaduaD = hexToRgba(0x3a3a1c);
  // guamos de sombrío detrás
  for (const [gx, gy] of [[40, 12], [200, 6], [520, 10], [620, 16]] as const) {
    pm.line(gx, h - 9, gx + 4, gy + 16, 4, dark);
    for (let k = 0; k < 6; k++) pm.ellipse(gx + (k - 2.5) * 12 + rnd() * 6, gy + rnd() * 10, 16 + rnd() * 6, 7, k % 2 ? dark : mid);
    pm.ellipse(gx - 6, gy - 2, 8, 2, light);
  }
  // plataneras con hojas grandes y rasgadas
  const plantain = (x: number, top: number) => {
    pm.line(x, h - 9, x + 1, top, 4, hexToRgba(0x2a3a1e));
    pm.vline(x + 2, top + 4, h - 10, light);
    for (const [dx, dy, len] of [[-1, -0.4, 22], [1, -0.5, 24], [-1, 0.5, 18], [1, 0.6, 20], [0.2, -1, 14]] as const) {
      let px = x;
      let py = top;
      for (let i = 1; i <= 8; i++) {
        const u = i / 8;
        const nx = x + dx * len * u;
        const ny = top + dy * len * u + u * u * 10;
        pm.line(px, py, nx, ny, 3, i % 3 === 0 ? light : mid);
        if (i % 2 === 0) pm.line(nx, ny, nx + dx * 2, ny + 4, 1, mid);
        px = nx;
        py = ny;
      }
    }
    pm.ellipse(x + 3, top + 14, 3, 5, hexToRgba(0x5a2440));
  };
  for (const [x, top] of [[90, 30], [150, 40], [490, 34], [590, 28]] as const) plantain(x, top);
  // la ramada
  const r0 = 236;
  const r1 = 440;
  const roofY = 24;
  for (const px of [r0 + 6, 300, 372, r1 - 6]) {
    pm.rect(px - 2, roofY + 6, 4, h - 9 - roofY - 6, guadua);
    for (let y = roofY + 12; y < h - 9; y += 10) pm.hline(px - 2, px + 1, y, guaduaD);
    pm.vline(px - 2, roofY + 6, h - 10, guaduaD);
  }
  // luz de la hornilla debajo de la ramada
  glow(pm, 330, 90, 70, fire, 54, 0.6);
  pm.polygon([[r0 - 12, roofY + 10], [r0 + 10, roofY - 6], [r1 - 10, roofY - 6], [r1 + 12, roofY + 10]], hexToRgba(0x4a1a10));
  for (let y = roofY - 4; y < roofY + 10; y += 3) {
    for (let x = r0 - 10; x < r1 + 10; x += 4) pm.set(x + (y % 2) * 2, y, hexToRgba(0x6a2a18));
    pm.hline(r0 - 10, r1 + 10, y + 1, [20, 6, 4, 120]);
  }
  pm.hline(r0 - 12, r1 + 12, roofY + 10, hexToRgba(0x1a0a06));
  // goteras del alero
  for (let x = r0 - 10; x < r1 + 12; x += 7) pm.vline(x, roofY + 11, roofY + 13 + (x % 3), [160, 190, 210, 150]);
  // hornilla de ladrillo con la boca encendida
  const hx = 330;
  pm.rect(hx - 34, h - 36, 68, 27, hexToRgba(0x5a2a1a));
  for (let y = h - 36; y < h - 9; y += 4) {
    pm.hline(hx - 34, hx + 33, y, hexToRgba(0x3a1a10));
    for (let x = hx - 34 + ((y / 4) % 2) * 4; x < hx + 34; x += 8) pm.vline(x, y, y + 3, hexToRgba(0x3a1a10));
  }
  pm.ellipse(hx - 14, h - 18, 8, 8, hexToRgba(0x1a0804));
  pm.rect(hx - 22, h - 18, 17, 9, hexToRgba(0x1a0804));
  pm.ellipse(hx - 14, h - 15, 6, 5, hexToRgba(0xff5a10));
  pm.ellipse(hx - 14, h - 13, 4, 3, hexToRgba(0xffc040));
  pm.hline(hx - 18, hx - 10, h - 11, hexToRgba(0xfff0a0));
  glow(pm, hx - 14, h - 14, 20, 0xff8a30, 80);
  // pailas con melao y el vapor que se mete por la teja
  for (const px of [hx + 2, hx + 22]) {
    pm.ellipse(px, h - 37, 9, 3, hexToRgba(0x2a2a2a));
    pm.ellipse(px, h - 38, 7, 2, hexToRgba(0xa05a18));
  }
  for (let i = 0; i < 40; i++) {
    const y = h - 42 - rnd() * 40;
    const x = hx + 12 + Math.sin(y * 0.15) * 6 + (rnd() - 0.5) * 10;
    pm.ellipse(x, y, 3 + rnd() * 3, 2, [220, 220, 210, 40]);
  }
  // chimenea y humo
  pm.rect(hx + 26, 0, 8, h - 36, hexToRgba(0x4a2216));
  for (let y = 2; y < h - 36; y += 4) pm.hline(hx + 26, hx + 33, y, hexToRgba(0x2e140c));
  for (let i = 0; i < 6; i++) pm.ellipse(hx + 30 + i * 3, -2 - i, 5, 3, [80, 80, 86, 80]);
  // el molino: rodillos, bastidor y el mayal
  const mx = 262;
  pm.rect(mx - 9, h - 40, 18, 31, hexToRgba(0x2a2420));
  for (const rx of [mx - 5, mx + 3]) {
    pm.rect(rx, h - 38, 4, 22, hexToRgba(0x4a4a4e));
    pm.vline(rx + 1, h - 38, h - 17, hexToRgba(0x7a7a80));
  }
  pm.line(mx, h - 42, mx - 40, h - 52, 2, hexToRgba(0x3a2a18));
  pm.rect(mx - 2, h - 46, 4, 6, hexToRgba(0x2a2420));
  // atados de caña y bultos de café
  for (let k = 0; k < 16; k++) pm.line(404 + k, h - 9, 398 + k * 1.4, h - 34, 1, k % 3 ? hexToRgba(0x6a7a30) : hexToRgba(0x8a8a40));
  for (const [sx, sy] of [[420, h - 16], [432, h - 16], [426, h - 24]] as const) {
    pm.ellipse(sx, sy, 6, 5, hexToRgba(0x8a7a5a));
    pm.hline(sx - 4, sx + 4, sy - 1, hexToRgba(0x5a4a34));
  }
  // farol de caperuza bajo la ramada
  pm.vline(300, roofY + 10, roofY + 22, hexToRgba(0x1a1410));
  pm.rect(298, roofY + 22, 5, 6, hexToRgba(0xffd080));
  glow(pm, 300, roofY + 26, 22, 0xffd080, 60);
  // matas de café al frente de la ramada
  for (let i = 0; i < 28; i++) {
    const x = rnd() * W;
    if (x > r0 && x < r1) continue;
    pm.ellipse(x, h - 14, 7 + rnd() * 4, 6, dark);
    pm.ellipse(x - 1, h - 16, 5, 4, mid);
    if (rnd() > 0.4) pm.set(x + 2, h - 14, hexToRgba(0xc02020));
  }
}

/** Páramo: frailejones grandes con su falda de hojas secas, puyas en flor, piedras con líquenes y pajonal. */
function paintParamo(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const h = pm.height;
  const W = pm.width;
  const mid = hexToRgba(t.mid.mid);
  const light = hexToRgba(t.mid.light);
  const flower = hexToRgba(t.mid.accent);
  const skirt = [0x2a2418, 0x3a3020, 0x221c14].map((c) => hexToRgba(c));
  // piedras grandes con líquenes
  for (const [rx, rw, rh] of [[150, 30, 22], [420, 40, 30], [610, 26, 18]] as const) {
    pm.polygon([[rx - rw, h - 9], [rx - rw * 0.7, h - 9 - rh * 0.8], [rx - rw * 0.1, h - 9 - rh], [rx + rw * 0.6, h - 9 - rh * 0.7], [rx + rw, h - 9]], hexToRgba(0x2e343a));
    pm.line(rx - rw * 0.7, h - 9 - rh * 0.8, rx - rw * 0.1, h - 9 - rh, 1, hexToRgba(0x7a8696));
    pm.line(rx - rw * 0.1, h - 9 - rh, rx + rw * 0.6, h - 9 - rh * 0.7, 1, hexToRgba(0x5a6676));
    for (let k = 0; k < 14; k++) pm.set(rx + (rnd() - 0.5) * rw * 1.4, h - 9 - rnd() * rh * 0.8, hexToRgba(k % 3 ? 0xc8a050 : 0xa0b0a0));
  }
  // pajonal dorado
  for (let i = 0; i < 160; i++) {
    const x = rnd() * W;
    const gh = 6 + rnd() * 12;
    pm.line(x, h - 9, x + (rnd() - 0.5) * 6, h - 9 - gh, 1, hexToRgba(i % 3 ? 0x6a6a44 : 0x8a8656));
  }
  // frailejones: el más alto, más cerca
  const frailejon = (x: number, sh: number) => {
    const top = h - 9 - sh;
    for (let y = top + 4; y < h - 9; y++) {
      const w = 4 + Math.sin(y * 0.7) * 0.6;
      pm.hline(x - w, x + w, y, skirt[Math.floor(y + x) % 3]);
    }
    for (let y = top + 6; y < h - 10; y += 3) pm.set(x - 3, y, hexToRgba(0x4a3e2a));
    // roseta de hojas lanudas plateadas
    for (let a = 0; a < 14; a++) {
      const ang = Math.PI + (a / 13) * Math.PI;
      const len = 7 + (a % 3) * 2;
      pm.line(x, top + 3, x + Math.cos(ang) * len, top + 3 + Math.sin(ang) * len * 0.7, 2, a % 2 ? mid : light);
    }
    for (const d of [-1, 1]) pm.line(x, top + 4, x + d * 9, top + 7, 2, mid);
    pm.ellipse(x, top + 1, 4, 2.5, light);
    pm.set(x - 1, top - 1, hexToRgba(0xe8f0f8));
    if (rnd() > 0.45) {
      for (const d of [-1, 0, 1]) {
        pm.line(x + d * 2, top, x + d * 6, top - 10, 1, hexToRgba(0x6a7a50));
        pm.circle(x + d * 6, top - 11, 1.5, flower);
      }
    }
  };
  // dos hileras: los de atrás bajitos, los de adelante viejos y altos (un frailejón crece 1 cm al año)
  for (let i = 0; i < 22; i++) frailejon(rnd() * W, 14 + rnd() * 16);
  for (let i = 0; i < 14; i++) frailejon(10 + i * 46 + rnd() * 30, 34 + rnd() * 50);
  // puyas con su espiga
  for (const px of [70, 330, 520]) {
    for (let a = 0; a < 9; a++) pm.line(px, h - 10, px + (a - 4) * 3, h - 22 + Math.abs(a - 4) * 2, 1, hexToRgba(0x4a6a5a));
    pm.line(px, h - 14, px, h - 56, 2, hexToRgba(0x3a4a3a));
    for (let y = h - 54; y < h - 24; y += 3) pm.set(px + (y % 2 ? 1 : -1) * 2, y, hexToRgba(0x5ab0a0));
  }
  // escarcha en los bordes
  for (let i = 0; i < 300; i++) {
    const x = rnd() * W;
    const y = rnd() * (h - 10);
    if (pm.alpha(x, y) > 0 && pm.alpha(x, y - 1) === 0) pm.set(x, y, [220, 230, 245, 200]);
  }
  pm.dither(0, h - 18, W, 8, rgba(t.mid.dark, 80), 0);
}

/** Plaza de Medellín: esculturas voluminosas (siluetas genéricas) en pedestal, palmas y farolas. */
function paintSculptures(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const h = pm.height;
  const W = pm.width;
  const bronzeD = hexToRgba(t.mid.dark);
  const bronze = hexToRgba(t.mid.mid);
  const rim = hexToRgba(t.mid.light);
  const lamp = t.mid.accent;
  const stone = hexToRgba(0x5a5666);
  const stoneL = hexToRgba(0x7a7686);
  // palmas reales
  for (const px of [30, 300, 610]) {
    const top = 4 + rnd() * 6;
    pm.line(px, h - 9, px + 2, top + 8, 4, hexToRgba(0x5a5660));
    pm.vline(px - 1, top + 10, h - 10, hexToRgba(0x7a7680));
    for (let a = -4; a <= 4; a++) {
      const ex = px + 2 + a * 6;
      const ey = top + 2 + Math.abs(a) * 3;
      pm.line(px + 2, top + 8, ex, ey, 2, hexToRgba(0x14201a));
      pm.line(ex, ey, ex + Math.sign(a || 1) * 4, ey + 8, 1, hexToRgba(0x1e3024));
    }
  }
  // farolas con su halo
  const lamps = [124, 246, 424, 548];
  for (const lx of lamps) glow(pm, lx, 34, 34, lamp, 60);
  for (const lx of lamps) {
    pm.rect(lx - 1, 34, 3, h - 43, hexToRgba(0x14121a));
    pm.rect(lx - 3, h - 14, 7, 5, hexToRgba(0x14121a));
    pm.circle(lx, 31, 4, hexToRgba(0xfff0c0));
    pm.circle(lx, 31, 2, hexToRgba(0xffffff));
    pm.rect(lx - 3, 35, 7, 2, hexToRgba(0x14121a));
  }
  const pedestal = (x: number, w: number, ph: number) => {
    pm.rect(x - w / 2, h - 9 - ph, w, ph, stone);
    pm.hline(x - w / 2 - 1, x + w / 2, h - 9 - ph, stoneL);
    pm.vline(x + w / 2 - 1, h - 9 - ph, h - 10, hexToRgba(0x3a3644));
    return h - 9 - ph;
  };
  /** cuerpo de bronce: relleno, sombra y borde iluminado del lado de la farola */
  const blob = (cx: number, cy: number, rx: number, ry: number, side: number) => {
    pm.ellipse(cx, cy, rx, ry, bronze);
    pm.ellipse(cx - side * rx * 0.25, cy + ry * 0.2, rx * 0.8, ry * 0.8, bronzeD);
    for (let a = 0; a < 40; a++) {
      const ang = (a / 40) * Math.PI - Math.PI / 2;
      pm.set(cx + side * Math.cos(ang) * (rx - 0.5), cy + Math.sin(ang) * (ry - 0.5), rim);
    }
  };
  // figura recostada, redonda
  {
    const top = pedestal(190, 50, 12);
    blob(184, top - 8, 20, 8, 1);
    blob(206, top - 13, 6, 6, 1);
    blob(168, top - 6, 9, 6, 1);
    blob(196, top - 4, 10, 4, 1);
  }
  // caballo rollizo
  {
    const top = pedestal(368, 44, 14);
    for (const lx of [354, 362, 376, 384]) pm.rect(lx - 2, top - 10, 5, 10, bronzeD);
    blob(370, top - 16, 19, 10, -1);
    pm.polygon([[352, top - 18], [346, top - 32], [354, top - 34], [360, top - 20]], bronze);
    blob(346, top - 34, 6, 4, -1);
    pm.line(388, top - 18, 393, top - 6, 2, bronzeD);
    pm.line(347, top - 34, 352, top - 30, 1, rim);
  }
  // figura de pie, voluminosa
  {
    const top = pedestal(486, 22, 18);
    pm.rect(480, top - 10, 4, 10, bronzeD);
    pm.rect(489, top - 10, 4, 10, bronzeD);
    blob(486, top - 20, 11, 13, -1);
    blob(486, top - 37, 5, 5, -1);
    blob(475, top - 22, 3, 7, -1);
    blob(497, top - 22, 3, 7, -1);
  }
  // pájaro gordo
  {
    const top = pedestal(76, 26, 16);
    blob(76, top - 10, 12, 9, 1);
    blob(88, top - 18, 5, 5, 1);
    pm.polygon([[92, top - 19], [98, top - 17], [92, top - 16]], rim);
    pm.vline(72, top - 2, top, bronzeD);
    pm.vline(80, top - 2, top, bronzeD);
  }
  // gato redondo
  {
    const top = pedestal(590, 26, 10);
    blob(590, top - 10, 11, 10, -1);
    blob(590, top - 24, 7, 6, -1);
    pm.polygon([[584, top - 28], [585, top - 34], [588, top - 29]], bronze);
    pm.polygon([[592, top - 29], [595, top - 34], [596, top - 28]], bronze);
  }
  // palomas dormidas al pie
  for (let i = 0; i < 9; i++) {
    const x = rnd() * W;
    pm.ellipse(x, h - 11, 2.5, 1.5, hexToRgba(0x4a4656));
    pm.set(x + 2, h - 12, hexToRgba(0x6a6676));
  }
}

/** Comuna 13: muros de grafiti, la escalera eléctrica con su techo naranja, casas arriba y bombillos. */
function paintGraffiti(pm: Pixmap, t: StageTheme, rnd: () => number): void {
  const h = pm.height;
  const W = pm.width;
  const dark = hexToRgba(t.mid.dark);
  const concrete = hexToRgba(t.mid.mid);
  const concreteL = hexToRgba(t.mid.light);
  const orange = hexToRgba(t.mid.accent);
  // casitas de ladrillo encima del muro
  let x = 0;
  while (x < W) {
    const w = 22 + Math.floor(rnd() * 20);
    const top = 6 + Math.floor(rnd() * 16);
    pm.rect(x, top, w, 46 - top, hexToRgba([0x5a3024, 0x6a3a28, 0x4a2a24][Math.floor(rnd() * 3)]));
    for (let y = top + 2; y < 46; y += 3) for (let bx = x + ((y / 3) % 2) * 2; bx < x + w; bx += 5) pm.set(bx, y, [30, 14, 10, 120]);
    pm.hline(x, x + w - 1, top, hexToRgba(0x8a5a40));
    for (let wx = x + 4; wx < x + w - 6; wx += 10) {
      const lit = rnd() > 0.4;
      pm.rect(wx, top + 6, 5, 6, hexToRgba(lit ? 0xffc860 : 0x1a1418));
      if (lit) glow(pm, wx + 2, top + 9, 9, 0xffc860, 40);
      pm.hline(wx - 1, wx + 5, top + 12, hexToRgba(0x8a8a8a));
    }
    x += w + 2;
  }
  // muros de grafiti (con huecos para ver la ladera)
  const palettes = [
    [0x2a6a8a, 0xf0c040, 0xe04070, 0xffffff],
    [0x8a2a4a, 0x40d0a0, 0xffd040, 0x1a1020],
    [0xc8801a, 0x3a2a8a, 0x40c0f0, 0xffffff],
    [0x3a8a4a, 0xf05a30, 0xf0e0a0, 0x1a1020],
    [0x6a3a9a, 0xff9a30, 0x60e070, 0xffffff],
  ];
  const segments: [number, number][] = [[0, 168], [214, 352], [520, W]];
  let p = 0;
  for (const [a, b] of segments) {
    const wallTop = 44;
    pm.rect(a, wallTop, b - a, h - 9 - wallTop, concrete);
    pm.hline(a, b - 1, wallTop, concreteL);
    for (let mx = a + 2; mx < b - 10; mx += 46) {
      const pal = palettes[p++ % palettes.length].map((c) => hexToRgba(c));
      const mw = Math.min(44, b - 2 - mx);
      pm.rect(mx, wallTop + 4, mw, h - 9 - wallTop - 8, pal[0]);
      const cx = mx + mw / 2;
      const cy = wallTop + 4 + (h - 9 - wallTop - 8) / 2;
      switch (p % 5) {
        case 0: // sol con rayos
          for (let r = 0; r < 12; r++) pm.line(cx, cy, cx + Math.cos(r * 0.52) * 18, cy + Math.sin(r * 0.52) * 18, 1, pal[1]);
          pm.circle(cx, cy, 9, pal[2]);
          pm.circle(cx, cy, 5, pal[1]);
          break;
        case 1: // ojo grande
          pm.ellipse(cx, cy, 16, 9, pal[3]);
          pm.circle(cx, cy, 6, pal[1]);
          pm.circle(cx, cy, 3, hexToRgba(0x0a0810));
          pm.set(cx + 1, cy - 2, hexToRgba(0xffffff));
          break;
        case 2: // olas y zigzag
          for (let k = 0; k < 4; k++) for (let u = 0; u < mw - 2; u++) pm.set(mx + 1 + u, cy - 12 + k * 7 + Math.sin(u * 0.4 + k) * 2, pal[1 + (k % 3)]);
          break;
        case 3: // pájaro de alas abiertas, geométrico
          pm.polygon([[cx - 18, cy - 6], [cx, cy + 2], [cx + 18, cy - 6], [cx, cy + 8]], pal[1]);
          pm.polygon([[cx - 3, cy], [cx + 3, cy], [cx, cy - 8]], pal[2]);
          pm.circle(cx, cy - 9, 2, pal[3]);
          break;
        default: // letras de bombas (manchas redondas con borde)
          for (let k = 0; k < 4; k++) {
            const bx = mx + 6 + k * 10;
            pm.ellipse(bx, cy, 6, 9, pal[3]);
            pm.ellipse(bx, cy, 5, 8, pal[1 + (k % 2)]);
            pm.set(bx - 2, cy - 4, hexToRgba(0xffffff));
          }
      }
      // goteos de pintura y mugre
      for (let k = 0; k < 4; k++) pm.vline(mx + rnd() * mw, wallTop + 4 + (h - 9 - wallTop - 8), h - 12 + rnd() * 2, pal[1]);
    }
    pm.dither(a, h - 22, b - a, 13, [20, 16, 24, 90], 0);
  }
  // escalera eléctrica cubierta subiendo loma arriba
  const s0: [number, number] = [358, h - 9];
  const s1: [number, number] = [520, 28];
  const along = (u: number): [number, number] => [s0[0] + (s1[0] - s0[0]) * u, s0[1] + (s1[1] - s0[1]) * u];
  for (let i = 0; i <= 40; i++) {
    const [sx, sy] = along(i / 40);
    pm.rect(sx - 1, sy - 2, 5, 3, hexToRgba(0x3a3a44));
    pm.hline(sx - 1, sx + 3, sy - 2, hexToRgba(0x9a9aa4));
  }
  for (let i = 0; i <= 120; i++) {
    const [sx, sy] = along(i / 120);
    pm.vline(sx, sy - 22, sy - 3, [120, 160, 190, 36]);
    pm.set(sx, sy - 6, hexToRgba(0xc8c8d0));
    pm.set(sx, sy - 22, orange);
    pm.set(sx, sy - 23, orange);
    pm.set(sx, sy - 24, hexToRgba(0xb05a10));
  }
  for (let i = 0; i <= 6; i++) {
    const [sx, sy] = along(i / 6);
    pm.vline(sx, sy - 24, Math.min(h - 9, sy + 14), hexToRgba(0x8a8a94));
  }
  // bombillos en guirnalda sobre el callejón
  const bulbs = [0xffd060, 0xff6080, 0x60d0ff, 0x80ff80];
  for (let span = 0; span < W; span += 110) {
    for (let bx = span; bx < span + 110; bx++) pm.set(bx, sag(bx, span, span + 110, 30, 12), dark);
    for (let bx = span + 8, k = 0; bx < span + 104; bx += 12, k++) {
      const by = Math.round(sag(bx, span, span + 110, 30, 12)) + 1;
      pm.rect(bx, by, 2, 2, hexToRgba(bulbs[k % 4]));
      glow(pm, bx, by, 6, bulbs[k % 4], 50);
    }
  }
  // poste de luz amarilla
  glow(pm, 190, 40, 30, 0xffa040, 55);
  pm.rect(189, 40, 2, h - 49, hexToRgba(0x1a1a20));
  pm.rect(186, 38, 8, 3, hexToRgba(0xffd080));
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
  const pm = paintGround(t);
  // profundidad: el suelo se oscurece hacia el borde de abajo (tramado, no plano)
  const top = 40;
  for (let y = top + 10; y < pm.height; y++) {
    const k = (y - top - 10) / (pm.height - top - 10);
    for (let x = 0; x < pm.width; x++) if (k * 0.9 > bayer(x, y)) pm.set(x, y, [6, 4, 10, 70]);
  }
  // sombra de contacto bajo el borde
  pm.dither(0, top + 1, pm.width, 2, [0, 0, 0, 60], 1);
  return pm;
}

function paintGround(t: StageTheme): Pixmap {
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
  if (g.kind === 'deck' || g.kind === 'moss' || g.kind === 'tiles' || g.kind === 'concrete') {
    paintGroundExtra(pm, t, top, rnd);
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

/** Suelos de los escenarios nuevos: tablero del puente, musgo del páramo, baldosas de la plaza y cemento. */
function paintGroundExtra(pm: Pixmap, t: StageTheme, top: number, rnd: () => number): void {
  const W = pm.width;
  const h = pm.height;
  const g = t.ground;
  const soil = hexToRgba(g.soil);
  const soilD = hexToRgba(g.soilD);
  const soilL = hexToRgba(g.soilL);
  const grass = hexToRgba(g.grass);
  const grassL = hexToRgba(g.grassL);
  const water = hexToRgba(g.water);
  switch (g.kind) {
    case 'deck': {
      // tablas atravesadas con rendijas por donde se ve el río, viga de borde con pernos y el vacío abajo
      const deckEnd = top + 18;
      pm.rect(0, top, W, h - top, water);
      for (let y = deckEnd + 5; y < h; y += 3) for (let x = (y * 7) % 11; x < W; x += 9 + (y % 5)) pm.hline(x, x + 2, y, [140, 170, 176, 110]);
      let x = 0;
      while (x < W) {
        const w = 5 + Math.floor(rnd() * 3);
        const c = rnd() > 0.5 ? soil : soilL;
        pm.rect(x, top, w, deckEnd - top, c);
        pm.vline(x, top, deckEnd - 1, soilD);
        for (let k = 0; k < 2; k++) pm.vline(x + 2 + Math.floor(rnd() * (w - 2)), top + 2 + rnd() * 8, top + 6 + rnd() * 10, [20, 10, 4, 60]);
        if (rnd() > 0.93) pm.rect(x + 1, top + 2, w - 1, deckEnd - top - 2, water);
        x += w + (rnd() > 0.85 ? 2 : 1);
      }
      pm.rect(0, deckEnd, W, 5, soilD);
      pm.hline(0, W, deckEnd, hexToRgba(0x3a2614));
      for (let bx = 8; bx < W; bx += 24) pm.set(bx, deckEnd + 2, hexToRgba(0x8a8a8a));
      pm.rect(0, top - 2, W, 2, grassL);
      pm.hline(0, W, top - 3, soilD);
      break;
    }
    case 'moss': {
      // pajonal con macollas, cojines de musgo y escarcha
      for (let i = 0; i < 500; i++) pm.set(rnd() * W, top + 2 + rnd() * (h - top - 2), rnd() > 0.5 ? soilD : soilL);
      for (let i = 0; i < 22; i++) pm.ellipse(rnd() * W, top + 6 + rnd() * 18, 6 + rnd() * 10, 2 + rnd() * 2, hexToRgba(i % 2 ? 0x3a4a2a : 0x2e3c24));
      for (let i = 0; i < 6; i++) {
        const x = rnd() * W;
        pm.ellipse(x, top + 10 + rnd() * 10, 8 + rnd() * 8, 1.5, water);
        pm.hline(x - 4, x + 2, top + 9, hexToRgba(0x8aa0c0));
      }
      pm.rect(0, top - 2, W, 4, grass);
      for (let x = 0; x < W; x += 3) {
        const gh = 3 + rnd() * 6;
        pm.line(x, top, x + (rnd() - 0.5) * 3, top - gh, 1, rnd() > 0.5 ? grassL : grass);
        if (rnd() > 0.6) pm.set(x, top - gh, [230, 238, 250, 220]);
      }
      for (let i = 0; i < 160; i++) pm.set(rnd() * W, top + rnd() * 20, [210, 222, 240, 120]);
      break;
    }
    case 'tiles': {
      // baldosas grandes de la plaza, más anchas al frente; charcos de luz de las farolas
      let y = top;
      let rh = 4;
      let row = 0;
      while (y < h) {
        const tw = rh * 4;
        for (let x = -((row * tw) / 2) % tw; x < W; x += tw) {
          pm.rect(x, y, tw - 1, rh - 1, (Math.floor(x / tw) + row) % 3 === 0 ? soilL : soil);
          pm.hline(x, x + tw - 2, y, [255, 255, 255, 18]);
        }
        pm.hline(0, W, y + rh - 1, soilD);
        y += rh;
        rh += 1;
        row++;
      }
      for (const lx of [84, 206, 384, 508]) glow(pm, lx, top + 12, 40, 0xffd890, 40, 0.35);
      pm.rect(0, top - 3, W, 3, grassL);
      pm.hline(0, W, top, soilD);
      for (let x = 0; x < W; x += 16) pm.vline(x, top - 3, top - 1, grass);
      break;
    }
    case 'concrete': {
      // losas de cemento con juntas, grietas, manchas y el borde del andén pintado de amarillo
      pm.dither(0, top, W, h - top, soilL, 0);
      for (let x = 0; x < W; x += 36) pm.vline(x + ((x / 36) % 2) * 6, top, h, soilD);
      pm.hline(0, W, top + 14, soilD);
      for (let i = 0; i < 12; i++) {
        let cx = rnd() * W;
        let cy = top + 2 + rnd() * 20;
        for (let k = 0; k < 12; k++) {
          pm.set(cx, cy, soilD);
          cx += rnd() > 0.5 ? 1 : 0;
          cy += rnd() > 0.4 ? 1 : 0;
        }
      }
      for (let i = 0; i < 10; i++) pm.ellipse(rnd() * W, top + 6 + rnd() * 18, 4 + rnd() * 8, 1.5 + rnd(), [16, 14, 20, 70]);
      for (const sx of [120, 430]) {
        pm.rect(sx, top + 4, 18, 6, hexToRgba(0x1a181e));
        for (let k = sx + 2; k < sx + 18; k += 3) pm.vline(k, top + 5, top + 9, hexToRgba(0x3a3640));
      }
      // tag pintado en el piso
      pm.ellipse(300, top + 18, 10, 3, [255, 80, 140, 120]);
      pm.ellipse(318, top + 18, 6, 2, [80, 200, 255, 120]);
      pm.rect(0, top - 3, W, 3, grass);
      for (let x = 0; x < W; x += 12) pm.rect(x, top - 3, 6, 3, soilD);
      pm.hline(0, W, top - 3, grassL);
      break;
    }
  }
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
    case 'ropes': {
      // baranda de cuerda del puente con sus postes y nudos
      const posts = [20, 150, 280, 410, 540];
      for (const x of posts) {
        pm.rect(x - 3, h - 40, 6, 40, c1);
        pm.vline(x + 2, h - 40, h, c2);
        pm.rect(x - 4, h - 42, 8, 3, c2);
      }
      for (let i = 0; i < posts.length; i++) {
        const a = posts[i];
        const b = posts[(i + 1) % posts.length] + (i === posts.length - 1 ? STAGE_LAYER_WIDTH : 0);
        for (const [y0, d] of [[h - 38, 8], [h - 24, 6]] as const) {
          for (let x = a; x < b; x++) {
            const y = sag(x, a, b, y0, d);
            pm.set(x % STAGE_LAYER_WIDTH, y, c1);
            pm.set(x % STAGE_LAYER_WIDTH, y + 1, c1);
            if (x % 4 === 0) pm.set(x % STAGE_LAYER_WIDTH, y, c2);
          }
        }
        for (let x = a + 8; x < b - 4; x += 10) pm.vline(x % STAGE_LAYER_WIDTH, sag(x, a, b, h - 38, 8), sag(x, a, b, h - 24, 6), c1);
      }
      break;
    }
    case 'plantain': {
      // hojas de plátano y matas de café a contraluz, chorreando agua
      for (const x of [40, 250, 470, 610]) {
        for (const [dx, dy] of [[-1, -1], [1, -1.2], [0.3, -1.6]] as const) {
          let px = x;
          let py = h;
          for (let i = 1; i <= 10; i++) {
            const u = i / 10;
            const nx = x + dx * 40 * u;
            const ny = h + dy * 44 * u + u * u * 30;
            pm.line(px, py, nx, ny, 6 - Math.round(u * 3), c1);
            if (i % 3 === 0) pm.line(nx, ny, nx + dx * 3, ny + 6, 1, c2);
            px = nx;
            py = ny;
          }
          pm.vline(px, py, py + 5, [150, 180, 200, 140]);
        }
      }
      for (let i = 0; i < 9; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        pm.ellipse(x, h - 4, 14, 10, c1);
        pm.ellipse(x - 3, h - 9, 8, 4, c2);
        pm.set(x + 4, h - 6, hexToRgba(0x5a1010));
      }
      break;
    }
    case 'frailejon': {
      // frailejones cercanos fuera de foco y pajonal
      for (let i = 0; i < 120; i++) {
        const x = rnd() * STAGE_LAYER_WIDTH;
        pm.line(x, h, x + (rnd() - 0.5) * 6, h - 6 - rnd() * 12, 1, i % 3 === 0 ? c2 : c1);
      }
      for (const x of [60, 330, 560]) {
        pm.rect(x - 5, h - 30, 10, 30, c1);
        for (let a = 0; a < 12; a++) {
          const ang = Math.PI + (a / 11) * Math.PI;
          pm.line(x, h - 30, x + Math.cos(ang) * 18, h - 30 + Math.sin(ang) * 12, 3, a % 2 ? c1 : c2);
        }
        pm.ellipse(x, h - 32, 8, 4, c2);
      }
      break;
    }
    case 'benches': {
      // banca de hierro, caneca y palomas
      for (const x of [90, 400]) {
        pm.rect(x - 22, h - 20, 44, 3, c2);
        pm.rect(x - 22, h - 30, 44, 2, c1);
        pm.rect(x - 22, h - 26, 44, 2, c1);
        for (const lx of [x - 20, x + 18]) pm.rect(lx, h - 30, 3, 30, c1);
      }
      pm.rect(250, h - 22, 14, 22, c1);
      pm.rect(249, h - 24, 16, 3, c2);
      for (const x of [170, 196, 540, 300]) {
        pm.ellipse(x, h - 4, 5, 3, c1);
        pm.circle(x + 4, h - 8, 2, c1);
        pm.set(x + 6, h - 8, c2);
      }
      break;
    }
    case 'railing': {
      // pasamanos de tubo de la escalera y una matera
      for (let x = 0; x < STAGE_LAYER_WIDTH; x += 64) {
        pm.rect(x, h - 34, 3, 34, c1);
        pm.vline(x + 2, h - 34, h, c2);
      }
      pm.rect(0, h - 36, STAGE_LAYER_WIDTH, 3, c1);
      pm.hline(0, STAGE_LAYER_WIDTH, h - 36, c2);
      pm.rect(0, h - 20, STAGE_LAYER_WIDTH, 2, c1);
      for (const x of [150, 470]) {
        pm.polygon([[x - 10, h - 14], [x + 10, h - 14], [x + 7, h], [x - 7, h]], c1);
        for (let a = 0; a < 7; a++) pm.line(x, h - 14, x + (a - 3) * 4, h - 26 + Math.abs(a - 3) * 2, 2, c2);
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
