import { describe, expect, it } from 'vitest';
import {
  MUSIC, PERCUSSION, SOUNDSCAPE_IDS, STAGE_SOUND, effectiveTension, midiToFreq, musicDuck, pickStageEvent,
  spread, stepSeconds, thirdBelow,
} from '../src/audio/StageSound';
import { STAGE_IDS } from '../src/art/StageArtist';

describe('sonido por escenario', () => {
  it('cada escenario tiene su propio paisaje sonoro válido', () => {
    for (const id of SOUNDSCAPE_IDS) {
      const t = STAGE_SOUND[id];
      expect(t).toBeDefined();
      expect(t.events.length).toBeGreaterThan(0);
      expect(t.events.every((e) => e.weight > 0)).toBe(true);
      expect(t.every[0]).toBeGreaterThan(0);
      expect(t.every[1]).toBeGreaterThanOrEqual(t.every[0]);
      expect(t.drone.every((f) => f > 15 && f < 120)).toBe(true);
    }
  });

  it('los escenarios suenan distinto: zumbido y sucesos propios', () => {
    const drones = new Set(STAGE_IDS.map((id) => STAGE_SOUND[id].drone.join(',')));
    expect(drones.size).toBe(STAGE_IDS.length);
    const signature = new Set(STAGE_IDS.map((id) => STAGE_SOUND[id].events.map((e) => e.name).sort().join(',')));
    expect(signature.size).toBe(STAGE_IDS.length);
    expect(STAGE_SOUND.llanos.events.some((e) => e.name === 'whistleTune')).toBe(true);
    expect(STAGE_SOUND.pueblo.events.some((e) => e.name === 'bell')).toBe(true);
    expect(STAGE_SOUND.infierno.events.some((e) => e.name === 'crackle')).toBe(true);
  });

  it('elige sucesos según su peso', () => {
    const t = STAGE_SOUND.infierno;
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const e = pickStageEvent(t, i / 1000);
      counts[e] = (counts[e] ?? 0) + 1;
    }
    expect(counts.crackle).toBeGreaterThan(counts.bull);
    expect(pickStageEvent(t, 0.9999)).toBe(t.events[t.events.length - 1].name);
  });
});

describe('paisajes de la aventura y música', () => {
  const happy = ['fiesta', 'hogar', 'ciudad', 'iglesia'] as const;

  it('las zonas alegres tienen música y apagan el terror', () => {
    for (const id of happy) {
      const t = STAGE_SOUND[id];
      expect(t.happy).toBe(true);
      expect(t.music).toBeDefined();
      expect(t.musicBox).toBe(false);
      expect(t.droneGain).toBe(0);
      expect(effectiveTension(t, 1)).toBe(0);
      expect(musicDuck(t, 1)).toBe(1);
    }
    expect(STAGE_SOUND.hogar.tick).toBeGreaterThan(0);
    expect(STAGE_SOUND.fiesta.events.some((e) => e.name === 'firework')).toBe(true);
    expect(STAGE_SOUND.ciudad.events.some((e) => e.name === 'metro')).toBe(true);
  });

  it('el monte es tenso: sin música, zumbido fuerte y silbido lejano', () => {
    const t = STAGE_SOUND.monte;
    expect(t.happy).toBeFalsy();
    expect(t.music).toBeUndefined();
    expect(t.droneGain!).toBeGreaterThan(0.16);
    expect(t.events.some((e) => e.name === 'farWhistle')).toBe(true);
    expect(effectiveTension(t, 0.7)).toBe(0.7);
  });

  it('en combate solo la cantina tiene música, y se apaga con la tensión', () => {
    const withMusic = STAGE_IDS.filter((id) => STAGE_SOUND[id].music);
    expect(withMusic).toEqual(['cantina']);
    const c = STAGE_SOUND.cantina;
    expect(musicDuck(c, 0)).toBe(1);
    expect(musicDuck(c, 0.4)).toBeLessThan(musicDuck(c, 0.1));
    expect(musicDuck(c, 1)).toBeCloseTo(0.2);
  });

  it('cada pieza es válida: notas en rango, percusión 0..1, pasos razonables', () => {
    for (const [id, tr] of Object.entries(MUSIC)) {
      expect(tr.bpm, id).toBeGreaterThan(30);
      expect(stepSeconds(tr)).toBeGreaterThan(0.08);
      expect(tr.voices.length).toBeGreaterThan(0);
      for (const v of tr.voices) {
        expect(v.steps.length).toBeGreaterThan(0);
        expect(v.vol).toBeGreaterThan(0);
        expect(v.vol).toBeLessThan(0.4);
        for (const s of v.steps.flat()) {
          if (PERCUSSION.includes(v.inst)) {
            expect(s).toBeGreaterThanOrEqual(0);
            expect(s).toBeLessThanOrEqual(1);
          } else if (s !== 0) {
            expect(s).toBeGreaterThanOrEqual(28);
            expect(s).toBeLessThanOrEqual(96);
          }
        }
      }
    }
  });

  it('la cumbia lleva el bajo en 1 y 3 y la guacharaca en cada semicorchea', () => {
    const bass = MUSIC.cumbia.voices.find((v) => v.inst === 'bass')!;
    bass.steps.forEach((s, i) => {
      if (s !== 0) expect(i % 16 === 0 || i % 16 === 8).toBe(true);
    });
    const shaker = MUSIC.cumbia.voices.find((v) => v.inst === 'shaker')!;
    expect(shaker.steps.every((s) => (s as number) > 0)).toBe(true);
  });

  it('la segunda voz va una tercera diatónica abajo', () => {
    expect(thirdBelow(76, 60)).toBe(72); // mi -> do
    expect(thirdBelow(72, 60)).toBe(69); // do -> la
    expect(thirdBelow(77, 60)).toBe(74); // fa -> re
    expect(thirdBelow(68, 60)).toBe(64); // sol# (fuera de escala) -> mi
    expect(thirdBelow(0, 60)).toBe(0);
    expect(spread([1, 2], 2)).toEqual([1, 0, 2, 0]);
    expect(midiToFreq(69)).toBe(440);
  });
});
