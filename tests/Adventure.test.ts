import { describe, expect, it } from 'vitest';
import { FIGHTER_IDS } from '../src/data/fighters';
import {
  BUILDINGS, GUARDIANS, HAUNTS, HERO_START, SWAPS, MAP_H, MAP_W, NPCS, PESCADOR_REFUGIO, PROPS, SIGNS, SPIRITS, HERO_FIGHTER,
  areaName, buildMap, doorOf, inRect, propCells, walkable,
} from '../src/adventure/World';
import { BUILDING_FOOTPRINT } from '../src/adventure/TownArt';
import { TRAIL_LEN, ambushChance, fleeFightChance, popSpot, spawnHidden, vanishChance, wander, zoneCells } from '../src/adventure/Hunt';
import { paginate, wrap } from '../src/adventure/text';
import {
  FIGHT_MINUTES, MAX_SIGHTINGS, NIGHT_MINUTES, addSighting, allCalmed, applyOutcome, clockText, fightDifficulty, hasMachete, homeOf, newAdventure, nightOver, reportSightings, rollHomes,
} from '../src/adventure/State';
import { campoSpot, getMap } from '../src/adventure/Maps';

/** Cada mito con su primer sitio del campo, para las pruebas que ruedan sobre el mapa grande. */
const ON_CAMPO = GUARDIANS.flatMap((g) => g.haunts.filter((h) => h.map === 'campo').slice(0, 1).map((h) => ({ id: g.id, zone: h.zone })));

describe('combates del modo aventura', () => {
  it('ganar calma al mito', () => {
    const s = newAdventure();
    applyOutcome(s, { id: 'llorona' }, 'win');
    applyOutcome(s, { id: 'llorona' }, 'win');
    expect(s.calmed).toEqual(['llorona']);
  });

  it('perder reinicia la partida desde cero', () => {
    const s = newAdventure();
    s.calmed.push('silbon');
    s.flags.push('intro');
    s.x = 30;
    const fresh = applyOutcome(s, { id: 'patasola' }, 'lose');
    expect({ ...fresh, homes: {} }).toEqual({ ...newAdventure(), homes: {} });
  });

  it('los mitos se ponen más bravos a medida que Juan calma a los demás', () => {
    const s = newAdventure();
    expect(fightDifficulty(s)).toBe('easy');
    s.calmed = ['silbon', 'llorona', 'patasola'];
    expect(fightDifficulty(s)).toBe('normal');
    s.calmed.push('mohan', 'bachue', 'muelona');
    expect(fightDifficulty(s)).toBe('hard');
  });

  it('Juan Machete pelea con todos los demás mitos, cada uno en el escenario de su leyenda', () => {
    expect(FIGHTER_IDS).toContain(HERO_FIGHTER);
    const ids = GUARDIANS.map((g) => g.id).sort();
    expect(ids).toEqual(FIGHTER_IDS.filter((id) => id !== HERO_FIGHTER).sort());
    const stage = Object.fromEntries(GUARDIANS.map((g) => [g.id, g.stage]));
    expect(stage).toMatchObject({
      silbon: 'llanos', llorona: 'ribera', mohan: 'ribera', hombrecaiman: 'pantano', bachue: 'laguna', sombreron: 'pueblo', muelona: 'cantina', patasola: 'selva', madremonte: 'selva',
    });
  });
});

