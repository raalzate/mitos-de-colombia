import { describe, expect, it } from 'vitest';
import type { Pixmap } from '../src/art/PixelPainter';
import {
  CITY_BUILDING_FOOTPRINT, CITY_BUILDING_NAME, CITY_PROP_FOOTPRINT,
  buildCityBuilding, buildCityGround, buildCityProp, cityBuildingLights, cityPropLights,
  type CityBuildingKind, type CityGround, type CityPropKind,
} from '../src/adventure/CityArt';

const opaque = (pm: Pixmap) => {
  let n = 0;
  for (let y = 0; y < pm.height; y++) for (let x = 0; x < pm.width; x++) if (pm.alpha(x, y) > 0) n++;
  return n;
};
const same = (a: Pixmap, b: Pixmap) => a.width === b.width && a.height === b.height && a.data.every((v, i) => v === b.data[i]);

const BUILDINGS = Object.keys(CITY_BUILDING_FOOTPRINT) as CityBuildingKind[];
const PROPS = Object.keys(CITY_PROP_FOOTPRINT) as CityPropKind[];
const ANIMATED: CityPropKind[] = ['metro_tren', 'metrocable', 'tarima', 'bombillos', 'castillo_polvora', 'fuente_ciudad', 'semaforo'];
const GROUNDS: CityGround[] = ['asfalto', 'anden', 'ladrillo', 'cebra', 'grama', 'adoquin', 'tierra_roja'];

describe('edificios de Medellín', () => {
  it('hay doce tipos', () => expect(BUILDINGS).toHaveLength(12));

  it.each(BUILDINGS)('%s cubre su huella y brilla de noche', (kind) => {
    const [w, h] = CITY_BUILDING_FOOTPRINT[kind];
    const pm = buildCityBuilding(kind);
    expect(pm.width).toBe(w * 16);
    expect(pm.height).toBeGreaterThanOrEqual(h * 16);
    expect(opaque(pm)).toBeGreaterThan(pm.width * h * 16 * 0.6);
    // la puerta abajo al centro debe ser sólida (no se ve el suelo a través del edificio)
    expect(pm.alpha(pm.width / 2, pm.height - 4)).toBe(255);
    const lights = cityBuildingLights(kind);
    expect(lights.length).toBeGreaterThanOrEqual(4);
    for (const [x, y] of lights) {
      expect(pm.inBounds(x, y)).toBe(true);
      expect(pm.alpha(x, y)).toBeGreaterThan(0);
    }
    expect(kind in CITY_BUILDING_NAME).toBe(true);
  });

  it('devuelve copias: pintar encima no ensucia la caché', () => {
    const a = buildCityBuilding('fonda');
    a.clear();
    expect(opaque(buildCityBuilding('fonda'))).toBeGreaterThan(0);
  });
});

describe('adornos de ciudad', () => {
  it.each(PROPS)('%s es al menos tan ancho como su huella y tiene cuerpo', (kind) => {
    const [w, h] = CITY_PROP_FOOTPRINT[kind];
    for (const f of [0, 1]) {
      const pm = buildCityProp(kind, f);
      expect(pm.width).toBeGreaterThanOrEqual(w * 16);
      expect(pm.height).toBeGreaterThanOrEqual(Math.min(h * 16, 14));
      expect(opaque(pm)).toBeGreaterThan(80);
    }
    const pm = buildCityProp(kind);
    for (const [x, y] of cityPropLights(kind)) {
      expect(pm.inBounds(x, y)).toBe(true);
      expect(pm.alpha(x, y)).toBeGreaterThan(0);
    }
  });

  it.each(ANIMATED)('%s cambia entre fotogramas', (kind) => {
    expect(same(buildCityProp(kind, 0), buildCityProp(kind, 1))).toBe(false);
    expect(same(buildCityProp(kind, 0), buildCityProp(kind, 2))).toBe(true);
  });

  it('lo que no se anima es igual en ambos fotogramas', () => {
    for (const kind of PROPS.filter((k) => !ANIMATED.includes(k))) {
      expect(same(buildCityProp(kind, 0), buildCityProp(kind, 1))).toBe(true);
    }
  });

  it('postes, vehículos y fiesta alumbran', () => {
    for (const kind of ['poste', 'taxi', 'jeep', 'buseta', 'metro_tren', 'bombillos', 'castillo_polvora', 'tarima', 'semaforo'] as CityPropKind[]) {
      expect(cityPropLights(kind).length).toBeGreaterThan(0);
    }
  });
});

describe('suelos de ciudad', () => {
  it.each(GROUNDS)('%s: baldosas 16×16 opacas, con variantes distintas', (kind) => {
    const tiles = [0, 1, 2, 3].map((v) => buildCityGround(kind, v));
    for (const t of tiles) {
      expect([t.width, t.height]).toEqual([16, 16]);
      expect(opaque(t)).toBe(256);
    }
    expect(same(tiles[0], tiles[1]) && same(tiles[1], tiles[2]) && same(tiles[2], tiles[3])).toBe(false);
    expect(same(buildCityGround(kind, 1), buildCityGround(kind, 5))).toBe(true);
  });
});
