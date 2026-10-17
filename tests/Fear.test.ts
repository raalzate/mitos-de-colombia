import { describe, expect, it } from 'vitest';
import { SCARE_CHANCE_PER_FRAME, SCARE_COOLDOWN, heartbeatBpm, shouldRandomScare, tension } from '../src/combat/Fear';

describe('terror: tensión y sustos', () => {
  it('la tensión sube cuando la vida baja y cuando el tiempo se acaba', () => {
    expect(tension(100, 100, 99)).toBe(0);
    expect(tension(20, 100, 99)).toBeGreaterThan(tension(60, 100, 99));
    expect(tension(100, 100, 3)).toBeGreaterThan(tension(100, 100, 14));
    expect(tension(5, 5, 0)).toBe(1);
    for (const [a, b, s] of [[0, 0, 0], [100, 100, 99], [50, 70, 10]]) {
      const t = tension(a, b, s);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
  });

  it('el corazón late más rápido con la tensión', () => {
    expect(heartbeatBpm(0)).toBe(55);
    expect(heartbeatBpm(1)).toBe(150);
    expect(heartbeatBpm(0.5)).toBeGreaterThan(heartbeatBpm(0.2));
  });

  it('el susto aleatorio solo salta con poca vida, una vez por ronda y respetando la separación', () => {
    const base = { enabled: true, usedThisRound: false, lowestHp: 20, framesSinceLast: SCARE_COOLDOWN };
    const hit = SCARE_CHANCE_PER_FRAME / 2;
    expect(shouldRandomScare(base, hit)).toBe(true);
    expect(shouldRandomScare(base, 0.99)).toBe(false);
    expect(shouldRandomScare({ ...base, enabled: false }, hit)).toBe(false);
    expect(shouldRandomScare({ ...base, usedThisRound: true }, hit)).toBe(false);
    expect(shouldRandomScare({ ...base, lowestHp: 80 }, hit)).toBe(false);
    expect(shouldRandomScare({ ...base, lowestHp: 0 }, hit)).toBe(false);
    expect(shouldRandomScare({ ...base, framesSinceLast: 10 }, hit)).toBe(false);
  });
});
