import type { FighterState } from '../combat/CombatTypes';

/**
 * Poses para el arte de cuerpo entero dibujado ("modo dibujado"): el sprite es una sola
 * imagen por personaje y se anima con desplazamiento, giro y escala según el estado.
 * Todo relativo al luchador mirando a la derecha; FightScene aplica el espejo.
 */
export interface SplashPose {
  /** desplazamiento horizontal (hacia delante positivo) y vertical (negativo = arriba) */
  dx: number;
  dy: number;
  /** giro en grados; positivo = inclinado hacia delante */
  rot: number;
  sx: number;
  sy: number;
}

export interface PoseInput {
  state: FighterState;
  anim: string;
  animFrame: number;
  /** fotograma global para oscilaciones */
  frame: number;
  vy: number;
  grounded: boolean;
}

const pose = (o: Partial<SplashPose> = {}): SplashPose => ({ dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, ...o });

export function splashPose(i: PoseInput): SplashPose {
  const t = i.frame;
  switch (i.anim) {
    case 'idle':
      return pose({ dy: Math.round(Math.sin(t / 9) * 1.2), sy: 1 + Math.sin(t / 9) * 0.012 });
    case 'walk':
      return pose({ dy: -Math.abs(Math.round(Math.sin(t / 4) * 2)), rot: Math.sin(t / 4) * 3 + 2 });
    case 'jump':
      return i.vy < -1 ? pose({ sx: 0.92, sy: 1.1, rot: 4 }) : pose({ sx: 1.04, sy: 0.96, rot: -3 });
    case 'crouch':
      return pose({ sy: 0.72, sx: 1.08, rot: 6 });
    case 'block':
      return pose({ sx: 0.94, rot: -6, dx: -2 });
    case 'crouchblock':
      return pose({ sy: 0.72, sx: 1.02, rot: -4, dx: -2 });
    case 'light':
    case 'airlight':
      return [pose({ rot: -4, dx: -1 }), pose({ rot: 10, dx: 6, sx: 1.06 }), pose({ rot: 4, dx: 2 })][Math.min(2, i.animFrame)];
    case 'heavy':
      return [pose({ rot: -10, dx: -3, sy: 1.04 }), pose({ rot: 18, dx: 9, sx: 1.1, sy: 0.96 }), pose({ rot: 8, dx: 4 })][Math.min(2, i.animFrame)];
    case 'lightkick':
    case 'airkick':
      return [pose({ rot: -6, dx: -2 }), pose({ rot: -10, dx: 7, sx: 1.12, sy: 0.98 }), pose({ rot: -4, dx: 2 })][Math.min(2, i.animFrame)];
    case 'heavykick':
      return [pose({ rot: -12, dx: -4, sy: 1.04 }), pose({ rot: -22, dx: 10, sx: 1.18, sy: 0.94 }), pose({ rot: -8, dx: 3 })][Math.min(2, i.animFrame)];
    case 'special1':
    case 'special2':
      return [pose({ rot: -8, dx: -3, sy: 1.06 }), pose({ rot: 12, dx: 8, sx: 1.08 }), pose({ rot: 4, dx: 3 })][Math.min(2, i.animFrame)];
    case 'ultimate':
      return [pose({ rot: -10, sy: 1.08, dy: -2 }), pose({ rot: 14, dx: 10, sx: 1.12 }), pose({ rot: -6, sy: 1.1, dy: -4 })][Math.min(2, i.animFrame)];
    case 'hit':
      return i.animFrame > 0 ? pose({ rot: -16, dx: -5, sx: 0.96 }) : pose({ rot: -9, dx: -3 });
    case 'knockdown':
      // tumbado: el pivote está en los pies, así que se adelanta medio cuerpo para centrarlo sobre x
      if (i.state === 'defeat') return pose({ rot: -84, dx: 30, dy: -17, sy: 0.96 });
      return i.grounded ? pose({ rot: -80, dx: 28, dy: -17 }) : pose({ rot: -40, dx: 10, dy: -6, sx: 0.98 });
    case 'getup':
      return pose({ rot: -32, dx: 8, sy: 0.92, dy: -4 });
    case 'victory':
      return pose({ dy: -Math.abs(Math.round(Math.sin(t / 7) * 4)), rot: Math.sin(t / 7) * 4, sy: 1 + Math.abs(Math.sin(t / 7)) * 0.04 });
    default:
      return pose();
  }
}
