import { STAGE_IDS, type StageId } from '../art/StageArtist';

/**
 * Paisaje sonoro de cada escenario: zumbido de fondo, un lecho continuo (agua, viento, fuego…)
 * y sucesos característicos al azar. La base de terror (latido por tensión, sustos) es común.
 * Los paisajes alegres de la aventura (fiesta, hogar, ciudad, iglesia) apagan el terror y
 * suenan con música: cumbia, carrilera, bambuco, salsa, órgano.
 */

export type StageEvent =
  | 'whisper' | 'creak' | 'distantScream'
  | 'frog' | 'owl' | 'thunder' | 'whistleTune' | 'crickets' | 'flute' | 'drip'
  | 'bubbles' | 'splash' | 'crackle' | 'bull' | 'bell' | 'dogHowl' | 'hooves' | 'steps'
  | 'chatter' | 'glass' | 'laugh' | 'firework' | 'metro' | 'horn' | 'moto' | 'prayer'
  | 'farWhistle' | 'branch' | 'bamboo';

export interface StageSoundTheme {
  /** tres osciladores del zumbido: dos en segunda menor y un sub grave (Hz) */
  drone: [number, number, number];
  /** corte del filtro del zumbido sin tensión (Hz) */
  droneCutoff: number;
  /** lecho continuo de ruido filtrado con oscilación lenta de volumen */
  bed: { type: BiquadFilterType; freq: number; q: number; gain: number; lfoRate: number; lfoDepth: number };
  /** caja de música desafinada de fondo */
  musicBox: boolean;
  /** sucesos al azar con su peso */
  events: { name: StageEvent; weight: number }[];
  /** segundos entre sucesos (mínimo, máximo) */
  every: [number, number];
  /** volumen del zumbido (0.16 si no se indica) */
  droneGain?: number;
  /** alegre: sin latido, sin tono agudo de tensión y sin zumbido disonante */
  happy?: boolean;
  /** pieza de fondo */
  music?: MusicId;
  /** tic-tac de reloj de pared (segundos por golpe) */
  tick?: number;
}

export type SoundscapeId = StageId | 'menu' | 'fiesta' | 'hogar' | 'ciudad' | 'iglesia' | 'monte';

export const SOUNDSCAPE_IDS: SoundscapeId[] = [
  ...STAGE_IDS, 'menu', 'fiesta', 'hogar', 'ciudad', 'iglesia', 'monte',
];

