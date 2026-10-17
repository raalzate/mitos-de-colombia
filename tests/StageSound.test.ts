import { describe, expect, it } from 'vitest';
import { STAGE_SOUND, pickStageEvent } from '../src/audio/StageSound';
import { STAGE_IDS } from '../src/art/StageArtist';

describe('sonido por escenario', () => {
  it('cada escenario tiene su propio paisaje sonoro válido', () => {
    for (const id of [...STAGE_IDS, 'menu' as const]) {
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
