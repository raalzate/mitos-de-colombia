import { describe, expect, it } from 'vitest';
import {
  ABUELA_INTRO, INTRO_PAGES, JUAN_AFTER, MYTH_ARC, MYTH_IDS, STORIES, abuelaNudge, calmedWords, juanAfterCalm, mythTaunt, roundTally,
} from '../src/adventure/Stories';
import { INTRO_FLAG, markIntroSeen, needsIntro, newAdventure } from '../src/adventure/State';
import { missions, purpose } from '../src/adventure/Missions';
import { GUARDIANS, NPCS, SPIRITS } from '../src/adventure/World';
import { ALL_MAP_IDS, getMap } from '../src/adventure/Maps';
import { BANTER, BANTER_VS, linesFor, pickLine } from '../src/combat/Banter';
import { pickDuel } from '../src/combat/Duels';
import { FIGHTER_IDS } from '../src/data/fighters';
import { FONT_CHARS } from '../src/art/PixelFont';
import { wrap } from '../src/adventure/text';

const withFlags = (...flags: string[]) => { const s = newAdventure(); s.flags.push('intro', ...flags); return s; };

/** letras que la fuente 5x7 no sabe pintar */
const unsupported = (t: string) => [...t.toUpperCase()].filter((c) => c !== '\n' && !FONT_CHARS.includes(c));

describe('el cuento de entrada', () => {
  it('se narra una sola vez por partida nueva', () => {
    const s = newAdventure();
    expect(needsIntro(s)).toBe(true);
    markIntroSeen(s);
    expect(needsIntro(s)).toBe(false);
    markIntroSeen(s);
    expect(s.flags.filter((f) => f === INTRO_FLAG)).toHaveLength(1);
    // otra partida nueva lo vuelve a pedir
    expect(needsIntro(newAdventure())).toBe(true);
  });

  it('cada página cabe en cuatro renglones debajo del cuadro', () => {
    expect(INTRO_PAGES.length).toBeGreaterThanOrEqual(6);
    for (const p of INTRO_PAGES) expect(wrap(p.text, 58).length, p.text).toBeLessThanOrEqual(4);
  });

  it('cuenta el propósito de Juan: la ronda del abuelo, calmar y no acabar', () => {
    const all = INTRO_PAGES.map((p) => p.text).join(' ');
    expect(all).toContain('RONDA');
    expect(all).toContain('CALMAR');
    expect(all).toContain('JUAN MACHETE');
    expect(all).toContain('NO ES BRUJO NI TIENE PACTO');
  });
});

describe('la historia de la ronda', () => {
  it('cada mito guardián tiene su arco: varios retos, lo que cuenta ya calmado y lo que Juan aprende', () => {
    expect([...MYTH_IDS].sort()).toEqual(GUARDIANS.map((g) => g.id).sort());
    for (const id of MYTH_IDS) {
      const a = MYTH_ARC[id];
      expect(a.taunts.length, id).toBeGreaterThanOrEqual(3);
      expect(a.calmed.length, id).toBeGreaterThanOrEqual(2);
      // cada uno se acuerda del abuelo
      expect(a.calmed.join(' ') + a.taunts.join(' '), id).toMatch(/ABUELO|JOAQUÍN/);
      expect(a.lesson.length).toBeGreaterThan(10);
    }
  });

  it('los retos salen al azar entre las variantes', () => {
    const seen = new Set([0, 0.4, 0.99].map((r) => mythTaunt('silbon', r)));
    expect(seen.size).toBe(3);
  });

  it('el último mito calmado manda a Juan donde la abuela', () => {
    expect(calmedWords('bachue', false).join(' ')).not.toContain('ROSA');
    expect(calmedWords('bachue', true).at(-1)).toContain('ROSA');
    expect(roundTally(9, 9)).toContain('ABUELA ROSA');
    expect(roundTally(8, 9)).toContain('FALTA UNO');
  });

  it('Juan va entendiendo: tiene algo que decir tras cada mito, de uno a nueve', () => {
    expect(JUAN_AFTER).toHaveLength(9);
    for (let n = 1; n <= 9; n++) expect(juanAfterCalm(n, 0.5).length).toBeGreaterThan(10);
    expect(juanAfterCalm(9, 0)).toContain('NUEVE');
  });

  it('la abuela le recuerda el propósito según cómo va', () => {
    expect(abuelaNudge(0)).toContain('RESPETO');
    expect(abuelaNudge(8)).toContain('UNO SOLO');
  });

  it('Juan sabe qué le toca y lo que ha aprendido de cada mito calmado', () => {
    expect(purpose(withFlags())[0]).toContain('RONDA');
    const s = withFlags('machete');
    s.calmed.push('llorona', 'mohan');
    const p = purpose(s);
    expect(p[0]).toContain('2 DE 9');
    expect(p[1]).toContain(MYTH_ARC.llorona.lesson);
    expect(p[1]).toContain(MYTH_ARC.mohan.lesson);
    const done = withFlags('machete', 'fin');
    done.calmed.push(...MYTH_IDS);
    expect(purpose(done)[0]).toContain('EN PAZ');
  });

  it('la misión de los mitos es la ronda del abuelo, con plazo a las doce', () => {
    const m = missions(withFlags('machete')).find((x) => x.id === 'mitos')!;
    expect(m.title).toBe('LA RONDA DEL ABUELO');
    expect(m.step.text).toContain('DOCE');
  });
});

