import { describe, expect, it } from 'vitest';
import { FrameWatch, isLowSpec } from '../src/config/perf';
import { MAX_INSERTION_DESCENTS, sortByDepthStable } from '../src/utils/depthSort';

describe('calidad ligera', () => {
  it('un celular arranca ligero; un escritorio no', () => {
    expect(isLowSpec({ coarsePointer: true, shortSide: 390, cores: 8, memoryGb: 8 })).toBe(true);
    expect(isLowSpec({ coarsePointer: false, shortSide: 1080, cores: 8, memoryGb: 8 })).toBe(false);
    expect(isLowSpec({ coarsePointer: false, shortSide: 900, cores: 4, memoryGb: 8 })).toBe(false);
  });

  it('un equipo muy justo arranca ligero', () => {
    expect(isLowSpec({ cores: 2 })).toBe(true);
    expect(isLowSpec({ memoryGb: 2 })).toBe(true);
  });

  it('?hq y ?lq mandan', () => {
    expect(isLowSpec({ coarsePointer: true, shortSide: 390, query: '?hq' })).toBe(false);
    expect(isLowSpec({ cores: 16, query: '?lq' })).toBe(true);
  });
});

describe('vigía del ritmo', () => {
  const run = (frames: number[], skip = 10, size = 20) => {
    let slow = 0;
    const w = new FrameWatch(() => slow++, skip, size);
    for (const f of frames) w.feed(f);
    return slow;
  };

  it('a 60 cuadros no baja la calidad, aunque haya tirones sueltos', () => {
    const frames = Array.from({ length: 200 }, (_, i) => (i % 15 === 0 ? 120 : 16.7));
    expect(run(frames)).toBe(0);
  });

  it('si el juego va a 30 cuadros, la baja', () => {
    expect(run(Array.from({ length: 60 }, () => 33))).toBeGreaterThan(0);
  });

  it('los primeros cuadros (carga de la escena) no cuentan', () => {
    expect(run([...Array.from({ length: 10 }, () => 500), ...Array.from({ length: 40 }, () => 16.7)])).toBe(0);
  });
});

describe('orden por profundidad', () => {
  const make = (depths: number[]) => depths.map((_depth, id) => ({ _depth, id }));
  const reference = <T extends { _depth: number }>(l: T[]) => l.slice().sort((a, b) => a._depth - b._depth);
  const fallback = <T extends { _depth: number }>(l: T[]) => { const s = reference(l); for (let i = 0; i < l.length; i++) l[i] = s[i]; };

  it('da lo mismo que un orden estable cuando casi nada cambió', () => {
    for (let trial = 0; trial < 50; trial++) {
      const list = make(Array.from({ length: 300 }, (_, i) => Math.floor(i / 3)));
      // unos pocos cambian de profundidad (como los muñecos que caminan)
      for (let k = 0; k < 5; k++) list[Math.floor(Math.random() * list.length)]._depth = Math.floor(Math.random() * 100);
      const want = reference(list).map((o) => o.id);
      sortByDepthStable(list, fallback);
      expect(list.map((o) => o.id)).toEqual(want);
    }
  });

  it('con la lista muy revuelta usa el orden completo, con el mismo resultado', () => {
    const list = make(Array.from({ length: 500 }, () => Math.floor(Math.random() * 40)));
    let used = false;
    const want = reference(list).map((o) => o.id);
    sortByDepthStable(list, (l) => { used = true; fallback(l); });
    expect(used).toBe(true);
    expect(list.map((o) => o.id)).toEqual(want);
  });

  it('una lista ya ordenada no se toca', () => {
    const list = make([1, 1, 2, 3, 3, 3]);
    const before = list.slice();
    sortByDepthStable(list, () => { throw new Error('no debía'); });
    expect(list).toEqual(before);
    expect(MAX_INSERTION_DESCENTS).toBeGreaterThan(0);
  });
});
