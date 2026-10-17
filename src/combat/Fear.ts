import { MAX_HP } from '../config/game-config';

/**
 * Reglas puras del terror: cuánta tensión hay en el combate y cuándo salta un susto.
 * Sin Phaser ni WebAudio, para poder probarlas.
 */

/** Tensión 0..1: sube con la vida más baja de los dos y con el tiempo que se acaba. */
export function tension(hp1: number, hp2: number, secondsLeft: number): number {
  const low = Math.min(hp1, hp2) / MAX_HP;
  const fromHp = 1 - Math.max(0, Math.min(1, low));
  const fromTime = secondsLeft <= 15 ? (15 - Math.max(0, secondsLeft)) / 15 : 0;
  return Math.max(0, Math.min(1, fromHp * 0.75 + fromTime * 0.5));
}

/** Latidos por minuto del corazón de fondo según la tensión. */
export function heartbeatBpm(t: number): number {
  return Math.round(55 + Math.max(0, Math.min(1, t)) * 95);
}

export interface ScareState {
  /** sustos activados en ajustes */
  enabled: boolean;
  /** ya hubo un susto aleatorio en esta ronda */
  usedThisRound: boolean;
  /** vida más baja de los dos luchadores */
  lowestHp: number;
  /** frames desde el último susto (para no encadenarlos) */
  framesSinceLast: number;
}

/** Vida por debajo de la cual puede saltar el susto aleatorio. */
export const SCARE_HP_THRESHOLD = 30;
/** Probabilidad por frame de saltar mientras se cumplen las condiciones (~1 cada 6 s de media). */
export const SCARE_CHANCE_PER_FRAME = 1 / 360;
/** Separación mínima entre sustos (frames a 60 Hz). */
export const SCARE_COOLDOWN = 60 * 20;

/** Susto aleatorio durante el combate: como mucho uno por ronda, cuando alguien está a punto de caer. */
export function shouldRandomScare(s: ScareState, rnd: number): boolean {
  if (!s.enabled || s.usedThisRound) return false;
  if (s.lowestHp > SCARE_HP_THRESHOLD || s.lowestHp <= 0) return false;
  if (s.framesSinceLast < SCARE_COOLDOWN) return false;
  return rnd < SCARE_CHANCE_PER_FRAME;
}

/** Segundos quieto en el menú principal antes de que salte un susto. */
export const MENU_IDLE_SCARE_SECONDS = 25;
