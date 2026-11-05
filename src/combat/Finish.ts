import type { FighterId } from './CombatTypes';

/**
 * Remate al estilo Mortal Kombat: tras el KO que decide el combate, el ganador tiene unos
 * segundos para hacer la FATALIDAD (definitivo o golpe fuerte). Reglas puras, sin Phaser.
 */

/** Frames (60 Hz) que dura la ventana de «¡ACÁBALO!». */
export const FINISH_FRAMES = 60 * 4;

/** Texto del aviso según el género del rival. */
export function finishPrompt(defenderFemale: boolean): string {
  return defenderFemale ? '¡ACÁBALA!' : '¡ACÁBALO!';
}

export interface FinishInput {
  ultimate: boolean;
  heavy: boolean;
  heavykick: boolean;
}

/** La fatalidad sale con el definitivo o con cualquier golpe fuerte dentro de la ventana. */
export function isFatalityInput(i: FinishInput): boolean {
  return i.ultimate || i.heavy || i.heavykick;
}

/** La CPU, si gana, remata a veces: más a menudo cuanto más difícil. */
export function cpuWantsFatality(difficulty: 'easy' | 'normal' | 'hard', rnd: number): boolean {
  const p = difficulty === 'hard' ? 0.9 : difficulty === 'normal' ? 0.6 : 0.3;
  return rnd < p;
}

/** Gotas de sangre por impacto: más con golpes fuertes, ninguna si se bloquea. */
export function bloodDrops(blocked: boolean, heavy: boolean, damage: number): number {
  if (blocked) return 0;
  return Math.min(40, Math.round((heavy ? 14 : 7) + damage * 1.2));
}

/* ------------------------------------------------------------------ */
/* El mito se calma: se disuelve en luz en vez de quedar tendido        */
/* ------------------------------------------------------------------ */

/** Luchadores humanos: nunca se disuelven al perder (Juan cae y ya). */
const HUMANS = new Set<FighterId>(['juanmachete']);

/** Un mito vencido se calma y se disuelve; un humano no. */
export function dissolvesOnDefeat(id: FighterId): boolean {
  return !HUMANS.has(id);
}

export type FinishStyle = 'fatality' | 'calm';

/**
 * Cómo termina el combate decidido por KO. En la aventura, ganarle a un mito es calmarlo
 * (FR-028): no hay fatalidad, el mito se apacigua y se disuelve. En arcade sigue la
 * FATALIDAD (FR-012) y el mito vencido se disuelve después.
 */
export function finishStyle(adventure: boolean, loserId: FighterId): FinishStyle {
  return adventure && dissolvesOnDefeat(loserId) ? 'calm' : 'fatality';
}

/** Frames (60 Hz) que dura la disolución completa. */
export const CALM_FRAMES = 170;
/** Frames que sostiene la pose de calma antes de empezar a desvanecerse. */
export const CALM_HOLD = 34;
/** Frames de la disolución (de opaco a invisible). */
const CALM_FADE = 110;

export interface CalmState {
  /** opacidad del mito 0..1 */
  alpha: number;
  /** desenfoque suave 0..1 */
  blur: number;
  /** resplandor en su color 0..1 */
  glow: number;
  /** px que sube flotando */
  rise: number;
  /** luces que suben en este frame */
  motes: number;
  /** velo suave sobre la escena 0..1 (la pelea se apacigua) */
  soften: number;
  done: boolean;
}

const c01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => { const x = c01(t); return x * x * (3 - 2 * x); };

/**
 * Estado de la disolución en el frame `f`: sostiene la pose de calma mientras empieza a
 * brillar, luego se desvanece despacio, se desenfoca y sube un poco soltando luces.
 */
export function calmAt(f: number): CalmState {
  const t = Math.max(0, f);
  const glowIn = smooth(t / CALM_HOLD);
  const u = c01((t - CALM_HOLD) / CALM_FADE);
  const after = c01((t - CALM_HOLD - CALM_FADE) / (CALM_FRAMES - CALM_HOLD - CALM_FADE));
  // luces: pocas al principio, muchas mientras se deshace, ninguna al final
  let motes = 0;
  if (t < CALM_HOLD) motes = t % 6 === 0 ? 1 : 0;
  else if (u < 1) motes = t % 2 === 0 ? 1 + Math.round(2 * Math.sin(u * Math.PI)) : 0;
  return {
    alpha: 1 - smooth(u),
    blur: smooth(u * 1.4),
    glow: glowIn * (1 - smooth(u)),
    rise: Math.round(10 * u * u),
    motes,
    soften: 0.3 * glowIn * (1 - after),
    done: t >= CALM_FRAMES,
  };
}

/**
 * Opacidad en escalones de 1/8 (Canvas, sin desenfoque): entre dos niveles vecinos se
 * alterna con un patrón de Bayer en el tiempo, como un tramado que se apaga.
 */
export function steppedAlpha(alpha: number, frame: number): number {
  const a = c01(alpha) * 8;
  const lo = Math.floor(a);
  const bayer = [0, 0.5, 0.75, 0.25][((frame % 4) + 4) % 4];
  return Math.min(8, lo + (a - lo > bayer ? 1 : 0)) / 8;
}

/** Color de las luces y el resplandor de cada mito al calmarse. */
export const CALM_COLOR: Record<FighterId, number> = {
  madremonte: 0x9ef07a,
  patasola: 0xffa0b8,
  hombrecaiman: 0x8ee8b0,
  llorona: 0xb8e4ff,
  sombreron: 0xc8a0ff,
  mohan: 0x90d8ff,
  muelona: 0xffc0a0,
  silbon: 0xf0e8b0,
  juanmachete: 0xffd080,
  bachue: 0x80f0e0,
};