describe('peleas con más charla', () => {
  it('las frases contra un rival caben en el globo y se mezclan con las de siempre', () => {
    for (const [id, vs] of Object.entries(BANTER_VS)) for (const lines of Object.values(vs ?? {})) for (const l of lines ?? []) expect(l.length, `${id}: ${l}`).toBeLessThanOrEqual(40);
    expect(linesFor('juanmachete', 'llorona').length).toBeGreaterThan(BANTER.juanmachete.length);
    expect(linesFor('juanmachete').length).toBe(BANTER.juanmachete.length);
    expect(linesFor('juanmachete', 'llorona')).toContain(pickLine('juanmachete', 0.999, undefined, 'llorona'));
  });

  it('los mitos vecinos se pican entre ellos, esté quien esté de primero', () => {
    const a = pickDuel('llorona', 'mohan', 0), b = pickDuel('mohan', 'llorona', 0);
    expect(a).toHaveLength(3);
    expect(b.map((l) => l.text)).toEqual(a.map((l) => l.text));
    expect(b[0].who).not.toBe(a[0].who);
  });
});

describe('todo el texto se puede pintar con la fuente', () => {
  it('no hay letras que la fuente 5x7 no tenga', () => {
    const texts: string[] = [
      ...INTRO_PAGES.map((p) => p.text), ...Object.values(ABUELA_INTRO).flat(),
      ...MYTH_IDS.flatMap((id) => [...MYTH_ARC[id].taunts, ...MYTH_ARC[id].calmed, MYTH_ARC[id].lesson]),
      ...JUAN_AFTER.flat(), ...[0, 2, 5, 8].map((n) => abuelaNudge(n)), roundTally(3), roundTally(9),
      ...Object.values(STORIES).flatMap((s) => [s.title, ...s.pages]),
      ...FIGHTER_IDS.flatMap((id) => BANTER[id]), ...Object.values(BANTER_VS).flatMap((v) => Object.values(v ?? {}).flat() as string[]),
      ...FIGHTER_IDS.flatMap((a) => FIGHTER_IDS.flatMap((b) => [0, 0.5, 0.9].flatMap((r) => pickDuel(a, b, r).map((l) => l.text)))),
      ...GUARDIANS.flatMap((g) => [g.clueText, g.fright, g.taunt, g.defeat, g.flee, g.disguise?.line ?? '', g.disguise?.reveal ?? '']),
      ...NPCS.flatMap((n) => (n.lines ?? []).flat()), ...SPIRITS.flatMap((s) => s.hints),
      ...ALL_MAP_IDS.flatMap((id) => getMap(id).npcs.flatMap((n) => (n.lines ?? []).flat())),
      ...ALL_MAP_IDS.flatMap((id) => getMap(id).signs.flatMap((s) => s.lines)),
      ...missions(withFlags()).map((m) => m.step.text), ...purpose(withFlags()),
    ];
    expect(texts.filter((t) => unsupported(t).length)).toEqual([]);
  });
});
