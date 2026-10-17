import type { FighterId } from '../combat/CombatTypes';

/** Generado por tools/build_anim.sh a partir de images/Retro Folklore Character Sprite Sheet.png. */
export type DrawnAction = 'walk' | 'attack' | 'hurt' | 'idle' | 'trans' | 'fall';
export interface DrawnStrip { frames: number; w: number; h: number; interpolated?: boolean; keys?: number; lying?: number; air?: number; airEnd?: number }

/** `fall` (caída y levantarse, generada con PixelLab) es opcional por personaje. */
export const DRAWN_ANIM: Record<FighterId, Record<Exclude<DrawnAction, 'fall'>, DrawnStrip> & { fall?: DrawnStrip }> = {
  madremonte: { walk: { frames: 7, w: 58, h: 72 }, attack: { frames: 6, w: 78, h: 72 }, hurt: { frames: 6, w: 70, h: 74 }, trans: { frames: 3, w: 78, h: 74 }, idle: { frames: 1, w: 78, h: 72 }, fall: { frames: 13, w: 96, h: 94, lying: 8, air: 6, airEnd: 7 } },
  patasola: { walk: { frames: 7, w: 60, h: 72 }, attack: { frames: 5, w: 94, h: 72 }, hurt: { frames: 5, w: 88, h: 72 }, trans: { frames: 3, w: 94, h: 72 }, idle: { frames: 8, w: 60, h: 72 }, fall: { frames: 13, w: 96, h: 94, lying: 7, air: 3, airEnd: 5 } },
  hombrecaiman: { walk: { frames: 6, w: 86, h: 72 }, attack: { frames: 5, w: 118, h: 74 }, hurt: { frames: 5, w: 106, h: 72 }, trans: { frames: 3, w: 118, h: 74 }, idle: { frames: 1, w: 118, h: 74 }, fall: { frames: 13, w: 96, h: 94, lying: 9, air: 6, airEnd: 7 } },
  llorona: { walk: { frames: 6, w: 46, h: 72 }, attack: { frames: 5, w: 70, h: 70 }, hurt: { frames: 5, w: 96, h: 70 }, trans: { frames: 3, w: 96, h: 72 }, idle: { frames: 1, w: 70, h: 72 }, fall: { frames: 13, w: 96, h: 94, lying: 9, air: 6, airEnd: 7 } },
  sombreron: { walk: { frames: 6, w: 50, h: 72 }, attack: { frames: 5, w: 68, h: 72 }, hurt: { frames: 5, w: 70, h: 70 }, trans: { frames: 3, w: 70, h: 72 }, idle: { frames: 1, w: 68, h: 72 }, fall: { frames: 13, w: 96, h: 94, lying: 8, air: 5, airEnd: 6 } },
  mohan: { walk: { frames: 6, w: 60, h: 72 }, attack: { frames: 5, w: 92, h: 74 }, hurt: { frames: 5, w: 80, h: 74 }, trans: { frames: 3, w: 92, h: 74 }, idle: { frames: 1, w: 92, h: 74 }, fall: { frames: 13, w: 96, h: 94, lying: 9, air: 6, airEnd: 6 } },
  muelona: { walk: { frames: 6, w: 66, h: 72 }, attack: { frames: 5, w: 78, h: 72 }, hurt: { frames: 5, w: 78, h: 68 }, trans: { frames: 3, w: 78, h: 72 }, idle: { frames: 1, w: 78, h: 72 }, fall: { frames: 13, w: 96, h: 94, lying: 8, air: 6, airEnd: 6 } },
  silbon: { walk: { frames: 6, w: 68, h: 72 }, attack: { frames: 5, w: 70, h: 72 }, hurt: { frames: 5, w: 94, h: 70 }, trans: { frames: 3, w: 94, h: 72 }, idle: { frames: 1, w: 70, h: 72 }, fall: { frames: 13, w: 96, h: 94, lying: 9, air: 7, airEnd: 7 } },
  juanmachete: { walk: { frames: 6, w: 58, h: 72 }, attack: { frames: 5, w: 102, h: 72 }, hurt: { frames: 5, w: 88, h: 76 }, trans: { frames: 3, w: 102, h: 76 }, idle: { frames: 1, w: 102, h: 72 }, fall: { frames: 13, w: 96, h: 94, lying: 9, air: 4, airEnd: 4 } },
  bachue: { walk: { frames: 6, w: 42, h: 72 }, attack: { frames: 5, w: 60, h: 72 }, hurt: { frames: 5, w: 72, h: 76 }, trans: { frames: 3, w: 72, h: 76 }, idle: { frames: 1, w: 60, h: 72 }, fall: { frames: 13, w: 96, h: 94, lying: 7, air: 4, airEnd: 5 } },
};
