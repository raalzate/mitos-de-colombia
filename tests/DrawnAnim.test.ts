import { describe, expect, it } from 'vitest';
import { DRAWN_ANIM } from '../src/art/drawnAnimManifest';
import {
  LAND_FRAMES, LAND_TUCK, STRIKE_FOLLOW, WALK_STRIDE_PX, attackIndex, drawnAnimFile, drawnAnimKey, drawnFrame, drawnMotion, flipPhase, hitRecoil,
  hitShake, landSquash, standHeight, strikeIndex, strikeKeys, strikeMotion, stripAnchor, walkFrameByDistance, walkPhase,
} from '../src/art/DrawnAnim';
import { DRAWN_METRICS } from '../src/art/drawnAnimMetrics';
import { FIGHTER_IDS } from '../src/data/fighters';

const files = import.meta.glob('../public/assets/anim/*.png');
const base = { state: 'idle' as const, anim: 'idle', animFrame: 0, frame: 0, grounded: true };

describe('animación dibujada', () => {
  it('cada personaje tiene las tres tiras con archivo en disco', () => {
    for (const id of FIGHTER_IDS) {
      for (const action of ['walk', 'attack', 'hurt', 'idle', 'trans'] as const) {
        const m = DRAWN_ANIM[id][action];
        expect(m.frames).toBeGreaterThanOrEqual(action === 'idle' ? 1 : action === 'trans' ? 3 : 4);
        expect(m.w).toBeGreaterThan(0);
        for (const slot of ['p1', 'p2'] as const) {
          expect(Object.keys(files)).toContain(`../public/assets/${drawnAnimFile(id, slot, action)}`);
        }
        expect(drawnAnimKey(id, 'p1', action)).toBe(`anim_${id}_p1_${action}`);
      }
    }
  });

  it('elige fotogramas dentro de rango para todos los estados', () => {
    const anims = ['walk', 'light', 'heavy', 'lightkick', 'heavykick', 'airlight', 'airkick', 'hit', 'knockdown', 'getup', 'victory'];
    for (const id of FIGHTER_IDS) {
      for (const anim of anims) {
        for (let f = 0; f < 3; f++) {
          const r = drawnFrame(id, { ...base, anim, animFrame: f, frame: f * 13 });
          expect(r).not.toBeNull();
          const n = DRAWN_ANIM[id][r!.action]!.frames;
          expect(r!.index).toBeGreaterThanOrEqual(0);
          expect(r!.index).toBeLessThan(n);
        }
      }
      expect(drawnFrame(id, { ...base, anim: 'idle' })).toEqual({ action: 'idle', index: 0 });
      // reposo = primer fotograma de andar (sin cambio de imagen al arrancar); Patasola salta en el sitio
      expect(DRAWN_ANIM[id].idle.frames).toBe(id === 'patasola' ? 8 : 1);
      expect(drawnFrame(id, { ...base, anim: 'idle', frame: 5 })!.index).toBe(id === 'patasola' ? 1 : 0);
      expect(drawnFrame(id, { ...base, anim: 'special1', animFrame: 1 })!.action).toBe('attack');
      expect(drawnFrame(id, { ...base, anim: 'crouch' })!.action).toBe(id === 'patasola' ? 'attack' : 'hurt');
    }
  });

  it('puño y patada usan mitades distintas de la tira de golpes y el ciclo de andar recorre todos los fotogramas', () => {
    const punch = drawnFrame('mohan', { ...base, anim: 'light', animFrame: 1 })!;
    const kick = drawnFrame('mohan', { ...base, anim: 'heavykick', animFrame: 1 })!;
    expect(kick.index).toBeGreaterThan(punch.index);
    const seen = new Set<number>();
    for (let f = 0; f < 200; f++) seen.add(drawnFrame('mohan', { ...base, anim: 'walk', frame: f })!.index);
    expect(seen.size).toBe(DRAWN_ANIM.mohan.walk.frames);
    expect(drawnFrame('mohan', { ...base, state: 'victory', anim: 'victory' })!.index).toBe(DRAWN_ANIM.mohan.hurt.frames - 1);
    // andar hacia atrás recorre el ciclo en reversa
    const fwd = [5, 10, 15].map((f) => drawnFrame('mohan', { ...base, anim: 'walk', frame: f })!.index);
    const back = [5, 10, 15].map((f) => drawnFrame('mohan', { ...base, anim: 'walk', frame: f, backward: true })!.index);
    const n = DRAWN_ANIM.mohan.walk.frames;
    expect(back).toEqual(fwd.map((k) => (n - k) % n));
  });

  it('el ciclo de andar avanza por distancia: un fotograma cada zancada, sin patinar', () => {
    const n = DRAWN_ANIM.mohan.walk.frames;
    expect(walkFrameByDistance(0, n)).toBe(0);
    expect(walkFrameByDistance(WALK_STRIDE_PX - 0.1, n)).toBe(0);
    expect(walkFrameByDistance(WALK_STRIDE_PX, n)).toBe(1);
    expect(walkFrameByDistance(WALK_STRIDE_PX * n, n)).toBe(0);
    // a velocidad de andar real (≈2 px/frame) un fotograma clave cada ~3-4 frames lógicos; con intermedios, el doble
    let dist = 0; let changes = 0; let last = 0;
    for (let t = 0; t < 120; t++) { dist += 2; const k = walkFrameByDistance(dist, n); if (k !== last) { changes++; last = k; } }
    expect(changes).toBeGreaterThanOrEqual(30);
    expect(changes).toBeLessThanOrEqual(40);
    for (const id of FIGHTER_IDS) {
      // solo fotogramas dibujados originales: los intermedios sintetizados dejaban contornos dentro del cuerpo
      expect(DRAWN_ANIM[id].walk.interpolated).toBeUndefined();
      expect(DRAWN_ANIM[id].walk.frames).toBeGreaterThanOrEqual(6);
    }
    const seen = new Set<number>();
    for (let d = 0; d < 200; d += 1) seen.add(drawnFrame('mohan', { ...base, anim: 'walk', walkDistance: d })!.index);
    expect(seen.size).toBe(n);
    expect(drawnFrame('mohan', { ...base, anim: 'walk', frame: 999, walkDistance: WALK_STRIDE_PX * 2 })!.index).toBe(2);
  });

  it('la fase de andar es continua: el fundido avanza sin saltos y hay pisada en los fotogramas de contacto', () => {
    const n = DRAWN_ANIM.mohan.walk.frames;
    let prev = walkPhase(0, n);
    let footfalls = 0;
    for (let d = 0.5; d <= WALK_STRIDE_PX * n * 2; d += 0.5) {
      const ph = walkPhase(d, n);
      // t avanza como máximo 0.5 px / zancada por paso de 0.5 px; al cambiar de fotograma vuelve a 0
      if (ph.index === prev.index) expect(ph.t - prev.t).toBeCloseTo(0.5 / WALK_STRIDE_PX, 6);
      else expect(ph.t).toBeLessThan(0.5 / WALK_STRIDE_PX + 1e-6);
      expect(ph.next).toBe((ph.index + 1) % n);
      expect(ph.bob).toBeLessThanOrEqual(0);
      expect(ph.bob).toBeGreaterThanOrEqual(-1.5);
      if (ph.footfall) footfalls++;
      prev = ph;
    }
    expect(footfalls).toBe(4); // dos ciclos completos, dos pisadas por ciclo
    const back = walkPhase(WALK_STRIDE_PX * 2, n, WALK_STRIDE_PX, true);
    expect(back.index).toBe(n - 2);
    expect(back.next).toBe(n - 3);
  });

  it('attackIndex reparte preparación, impacto sostenido y recuperación', () => {
    const p = { startup: 6, active: 3, recovery: 9 };
    const seq = Array.from({ length: 18 }, (_, f) => attackIndex(0, 2, 4, { ...p, frame: f }));
    expect(seq[0]).toBe(0);
    expect(seq.slice(6, 9)).toEqual([2, 2, 2]);
    expect(seq[17]).toBe(4);
  });

  it('los golpes sostienen la anticipación, impactan en los frames activos y siguen extendidos', () => {
    const p = { startup: 9, active: 4, recovery: 15 };
    for (const id of FIGHTER_IDS) {
      const k = strikeKeys(id);
      const n = DRAWN_ANIM[id].attack.frames;
      expect(k.light).toBeLessThan(n);
      expect(k.heavy).toBeGreaterThanOrEqual(k.light);
      for (const heavy of [false, true]) {
        const seq = Array.from({ length: 28 }, (_, f) => strikeIndex(k, heavy, { ...p, frame: f }));
        const hit = heavy ? k.heavy : k.light;
        // guardia un instante, preparación sostenida el resto del arranque
        expect(seq[0]).toBe(0);
        expect(new Set(seq.slice(1, 9))).toEqual(new Set([k.wind]));
        // impacto exacto en los activos y seguimiento: sigue extendido al empezar la recuperación
        expect(seq.slice(9, 13)).toEqual([hit, hit, hit, hit]);
        expect(seq[13]).toBe(hit);
        expect(seq[13 + Math.floor(15 * STRIKE_FOLLOW) - 1]).toBe(hit);
        // termina en un fotograma de recuperación distinto del impacto
        expect(seq[27]).not.toBe(hit);
        // pocos cambios de dibujo: poses clave sostenidas, no un fotograma distinto cada frame
        let changes = 0;
        for (let f = 1; f < seq.length; f++) if (seq[f] !== seq[f - 1]) changes++;
        expect(changes).toBeLessThanOrEqual(4);
      }
    }
    // en el juego los golpes ligeros y fuertes impactan con fotogramas distintos
    const light = drawnFrame('juanmachete', { ...base, state: 'attack', anim: 'light', attackProgress: { ...p, frame: 10 } })!;
    const heavy = drawnFrame('juanmachete', { ...base, state: 'attack', anim: 'heavykick', attackProgress: { ...p, frame: 10 } })!;
    expect(light).toEqual({ action: 'attack', index: strikeKeys('juanmachete').light });
    expect(heavy.index).toBeGreaterThan(light.index);
  });

  it('el golpe recoge hacia atrás, se lanza al impacto y vuelve suave a cero', () => {
    const p = { startup: 6, active: 3, recovery: 10 };
    const m = Array.from({ length: 19 }, (_, f) => strikeMotion({ ...p, frame: f }, true, false));
    expect(m[5].dx).toBeLessThan(0);
    expect(m[6].dx).toBeGreaterThan(3);
    expect(m[18].dx).toBeLessThan(0.5);
    for (let f = 10; f < 19; f++) expect(m[f].dx).toBeLessThanOrEqual(m[f - 1].dx + 1e-9);
    // la patada se inclina hacia atrás; el puño hacia delante
    expect(strikeMotion({ ...p, frame: 7 }, true, true).rot).toBeLessThan(0);
    expect(strikeMotion({ ...p, frame: 7 }, true, false).rot).toBeGreaterThan(0);
  });

  it('al recibir un golpe retrocede, se sostiene y vuelve; el temblor solo dura el hitstop', () => {
    const full = hitRecoil(20, 20, true);
    expect(full.dx).toBeLessThan(-3);
    expect(full.rot).toBeLessThan(-6);
    expect(hitRecoil(17, 20, true)).toEqual(full);
    expect(Math.abs(hitRecoil(0, 20, true).dx)).toBeLessThan(1e-9);
    expect(Math.abs(hitRecoil(10, 20, false).dx)).toBeLessThan(Math.abs(hitRecoil(10, 20, true).dx));
    expect(hitShake(0)).toBe(0);
    expect(Math.abs(hitShake(7))).toBe(2);
    expect(Math.abs(hitShake(3))).toBe(1);
    expect(hitShake(6)).toBe(-hitShake(7));
  });

  it('salto: encogido al despegar, voltereta con dirección, encogido en la cima en vertical y aterrizaje aplastado', () => {
    const jump = (o: object) => drawnFrame('mohan', { ...base, state: 'jump', anim: 'jump', grounded: false, ...o })!;
    const tuck = { action: 'trans', index: 1 };
    expect(jump({ stateFrame: 0, vy: -7 })).toEqual(tuck);
    expect(jump({ stateFrame: 5, vy: -6 }).action).toBe('idle');
    expect(jump({ stateFrame: 20, vy: 0 })).toEqual(tuck);
    expect(jump({ stateFrame: 36, vy: 6 }).action).toBe('idle');
    expect(jump({ stateFrame: 12, vy: -2, vxForward: 1.5 })).toEqual(tuck);
    // la voltereta da una vuelta completa: hacia delante gira a favor, hacia atrás en contra
    expect(flipPhase(-6, 1.5)).toBeNull();
    expect(flipPhase(0, 0)).toBeNull();
    const start = drawnMotion('mohan', { ...base, anim: 'jump', state: 'jump', grounded: false, stateFrame: 10, vy: -4.9, vxForward: 1.5 });
    const end = drawnMotion('mohan', { ...base, anim: 'jump', state: 'jump', grounded: false, stateFrame: 30, vy: 4.4, vxForward: 1.5 });
    const back = drawnMotion('mohan', { ...base, anim: 'jump', state: 'jump', grounded: false, stateFrame: 20, vy: 0, vxForward: -1.2 });
    expect(start.center).toBe(true);
    expect(start.rot).toBeLessThan(20);
    expect(end.rot).toBeGreaterThan(340);
    expect(back.rot).toBeLessThan(0);
    // despegue y subida estirados
    const up = drawnMotion('mohan', { ...base, anim: 'jump', state: 'jump', grounded: false, stateFrame: 4, vy: -6.5 });
    expect(up.sy).toBeGreaterThan(1);
    // aterrizaje: encogido unos frames, aplastado y vuelve a 1
    expect(drawnFrame('mohan', { ...base, landing: 0 })).toEqual(tuck);
    expect(drawnFrame('mohan', { ...base, landing: LAND_TUCK })!.action).toBe('idle');
    expect(landSquash(0).sy).toBeLessThan(1);
    expect(landSquash(LAND_TUCK).sy).toBeLessThan(1);
    expect(landSquash(LAND_FRAMES)).toEqual({ sx: 1, sy: 1 });
  });

  it('todas las tiras comparten eje y línea de suelo', () => {
    for (const id of FIGHTER_IDS) {
      for (const action of ['walk', 'attack', 'hurt', 'trans', 'idle', 'fall'] as const) {
        const strip = DRAWN_ANIM[id][action];
        if (!strip) continue;
        expect(DRAWN_METRICS[id][action]!.length).toBe(strip.frames);
        for (let k = 0; k < strip.frames; k++) {
          const a = stripAnchor(id, action, k, true);
          const [, pad] = DRAWN_METRICS[id][action]![k];
          const ref = DRAWN_METRICS[id].idle![0];
          // en el suelo los pies quedan a la altura de los del reposo (salvo los golpes)
          if (action !== 'attack') expect(pad - a.dy).toBe(ref[1]);
          expect(Math.abs(a.dx)).toBeLessThanOrEqual(8);
        }
      }
      // la altura de pie es coherente entre tiras: el fotograma de guardia de cada tira mide casi lo mismo
      const h = standHeight(id);
      for (const action of ['walk', 'fall'] as const) expect(Math.abs(DRAWN_METRICS[id][action]![0][2] - h)).toBeLessThanOrEqual(4);
    }
    // Patasola tumbada flotaba 11 px: ahora toca el suelo
    const lying = DRAWN_ANIM.patasola.fall!.lying!;
    expect(stripAnchor('patasola', 'fall', lying, true).dy).toBeGreaterThanOrEqual(10);
  });

  it('derribo: impacto y rebote al caer antes de quedar tumbado', () => {
    const f = DRAWN_ANIM.juanmachete.fall!;
    const at = (lying: number) => drawnFrame('juanmachete', { ...base, state: 'knockdown', anim: 'knockdown', grounded: true, lying })!.index;
    expect(at(0)).toBeLessThan(f.lying!);
    expect(at(20)).toBe(f.lying);
    for (let k = 1; k < 20; k++) expect(at(k)).toBeGreaterThanOrEqual(at(k - 1));
    const bounce = drawnMotion('juanmachete', { ...base, state: 'knockdown', anim: 'knockdown', grounded: true, lying: 4 });
    expect(bounce.dy).toBeLessThan(0);
    // el golpe usa fotogramas de retroceso de la caída, no los de vuelo
    const hit = drawnFrame('juanmachete', { ...base, state: 'hitstun', anim: 'hit', animFrame: 1 })!;
    expect(hit.action).toBe('fall');
    expect(hit.index).toBeLessThan(f.lying!);
  });

  it('agacharse y bloquear entran con transición propia antes de la pose final', () => {
    expect(drawnFrame('mohan', { ...base, anim: 'crouch', stateFrame: 0 })).toEqual({ action: 'trans', index: 0 });
    expect(drawnFrame('mohan', { ...base, anim: 'crouch', stateFrame: 4 })).toEqual({ action: 'trans', index: 1 });
    expect(drawnFrame('mohan', { ...base, anim: 'crouch', stateFrame: 10 })!.action).toBe('hurt');
    expect(drawnFrame('mohan', { ...base, anim: 'block', stateFrame: 1 })).toEqual({ action: 'trans', index: 2 });
    expect(drawnFrame('mohan', { ...base, anim: 'block', stateFrame: 10 })).toEqual({ action: 'attack', index: 0 });
  });

  it('Patasola se agacha encorvada, no tumbada', () => {
    expect(drawnFrame('patasola', { ...base, anim: 'crouch', stateFrame: 10 })).toEqual({ action: 'attack', index: 0 });
  });

  it('la caída generada con PixelLab: en el aire, tumbado y levantándose en orden', () => {
    const f = DRAWN_ANIM.mohan.fall!;
    expect(f.frames).toBeGreaterThanOrEqual(8);
    const up = drawnFrame('mohan', { ...base, state: 'knockdown', anim: 'knockdown', grounded: false, vy: -4 })!;
    const down = drawnFrame('mohan', { ...base, state: 'knockdown', anim: 'knockdown', grounded: false, vy: 4 })!;
    const lying = drawnFrame('mohan', { ...base, state: 'knockdown', anim: 'knockdown', grounded: true })!;
    expect(up.action).toBe('fall');
    expect(down.index).toBeGreaterThanOrEqual(up.index);
    expect(lying.index).toBeGreaterThan(down.index);
    expect(lying.index).toBe(f.lying);
    // con más de un fotograma de vuelo, bajando avanza respecto a subiendo
    const ll = DRAWN_ANIM.llorona.fall!;
    expect(ll.airEnd!).toBeGreaterThan(ll.air!);
    const lUp = drawnFrame('llorona', { ...base, state: 'knockdown', anim: 'knockdown', grounded: false, vy: -4 })!;
    const lDown = drawnFrame('llorona', { ...base, state: 'knockdown', anim: 'knockdown', grounded: false, vy: 4 })!;
    expect(lDown.index).toBeGreaterThan(lUp.index);
    const getup = [0, 4, 8, 13].map((sf) => drawnFrame('mohan', { ...base, state: 'getup', anim: 'getup', stateFrame: sf })!.index);
    for (let k = 1; k < getup.length; k++) expect(getup[k]).toBeGreaterThanOrEqual(getup[k - 1]);
    expect(getup[0]).toBeGreaterThan(lying.index);
    expect(getup[3]).toBeLessThan(f.frames);
  });
});
