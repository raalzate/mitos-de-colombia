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
}

export function drawnAnimKey(id: FighterId, slot: 'p1' | 'p2', action: DrawnAction): string {
  return `anim_${id}_${slot}_${action}`;
}

export function drawnAnimFile(id: FighterId, slot: 'p1' | 'p2', action: DrawnAction): string {
  return `anim/${id}_${action}_${slot}.png`;
}

/**
 * Devuelve la tira y el fotograma, o null si el estado se dibuja con la imagen base
 * (reposo, salto, agachado, bloqueo y habilidades, que usan `SplashPose`).
 */
export function drawnFrame(id: FighterId, i: DrawnFrameInput): DrawnFrame | null {
  const m = DRAWN_ANIM[id];
  if (!m) return null;
  const walkN = m.walk.frames;
  const atkN = m.attack.frames;
  const hurtN = m.hurt.frames;
  switch (i.anim) {
    case 'walk':
      return { action: 'walk', index: Math.floor(i.frame / 5) % walkN };
    case 'light':
    case 'airlight':
    case 'heavy': {
      // puño: primera mitad de la tira (preparación, extensión, recuperación)
      const half = Math.max(1, Math.floor(atkN / 2));
      const seq = [0, Math.min(half - 1, 1), Math.min(half - 1, 2)];
      return { action: 'attack', index: seq[Math.min(2, i.animFrame)] };
    }
    case 'lightkick':
    case 'airkick':
    case 'heavykick': {
      // patada: segunda mitad
      const start = Math.floor(atkN / 2);
      const seq = [start, Math.min(atkN - 1, start + 1), Math.min(atkN - 1, start + 2)];
      return { action: 'attack', index: seq[Math.min(2, i.animFrame)] };
    }
    // tira de daño: [golpe, golpe fuerte, caída, tumbado, levantarse, victoria]; con 5 fotogramas
    // faltan uno de los intermedios, así que se cuenta desde el final.
    case 'hit':
      return { action: 'hurt', index: i.animFrame > 0 ? Math.min(1, hurtN - 1) : 0 };
    case 'knockdown':
      if (i.state === 'defeat' || i.grounded) return { action: 'hurt', index: hurtN >= 6 ? 3 : hurtN - 2 };
      return { action: 'hurt', index: Math.min(2, hurtN - 1) };
    case 'getup':
      return { action: 'hurt', index: hurtN >= 6 ? 4 : hurtN - 2 };
    case 'victory':
      return { action: 'hurt', index: hurtN - 1 };
    default:
      return null;
  }
}
