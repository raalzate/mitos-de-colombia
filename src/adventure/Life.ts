import type { Dir } from './World';

/**
 * Vida propia de la gente y de Firulais en el mapa: respiran, miran a Juan cuando se arrima,
 * miran para los lados y el perro olfatea y corretea alrededor de Juan.
 * Solo se usan los fotogramas dibujados (uno por dirección) y transformaciones del fotograma completo (TC-04).
 */

/** Casillas a las que tiene que estar Juan para que alguien voltee a mirarlo. */
export const NOTICE_RADIUS = 2;
/** Cuánto se estira al respirar (fracción de la altura): ~1 px en un muñeco de 48 px. */
export const BREATH_AMP = 0.022;

/** Factor de altura al respirar: cada quien con su propio ritmo (fase y velocidad). */
export function breath(frame: number, phase: number, speed = 1): number {
  return 1 + Math.sin(frame * 0.045 * speed + phase) * BREATH_AMP;
}

/** Hacia dónde mira alguien en (fx, fy) para ver a (tx, ty); null si están en la misma casilla. */
export function faceToward(fx: number, fy: number, tx: number, ty: number): Dir | null {
  const dx = tx - fx, dy = ty - fy;
  if (!dx && !dy) return null;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}

/** Fotogramas hasta la próxima ocurrencia de alguien: entre `min` y `min + span`, al azar para que no vayan todos al tiempo. */
export function nextBeat(rnd: () => number, min = 120, span = 240): number {
  return min + Math.floor(rnd() * span);
}

/** Una mirada a un lado (no la de siempre ni para atrás de golpe): izquierda o derecha si mira de frente, y al revés. */
export function glance(facing: Dir, rnd: () => number): Dir {
  const side: Dir[] = facing === 'up' || facing === 'down' ? ['left', 'right'] : ['down', 'up'];
  return side[rnd() < 0.5 ? 0 : 1];
}

export type DogMood = 'olfatear' | 'corretear' | 'mirar';

/** Qué hace Firulais cuando Juan se queda quieto un rato. */
export function dogMood(rnd: () => number): DogMood {
  const r = rnd();
  return r < 0.45 ? 'olfatear' : r < 0.8 ? 'corretear' : 'mirar';
}

/**
 * Casilla libre a una o dos de Juan para que el perro vaya a husmear, y distinta de donde está.
 * `free` dice si la casilla se puede pisar y no hay nadie.
 */
export function dogRoam(
  hero: [number, number], dog: [number, number], rnd: () => number, free: (x: number, y: number) => boolean,
): [number, number] | null {
  const opts: [number, number][] = [];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const x = hero[0] + dx, y = hero[1] + dy;
    if ((!dx && !dy) || Math.abs(dx) + Math.abs(dy) > 2) continue;
    if (x === dog[0] && y === dog[1]) continue;
    // de a una casilla del perro, para que se vea que camina y no que salta
    if (Math.abs(x - dog[0]) + Math.abs(y - dog[1]) !== 1) continue;
    if (free(x, y)) opts.push([x, y]);
  }
  return opts.length ? opts[Math.floor(rnd() * opts.length)] : null;
}