describe('mapa del modo aventura', () => {
  const g = buildMap();
  const seen = new Set<string>();
  const q: [number, number][] = [HERO_START];
  seen.add(HERO_START.join());
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!seen.has(k) && walkable(g, x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); }
    }
  }
  const nextTo = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`));

  it('tamaño y bordes cerrados', () => {
    expect(g).toHaveLength(MAP_H);
    for (const row of g) expect(row).toHaveLength(MAP_W);
    for (let x = 0; x < MAP_W; x++) expect(walkable(g, x, 0) || walkable(g, x, MAP_H - 1)).toBe(false);
  });

  it('se puede llegar a cada aldeano, letrero y puerta desde el inicio', () => {
    for (const t of [...NPCS, ...SIGNS]) expect(nextTo(t.x, t.y), `${t.x},${t.y}`).toBe(true);
    for (const n of NPCS) expect(walkable(g, n.x, n.y), `${n.name} ${n.x},${n.y}`).toBe(true);
    expect(seen.has(PESCADOR_REFUGIO.join())).toBe(true);
    for (const b of BUILDINGS) expect(seen.has(doorOf(b).join()), `puerta de ${b.kind}`).toBe(true);
  });

  it('cada sitio de cada mito tiene bastante terreno para esconderse', () => {
    for (const m of GUARDIANS) for (const hn of m.haunts) {
      const grid = hn.map === 'campo' ? g : getMap(hn.map).grid;
      const cells = zoneCells(grid, hn.zone).filter(([x, y]) => hn.map !== 'campo' || seen.has(`${x},${y}`));
      expect(cells.length, `${m.id} en ${hn.place}`).toBeGreaterThan(hn.map.startsWith('int:') ? 15 : 20);
    }
    for (const s of SPIRITS) expect(zoneCells(g, s.zone).some(([x, y]) => seen.has(`${x},${y}`)), s.kind).toBe(true);
  });

  it('edificios y objetos no se pisan entre sí ni tapan el camino de la casa', () => {
    const used = new Map<string, string>();
    for (const b of BUILDINGS) {
      const [w, h] = BUILDING_FOOTPRINT[b.kind];
      for (let y = b.y; y < b.y + h; y++) for (let x = b.x; x < b.x + w; x++) {
        expect(used.has(`${x},${y}`), `${b.kind} choca con ${used.get(`${x},${y}`)}`).toBe(false);
        used.set(`${x},${y}`, b.kind);
      }
    }
    for (const p of PROPS) for (const [x, y] of propCells(p)) expect(used.get(`${x},${y}`), `${p.kind} en ${x},${y}`).toBeUndefined();
  });

  it('es un mundo grande, con pueblo, llano, monte, río, ciénaga y laguna', () => {
    const names = new Set<string>();
    for (const k of seen) { const [x, y] = k.split(',').map(Number); names.add(areaName(x, y)); }
    expect(names.size).toBeGreaterThanOrEqual(9);
    expect(seen.size).toBeGreaterThan(2500);
    expect(g.flat().filter((c) => c === '"').length).toBeGreaterThan(300);
  });
});

describe('mitos escondidos', () => {
  const g = buildMap();

  it('aparecen lejos de Juan y dentro de su zona', () => {
    const hs = spawnHidden(g, ON_CAMPO, Math.random, { x: HERO_START[0], y: HERO_START[1] });
    hs.forEach((h, i) => {
      expect(inRect(ON_CAMPO[i].zone, h.x, h.y)).toBe(true);
      expect(walkable(g, h.x, h.y)).toBe(true);
    });
  });

  it('rondan sin salir de su zona y dejan señales detrás', () => {
    const m = ON_CAMPO.find((x) => x.id === 'silbon')!;
    const [h] = spawnHidden(g, [m], Math.random, { x: 0, y: 0 });
    for (let i = 0; i < 200; i++) {
      wander(g, h, m, Math.random, () => false);
      expect(inRect(m.zone, h.x, h.y)).toBe(true);
    }
    expect(h.trail.length).toBeGreaterThan(0);
    expect(h.trail.length).toBeLessThanOrEqual(TRAIL_LEN);
  });

  it('saltan encima solo de cerca y descansan tras esfumarse', () => {
    expect(ambushChance(1, 0)).toBeGreaterThan(0.5);
    expect(ambushChance(8, 0)).toBe(0);
    expect(ambushChance(1, 3)).toBe(0);
    expect(vanishChance(0)).toBeGreaterThan(vanishChance(2));
    expect(fleeFightChance(0)).toBeGreaterThan(fleeFightChance(3));
    expect(fleeFightChance(9)).toBeGreaterThan(0);
  });

  it('aparece en una casilla libre junto a Juan', () => {
    const spot = popSpot(g, { x: HERO_START[0], y: HERO_START[1] }, [1, 0], () => false)!;
    expect(Math.abs(spot[0] - HERO_START[0]) + Math.abs(spot[1] - HERO_START[1])).toBe(1);
  });

  it('si se vuela de la pelea no queda calmado y cuenta la huida', () => {
    const s = newAdventure();
    applyOutcome(s, { id: 'mohan' }, 'fled');
    expect(s.calmed).toEqual([]);
    expect(s.escapes.mohan).toBe(1);
  });
});

describe('diálogos y partida', () => {
  it('parte el texto sin cortar palabras', () => {
    const lines = wrap('LOS ESPANTOS ANDAN ALBOROTADOS DE NOCHE SE OYEN SILBIDOS LLANTOS EN EL RÍO Y PASOS DE UNA SOLA PATA', 30);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(30);
    expect(lines.join(' ')).toContain('UNA SOLA PATA');
    expect(paginate(['a '.repeat(200)]).every((p) => p.length <= 3)).toBe(true);
  });

  it('final al calmar a los cinco', () => {
    const s = newAdventure();
    expect(allCalmed(s)).toBe(false);
    s.calmed = GUARDIANS.map((x) => x.id);
    expect(allCalmed(s)).toBe(true);
  });
});

describe('machete y mapa de avistamientos', () => {
  it('Juan empieza sin machete: hay que ganárselo', () => {
    expect(hasMachete(newAdventure())).toBe(false);
  });

  it('el cabo marca un avistamiento por cada mito suelto y Juan va sumando los suyos', () => {
    const s = newAdventure();
    s.calmed.push('silbon');
    reportSightings(s);
    expect(s.sightings.silbon).toBeUndefined();
    expect(Object.keys(s.sightings)).toHaveLength(GUARDIANS.length - 1);
    for (let i = 0; i < MAX_SIGHTINGS + 2; i++) addSighting(s, 'llorona', 30 + i, 50);
    expect(s.sightings.llorona).toHaveLength(MAX_SIGHTINGS);
    expect(s.sightings.llorona!.at(-1)).toEqual([30 + MAX_SIGHTINGS + 1, 50]);
  });
});

describe('cada noche los mitos cambian de sitio', () => {
  it('la Patasola y la Madremonte se reparten los dos montes; la Llorona y el Hombre Caimán, las dos aguas', () => {
    const places = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const s = newAdventure();
      for (const [a, b] of SWAPS) {
        const ha = homeOf(s, GUARDIANS.find((g) => g.id === a)!), hb = homeOf(s, GUARDIANS.find((g) => g.id === b)!);
        expect(ha.place).not.toBe(hb.place);
        places.add(`${a}:${ha.place}`);
      }
    }
    // con 40 noches cada uno pasó por los dos sitios
    expect(places.size).toBe(4);
  });

  it('la Muelona se esconde dentro de una de las dos cantinas', () => {
    const muelona = GUARDIANS.find((g) => g.id === 'muelona')!;
    expect(muelona.haunts.map((h) => h.map).sort()).toEqual(['int:cantina0', 'int:cantina1']);
    const where = new Set(Array.from({ length: 40 }, () => homeOf({ ...newAdventure(), homes: rollHomes() }, muelona).map));
    expect(where.size).toBe(2);
  });

  it('el mapa del cabo marca lo de otros mapas en su puerta o en su trocha', () => {
    expect(campoSpot('campo', 5, 6)).toEqual([5, 6]);
    expect(campoSpot(HAUNTS.cantina0.map, 3, 3)).toEqual(doorOf(BUILDINGS.find((b) => b.id === 'cantina0')!));
    expect(campoSpot('charco', 10, 10)).toEqual([16, 69]);
    expect(campoSpot('monte', 10, 10)).toEqual([88, 2]);
    const s = newAdventure();
    reportSightings(s);
    for (const [x, y] of Object.values(s.sightings).flat()) expect(walkable(buildMap(), x, y), `${x},${y}`).toBe(true);
  });

  it('a Río Abajo se baja por la trocha de la ciénaga y se vuelve por el mismo lado', () => {
    const campo = getMap('campo'), charco = getMap('charco');
    const down = campo.links!.find((l) => l.to === 'charco')!;
    expect(walkable(campo.grid, down.x, down.y)).toBe(true);
    const up = charco.links!.find((l) => l.to === 'campo')!;
    expect([up.tx, up.ty]).toEqual([down.x, down.y - 1]);
    expect(walkable(charco.grid, down.tx, down.ty)).toBe(true);
  });
});

describe('el reloj de la noche', () => {
  it('va de las 6:00 PM a las 12:00 AM', () => {
    expect(clockText(0)).toBe('6:00 PM');
    expect(clockText(95)).toBe('7:35 PM');
    expect(clockText(359)).toBe('11:59 PM');
    expect(clockText(NIGHT_MINUTES)).toBe('12:00 AM');
  });

  it('a medianoche se acaba la noche, salvo que ya haya ganado', () => {
    const s = newAdventure();
    expect(s.minutes).toBe(0);
    expect(nightOver(s)).toBe(false);
    s.minutes = NIGHT_MINUTES;
    expect(nightOver(s)).toBe(true);
    s.flags.push('fin');
    expect(nightOver(s)).toBe(false);
  });

  it('cada pelea se lleva un rato de la noche', () => {
    const s = newAdventure();
    applyOutcome(s, { id: 'silbon' }, 'win');
    applyOutcome(s, { id: 'mohan' }, 'fled');
    expect(s.minutes).toBe(FIGHT_MINUTES * 2);
  });
});