export const STAGE_SOUND: Record<SoundscapeId, StageSoundTheme> = {
  menu: {
    drone: [55, 58.27, 27.5], droneCutoff: 220,
    bed: { type: 'lowpass', freq: 400, q: 0.7, gain: 0.015, lfoRate: 0.1, lfoDepth: 0.01 },
    musicBox: true,
    events: [{ name: 'whisper', weight: 4 }, { name: 'creak', weight: 3 }, { name: 'distantScream', weight: 2 }],
    every: [5, 14],
  },
  ribera: {
    drone: [55, 58.27, 27.5], droneCutoff: 220,
    bed: { type: 'lowpass', freq: 650, q: 0.8, gain: 0.05, lfoRate: 0.22, lfoDepth: 0.025 },
    musicBox: true,
    events: [{ name: 'frog', weight: 5 }, { name: 'owl', weight: 3 }, { name: 'splash', weight: 2 }, { name: 'whisper', weight: 2 }],
    every: [3, 8],
  },
  llanos: {
    drone: [49, 51.91, 24.5], droneCutoff: 260,
    bed: { type: 'bandpass', freq: 480, q: 2.5, gain: 0.08, lfoRate: 0.09, lfoDepth: 0.06 },
    musicBox: false,
    events: [{ name: 'whistleTune', weight: 4 }, { name: 'thunder', weight: 3 }, { name: 'crickets', weight: 3 }, { name: 'distantScream', weight: 1 }],
    every: [4, 9],
  },
  laguna: {
    drone: [65.41, 69.3, 32.7], droneCutoff: 180,
    bed: { type: 'highpass', freq: 2400, q: 0.7, gain: 0.03, lfoRate: 0.05, lfoDepth: 0.02 },
    musicBox: false,
    events: [{ name: 'flute', weight: 4 }, { name: 'drip', weight: 4 }, { name: 'whisper', weight: 2 }],
    every: [3, 8],
  },
  pantano: {
    drone: [41.2, 43.65, 20.6], droneCutoff: 150,
    bed: { type: 'bandpass', freq: 3600, q: 7, gain: 0.03, lfoRate: 0.6, lfoDepth: 0.02 },
    musicBox: false,
    events: [{ name: 'frog', weight: 5 }, { name: 'bubbles', weight: 4 }, { name: 'splash', weight: 3 }, { name: 'crickets', weight: 3 }],
    every: [2, 6],
  },
  infierno: {
    drone: [36.71, 38.89, 18.35], droneCutoff: 380,
    bed: { type: 'lowpass', freq: 900, q: 0.9, gain: 0.09, lfoRate: 1.4, lfoDepth: 0.05 },
    musicBox: false,
    events: [{ name: 'crackle', weight: 6 }, { name: 'bull', weight: 2 }, { name: 'distantScream', weight: 3 }, { name: 'creak', weight: 1 }],
    every: [2, 6],
  },
  pueblo: {
    drone: [61.74, 65.41, 30.87], droneCutoff: 200,
    bed: { type: 'lowpass', freq: 300, q: 0.7, gain: 0.03, lfoRate: 0.07, lfoDepth: 0.015 },
    musicBox: true,
    events: [{ name: 'bell', weight: 3 }, { name: 'dogHowl', weight: 3 }, { name: 'hooves', weight: 3 }, { name: 'steps', weight: 2 }],
    every: [4, 10],
  },
  selva: {
    drone: [51.91, 55, 25.96], droneCutoff: 170,
    bed: { type: 'bandpass', freq: 5200, q: 6, gain: 0.025, lfoRate: 0.4, lfoDepth: 0.015 },
    musicBox: false,
    events: [{ name: 'frog', weight: 3 }, { name: 'bamboo', weight: 3 }, { name: 'farWhistle', weight: 2 }, { name: 'owl', weight: 2 }, { name: 'branch', weight: 2 }],
    every: [3, 8],
  },
  cantina: {
    drone: [46.25, 49, 23.12], droneCutoff: 190, droneGain: 0.06,
    bed: { type: 'bandpass', freq: 650, q: 1.2, gain: 0.035, lfoRate: 0.3, lfoDepth: 0.015 },
    musicBox: false,
    music: 'carrilera',
    events: [{ name: 'chatter', weight: 4 }, { name: 'glass', weight: 4 }, { name: 'laugh', weight: 2 }, { name: 'creak', weight: 1 }],
    every: [2, 6],
  },
  cementerio: {
    drone: [38.89, 41.2, 19.45], droneCutoff: 170,
    bed: { type: 'bandpass', freq: 380, q: 1.5, gain: 0.06, lfoRate: 0.08, lfoDepth: 0.05 },
    musicBox: true,
    events: [{ name: 'bell', weight: 2 }, { name: 'owl', weight: 3 }, { name: 'creak', weight: 3 }, { name: 'whisper', weight: 3 }, { name: 'dogHowl', weight: 2 }],
    every: [4, 9],
  },
  monte: {
    drone: [43.65, 46.25, 21.83], droneCutoff: 160, droneGain: 0.2,
    bed: { type: 'bandpass', freq: 4600, q: 9, gain: 0.022, lfoRate: 6, lfoDepth: 0.018 },
    musicBox: false,
    events: [{ name: 'farWhistle', weight: 3 }, { name: 'owl', weight: 3 }, { name: 'branch', weight: 3 }, { name: 'whisper', weight: 2 }, { name: 'frog', weight: 1 }],
    every: [4, 10],
  },
  fiesta: {
    drone: [65.41, 82.41, 32.7], droneCutoff: 200, droneGain: 0, happy: true,
    bed: { type: 'bandpass', freq: 800, q: 0.8, gain: 0.03, lfoRate: 0.2, lfoDepth: 0.012 },
    musicBox: false,
    music: 'cumbia',
    events: [{ name: 'firework', weight: 3 }, { name: 'chatter', weight: 3 }, { name: 'laugh', weight: 2 }, { name: 'glass', weight: 1 }],
    every: [3, 7],
  },
  hogar: {
    drone: [73.42, 92.5, 36.71], droneCutoff: 200, droneGain: 0, happy: true,
    bed: { type: 'lowpass', freq: 500, q: 0.7, gain: 0.025, lfoRate: 0.5, lfoDepth: 0.01 },
    musicBox: false,
    music: 'bambuco',
    tick: 1,
    events: [{ name: 'crackle', weight: 5 }, { name: 'creak', weight: 1 }, { name: 'owl', weight: 1 }],
    every: [3, 7],
  },
  ciudad: {
    drone: [65.41, 98, 32.7], droneCutoff: 200, droneGain: 0, happy: true,
    bed: { type: 'lowpass', freq: 220, q: 0.7, gain: 0.06, lfoRate: 0.05, lfoDepth: 0.02 },
    musicBox: false,
    music: 'salsa',
    events: [{ name: 'metro', weight: 2 }, { name: 'horn', weight: 3 }, { name: 'moto', weight: 3 }, { name: 'laugh', weight: 1 }],
    every: [3, 8],
  },
  iglesia: {
    drone: [43.65, 65.41, 21.83], droneCutoff: 160, droneGain: 0, happy: true,
    bed: { type: 'lowpass', freq: 180, q: 0.7, gain: 0.012, lfoRate: 0.06, lfoDepth: 0.005 },
    musicBox: false,
    music: 'organo',
    events: [{ name: 'steps', weight: 2 }, { name: 'prayer', weight: 3 }, { name: 'bell', weight: 1 }, { name: 'creak', weight: 1 }],
    every: [5, 11],
  },
};

