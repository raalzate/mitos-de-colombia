import { describe, expect, it } from 'vitest';
import { ALL_MAP_IDS, INTERIORS, buildingFootprint, cellsOf, doorCell, getMap, h, interiorOf, moodIn, w, type GameMap } from '../src/adventure/Maps';
import { walkable } from '../src/adventure/World';
import { STORIES, STORY_IDS } from '../src/adventure/Stories';

function reach(m: GameMap, start: [number, number]): Set<string> {
  const seen = new Set([start.join()]);
  const q = [start];
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!seen.has(k) && walkable(m.grid, x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); }
    }
  }
  return seen;
}

const nextTo = (seen: Set<string>, x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`));

describe('todos los mapas', () => {
  for (const id of ALL_MAP_IDS) {
    const m = getMap(id);
    const start: [number, number] = m.exit ? [m.exit.x, m.exit.y - 1] : (m.arrival ?? m.horseArrival)!;
    const seen = reach(m, start);

    it(`${id}: se llega a cada persona, letrero y puerta`, () => {
      expect(walkable(m.grid, start[0], start[1]), `entrada ${start}`).toBe(true);
      for (const n of m.npcs) {
        expect(walkable(m.grid, n.x, n.y), `${n.name} parado en ${n.x},${n.y} (${m.grid[n.y]?.[n.x]})`).toBe(true);
        expect(seen.has(`${n.x},${n.y}`) || nextTo(seen, n.x, n.y), `${n.name} alcanzable`).toBe(true);
      }
      for (const s of m.signs) expect(nextTo(seen, s.x, s.y), `letrero ${s.x},${s.y}`).toBe(true);
      for (const b of m.buildings) if (interiorOf(b)) expect(seen.has(doorCell(b).join()), `puerta de ${b.id}`).toBe(true);
    });

    it(`${id}: edificios y objetos no se montan unos sobre otros ni se salen del mapa`, () => {
      const used = new Map<string, string>();
      for (const b of m.buildings) {
        const [bw, bh] = buildingFootprint(b);
        expect(b.x >= 0 && b.y >= 0 && b.x + bw <= w(m) && b.y + bh <= h(m), `${b.id} dentro`).toBe(true);
        for (let y = b.y; y < b.y + bh; y++) for (let x = b.x; x < b.x + bw; x++) {
          expect(used.get(`${x},${y}`), `${b.id} choca`).toBeUndefined();
          used.set(`${x},${y}`, b.id ?? b.kind);
        }
      }
      for (const p of m.props) {
        if (p.kind === 'metro_via') continue;
        for (const [x, y] of cellsOf(p)) expect(used.get(`${x},${y}`), `${p.kind} en ${x},${y} sobre edificio`).toBeUndefined();
      }
    });
  }

  it('cada interior tiene puerta en el campo o en la ciudad y vuelve a ella', () => {
    for (const key of Object.keys(INTERIORS)) {
      const m = getMap(`int:${key}`);
      const back = getMap(m.exit!.to);
      expect(walkable(back.grid, m.exit!.tx, m.exit!.ty), `salida de ${key}`).toBe(true);
      expect(m.grid[m.exit!.y][m.exit!.x]).toBe('M');
    }
  });

  it('el jeep conecta el campo con Medellín, con conductor a cada lado', () => {
    for (const id of ['campo', 'medellin']) expect(getMap(id).npcs.some((n) => n.action === 'carro'), id).toBe(true);
  });

  it('a Santa Fe de Antioquia se va a caballo: Lucero queda amarrado a cada lado del camino', () => {
    for (const id of ['campo', 'santafe']) {
      const m = getMap(id);
      const horse = m.npcs.find((n) => n.action === 'caballo')!;
      expect(horse, id).toBeDefined();
      const [ax, ay] = m.horseArrival!;
      expect(walkable(m.grid, ax, ay), `${id} llegada`).toBe(true);
      expect(Math.abs(ax - horse.x) + Math.abs(ay - horse.y), `${id} junto a Lucero`).toBe(1);
    }
    expect(getMap('campo').npcs.find((n) => n.action === 'caballo')!.needs).toBe('caballo');
  });

  it('el perro callejero anda por la plaza hasta que se une a Juan', () => {
    const perro = getMap('campo').npcs.find((n) => n.key === 'perro')!;
    expect(perro.gone).toBe('perro');
    expect(moodIn(getMap('campo'), perro.x, perro.y)).toBe('alegre');
  });

  it('el ritmo: el campo es mayormente tensión; la ciudad y los interiores, alegría', () => {
    const campo = getMap('campo');
    let tense = 0, total = 0;
    for (let y = 0; y < h(campo); y++) for (let x = 0; x < w(campo); x++) if (walkable(campo.grid, x, y)) { total++; if (moodIn(campo, x, y) === 'tension') tense++; }
    expect(tense / total).toBeGreaterThan(0.65);
    expect(tense / total).toBeLessThan(0.9);
    expect(moodIn(getMap('medellin'), 30, 20)).toBe('alegre');
  });

  it('casi todas las historias las cuenta alguien', () => {
    const told = new Set(ALL_MAP_IDS.flatMap((id) => getMap(id).npcs.map((n) => n.story)).filter(Boolean));
    for (const s of STORY_IDS) expect(told.has(s), `${STORIES[s].title} sin narrador`).toBe(true);
  });
});

describe('el monte puro', () => {
  it('la trocha del monte sube al monte puro y baja otra vez', () => {
    const campo = getMap('campo'), monte = getMap('monte');
    const upLink = campo.links!.find((l) => l.to === 'monte')!;
    const downLink = monte.links!.find((l) => l.to === 'campo')!;
    expect(walkable(campo.grid, upLink.x, upLink.y)).toBe(true);
    expect(walkable(monte.grid, upLink.tx, upLink.ty)).toBe(true);
    expect(walkable(campo.grid, downLink.tx, downLink.ty)).toBe(true);
    const seen = reach(monte, [upLink.tx, upLink.ty]);
    expect(seen.has(`${downLink.x},${downLink.y}`)).toBe(true);
    // la leña caída del claro se alcanza desde la entrada
    const logs = monte.props.filter((p) => p.kind === 'tronco');
    expect(logs.length).toBeGreaterThan(0);
    for (const p of logs) expect(cellsOf(p).some(([x, y]) => nextTo(seen, x, y)), `tronco ${p.x},${p.y}`).toBe(true);
  });
});

describe('las puertas quedan libres', () => {
  for (const id of ['campo', 'medellin', 'santafe']) {
    it(`${id}: nadie se para en la puerta de un edificio con interior`, () => {
      const m = getMap(id);
      for (const b of m.buildings) {
        if (!interiorOf(b)) continue;
        const [dx, dy] = doorCell(b);
        for (const n of m.npcs) expect(n.x === dx && n.y === dy, `${n.name} tapa la puerta de ${b.id}`).toBe(false);
      }
    });
  }
});
