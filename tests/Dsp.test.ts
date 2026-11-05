import { describe, expect, it } from 'vitest';
import { jitter, makeImpulse, makeNoise, normalize, softClipCurve, swingOffset } from '../src/audio/Dsp';
import { playCalm, sfx } from '../src/audio/Sfx';

/** Azar con semilla para pruebas repetibles. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('señal', () => {
  it('los ruidos quedan en [-1, 1], centrados y con bucle sin escalón', () => {
    for (const color of ['white', 'pink', 'brown'] as const) {
      const n = makeNoise(color, 8000, seeded(7));
      expect(n.length).toBe(8000);
      let max = 0, mean = 0;
      for (const v of n) { max = Math.max(max, Math.abs(v)); mean += v; }
      expect(max, color).toBeLessThanOrEqual(0.95 + 1e-6);
      expect(Math.abs(mean / n.length), color).toBeLessThan(0.2);
      if (color === 'brown') {
        // el café cambia poco entre muestras: el salto del final al principio debe ser igual de pequeño
        let step = 0;
        for (let i = 1; i < n.length; i++) step = Math.max(step, Math.abs(n[i] - n[i - 1]));
        expect(Math.abs(n[0] - n[n.length - 1])).toBeLessThanOrEqual(step * 1.5);
      }
    }
  });

  it('el ruido rosado y el café tienen menos agudos que el blanco', () => {
    const diff = (a: Float32Array) => {
      let d = 0;
      for (let i = 1; i < a.length; i++) d += Math.abs(a[i] - a[i - 1]);
      return d / a.length;
    };
    const w = diff(makeNoise('white', 8000, seeded(1)));
    const p = diff(makeNoise('pink', 8000, seeded(1)));
    const b = diff(makeNoise('brown', 8000, seeded(1)));
    expect(p).toBeLessThan(w);
    expect(b).toBeLessThan(p);
  });

  it('la respuesta al impulso es estéreo, distinta por canal y se apaga', () => {
    const [l, r] = makeImpulse(8000, { seconds: 1, decay: 3, preDelay: 0.01, early: [0.02] }, seeded(3));
    expect(l.length).toBe(8000);
    expect(r.length).toBe(8000);
    const energy = (a: Float32Array, from: number, to: number) => {
      let e = 0;
      for (let i = from; i < to; i++) e += a[i] * a[i];
      return e;
    };
    expect(energy(l, 100, 2000)).toBeGreaterThan(energy(l, 6000, 7900) * 10);
    let same = true;
    for (let i = 200; i < 300; i++) if (l[i] !== r[i]) same = false;
    expect(same).toBe(false);
    // nada antes del pre-retardo
    expect(energy(l, 0, 70)).toBe(0);
  });

  it('la saturación suave es simétrica, monótona y llega a ±1', () => {
    const c = softClipCurve(2.5, 101);
    expect(c[0]).toBeCloseTo(-1);
    expect(c[100]).toBeCloseTo(1);
    expect(c[50]).toBeCloseTo(0);
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeGreaterThan(c[i - 1]);
  });

  it('variación por golpe, swing y normalizado', () => {
    for (let i = 0; i < 50; i++) {
      const v = jitter(100, 0.1);
      expect(v).toBeGreaterThanOrEqual(90);
      expect(v).toBeLessThanOrEqual(110);
    }
    expect(swingOffset(0, 0.2, 0.1)).toBe(0);
    expect(swingOffset(1, 0.2, 0.1)).toBeCloseTo(0.02);
    expect(swingOffset(3, 0.9, 0.1)).toBeCloseTo(0.05);
    const d = new Float32Array([0.5, -2, 1]);
    normalize(d, 1);
    expect(d[1]).toBe(-1);
  });

  it('el sonido de paz existe y no falla sin audio desbloqueado', () => {
    expect(typeof playCalm).toBe('function');
    expect(() => playCalm()).not.toThrow();
    expect(() => sfx.play('calm')).not.toThrow();
  });
});
