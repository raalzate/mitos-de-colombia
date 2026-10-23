import { describe, expect, it } from 'vitest';
import type { Pixmap } from '../src/art/PixelPainter';
import {
  BUILDING_FOOTPRINT, BUILDING_NAME, PROP_FOOTPRINT, SPIRIT_FRAMES,
  buildBuilding, buildClue, buildProp, buildSpirit, buildVillager, buildingLights, propLights,
  type BuildingKind, type ClueKind, type PropKind, type SpiritKind, type VillagerKind,
} from '../src/adventure/TownArt';

const opaque = (pm: Pixmap, x0 = 0, w = pm.width) => {
  let n = 0;
  for (let y = 0; y < pm.height; y++) for (let x = x0; x < x0 + w; x++) if (pm.alpha(x, y) > 0) n++;
  return n;
};

const BUILDINGS = Object.keys(BUILDING_FOOTPRINT) as BuildingKind[];
const PROPS = Object.keys(PROP_FOOTPRINT) as PropKind[];
const CLUES: ClueKind[] = ['huella_pata', 'sombrero', 'oro', 'burbujas', 'huesos', 'ramas', 'diente', 'escamas', 'charco_lagrimas', 'huella_caiman'];
const VILLAGERS: VillagerKind[] = ['cantinero', 'cura', 'borracho', 'nina', 'arriero', 'vendedora', 'campesina', 'policia', 'cafetero', 'nino'];
const SPIRITS = Object.keys(SPIRIT_FRAMES) as SpiritKind[];

describe('edificios del pueblo', () => {
  it.each(BUILDINGS)('%s cubre su huella y tiene ventanas encendidas', (kind) => {
    const [w, h] = BUILDING_FOOTPRINT[kind];
    const pm = buildBuilding(kind);
    expect(pm.width).toBe(w * 16);
    expect(pm.height).toBeGreaterThanOrEqual(h * 16);
    expect(opaque(pm)).toBeGreaterThan(pm.width * h * 16 * 0.6);
    const lights = buildingLights(kind);
    expect(lights.length).toBeGreaterThan(0);
    for (const [x, y] of lights) expect(pm.alpha(x, y)).toBeGreaterThan(0);
    expect(kind in BUILDING_NAME).toBe(true);
  });
});

describe('adornos', () => {
  it.each(PROPS)('%s es al menos tan ancho como su huella', (kind) => {
    const [w, h] = PROP_FOOTPRINT[kind];
    const pm = buildProp(kind);
    expect(pm.width).toBeGreaterThanOrEqual(w * 16);
    expect(pm.height).toBeGreaterThanOrEqual(Math.min(h * 16, 14));
    expect(opaque(pm)).toBeGreaterThan(60);
    for (const [x, y] of propLights(kind)) expect(pm.inBounds(x, y)).toBe(true);
  });

  it('el farol y la chiva alumbran', () => {
    expect(propLights('farol').length).toBeGreaterThan(0);
    expect(propLights('chiva').length).toBeGreaterThan(0);
  });
});

describe('pistas de los mitos', () => {
  it.each(CLUES)('%s mide 16×16 y sus dos fotogramas difieren', (kind) => {
    const a = buildClue(kind, 0), b = buildClue(kind, 1);
    expect([a.width, a.height]).toEqual([16, 16]);
    expect(opaque(a)).toBeGreaterThan(15);
    expect(Array.from(a.data)).not.toEqual(Array.from(b.data));
  });
});

describe('personajes', () => {
  it.each(VILLAGERS)('%s trae tres fotogramas de 48×48 con figura', (kind) => {
    const pm = buildVillager(kind);
    expect([pm.width, pm.height]).toEqual([144, 48]);
    for (let f = 0; f < 3; f++) expect(opaque(pm, f * 48, 48)).toBeGreaterThan(250);
  });

  it.each(SPIRITS)('%s trae una hoja de %s fotogramas', (kind) => {
    const pm = buildSpirit(kind);
    expect([pm.width, pm.height]).toEqual([48 * SPIRIT_FRAMES[kind], 48]);
    for (let f = 0; f < SPIRIT_FRAMES[kind]; f++) expect(opaque(pm, f * 48, 48)).toBeGreaterThan(120);
  });
});
