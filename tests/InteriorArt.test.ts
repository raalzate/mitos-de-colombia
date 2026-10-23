import { describe, expect, it } from 'vitest';
import type { Pixmap } from '../src/art/PixelPainter';
import {
  FURNITURE_ANIMATED, FURNITURE_FOOTPRINT, WALL_HUNG,
  buildBackWall, buildDoorMat, buildFloor, buildFurniture, buildWallEdge, furnitureLights,
  type FloorKind, type FurnitureKind, type WallKind,
} from '../src/adventure/InteriorArt';

const opaque = (pm: Pixmap) => {
  let n = 0;
  for (let y = 0; y < pm.height; y++) for (let x = 0; x < pm.width; x++) if (pm.alpha(x, y) > 0) n++;
  return n;
};

/** diferencia media de color entre dos columnas (o filas) */
const lineDiff = (a: Pixmap, ia: number, b: Pixmap, ib: number, vertical: boolean) => {
  let s = 0;
  const n = vertical ? a.height : a.width;
  for (let k = 0; k < n; k++) {
    const ca = vertical ? a.get(ia, k) : a.get(k, ia);
    const cb = vertical ? b.get(ib, k) : b.get(k, ib);
    s += Math.abs(ca[0] - cb[0]) + Math.abs(ca[1] - cb[1]) + Math.abs(ca[2] - cb[2]);
  }
  return s / n;
};

/** la costura al repetir no debe ser más brusca que el salto interior más fuerte */
const seamOk = (a: Pixmap, b: Pixmap, vertical: boolean) => {
  const size = vertical ? a.width : a.height;
  let inner = 0;
  for (let i = 0; i < size - 1; i++) inner = Math.max(inner, lineDiff(a, i, a, i + 1, vertical), lineDiff(b, i, b, i + 1, vertical));
  return lineDiff(a, size - 1, b, 0, vertical) <= inner + 12;
};

const FLOORS: FloorKind[] = ['madera', 'baldosa', 'baldosa_ajedrez', 'ladrillo', 'tierra', 'cemento'];
const WALLS: WallKind[] = ['bahareque', 'ladrillo', 'madera', 'iglesia', 'azul', 'verde'];
const FURNITURE = Object.keys(FURNITURE_FOOTPRINT) as FurnitureKind[];

describe('pisos', () => {
  it.each(FLOORS)('%s: 16×16 opaco y sin costuras entre variantes', (kind) => {
    for (let v = 0; v < 4; v++) {
      const a = buildFloor(kind, v);
      expect([a.width, a.height]).toEqual([16, 16]);
      expect(opaque(a)).toBe(256);
      for (let w = 0; w < 4; w++) {
        const b = buildFloor(kind, w);
        expect(seamOk(a, b, true)).toBe(true);
        expect(seamOk(a, b, false)).toBe(true);
      }
    }
  });

  it('las variantes no son idénticas', () => {
    for (const kind of FLOORS) {
      expect(Array.from(buildFloor(kind, 0).data)).not.toEqual(Array.from(buildFloor(kind, 1).data));
    }
  });
});

describe('paredes', () => {
  it.each(WALLS)('%s: pared del fondo 16×32 opaca y repetible a lo ancho', (kind) => {
    for (let v = 0; v < 4; v++) {
      const a = buildBackWall(kind, v);
      expect([a.width, a.height]).toEqual([16, 32]);
      expect(opaque(a)).toBe(16 * 32);
      for (let w = 0; w < 4; w++) expect(seamOk(a, buildBackWall(kind, w), true)).toBe(true);
    }
  });

  it.each(WALLS)('%s: bordes de 16×16 que tapan la baldosa', (kind) => {
    for (const side of ['left', 'right', 'bottom', 'corner_l', 'corner_r'] as const) {
      const e = buildWallEdge(kind, side);
      expect([e.width, e.height]).toEqual([16, 16]);
      expect(opaque(e)).toBe(256);
    }
    expect(Array.from(buildWallEdge(kind, 'left').data)).not.toEqual(Array.from(buildWallEdge(kind, 'right').data));
  });

  it('la estera de salida cubre buena parte de su baldosa', () => {
    const m = buildDoorMat();
    expect([m.width, m.height]).toEqual([16, 16]);
    expect(opaque(m)).toBeGreaterThan(128);
  });
});

describe('muebles', () => {
  it.each(FURNITURE)('%s respeta su huella y tiene dibujo', (kind) => {
    const [fw, fh] = FURNITURE_FOOTPRINT[kind];
    const pm = buildFurniture(kind);
    if (WALL_HUNG.has(kind)) {
      expect([fw, fh]).toEqual([0, 0]);
      expect(pm.height).toBe(32);
      expect(pm.width % 16).toBe(0);
    } else {
      if (fw > 0) expect(pm.width).toBe(fw * 16);
      else expect(pm.width).toBeGreaterThanOrEqual(16);
      expect(pm.height).toBeGreaterThanOrEqual(Math.max(1, fh) * 16);
    }
    expect(opaque(pm)).toBeGreaterThan(Math.min(pm.width * pm.height * 0.25, 60));
    for (const [x, y] of furnitureLights(kind)) {
      expect(pm.inBounds(x, y)).toBe(true);
      expect(pm.alpha(x, y)).toBeGreaterThan(0);
    }
  });

  it.each([...FURNITURE_ANIMATED])('%s cambia entre fotogramas', (kind) => {
    const a = buildFurniture(kind, 0), b = buildFurniture(kind, 1);
    expect([a.width, a.height]).toEqual([b.width, b.height]);
    expect(Array.from(a.data)).not.toEqual(Array.from(b.data));
  });

  it('los quietos no cambian con el fotograma', () => {
    for (const kind of FURNITURE.filter((k) => !FURNITURE_ANIMATED.has(k))) {
      expect(Array.from(buildFurniture(kind, 1).data)).toEqual(Array.from(buildFurniture(kind, 0).data));
    }
  });

  it('lámparas, velas, fuego y rockola alumbran', () => {
    for (const kind of ['rockola', 'bombillos_pared', 'fogon_lena', 'chimenea', 'velas', 'altar', 'sagrado_corazon', 'lampara', 'tv_vieja', 'radio'] as const) {
      expect(furnitureLights(kind).length).toBeGreaterThan(0);
    }
  });
});
