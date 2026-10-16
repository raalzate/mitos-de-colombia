import type { FighterId } from '../combat/CombatTypes';

/** Generado por tools/extract_anim.py a partir de images/Retro Folklore Character Sprite Sheet.png. */
export type DrawnAction = 'walk' | 'attack' | 'hurt';
export interface DrawnStrip { frames: number; w: number; h: number; interpolated?: boolean }

export const DRAWN_ANIM: Record<FighterId, Record<DrawnAction, DrawnStrip>> = {
  madremonte: { walk: { frames: 7, w: 58, h: 72 }, attack: { frames: 6, w: 78, h: 72 }, hurt: { frames: 6, w: 70, h: 74 } },
  patasola: { walk: { frames: 7, w: 60, h: 72 }, attack: { frames: 5, w: 94, h: 72 }, hurt: { frames: 5, w: 88, h: 72 } },
  hombrecaiman: { walk: { frames: 6, w: 86, h: 72 }, attack: { frames: 5, w: 118, h: 74 }, hurt: { frames: 5, w: 106, h: 72 } },
  llorona: { walk: { frames: 6, w: 46, h: 72 }, attack: { frames: 5, w: 70, h: 70 }, hurt: { frames: 5, w: 96, h: 70 } },
  sombreron: { walk: { frames: 6, w: 50, h: 72 }, attack: { frames: 5, w: 68, h: 72 }, hurt: { frames: 5, w: 70, h: 70 } },
  mohan: { walk: { frames: 6, w: 60, h: 72 }, attack: { frames: 5, w: 92, h: 74 }, hurt: { frames: 5, w: 80, h: 74 } },
  muelona: { walk: { frames: 6, w: 66, h: 72 }, attack: { frames: 5, w: 78, h: 72 }, hurt: { frames: 5, w: 78, h: 68 } },
  silbon: { walk: { frames: 6, w: 68, h: 72 }, attack: { frames: 5, w: 70, h: 72 }, hurt: { frames: 5, w: 94, h: 70 } },
  juanmachete: { walk: { frames: 6, w: 58, h: 72 }, attack: { frames: 5, w: 102, h: 72 }, hurt: { frames: 5, w: 88, h: 76 } },
  bachue: { walk: { frames: 6, w: 42, h: 72 }, attack: { frames: 5, w: 60, h: 72 }, hurt: { frames: 5, w: 72, h: 76 } },
};
