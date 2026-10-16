import type { Box, Facing, WorldBox } from './CombatTypes';

/** Convierte una caja relativa (mirando a la derecha) en coordenadas de mundo según posición y orientación. */
export function toWorldBox(box: Box, x: number, y: number, facing: Facing): WorldBox {
  const left = facing === 1 ? x + box.x : x - box.x - box.w;
  return {
    left,
    top: y + box.y,
    right: left + box.w,
    bottom: y + box.y + box.h,
  };
}

export function boxesOverlap(a: WorldBox, b: WorldBox): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function overlapAmountX(a: WorldBox, b: WorldBox): number {
  return Math.min(a.right, b.right) - Math.max(a.left, b.left);
}

export function boxCenter(b: WorldBox): { x: number; y: number } {
  return { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 };
}

/** Punto de impacto aproximado: centro de la intersección. */
export function intersectionCenter(a: WorldBox, b: WorldBox): { x: number; y: number } {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}