/** Tensión que de verdad suena: los paisajes alegres no tienen latido ni tono de tensión. */
export function effectiveTension(theme: StageSoundTheme, t: number): number {
  return theme.happy ? 0 : Math.max(0, Math.min(1, t));
}

/** La música baja cuando sube la tensión (la rockola se apaga bajo el latido). */
export function musicDuck(theme: StageSoundTheme, t: number): number {
  return 1 - 0.8 * Math.min(1, effectiveTension(theme, t) * 1.5);
}

/* ------------------------------------------------------------------ */
/* Música                                                              */
/* ------------------------------------------------------------------ */

export type MusicId = 'cumbia' | 'carrilera' | 'bambuco' | 'salsa' | 'organo' | 'batalla';

/**
 * Instrumentos chiptune: bajo (triángulo), metal (cuadrada con filtro, tipo bombardino/trompeta),
 * punteo (tiple/requinto), rasgueo (acorde), teclado (montuno), órgano y coro (sostenidos);
 * percusión: guacharaca/maracas, tambor (llamador/conga), clave, campana.
 */
export type Instrument =
  | 'bass' | 'brass' | 'pluck' | 'strum' | 'keys' | 'organ' | 'choir'
  | 'shaker' | 'drum' | 'clave' | 'cowbell' | 'taiko';

export const PERCUSSION: readonly Instrument[] = ['shaker', 'drum', 'clave', 'cowbell', 'taiko'];

export interface MusicVoice {
  inst: Instrument;
  /** un valor por paso (se repite en bucle): nota MIDI, acorde, o intensidad 0..1 en percusión; 0 = silencio */
  steps: (number | number[])[];
  vol: number;
  /** duración de cada nota en pasos */
  len: number;
}

export interface MusicTrack {
  bpm: number;
  stepsPerBeat: number;
  /** volumen general de la pieza */
  gain: number;
  /** filtro paso bajo (Hz) para que suene lejos o "de rockola" */
  muffle?: number;
  voices: MusicVoice[];
}

