import { describe, expect, it } from 'vitest';
import { FIGHTER_IDS } from '../src/data/fighters';
import { GUARDIANS, HERO_START, MAP_H, MAP_W, NPCS, PESCADOR_REFUGIO, SIGNS, HERO_FIGHTER, buildMap, walkable } from '../src/adventure/World';
import { paginate, wrap } from '../src/adventure/text';
import { allCalmed, applyOutcome, fightDifficulty, newAdventure } from '../src/adventure/State';

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
    expect(applyOutcome(s, { id: 'patasola' }, 'lose')).toEqual(newAdventure());
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
      silbon: 'llanos', llorona: 'ribera', mohan: 'ribera', hombrecaiman: 'pantano', bachue: 'laguna', sombreron: 'pueblo', muelona: 'pueblo',
    });
  });
});

describe('mapa del modo aventura', () => {
  const g = buildMap();
  it('tamaño y bordes cerrados', () => {
    expect(g).toHaveLength(MAP_H);
    for (const row of g) expect(row).toHaveLength(MAP_W);
    for (let x = 0; x < MAP_W; x++) expect(walkable(g, x, 0) || walkable(g, x, MAP_H - 1)).toBe(false);
  });

  it('se puede llegar a cada espanto, aldeano y letrero desde el inicio', () => {
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
    for (const t of [...GUARDIANS, ...NPCS, ...SIGNS]) expect(nextTo(t.x, t.y), `${t.x},${t.y}`).toBe(true);
    expect(seen.has(PESCADOR_REFUGIO.join())).toBe(true);
    for (const t of [...GUARDIANS, ...NPCS]) expect(walkable(g, t.x, t.y)).toBe(true);
  });

  it('hay hierba alta para encuentros', () => {
    expect(g.flat().filter((c) => c === '"').length).toBeGreaterThan(60);
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
