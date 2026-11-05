import { afterEach, describe, expect, it, vi } from 'vitest';
import { NPCS, type Npc } from '../src/adventure/World';
import { firstSentence, firstTime, hintLines, markTalked, storyAgain, talkKey, timesTalked, villagerLines } from '../src/adventure/Memory';
import { loadAdventure, newAdventure, saveAdventure } from '../src/adventure/State';
import { getMap } from '../src/adventure/Maps';

const npc = (name: string, map = 'campo'): Npc => getMap(map).npcs.find((n) => n.name === name)!;

describe('la gente se acuerda de Juan', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('la primera vez dice lo suyo; después, la frase que falta y luego un acuse corto', () => {
    const gloria = npc('DOÑA GLORIA');
    const all = gloria.lines!;
    const seen = all.map((_, i) => villagerLines(gloria, i));
    seen.forEach((r, i) => { expect(r.fresh).toBe(true); expect(r.lines).toEqual(all[i]); });
    const again = villagerLines(gloria, all.length);
    expect(again.fresh).toBe(false);
    expect(again.lines).toHaveLength(1);
    // no repite el discurso entero
    for (const l of all.flat()) expect(again.lines[0]).not.toBe(l);
  });

  it('quien dio una pista la recuerda en una línea, citando la primera oración', () => {
    const policia = npc('PATRULLERO GÓMEZ', 'medellin');
    const after = villagerLines(policia, policia.lines!.length).lines[0];
    expect(after).toContain('ENTRE NOS: ESTAS NOCHES ANDA POR LA PLAZA UN SEÑOR DE NEGRO CON UN SOMBRERO ENORME, A CABALLO.');
    expect(after.length).toBeLessThan(policia.lines![1][0].length + 40);
    expect(hintLines(policia)).toHaveLength(1);
  });

  it('sin pista que recordar, se acuerda de la historia que contó', () => {
    const nina = npc('VALENTINA');
    expect(villagerLines(nina, 1).lines[0]).toMatch(/OTRA VEZ|HOLA OTRA VEZ/);
    const evelio = npc('DON EVELIO');
    expect(villagerLines(evelio, 1, 'chiva').lines[0]).toContain('LA CHIVA');
  });

  it('las historias ya contadas se despachan en una línea', () => {
    expect(storyAgain('mohan')).toContain('EL MOHÁN');
  });

  it('primera oración de un parlamento', () => {
    expect(firstSentence('HOLA, MIJO. ¿CÓMO ESTÁ?')).toBe('HOLA, MIJO.');
    expect(firstSentence('¡JI, JI! ¿ME VIO?')).toBe('¡JI, JI!');
    expect(firstSentence('YO VI ALGO... ¡QUÉ SUSTO!')).toBe('YO VI ALGO...');
    expect(firstSentence('SIN PUNTO')).toBe('SIN PUNTO');
  });

  it('los temas que cambian con el progreso se dicen una vez cada uno', () => {
    const s = newAdventure();
    expect(firstTime(s, 'abuela:ronda:0')).toBe(true);
    expect(firstTime(s, 'abuela:ronda:0')).toBe(false);
    // calmó un mito: la noticia nueva sí se cuenta
    expect(firstTime(s, 'abuela:ronda:1')).toBe(true);
  });

  it('la memoria se guarda con la partida, sobrevive al cambiar de mapa y se borra con la partida nueva', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    const s = newAdventure();
    const k = talkKey('campo', 'DOÑA GLORIA');
    expect(markTalked(s, k)).toBe(0);
    expect(markTalked(s, k)).toBe(1);
    s.map = 'int:cantina0';
    saveAdventure(s);
    const back = loadAdventure()!;
    expect(timesTalked(back, k)).toBe(2);
    expect(timesTalked(newAdventure(), k)).toBe(0);
  });

  it('las partidas viejas sin memoria arrancan con la memoria vacía', () => {
    const s = newAdventure() as Partial<ReturnType<typeof newAdventure>>;
    delete s.talked;
    expect(timesTalked(s as ReturnType<typeof newAdventure>, 'campo:X')).toBe(0);
  });

  it('cada persona del campo tiene nombre único (la memoria es por mapa y nombre)', () => {
    const names = NPCS.map((n) => n.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