/** Cada valor seguido de (n - 1) silencios: escribe corcheas en una rejilla de semicorcheas. */
export function spread(values: (number | number[])[], n: number): (number | number[])[] {
  const out: (number | number[])[] = [];
  for (const v of values) {
    out.push(v);
    for (let i = 1; i < n; i++) out.push(0);
  }
  return out;
}

/** Coloca valores en posiciones de un compás de `size` pasos. */
function at(size: number, hits: [number, number | number[]][]): (number | number[])[] {
  const bar: (number | number[])[] = new Array(size).fill(0);
  for (const [i, v] of hits) bar[i] = v;
  return bar;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/**
 * Tercera diatónica por debajo (la segunda voz de los vientos y los duetos):
 * en la escala mayor de `tonic` baja dos grados; si la nota no está en la escala, baja 4 semitonos.
 */
export function thirdBelow(note: number, tonic: number): number {
  if (note <= 0) return 0;
  const rel = (((note - tonic) % 12) + 12) % 12;
  const deg = MAJOR.indexOf(rel);
  if (deg < 0) return note - 4;
  const target = MAJOR[(deg + 5) % 7];
  const down = (rel - target + 12) % 12;
  return note - down;
}

/** Nota MIDI a frecuencia (Hz). */
export function midiToFreq(n: number): number {
  return 440 * 2 ** ((n - 69) / 12);
}

// Cumbia / porro de banda papayera en Do: I-V-V-I | IV-I-V-I
const CUMBIA_LEAD = spread([
  76, 0, 79, 76, 72, 0, 74, 76,
  74, 0, 71, 74, 79, 0, 77, 74,
  71, 74, 77, 74, 71, 0, 67, 0,
  72, 76, 79, 76, 72, 0, 0, 0,
  77, 0, 81, 77, 72, 0, 77, 81,
  79, 0, 76, 79, 84, 0, 79, 76,
  74, 77, 79, 77, 74, 71, 67, 71,
  72, 0, 76, 0, 72, 0, 0, 0,
], 2);
const CUMBIA_BASS = [
  [36, 43], [43, 38], [43, 38], [36, 43], [41, 36], [36, 43], [43, 38], [36, 31],
].flatMap(([a, b]) => at(16, [[0, a], [8, b]]));

// Música de carrilera / despecho en La menor, vals: bajo en 1, rasgueo en 2 y 3
const AM = [57, 60, 64];
const E = [56, 59, 64];
const DM = [57, 62, 65];
const CARRILERA_CHORDS = [AM, E, E, AM, DM, AM, E, AM];
const CARRILERA_ROOTS = [45, 40, 47, 45, 38, 45, 40, 45];
const CARRILERA_LEAD = [
  76, 0, 72, 0, 69, 72,
  71, 0, 68, 0, 64, 68,
  71, 72, 74, 0, 71, 68,
  69, 0, 0, 0, 72, 76,
  77, 0, 74, 0, 69, 74,
  76, 0, 72, 0, 69, 72,
  71, 0, 74, 72, 71, 68,
  69, 0, 0, 0, 0, 0,
];

// Bambuco en Re (6/8): tiple rasgado x.xx.x, bandola punteada
const D = [66, 69, 74];
const A = [64, 69, 73];
const G = [67, 71, 74];
const BAMBUCO_CHORDS = [D, A, A, D, G, D, A, D];
const BAMBUCO_ROOTS: [number, number][] = [[38, 45], [45, 40], [45, 40], [38, 45], [43, 38], [38, 45], [45, 40], [38, 38]];
const BAMBUCO_LEAD = [
  78, 0, 76, 74, 0, 73,
  76, 0, 73, 69, 0, 0,
  73, 76, 79, 78, 0, 76,
  74, 0, 0, 78, 81, 0,
  79, 0, 78, 76, 0, 74,
  78, 0, 74, 69, 0, 74,
  76, 0, 73, 71, 0, 73,
  74, 0, 0, 0, 0, 0,
];

// Salsa en Do: tumbao anticipado, montuno, clave 2-3, campana y un mambo de trompetas
const SALSA_ROOTS: [number, number][] = [[36, 41], [41, 43], [43, 41], [41, 36]];
const SALSA_MONTUNO = [
  at(8, [[0, 72], [2, 76], [3, 79], [5, 76], [6, 72]]),
  at(8, [[0, 72], [2, 77], [3, 81], [5, 77], [6, 72]]),
  at(8, [[0, 71], [2, 74], [3, 79], [5, 74], [6, 71]]),
  at(8, [[0, 72], [2, 77], [3, 81], [5, 77], [6, 72]]),
].flat();
const SALSA_MAMBO = [
  ...new Array(16).fill(0),
  0, 0, 79, 0, 81, 0, 83, 0,
  84, 0, 0, 0, 79, 0, 0, 0,
];

// Órgano de iglesia en Fa: acordes largos, pedal grave y coro en la voz alta
const ORGAN_CHORDS = [[53, 57, 60], [52, 55, 60], [50, 57, 62], [53, 58, 62], [48, 53, 57], [48, 52, 55], [50, 53, 57], [48, 53, 57]];
const ORGAN_PEDAL = [41, 36, 38, 34, 36, 36, 38, 41];
const CHOIR = [72, 72, 74, 74, 72, 67, 69, 69];

// Música de batalla, oscura y de miedo (nada de circo): bajo grave que late en La con el roce de medio tono a Si bemol,
// tambores graves tipo taiko, cuerdas sostenidas en menor y una campanita lejana que aparece de vez en cuando
const BATTLE_ROOTS = [33, 33, 34, 33];
const BATTLE_BASS = BATTLE_ROOTS.flatMap((r) => at(16, [[0, r], [2, r], [4, r], [6, r], [8, r], [10, r], [12, r], [14, r]]));
const BATTLE_PAD = [[57, 60, 64], [57, 60, 65], [58, 62, 65], [56, 59, 64]];
const BATTLE_BELL = [
  ...new Array(16).fill(0),
  81, 0, 0, 0, 0, 0, 80, 0, 0, 0, 0, 0, 77, 0, 0, 0,
  ...new Array(16).fill(0),
  76, 0, 0, 0, 0, 0, 77, 0, 0, 0, 0, 0, 76, 0, 0, 0,
];
const TAIKO_BAR = at(16, [[0, 1], [3, 0.55], [6, 0.8], [8, 1], [11, 0.55], [12, 0.7], [14, 0.85]]);
const TAIKO_FILL = at(16, [[0, 1], [3, 0.55], [6, 0.8], [8, 1], [10, 0.6], [11, 0.7], [12, 0.8], [13, 0.85], [14, 0.9], [15, 1]]);

export const MUSIC: Record<MusicId, MusicTrack> = {
  batalla: {
    bpm: 112, stepsPerBeat: 4, gain: 0.55, muffle: 3200,
    voices: [
      { inst: 'bass', steps: BATTLE_BASS, vol: 0.36, len: 1.7 },
      { inst: 'taiko', steps: [...TAIKO_BAR, ...TAIKO_BAR, ...TAIKO_BAR, ...TAIKO_FILL], vol: 0.38, len: 1 },
      { inst: 'choir', steps: BATTLE_PAD.flatMap((c) => at(16, [[0, c]])), vol: 0.022, len: 16 },
      { inst: 'pluck', steps: BATTLE_BELL, vol: 0.06, len: 5 },
    ],
  },
  cumbia: {
    bpm: 100, stepsPerBeat: 4, gain: 0.5,
    voices: [
      { inst: 'bass', steps: CUMBIA_BASS, vol: 0.32, len: 3 },
      { inst: 'brass', steps: CUMBIA_LEAD, vol: 0.09, len: 1.6 },
      { inst: 'brass', steps: CUMBIA_LEAD.map((n) => thirdBelow(n as number, 60)), vol: 0.055, len: 1.6 },
      { inst: 'shaker', steps: [0.35, 0.15, 0.7, 0.2, 0.35, 0.15, 0.7, 0.2, 0.35, 0.15, 0.7, 0.2, 0.35, 0.15, 0.7, 0.35], vol: 0.12, len: 1 },
      { inst: 'drum', steps: at(16, [[2, 0.6], [6, 0.6], [10, 0.6], [14, 0.8]]), vol: 0.3, len: 1 },
      { inst: 'clave', steps: [...at(16, [[0, 0.5], [6, 0.5], [12, 0.5]]), ...at(16, [[4, 0.5], [8, 0.5]])], vol: 0.12, len: 1 },
    ],
  },
  carrilera: {
    bpm: 138, stepsPerBeat: 2, gain: 0.45, muffle: 1700,
    voices: [
      { inst: 'bass', steps: CARRILERA_ROOTS.flatMap((r) => at(6, [[0, r]])), vol: 0.3, len: 2 },
      { inst: 'strum', steps: CARRILERA_CHORDS.flatMap((c) => at(6, [[2, c], [4, c]])), vol: 0.07, len: 1.2 },
      { inst: 'pluck', steps: CARRILERA_LEAD, vol: 0.13, len: 2 },
      { inst: 'pluck', steps: CARRILERA_LEAD.map((n) => thirdBelow(n, 60)), vol: 0.07, len: 2 },
    ],
  },
  bambuco: {
    bpm: 76, stepsPerBeat: 3, gain: 0.4, muffle: 2600,
    voices: [
      { inst: 'bass', steps: BAMBUCO_ROOTS.flatMap(([a, b]) => at(6, [[0, a], [3, b]])), vol: 0.24, len: 2 },
      { inst: 'strum', steps: BAMBUCO_CHORDS.flatMap((c) => at(6, [[0, c], [2, c], [3, c], [5, c]])), vol: 0.045, len: 1 },
      { inst: 'pluck', steps: BAMBUCO_LEAD, vol: 0.12, len: 2 },
    ],
  },
  salsa: {
    bpm: 184, stepsPerBeat: 2, gain: 0.42,
    voices: [
      { inst: 'bass', steps: SALSA_ROOTS.flatMap(([a, b]) => at(8, [[3, a], [6, b]])), vol: 0.32, len: 2.5 },
      { inst: 'keys', steps: SALSA_MONTUNO, vol: 0.06, len: 0.9 },
      { inst: 'brass', steps: SALSA_MAMBO, vol: 0.08, len: 1.6 },
      { inst: 'brass', steps: SALSA_MAMBO.map((n) => thirdBelow(n, 60)), vol: 0.05, len: 1.6 },
      { inst: 'clave', steps: [...at(8, [[2, 0.6], [4, 0.6]]), ...at(8, [[0, 0.6], [3, 0.6], [6, 0.6]])], vol: 0.12, len: 1 },
      { inst: 'cowbell', steps: at(8, [[0, 0.6], [2, 0.35], [4, 0.45], [6, 0.35]]), vol: 0.06, len: 1 },
      { inst: 'drum', steps: at(8, [[6, 0.5], [7, 0.7]]), vol: 0.22, len: 1 },
    ],
  },
  organo: {
    bpm: 40, stepsPerBeat: 1, gain: 0.4, muffle: 2200,
    voices: [
      { inst: 'organ', steps: ORGAN_CHORDS.flatMap((c) => at(4, [[0, c]])), vol: 0.05, len: 4 },
      { inst: 'organ', steps: ORGAN_PEDAL.flatMap((n) => at(4, [[0, n]])), vol: 0.07, len: 4 },
      { inst: 'choir', steps: CHOIR.flatMap((n) => at(4, [[0, n]])), vol: 0.035, len: 4 },
    ],
  },
};

/** Duración de un paso (s). */
export function stepSeconds(track: MusicTrack): number {
  return 60 / track.bpm / track.stepsPerBeat;
}

/** Elige un suceso según los pesos del tema (rnd en [0, 1)). */
export function pickStageEvent(theme: StageSoundTheme, rnd: number): StageEvent {
  const total = theme.events.reduce((a, e) => a + e.weight, 0);
  let r = rnd * total;
  for (const e of theme.events) {
    if (r < e.weight) return e.name;
    r -= e.weight;
  }
  return theme.events[theme.events.length - 1].name;
}
