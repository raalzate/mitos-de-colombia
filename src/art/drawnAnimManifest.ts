import type { FighterId } from '../combat/CombatTypes';

/** Generado por tools/extract_anim.py + tools/interpolate_walk.py a partir de images/Retro Folklore Character Sprite Sheet.png. */
export type DrawnAction = 'walk' | 'attack' | 'hurt' | 'idle';
export interface DrawnStrip { frames: number; w: number; h: number; interpolated?: boolean }

export const DRAWN_ANIM: Record<FighterId, Record<DrawnAction, DrawnStrip>> = {
  madremonte: { walk: { frames: 14, w: 58, h: 72, interpolated: true }, attack: { frames: 6, w: 78, h: 72 }, hurt: { frames: 6, w: 70, h: 74 }, idle: { frames: 6, w: 78, h: 72, interpolated: true } },
  patasola: { walk: { frames: 14, w: 60, h: 72, interpolated: true }, attack: { frames: 5, w: 94, h: 72 }, hurt: { frames: 5, w: 88, h: 72 }, idle: { frames: 6, w: 94, h: 72, interpolated: true } },
  hombrecaiman: { walk: { frames: 12, w: 86, h: 72, interpolated: true }, attack: { frames: 5, w: 118, h: 74 }, hurt: { frames: 5, w: 106, h: 72 }, idle: { frames: 6, w: 118, h: 74, interpolated: true } },
  llorona: { walk: { frames: 12, w: 46, h: 72, interpolated: true }, attack: { frames: 5, w: 70, h: 70 }, hurt: { frames: 5, w: 96, h: 70 }, idle: { frames: 6, w: 70, h: 72, interpolated: true } },
  sombreron: { walk: { frames: 12, w: 50, h: 72, interpolated: true }, attack: { frames: 5, w: 68, h: 72 }, hurt: { frames: 5, w: 70, h: 70 }, idle: { frames: 6, w: 68, h: 72, interpolated: true } },
  mohan: { walk: { frames: 12, w: 60, h: 72, interpolated: true }, attack: { frames: 5, w: 92, h: 74 }, hurt: { frames: 5, w: 80, h: 74 }, idle: { frames: 6, w: 92, h: 74, interpolated: true } },
  muelona: { walk: { frames: 12, w: 66, h: 72, interpolated: true }, attack: { frames: 5, w: 78, h: 72 }, hurt: { frames: 5, w: 78, h: 68 }, idle: { frames: 6, w: 78, h: 72, interpolated: true } },
  silbon: { walk: { frames: 12, w: 68, h: 72, interpolated: true }, attack: { frames: 5, w: 70, h: 72 }, hurt: { frames: 5, w: 94, h: 70 }, idle: { frames: 6, w: 70, h: 72, interpolated: true } },
  juanmachete: { walk: { frames: 12, w: 58, h: 72, interpolated: true }, attack: { frames: 5, w: 102, h: 72 }, hurt: { frames: 5, w: 88, h: 76 }, idle: { frames: 6, w: 102, h: 72, interpolated: true } },
  bachue: { walk: { frames: 12, w: 42, h: 72, interpolated: true }, attack: { frames: 5, w: 60, h: 72 }, hurt: { frames: 5, w: 72, h: 76 }, idle: { frames: 6, w: 60, h: 72, interpolated: true } },
};
