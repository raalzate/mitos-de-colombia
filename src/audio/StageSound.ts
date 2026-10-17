import type { StageId } from '../art/StageArtist';

/**
 * Paisaje sonoro de cada escenario: zumbido de fondo, un lecho continuo (agua, viento, fuego…)
 * y sucesos característicos al azar. La base de terror (latido por tensión, sustos) es común.
 */

export type StageEvent =
  | 'whisper' | 'creak' | 'distantScream'
  | 'frog' | 'owl' | 'thunder' | 'whistleTune' | 'crickets' | 'flute' | 'drip'
  | 'bubbles' | 'splash' | 'crackle' | 'bull' | 'bell' | 'dogHowl' | 'hooves' | 'steps';

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
}

export type SoundscapeId = StageId | 'menu';

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
};

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
