/**
 * Sonidos grabados (CC0 / dominio público, ver public/assets/audio/CREDITS.md):
 * machete de Juan Machete, voces de los mitos y ambientes del modo aventura.
 */

import type { AttackKind, FighterId } from '../combat/CombatTypes';

export const SAMPLE_IDS = [
  'machete_swing_1', 'machete_swing_2', 'machete_hit_1', 'machete_hit_2', 'machete_clang',
  'monster_madremonte', 'monster_roar', 'monster_snarl', 'monster_hiss', 'beast_hurt_1', 'beast_hurt_2',
  'female_shriek', 'female_cackle', 'female_cackle_2', 'female_wail',
  'male_laugh_1', 'male_laugh_2', 'male_laugh_deep', 'male_hurt_1', 'male_hurt_2',
  'ambient_pollo', 'ambient_duende', 'ambient_mano',
] as const;

export type SampleId = (typeof SAMPLE_IDS)[number];

export const sampleUrl = (id: SampleId): string => `assets/audio/${id}.mp3`;

/** Muestra + velocidad de reproducción (cambia el tono para que cada mito suene distinto). */
export interface Voice {
  id: SampleId;
  rate: number;
}

export type VoiceKind = 'attack' | 'hurt';

export const MONSTER_VOICES: Record<FighterId, Record<VoiceKind, Voice[]> | null> = {
  silbon: {
    attack: [{ id: 'male_laugh_1', rate: 0.88 }],
    hurt: [{ id: 'male_hurt_1', rate: 0.95 }, { id: 'male_hurt_2', rate: 1.05 }],
  },
  sombreron: {
    attack: [{ id: 'male_laugh_deep', rate: 0.82 }],
    hurt: [{ id: 'male_hurt_2', rate: 0.82 }],
  },
  mohan: {
    attack: [{ id: 'male_laugh_2', rate: 0.95 }, { id: 'male_laugh_deep', rate: 1.05 }],
    hurt: [{ id: 'male_hurt_1', rate: 1.1 }],
  },
  llorona: {
    attack: [{ id: 'female_wail', rate: 1 }, { id: 'female_shriek', rate: 0.92 }],
    hurt: [{ id: 'female_shriek', rate: 1.15 }],
  },
  muelona: {
    attack: [{ id: 'female_cackle', rate: 0.94 }, { id: 'female_cackle_2', rate: 0.9 }],
    hurt: [{ id: 'female_shriek', rate: 1 }],
  },
  patasola: {
    attack: [{ id: 'female_cackle_2', rate: 1.08 }, { id: 'female_wail', rate: 1.12 }],
    hurt: [{ id: 'female_shriek', rate: 0.88 }],
  },
  madremonte: {
    attack: [{ id: 'monster_madremonte', rate: 0.9 }, { id: 'monster_roar', rate: 0.78 }],
    hurt: [{ id: 'monster_roar', rate: 0.95 }, { id: 'beast_hurt_2', rate: 0.7 }],
  },
  hombrecaiman: {
    attack: [{ id: 'monster_snarl', rate: 0.8 }, { id: 'monster_hiss', rate: 0.7 }],
    hurt: [{ id: 'beast_hurt_1', rate: 0.72 }],
  },
  bachue: {
    attack: [{ id: 'monster_hiss', rate: 0.85 }],
    hurt: [{ id: 'beast_hurt_2', rate: 0.85 }, { id: 'beast_hurt_1', rate: 0.95 }],
  },
  juanmachete: null,
};

/** Tiempo mínimo (s) desde la última voz del mismo luchador; el quejido puede cortar la risa. */
export const VOICE_GAP: Record<VoiceKind, number> = { attack: 1.1, hurt: 0.45 };

export function pickVoice(voices: readonly Voice[], r: number): Voice {
  return voices[Math.min(voices.length - 1, Math.floor(r * voices.length))];
}

export function canVoice(kind: VoiceKind, now: number, lastAt: number | undefined): boolean {
  return lastAt === undefined || now - lastAt >= VOICE_GAP[kind];
}

/** Golpes de Juan Machete que se dan con el machete (el resto son puños y patadas). */
export function isMacheteAttack(id: FighterId, kind: AttackKind | undefined): boolean {
  return id === 'juanmachete' && (kind === 'heavy' || kind === 'special1');
}
