import { describe, expect, it } from 'vitest';
import { AREAS, BRAIDABLE, DUENDE_PRANKS, GUARDIANS, HAUNTS, SPIRITS, inRect, pickPrank } from '../src/adventure/World';
import { ALL_MAP_IDS, INTERIORS, getMap } from '../src/adventure/Maps';
import { HOUSES, SAFE_ZONES, hauntHere, isHouse, isSafe, safeHaunters, scareAllowed } from '../src/adventure/Safe';
import { newAdventure } from '../src/adventure/State';
import {
  SPIRIT_ANY_GAP_MS, SPIRIT_CHANCE, SPIRIT_GAP_MS, SPIRIT_GAPS, SPIRIT_REPEAT_GAP_MS, newSpiritPace, spiritReady, spiritShown,
} from '../src/adventure/Hunt';
import { DEMO_SPIRIT_GAPS } from '../src/demo/Demo';

const center = (r: { x0: number; y0: number; x1: number; y1: number }): [number, number] => [Math.round((r.x0 + r.x1) / 2), Math.round((r.y0 + r.y1) / 2)];

describe('zonas sin miedo (FR-039)', () => {
  it('las zonas alegres de cada mapa son exactamente las de SAFE_ZONES', () => {
    for (const [id, zones] of Object.entries(SAFE_ZONES)) {
      const m = getMap(id);
      if (zones === 'todo') {
        for (let y = 0; y < m.grid.length; y++) for (let x = 0; x < m.grid[0].length; x++) expect(isSafe(m, x, y)).toBe(true);
        continue;
      }
      const happy = m.areas.filter((a) => (a.mood ?? (m.kind === 'campo' ? 'tension' : 'alegre')) === 'alegre').map((a) => a.name);
      expect(happy.sort()).toEqual([...zones].sort());
    }
  });

  it('fiestas, terminal, plaza, Medellín e interiores son zona sin miedo; monte, llano, río, ciénaga y cementerio no', () => {
    const campo = getMap('campo');
    const at = (name: string) => center(AREAS.find((a) => a.name === name)!.r);
    for (const n of ['FIESTAS DE SAN AGUSTÍN', 'TERMINAL DE JEEPS', 'PLAZA PRINCIPAL']) expect(isSafe(campo, ...at(n))).toBe(true);
    for (const n of ['EL MONTE', 'EL LLANO', 'EL RÍO GRANDE', 'LA CIÉNAGA', 'CEMENTERIO DE SAN AGUSTÍN', 'LAGUNA DE BACHUÉ']) expect(isSafe(campo, ...at(n))).toBe(false);
    for (const k of Object.keys(INTERIORS)) expect(isSafe(getMap(`int:${k}`), 3, 3)).toBe(true);
    expect(isSafe(getMap('monte'), 10, 10)).toBe(false);
    expect(isSafe(getMap('charco'), 10, 10)).toBe(false);
  });

  it('ningún espíritu ronda solo en zona sin miedo, y en ellas no puede salir', () => {
    const s = newAdventure();
    const campo = getMap('campo');
    const duende = SPIRITS.find((x) => x.kind === 'duende')!;
    // el duende ronda el pueblo, que incluye la plaza: ahí no sale
    const plaza = center(AREAS.find((a) => a.name === 'PLAZA PRINCIPAL')!.r);
    expect(inRect(duende.zone, ...plaza)).toBe(true);
    expect(scareAllowed(s, campo, ...plaza)).toBe(false);
    // fuera de la plaza, en el pueblo, sí
    expect(scareAllowed(s, campo, 25, 40)).toBe(true);
  });

  it('la única excepción: el mito cuya guarida queda en sitio alegre, y solo dentro de ella', () => {
    expect(safeHaunters().sort()).toEqual(['muelona', 'sombreron']);
    const s = newAdventure();
    const med = getMap('medellin');
    const plaza = GUARDIANS.find((g) => g.id === 'sombreron')!.haunts[0];
    const [px, py] = center(plaza.zone);
    expect(hauntHere(s, 'medellin', px, py)).toBe('sombreron');
    expect(scareAllowed(s, med, px, py, 'sombreron')).toBe(true);
    // nada más asusta ahí, ni el Sombrerón fuera de su plaza
    expect(scareAllowed(s, med, px, py)).toBe(false);
    expect(scareAllowed(s, med, px, py, 'muelona')).toBe(false);
    expect(scareAllowed(s, med, 9, 45, 'sombreron')).toBe(false); // Comuna 13
    expect(scareAllowed(s, med, 50, 40, 'sombreron')).toBe(false); // Feria de las Flores
    // ya calmado, la plaza queda en paz
    s.calmed.push('sombreron');
    expect(scareAllowed(s, med, px, py, 'sombreron')).toBe(false);
  });

  it('la Muelona solo asusta en la cantina que le tocó esta noche', () => {
    const s = newAdventure();
    s.homes.muelona = 0;
    const [x, y] = center(HAUNTS.cantina0.zone);
    expect(scareAllowed(s, getMap('int:cantina0'), x, y, 'muelona')).toBe(true);
    expect(scareAllowed(s, getMap('int:cantina1'), x, y, 'muelona')).toBe(false);
  });
});

