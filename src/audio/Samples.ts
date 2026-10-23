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
  'juan_attack_1', 'juan_attack_2', 'juan_attack_3', 'juan_hurt_1', 'juan_hurt_2', 'juan_power_1', 'juan_power_2',
  'wood_crack', 'wood_snap', 'wood_break', 'rock_rumble', 'rock_break', 'roar_deep', 'roar_low', 'grunt_deep', 'stomp',
  'splash_big', 'splash_small', 'bubbles', 'water_rush', 'rain', 'fire_burst', 'fire_roar',
  'blade_slash', 'chain_whip', 'bite_snap', 'bones_clack', 'bones_rattle', 'ghost_breath', 'punch_1', 'punch_2', 'punch_heavy',
] as const;

export type SampleId = (typeof SAMPLE_IDS)[number];

export const sampleUrl = (id: SampleId): string => `assets/audio/${id}.mp3`;

/** Muestra + velocidad de reproducción (cambia el tono para que cada mito suene distinto). */
export interface Voice {
  id: SampleId;
  rate: number;
}

/** attack: al golpear; hurt: al recibir; power: el grito fuerte al soltar un poder */
export type VoiceKind = 'attack' | 'hurt' | 'power';

export const MONSTER_VOICES: Record<FighterId, Record<VoiceKind, Voice[]>> = {
  silbon: {
    attack: [{ id: 'male_laugh_1', rate: 0.88 }],
    hurt: [{ id: 'male_hurt_1', rate: 0.95 }, { id: 'male_hurt_2', rate: 1.05 }],
    power: [{ id: 'male_laugh_1', rate: 0.8 }],
  },
  sombreron: {
    attack: [{ id: 'male_laugh_deep', rate: 0.82 }],
    hurt: [{ id: 'male_hurt_2', rate: 0.82 }],
    power: [{ id: 'male_laugh_deep', rate: 0.75 }],
  },
  mohan: {
    attack: [{ id: 'male_laugh_2', rate: 0.95 }, { id: 'male_laugh_deep', rate: 1.05 }],
    hurt: [{ id: 'male_hurt_1', rate: 1.1 }],
    power: [{ id: 'male_laugh_deep', rate: 0.9 }],
  },
  llorona: {
    attack: [{ id: 'female_wail', rate: 1 }, { id: 'female_shriek', rate: 0.92 }],
    hurt: [{ id: 'female_shriek', rate: 1.15 }],
    power: [{ id: 'female_wail', rate: 0.9 }],
  },
  muelona: {
    attack: [{ id: 'female_cackle', rate: 0.94 }, { id: 'female_cackle_2', rate: 0.9 }],
    hurt: [{ id: 'female_shriek', rate: 1 }],
    power: [{ id: 'female_cackle', rate: 0.85 }],
  },
  patasola: {
    attack: [{ id: 'female_cackle_2', rate: 1.08 }, { id: 'female_wail', rate: 1.12 }],
    hurt: [{ id: 'female_shriek', rate: 0.88 }],
    power: [{ id: 'female_shriek', rate: 0.8 }],
  },
  // la dueña del monte: voz de tierra y tronco, siempre grave (nada de chillidos)
  madremonte: {
    attack: [{ id: 'monster_madremonte', rate: 0.85 }, { id: 'roar_deep', rate: 1 }],
    hurt: [{ id: 'grunt_deep', rate: 1 }, { id: 'roar_low', rate: 1.05 }],
    power: [{ id: 'roar_deep', rate: 0.9 }, { id: 'roar_low', rate: 0.9 }],
  },
  hombrecaiman: {
    attack: [{ id: 'monster_snarl', rate: 0.8 }, { id: 'monster_hiss', rate: 0.7 }],
    hurt: [{ id: 'beast_hurt_1', rate: 0.72 }],
    power: [{ id: 'roar_low', rate: 1 }],
  },
  bachue: {
    attack: [{ id: 'monster_hiss', rate: 0.85 }],
    hurt: [{ id: 'beast_hurt_2', rate: 0.85 }, { id: 'beast_hurt_1', rate: 0.95 }],
    power: [{ id: 'monster_hiss', rate: 0.7 }],
  },
  // Juan Machete: un campesino de carne y hueso que grita al pegar y se queja al recibir
  juanmachete: {
    attack: [{ id: 'juan_attack_1', rate: 1 }, { id: 'juan_attack_2', rate: 1 }, { id: 'juan_attack_3', rate: 1 }],
    hurt: [{ id: 'juan_hurt_1', rate: 1 }, { id: 'juan_hurt_2', rate: 1 }],
    power: [{ id: 'juan_power_1', rate: 1 }, { id: 'juan_power_2', rate: 1 }],
  },
};

/** Tiempo mínimo (s) desde la última voz del mismo luchador; el quejido puede cortar la risa y el grito del poder corta todo. */
export const VOICE_GAP: Record<VoiceKind, number> = { attack: 1.1, hurt: 0.45, power: 0 };

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
