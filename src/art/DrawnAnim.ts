import type { FighterId, FighterState } from '../combat/CombatTypes';
import { DRAWN_ANIM, type DrawnAction } from './drawnAnimManifest';

/**
 * Animación dibujada fotograma a fotograma (tiras de `public/assets/anim`):
 * elige tira y fotograma a partir del estado lógico del luchador. Puro, sin Phaser.
 * Las tiras tienen un número variable de fotogramas, así que las posiciones se
 * expresan como fracción de la tira.
 */
export interface DrawnFrame {
  action: DrawnAction;
  index: number;
}

export interface DrawnFrameInput {
  state: FighterState;
  anim: string;
  animFrame: number;
  /** fotograma global del combate (para ciclos) */
  frame: number;
  grounded: boolean;
  /** caminando hacia atrás (vx opuesto a facing): el ciclo se reproduce en reversa */
  backward?: boolean;
  /** distancia recorrida andando (px); si se da, el ciclo avanza por distancia y no por tiempo */
  walkDistance?: number;
  /** subiendo en el salto */
  rising?: boolean;
}

export function drawnAnimKey(id: FighterId, slot: 'p1' | 'p2', action: DrawnAction): string {
  return `anim_${id}_${slot}_${action}`;
}

export function drawnAnimFile(id: FighterId, slot: 'p1' | 'p2', action: DrawnAction): string {
  return `anim/${id}_${action}_${slot}.png`;
}

/** Velocidad del ciclo de andar (fotogramas lógicos por fotograma dibujado) cuando no hay distancia. */
export const WALK_FRAME_TICKS = 5;
/** Píxeles recorridos por fotograma de andar: los pies no patinan sobre el suelo. */
export const WALK_STRIDE_PX = 7;

/** Fotograma del ciclo de andar según la distancia recorrida (sin deslizamiento de pies). */
export function walkFrameByDistance(distance: number, frames: number, stride = WALK_STRIDE_PX): number {
  return Math.floor(Math.max(0, distance) / stride) % frames;
}

/**
 * Devuelve la tira y el fotograma para cualquier estado: todo el personaje sale de las
 * mismas tres tiras, así nunca cambia de "dibujo" entre acciones (estilo Mortal Kombat).
 * null solo si el personaje no tiene tiras.
 */
export function drawnFrame(id: FighterId, i: DrawnFrameInput): DrawnFrame | null {
  const m = DRAWN_ANIM[id];
  if (!m) return null;
  const walkN = m.walk.frames;
  const atkN = m.attack.frames;
  const hurtN = m.hurt.frames;
  const half = Math.max(1, Math.floor(atkN / 2));
  const punch = (f: number) => ({ action: 'attack' as const, index: [0, Math.min(half - 1, 1), Math.min(half - 1, 2)][Math.min(2, f)] });
  const kick = (f: number) => ({ action: 'attack' as const, index: [half, Math.min(atkN - 1, half + 1), Math.min(atkN - 1, half + 2)][Math.min(2, f)] });
  const getup = hurtN >= 6 ? 4 : hurtN - 2;
  switch (i.anim) {
    case 'idle':
      return { action: 'walk', index: 0 };
    case 'walk': {
      const k = i.walkDistance !== undefined ? walkFrameByDistance(i.walkDistance, walkN) : Math.floor(i.frame / WALK_FRAME_TICKS) % walkN;
      return { action: 'walk', index: i.backward ? (walkN - k) % walkN : k };
    }
    case 'jump':
      // subiendo: pierna recogida (preparación de patada); bajando: pierna extendida
      return { action: 'attack', index: i.rising ? half : Math.min(atkN - 1, half + 1) };
    case 'crouch':
    case 'crouchblock':
      return { action: 'hurt', index: getup };
    case 'block':
      return { action: 'attack', index: 0 };
    case 'special1':
      return punch(i.animFrame);
    case 'special2':
      return kick(i.animFrame);
    case 'ultimate':
      return [punch(1), kick(1), { action: 'hurt' as const, index: hurtN - 1 }][Math.min(2, i.animFrame)];
    case 'light':
    case 'airlight':
    case 'heavy':
      return punch(i.animFrame);
    case 'lightkick':
    case 'airkick':
    case 'heavykick':
      return kick(i.animFrame);
    // tira de daño: [golpe, golpe fuerte, caída, tumbado, levantarse, victoria]; con 5 fotogramas
    // faltan uno de los intermedios, así que se cuenta desde el final.
    case 'hit':
      return { action: 'hurt', index: i.animFrame > 0 ? Math.min(1, hurtN - 1) : 0 };
    case 'knockdown':
      if (i.state === 'defeat' || i.grounded) return { action: 'hurt', index: hurtN >= 6 ? 3 : hurtN - 2 };
      return { action: 'hurt', index: Math.min(2, hurtN - 1) };
    case 'getup':
      return { action: 'hurt', index: getup };
    case 'victory':
      return { action: 'hurt', index: hurtN - 1 };
    default:
      return { action: 'walk', index: 0 };
  }
}
