import type { FighterId } from '../combat/CombatTypes';

/** Generado por tools/build_anim.sh a partir de images/Retro Folklore Character Sprite Sheet.png. */
export type DrawnAction = 'walk' | 'attack' | 'hurt' | 'idle' | 'trans';
export interface DrawnStrip { frames: number; w: number; h: number; interpolated?: boolean; keys?: number }

export const DRAWN_ANIM: Record<FighterId, Record<DrawnAction, DrawnStrip>> = {
  madremonte: { walk: { frames: 14, w: 58, h: 72, interpolated: true }, attack: { frames: 11, w: 78, h: 72, interpolated: true, keys: 6 }, hurt: { frames: 6, w: 70, h: 74 }, trans: { frames: 3, w: 78, h: 74, interpolated: true }, idle: { frames: 8, w: 78, h: 72, interpolated: true } },
  patasola: { walk: { frames: 14, w: 60, h: 72, interpolated: true }, attack: { frames: 9, w: 94, h: 72, interpolated: true, keys: 5 }, hurt: { frames: 5, w: 88, h: 72 }, trans: { frames: 3, w: 94, h: 72, interpolated: true }, idle: { frames: 8, w: 60, h: 72 } },
  hombrecaiman: { walk: { frames: 12, w: 86, h: 72, interpolated: true }, attack: { frames: 9, w: 118, h: 74, interpolated: true, keys: 5 }, hurt: { frames: 5, w: 106, h: 72 }, trans: { frames: 3, w: 118, h: 74, interpolated: true }, idle: { frames: 8, w: 118, h: 74, interpolated: true } },
  llorona: { walk: { frames: 12, w: 46, h: 72, interpolated: true }, attack: { frames: 9, w: 70, h: 70, interpolated: true, keys: 5 }, hurt: { frames: 5, w: 96, h: 70 }, trans: { frames: 3, w: 96, h: 72, interpolated: true }, idle: { frames: 8, w: 70, h: 72, interpolated: true } },
  sombreron: { walk: { frames: 12, w: 50, h: 72, interpolated: true }, attack: { frames: 9, w: 68, h: 72, interpolated: true, keys: 5 }, hurt: { frames: 5, w: 70, h: 70 }, trans: { frames: 3, w: 70, h: 72, interpolated: true }, idle: { frames: 8, w: 68, h: 72, interpolated: true } },
  mohan: { walk: { frames: 12, w: 60, h: 72, interpolated: true }, attack: { frames: 9, w: 92, h: 74, interpolated: true, keys: 5 }, hurt: { frames: 5, w: 80, h: 74 }, trans: { frames: 3, w: 92, h: 74, interpolated: true }, idle: { frames: 8, w: 92, h: 74, interpolated: true } },
  muelona: { walk: { frames: 12, w: 66, h: 72, interpolated: true }, attack: { frames: 9, w: 78, h: 72, interpolated: true, keys: 5 }, hurt: { frames: 5, w: 78, h: 68 }, trans: { frames: 3, w: 78, h: 72, interpolated: true }, idle: { frames: 8, w: 78, h: 72, interpolated: true } },
  silbon: { walk: { frames: 12, w: 68, h: 72, interpolated: true }, attack: { frames: 9, w: 70, h: 72, interpolated: true, keys: 5 }, hurt: { frames: 5, w: 94, h: 70 }, trans: { frames: 3, w: 94, h: 72, interpolated: true }, idle: { frames: 8, w: 70, h: 72, interpolated: true } },
  juanmachete: { walk: { frames: 12, w: 58, h: 72, interpolated: true }, attack: { frames: 9, w: 102, h: 72, interpolated: true, keys: 5 }, hurt: { frames: 5, w: 88, h: 76 }, trans: { frames: 3, w: 102, h: 76, interpolated: true }, idle: { frames: 8, w: 102, h: 72, interpolated: true } },
  bachue: { walk: { frames: 12, w: 42, h: 72, interpolated: true }, attack: { frames: 9, w: 60, h: 72, interpolated: true, keys: 5 }, hurt: { frames: 5, w: 72, h: 76 }, trans: { frames: 3, w: 72, h: 76, interpolated: true }, idle: { frames: 8, w: 60, h: 72, interpolated: true } },
};
