import { describe, expect, it } from 'vitest';
import { FINISH_FRAMES, bloodDrops, cpuWantsFatality, finishPrompt, isFatalityInput } from '../src/combat/Finish';

describe('remate y sangre', () => {
  it('el aviso usa el género del rival y la ventana dura 4 s', () => {
    expect(finishPrompt(true)).toBe('¡ACÁBALA!');
    expect(finishPrompt(false)).toBe('¡ACÁBALO!');
    expect(FINISH_FRAMES).toBe(240);
  });

  it('la fatalidad sale con el definitivo o un golpe fuerte', () => {
    expect(isFatalityInput({ ultimate: true, heavy: false, heavykick: false })).toBe(true);
    expect(isFatalityInput({ ultimate: false, heavy: true, heavykick: false })).toBe(true);
    expect(isFatalityInput({ ultimate: false, heavy: false, heavykick: true })).toBe(true);
    expect(isFatalityInput({ ultimate: false, heavy: false, heavykick: false })).toBe(false);
  });

  it('la CPU remata más cuanto más difícil', () => {
    expect(cpuWantsFatality('hard', 0.8)).toBe(true);
    expect(cpuWantsFatality('easy', 0.8)).toBe(false);
    expect(cpuWantsFatality('normal', 0.5)).toBe(true);
  });

  it('sangra más un golpe fuerte y nada si se bloquea', () => {
    expect(bloodDrops(true, true, 20)).toBe(0);
    expect(bloodDrops(false, true, 10)).toBeGreaterThan(bloodDrops(false, false, 10));
    expect(bloodDrops(false, true, 999)).toBe(40);
  });
});
