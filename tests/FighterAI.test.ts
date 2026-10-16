import { describe, expect, it } from 'vitest';
import { Fighter } from '../src/entities/Fighter';
import { CombatSystem } from '../src/combat/CombatSystem';
import { FIGHTERS } from '../src/data/fighters';
import { FighterAI } from '../src/ai/FighterAI';
import { SpecBehavior } from '../src/entities/SpecBehavior';
import { seededRandom } from '../src/art/PixelPainter';
import type { Difficulty } from '../src/combat/CombatTypes';

function simulate(difficulty: Difficulty, seed: number, frames = 60 * 60) {
  const p1 = new Fighter(1, FIGHTERS.madremonte, 190, 1);
  const p2 = new Fighter(2, FIGHTERS.mohan, 370, -1);
  p1.behavior = new SpecBehavior();
  p2.behavior = new SpecBehavior();
  const combat = new CombatSystem(p1, p2, {
    onHit: () => {},
    onUltimateConnect: (a, d) => {
      // simulación: el definitivo aplica daño directo
      d.hp -= a.stats.attacks.ultimate.damage;
      a.setState('idle');
    },
    onProjectileSpawn: () => {},
    onProjectileEnd: () => {},
  });
  const rng = seededRandom(seed);
  const ai1 = new FighterAI(p1, p2, difficulty, rng);
  const ai2 = new FighterAI(p2, p1, difficulty, rng);
  const states = new Set<string>();
  let moved = 0;
  let attacks = 0;
  let blocks = 0;
  let lastX = p2.x;
  for (let f = 0; f < frames; f++) {
    if (p1.hp <= 0 || p2.hp <= 0) break;
    const in1 = ai1.update();
    const in2 = ai2.update();
    p1.update(in1);
    p2.update(in2);
    combat.step();
    states.add(p2.state);
    if (p2.x !== lastX) moved++;
    lastX = p2.x;
    if (p2.isAttacking() && p2.attackFrame === 0) attacks++;
    if (p2.state === 'block') blocks++;
    expect(Number.isFinite(p1.x) && Number.isFinite(p2.x)).toBe(true);
  }
  return { p1, p2, states, moved, attacks, blocks };
}

describe('IA del luchador', () => {
  for (const d of ['easy', 'normal', 'hard'] as Difficulty[]) {
    it(`en dificultad ${d} se mueve, ataca y no se queda bloqueada`, () => {
      const r = simulate(d, 42);
      expect(r.moved).toBeGreaterThan(30);
      expect(r.attacks).toBeGreaterThan(3);
      expect(r.states.has('attack') || r.states.has('special')).toBe(true);
      expect(r.p1.hp + r.p2.hp).toBeLessThan(200);
    });
  }
  it('la IA difícil bloquea más que la fácil', () => {
    const easy = simulate('easy', 7);
    const hard = simulate('hard', 7);
    expect(hard.blocks).toBeGreaterThanOrEqual(easy.blocks);
  });
  it('un combate IA vs IA termina en KO en menos de 99 segundos la mayoría de las veces', () => {
    let kos = 0;
    for (let s = 1; s <= 5; s++) {
      const r = simulate('normal', s, 99 * 60);
      if (r.p1.hp <= 0 || r.p2.hp <= 0) kos++;
    }
    expect(kos).toBeGreaterThanOrEqual(3);
  });
});
