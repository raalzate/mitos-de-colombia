import { describe, expect, it } from 'vitest';
import { STAGE_IDS } from '../src/art/StageArtist';
import { LIFE_ART, EMISSIVE_ALPHA } from '../src/art/LifeArtist';
import { LIFE_MAX_ACTORS, LifeSim, buildLifeSheets, lifeSpecs } from '../src/art/StageLife';
import { seededRandom } from '../src/art/PixelPainter';

describe('vida del fondo de los escenarios', () => {
  it('los quince escenarios tienen al menos tres clases de vida', () => {
    for (const id of STAGE_IDS) {
      const kinds = new Set(lifeSpecs(id).map((s) => s.kind));
      expect(kinds.size, id).toBeGreaterThanOrEqual(3);
    }
  });

  it('cada tira se dibuja una vez, con fotogramas del mismo tamaño y con algo pintado', () => {
    for (const id of STAGE_IDS) {
      const sheets = buildLifeSheets(id);
      expect(new Set(sheets.map((s) => s.key)).size).toBe(sheets.length);
      for (const s of sheets) {
        const art = LIFE_ART[s.kind];
        expect(s.frames.length).toBe(art.n);
        for (const f of s.frames) {
          expect([f.width, f.height]).toEqual([art.w, art.h]);
          let opaque = 0;
          for (let i = 3; i < f.data.length; i += 4) {
            expect(f.data[i] === 0 || f.data[i] === 255, `${s.key}: alfa entero (pixel art nítido)`).toBe(true);
            expect(f.data[i]).not.toBe(EMISSIVE_ALPHA);
            if (f.data[i]) opaque++;
          }
          expect(opaque, s.key).toBeGreaterThan(2);
        }
      }
    }
  });

  it('las animaciones solo nombran fotogramas que existen; andar y aletear tienen 4-6 cuadros', () => {
    for (const [kind, art] of Object.entries(LIFE_ART)) {
      for (const f of [...art.go, ...(art.idle ?? [])]) expect(f, kind).toBeLessThan(art.n);
    }
    for (const k of ['ruana', 'peon', 'walker', 'mourner', 'woodcutter'] as const) expect(LIFE_ART[k].go.length).toBe(6);
    for (const k of ['garza', 'bird', 'crow', 'parrot', 'bat'] as const) expect(LIFE_ART[k].go.length).toBe(4);
  });

  it('la vida aparece con el tiempo, no pasa del tope y entra por fuera de la vista', () => {
    for (const id of STAGE_IDS) {
      const sim = new LifeSim(id, seededRandom(id.length * 97));
      let max = 0;
      let seen = 0;
      for (let t = 0; t < 60 * 90; t++) {
        const before = new Set(sim.actors);
        sim.update(1 / 60, 88);
        for (const a of sim.actors) {
          if (before.has(a)) continue;
          seen++;
          if (a.spec.move === 'walk' && !a.spec.inside) {
            const [vl, vr] = sim.view(a.spec.layer);
            expect(a.x < vl || a.x > vr, `${id}/${a.kind} nace fuera de la vista`).toBe(true);
          }
        }
        max = Math.max(max, sim.actors.length);
      }
      expect(seen, id).toBeGreaterThanOrEqual(4);
      expect(max).toBeLessThanOrEqual(LIFE_MAX_ACTORS);
      for (const d of sim.draws()) {
        expect(Number.isInteger(d.x) && Number.isInteger(d.y)).toBe(true);
        expect(d.alpha).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('un golpe fuerte espanta a los pájaros; el KO espanta también a la gente', () => {
    const sim = new LifeSim('botero', seededRandom(5));
    for (let t = 0; t < 60 * 20; t++) sim.update(1 / 60, 88);
    const pigeons = sim.actors.filter((a) => a.kind === 'pigeon' && a.mode === 'main');
    const people = sim.actors.filter((a) => a.spec.move === 'walk' && a.mode === 'main');
    expect(pigeons.length + people.length).toBeGreaterThan(0);
    sim.scare('hit');
    for (const p of pigeons) expect(p.mode).toBe('out');
    for (const p of people) expect(p.mode).toBe('main');
    sim.scare('ko');
    for (const p of people) {
      expect(p.mode).toBe('flee');
      expect(Math.abs(p.vx)).toBeGreaterThanOrEqual(30);
    }
  });

  it('en la cantina el cantinero, la pareja y el de la rockola ya están al empezar', () => {
    const sim = new LifeSim('cantina', seededRandom(1));
    sim.update(1 / 60, 88);
    const kinds = sim.actors.map((a) => a.kind);
    expect(kinds).toEqual(expect.arrayContaining(['bartender', 'dancers', 'jukebox']));
    sim.scare('ultimate');
    expect(sim.actors.find((a) => a.kind === 'bartender')!.mode).toBe('flinch');
  });
});
