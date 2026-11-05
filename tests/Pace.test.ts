import { describe, expect, it } from 'vitest';
import { DASH_FRAMES, Fighter } from '../src/entities/Fighter';
import { FIGHTERS, FIGHTER_IDS } from '../src/data/fighters';
import { EMPTY_INPUT, type InputState } from '../src/combat/CombatTypes';
import { hitstopFor } from '../src/combat/CombatRules';
import { strikeMotion } from '../src/art/DrawnAnim';
import { impactScale, strikeTrail } from '../src/art/DrawnFx';

/** Ritmo de pelea: andar, salto, golpes y hitstop se sienten ágiles (feedback "la pelea se ve lenta"). */

const input = (p: Partial<InputState> & { pr?: Partial<InputState['pressed']> } = {}): InputState => {
  const { pr, ...rest } = p;
  return { ...EMPTY_INPUT, ...rest, pressed: { ...EMPTY_INPUT.pressed, ...(pr ?? {}) } };
};

function airtime(id: (typeof FIGHTER_IDS)[number]): { frames: number; height: number } {
  const f = new Fighter(1, FIGHTERS[id], 200, 1);
  f.update(input({ up: true, pr: { up: true } }));
  let frames = 1;
  let top = f.y;
  while (!f.grounded && frames < 200) { f.update(EMPTY_INPUT); top = Math.min(top, f.y); frames++; }
  return { frames, height: f.y - top };
}

describe('ritmo de pelea', () => {
  it('andar es ágil: al menos ~1,6 px/frame hacia delante (≈ un cuarto de pantalla por segundo)', () => {
    for (const id of FIGHTER_IDS) {
      expect(FIGHTERS[id].walkSpeed).toBeGreaterThanOrEqual(1.6);
      expect(FIGHTERS[id].backSpeed).toBeLessThan(FIGHTERS[id].walkSpeed);
    }
  });

  it('el salto es corto y seco (≤ 34 frames en el aire) pero sigue alto (≥ 55 px)', () => {
    for (const id of FIGHTER_IDS) {
      const a = airtime(id);
      expect(a.frames, id).toBeLessThanOrEqual(34);
      expect(a.height, id).toBeGreaterThanOrEqual(55);
    }
  });

  it('los golpes ligeros recuperan rápido (≤ 15 frames en total)', () => {
    for (const id of FIGHTER_IDS) {
      const l = FIGHTERS[id].attacks.light;
      expect(l.startup + l.active + l.recovery, id).toBeLessThanOrEqual(15);
    }
  });

  it('hitstop de 3 a 6 frames según el daño; el definitivo no congela', () => {
    expect(hitstopFor({ hitstop: 4, damage: 4 }, false)).toBe(3);
    expect(hitstopFor({ hitstop: 4, damage: 5 }, false)).toBe(4);
    expect(hitstopFor({ hitstop: 7, damage: 11 }, false)).toBe(6);
    expect(hitstopFor({ hitstop: 8, damage: 30 }, false)).toBe(6);
    expect(hitstopFor({ hitstop: 7, damage: 11 }, true)).toBe(5);
    expect(hitstopFor({ hitstop: 0, damage: 30 }, false)).toBe(0);
  });

  it('doble toque adelante: carrerita más rápida que andar, que se acaba sola', () => {
    const f = new Fighter(1, FIGHTERS.juanmachete, 200, 1);
    const right = input({ right: true });
    f.update(right);
    f.update(EMPTY_INPUT);
    f.update(right);
    expect(f.dash).toBeGreaterThan(0);
    expect(f.anim).toBe('dash');
    expect(f.vx).toBeGreaterThan(FIGHTERS.juanmachete.walkSpeed * 2);
    for (let i = 0; i < DASH_FRAMES; i++) f.update(EMPTY_INPUT);
    expect(f.dash).toBe(0);
    expect(f.state).toBe('idle');
    // mantener adelante sin soltar no hace carrerita
    const g = new Fighter(1, FIGHTERS.juanmachete, 200, 1);
    for (let i = 0; i < 20; i++) g.update(right);
    expect(g.dash).toBe(0);
  });

  it('puño y patada se distinguen con la misma tira: el puño se lanza adelante, la patada se echa atrás y se eleva', () => {
    const p = { frame: 6, startup: 6, active: 3, recovery: 10 };
    const punch = strikeMotion(p, true, false);
    const kick = strikeMotion(p, true, true);
    expect(punch.rot).toBeGreaterThan(4);
    expect(kick.rot).toBeLessThan(-8);
    expect(kick.dy).toBeLessThan(0);
    expect(punch.sx).toBeGreaterThan(1);
    // anticipación: recoge hacia atrás antes de soltar
    expect(strikeMotion({ ...p, frame: 4 }, true, false).dx).toBeLessThan(-3);
  });

  it('rastros de arma en el impacto y destello que crece con el daño', () => {
    expect(strikeTrail('juanmachete', 'heavy')).toBe('machete');
    expect(strikeTrail('juanmachete', 'light')).toBeNull();
    expect(strikeTrail('patasola', 'light')).toBe('claw');
    expect(strikeTrail('llorona', 'light')).toBeNull();
    expect(impactScale(11, false)).toBeGreaterThan(impactScale(5, false));
    expect(impactScale(11, true)).toBeLessThan(impactScale(11, false));
  });
});