describe('el duende y el pollo maligno salen poco', () => {
  it('cada uno descansa varios minutos y entre dos espíritus pasa un buen rato', () => {
    expect(SPIRIT_GAP_MS).toBeGreaterThanOrEqual(3 * 60_000);
    expect(SPIRIT_CHANCE).toBeLessThan(0.06);
    const p = newSpiritPace();
    expect(spiritReady('duende', 0, p)).toBe(true);
    spiritShown('duende', 0, p);
    expect(spiritReady('pollo', SPIRIT_ANY_GAP_MS - 1, p)).toBe(false);
    p.visit = {};
    expect(spiritReady('pollo', SPIRIT_ANY_GAP_MS, p)).toBe(true);
    expect(spiritReady('duende', SPIRIT_GAP_MS, p)).toBe(false);
  });

  it('nunca el mismo dos veces seguidas (salvo tras un rato largo)', () => {
    const p = newSpiritPace();
    spiritShown('duende', 0, p);
    p.visit = {};
    expect(spiritReady('duende', SPIRIT_GAP_MS + 1, p)).toBe(false);
    expect(spiritReady('duende', SPIRIT_REPEAT_GAP_MS, p)).toBe(true);
    spiritShown('pollo', SPIRIT_REPEAT_GAP_MS, p);
    p.visit = {};
    // después del pollo, el duende ya puede volver cuando pase su descanso
    expect(spiritReady('duende', SPIRIT_REPEAT_GAP_MS + SPIRIT_ANY_GAP_MS, p)).toBe(true);
  });

  it('a lo sumo una vez por visita a un mapa', () => {
    const p = newSpiritPace();
    spiritShown('pollo', 0, p);
    expect(spiritReady('pollo', 10 * SPIRIT_REPEAT_GAP_MS, p)).toBe(false);
    p.visit = {};
    expect(spiritReady('pollo', 10 * SPIRIT_REPEAT_GAP_MS, p)).toBe(true);
  });

  it('en una hora de juego salen pocas veces aunque Juan no pare de andar', () => {
    const p = newSpiritPace();
    const shown = { duende: 0, pollo: 0 };
    // el peor caso: un paso cada 250 ms durante una hora, saliendo siempre que le toca, cambiando de mapa cada 2 minutos
    for (let t = 0; t < 60 * 60_000; t += 250) {
      if (t % 120_000 === 0) p.visit = {};
      for (const k of ['duende', 'pollo'] as const) if (spiritReady(k, t, p)) { spiritShown(k, t, p); shown[k]++; }
    }
    // antes salían cada pocos segundos de caminar; ahora, cada uno a lo sumo una vez cada cuatro minutos
    expect(shown.duende).toBeLessThanOrEqual(60 / 4 + 1);
    expect(shown.pollo).toBeLessThanOrEqual(60 / 4 + 1);
  });

  it('la demo usa su propio ritmo, más seguido pero también espaciado', () => {
    expect(DEMO_SPIRIT_GAPS.gap).toBeLessThan(SPIRIT_GAPS.gap);
    expect(DEMO_SPIRIT_GAPS.gap).toBeGreaterThan(0);
  });
});

describe('el duende en las casas: travesuras, no sustos', () => {
  it('las casas son interiores de familia y son zona sin miedo', () => {
    for (const k of HOUSES) {
      expect(INTERIORS[k], k).toBeDefined();
      expect(INTERIORS[k].name).toMatch(/^(CASA|FINCA)/);
      expect(isHouse(`int:${k}`)).toBe(true);
      expect(isSafe(getMap(`int:${k}`), 2, 3)).toBe(true);
    }
    expect(isHouse('int:cantina0')).toBe(false);
    expect(isHouse('int:iglesia0')).toBe(false);
    expect(isHouse('campo')).toBe(false);
    expect(ALL_MAP_IDS.filter(isHouse)).toHaveLength(HOUSES.size);
  });

  it('cada casa tiene travesuras posibles y todas son juguetonas', () => {
    for (const k of HOUSES) {
      const def = INTERIORS[k];
      const furniture = def.furniture.map(([f]) => f);
      const braid = def.npcs.some((n) => BRAIDABLE.has(n.key));
      for (let i = 0; i < 10; i++) {
        const p = pickPrank(furniture, braid, () => i / 10);
        expect(!p.on || p.on.some((f) => furniture.includes(f))).toBe(true);
        expect(!p.who || braid).toBe(true);
      }
    }
    const kinds = new Set(DUENDE_PRANKS.map((p) => p.kind));
    expect([...kinds].sort()).toEqual(['esconde', 'mueve', 'risa', 'trenza']);
    for (const p of DUENDE_PRANKS) expect(`${p.scene} ${p.duende}`).not.toMatch(/SANGRE|MUERT|GRIT|AAAY/);
  });

  it('sin muebles ni nadie a quien trenzar, al menos se ríe escondido', () => {
    expect(pickPrank([], false, () => 0.99).kind).toMatch(/esconde|risa/);
  });
});
