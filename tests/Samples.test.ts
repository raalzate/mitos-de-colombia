import { describe, expect, it } from 'vitest';
import { MONSTER_VOICES, SAMPLE_IDS, VOICE_GAP, canVoice, isMacheteAttack, pickVoice, sampleUrl } from '../src/audio/Samples';
import { FIGHTERS } from '../src/data/fighters';

const AUDIO_FILES = new Set(Object.keys(import.meta.glob('../public/assets/audio/*.mp3')).map((p) => p.replace('../public/', '')));

describe('sonidos grabados', () => {
  it('cada muestra existe en public/', () => {
    for (const id of SAMPLE_IDS) expect(AUDIO_FILES.has(sampleUrl(id)), id).toBe(true);
  });

  it('cada mito tiene voz de ataque y de dolor; Juan Machete usa el machete', () => {
    for (const id of Object.keys(FIGHTERS) as (keyof typeof FIGHTERS)[]) {
      const v = MONSTER_VOICES[id];
      if (id === 'juanmachete') {
        expect(v).toBeNull();
        continue;
      }
      expect(v?.attack.length).toBeGreaterThan(0);
      expect(v?.hurt.length).toBeGreaterThan(0);
    }
  });

  it('los mitos que comparten muestra suenan con tono distinto', () => {
    const seen = new Set<string>();
    for (const set of Object.values(MONSTER_VOICES)) {
      for (const v of set?.attack ?? []) {
        const k = `${v.id}@${v.rate}`;
        expect(seen.has(k), k).toBe(false);
        seen.add(k);
      }
    }
  });

  it('las voces no se repiten antes de la pausa mínima', () => {
    expect(canVoice('attack', 5, undefined)).toBe(true);
    expect(canVoice('attack', 5, 5 - VOICE_GAP.attack / 2)).toBe(false);
    expect(canVoice('hurt', 5, 5 - VOICE_GAP.hurt)).toBe(true);
    expect(pickVoice(MONSTER_VOICES.silbon!.hurt, 0.999)).toBe(MONSTER_VOICES.silbon!.hurt.at(-1));
  });

  it('solo el golpe fuerte y el machetazo de Juan Machete suenan a machete', () => {
    expect(isMacheteAttack('juanmachete', 'heavy')).toBe(true);
    expect(isMacheteAttack('juanmachete', 'special1')).toBe(true);
    expect(isMacheteAttack('juanmachete', 'lightkick')).toBe(false);
    expect(isMacheteAttack('silbon', 'heavy')).toBe(false);
  });
});
