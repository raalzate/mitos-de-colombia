import { describe, expect, it } from 'vitest';
import { MONSTER_VOICES, SAMPLE_IDS, VOICE_GAP, canVoice, isMacheteAttack, pickVoice, sampleUrl } from '../src/audio/Samples';
import { FIGHTERS } from '../src/data/fighters';

const AUDIO_FILES = new Set(Object.keys(import.meta.glob('../public/assets/audio/*.mp3')).map((p) => p.replace('../public/', '')));

describe('sonidos grabados', () => {
  it('cada muestra existe en public/', () => {
    for (const id of SAMPLE_IDS) expect(AUDIO_FILES.has(sampleUrl(id)), id).toBe(true);
  });

  it('todos tienen voz al pegar, al recibir y al soltar un poder; Juan Machete habla con su propia voz', () => {
    for (const id of Object.keys(FIGHTERS) as (keyof typeof FIGHTERS)[]) {
      const v = MONSTER_VOICES[id];
      for (const k of ['attack', 'hurt', 'power'] as const) expect(v[k].length, `${id} ${k}`).toBeGreaterThan(0);
    }
    for (const k of ['attack', 'hurt', 'power'] as const) {
      for (const v of MONSTER_VOICES.juanmachete[k]) expect(v.id.startsWith('juan_'), v.id).toBe(true);
    }
  });

  it('cada poder declara su sonido con grabaciones que existen', () => {
    for (const f of Object.values(FIGHTERS)) {
      for (const [name, spec] of [['s1', f.special1], ['s2', f.special2], ['ult', f.ultimateSpec]] as const) {
        const ps = spec.sound;
        expect(ps.release.length, `${f.id} ${name}`).toBeGreaterThan(0);
        for (const l of [...(ps.cast ?? []), ...ps.release]) {
          expect(!!l.s || !!l.fx, `${f.id} ${name}`).toBe(true);
          if (l.s) expect((SAMPLE_IDS as readonly string[]).includes(l.s), `${f.id} ${name} ${l.s}`).toBe(true);
        }
      }
      // el definitivo siempre lleva el grito de quien lo lanza
      expect(f.ultimateSpec.sound.voice, f.id).toBe(true);
    }
  });

  it('la Madremonte suena a tierra y madera: ni voces de mujer ni pitidos agudos', () => {
    const f = FIGHTERS.madremonte;
    const layers = [f.special1, f.special2, f.ultimateSpec].flatMap((sp) => [...(sp.sound.cast ?? []), ...sp.sound.release]);
    const voices = Object.values(MONSTER_VOICES.madremonte).flat().map((v) => v.id);
    for (const id of [...layers.map((l) => l.s ?? l.fx), ...voices]) {
      expect(id, String(id)).not.toMatch(/^female_|^juan_|bloom|scream|whistle|jump/);
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
    expect(pickVoice(MONSTER_VOICES.silbon.hurt, 0.999)).toBe(MONSTER_VOICES.silbon.hurt.at(-1));
  });

  it('solo el golpe fuerte y el machetazo de Juan Machete suenan a machete', () => {
    expect(isMacheteAttack('juanmachete', 'heavy')).toBe(true);
    expect(isMacheteAttack('juanmachete', 'special1')).toBe(true);
    expect(isMacheteAttack('juanmachete', 'lightkick')).toBe(false);
    expect(isMacheteAttack('silbon', 'heavy')).toBe(false);
  });
});
