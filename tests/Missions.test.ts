import { describe, expect, it } from 'vitest';
import { newAdventure } from '../src/adventure/State';
import { MISSION_IDS, currentMission, items, missions, waypoint } from '../src/adventure/Missions';
import { getMap } from '../src/adventure/Maps';
import { walkable } from '../src/adventure/World';
import { wrap } from '../src/adventure/text';

const exitOf = (id: string) => (id.startsWith('int:') ? getMap(id).exit : undefined);
const withFlags = (...flags: string[]) => { const s = newAdventure(); s.flags.push('intro', ...flags); return s; };

describe('misiones', () => {
  it('al empezar, la misión en pantalla es el machete, con el trapiche como meta', () => {
    const m = currentMission(withFlags())!;
    expect(m.id).toBe('machete');
    expect(m.step.goal?.map).toBe('int:trapiche0');
  });

  it('el machete avanza: trapiche → monte puro → trapiche → hecho', () => {
    expect(currentMission(withFlags('encargo_lena'))!.step.goal?.map).toBe('monte');
    expect(currentMission(withFlags('encargo_lena', 'lena'))!.step.goal?.map).toBe('int:trapiche0');
    expect(currentMission(withFlags('encargo_lena', 'lena', 'machete'))!.id).toBe('mapa');
  });

  it('se puede fijar otra misión, y si ya está hecha se vuelve a la que toque', () => {
    const s = withFlags();
    s.pinned = 'perro';
    expect(currentMission(s)!.id).toBe('perro');
    s.flags.push('perro');
    expect(currentMission(s)!.id).toBe('machete');
  });

  it('cada paso cabe en dos renglones del panel y su meta es una casilla donde se puede estar', () => {
    const states = [withFlags(), withFlags('perro_visto', 'oferta_caballo', 'encargo_lena'), withFlags('arepa', 'lena')];
    const s4 = withFlags('machete'); s4.calmed.push('silbon'); states.push(s4);
    for (const s of states) for (const m of missions(s)) {
      expect(wrap(m.step.text, 44).length, m.step.text).toBeLessThanOrEqual(2);
      const g = m.step.goal;
      if (g && g.map !== 'campo' || !g) continue;
      const grid = getMap(g.map).grid;
      const ok = walkable(grid, g.x, g.y) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => walkable(grid, g.x + dx, g.y + dy));
      expect(ok, `${m.id} ${g.x},${g.y}`).toBe(true);
    }
  });

  it('la flecha lleva del campo a la puerta del trapiche y a la trocha del monte puro', () => {
    expect(waypoint('campo', { map: 'int:trapiche0', x: 7, y: 5 }, exitOf)).toEqual({ map: 'campo', x: 6, y: 42 });
    expect(waypoint('campo', { map: 'monte', x: 25, y: 5 }, exitOf)).toEqual({ map: 'campo', x: 88, y: 1 });
    const inside = waypoint('int:cantina0', { map: 'campo', x: 23, y: 24 }, exitOf)!;
    expect(getMap('int:cantina0').grid[inside.y][inside.x]).toBe('M');
    expect(waypoint('medellin', { map: 'campo', x: 23, y: 24 }, exitOf)).toBeNull();
  });

  it('lo que carga Juan aparece a medida que se lo gana', () => {
    expect(items(withFlags())).toEqual(['farol']);
    expect(items(withFlags('machete', 'perro'))).toEqual(['farol', 'machete', 'perro']);
    expect(MISSION_IDS).toContain('mitos');
  });
});
