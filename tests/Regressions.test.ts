import { describe, expect, it } from 'vitest';
import { Fighter } from '../src/entities/Fighter';
import { SpecBehavior } from '../src/entities/SpecBehavior';
import { CombatSystem } from '../src/combat/CombatSystem';
import { attackCooldownTotal, cooldownFraction } from '../src/combat/CombatRules';
import { FighterAI } from '../src/ai/FighterAI';
import { FIGHTERS } from '../src/data/fighters';
import { EMPTY_INPUT, type FighterId, type InputState } from '../src/combat/CombatTypes';
import { GROUND_Y } from '../src/config/game-config';
import { seededRandom } from '../src/art/PixelPainter';

const press = (p: Partial<InputState['pressed']>, down = false): InputState =>
  ({ ...EMPTY_INPUT, down, pressed: { ...EMPTY_INPUT.pressed, ...p } });

function setup(a: FighterId = 'madremonte', b: FighterId = 'mohan', dist = 180) {
  const p1 = new Fighter(1, FIGHTERS[a], 190, 1);
  const p2 = new Fighter(2, FIGHTERS[b], 190 + dist, -1);
  p1.behavior = new SpecBehavior();
  p2.behavior = new SpecBehavior();
  const ended: { id: number; reason: string }[] = [];
  const combat = new CombatSystem(p1, p2, {
    onHit: () => {},
    onUltimateConnect: (at, d) => { d.hp -= 30; at.setState('idle'); },
    onProjectileSpawn: () => {},
    onProjectileEnd: (p, reason) => ended.push({ id: p.id, reason }),
  });
  for (const f of [p1, p2]) f.events = { sound: () => {}, effect: () => {}, projectile: (s) => combat.spawnProjectile(s) };
  const step = (in1 = EMPTY_INPUT, in2 = EMPTY_INPUT) => { p1.update(in1); p2.update(in2); combat.step(); };
  return { p1, p2, combat, ended, step };
}

describe('regresiones de combate', () => {
  it('cooldownFraction: 1 al usar, baja hasta 0 y no divide por cero sin enfriamiento', () => {
    const atk = FIGHTERS.madremonte.attacks.special1;
    expect(attackCooldownTotal(atk)).toBe(atk.cooldown + atk.startup + atk.active + atk.recovery);
    expect(cooldownFraction(attackCooldownTotal(atk), atk)).toBe(1);
    expect(cooldownFraction(0, atk)).toBe(0);
    expect(cooldownFraction(attackCooldownTotal(atk) / 2, atk)).toBeCloseTo(0.5);
    const noCd = { ...atk, cooldown: 0 };
    expect(attackCooldownTotal(noCd)).toBe(0);
    expect(cooldownFraction(5, noCd)).toBe(0);
    expect(Number.isNaN(cooldownFraction(0, noCd))).toBe(false);
  });

  it('el luchador fija el enfriamiento con la misma fórmula que muestra el HUD', () => {
    const { p1, step } = setup();
    step(press({ special: true }));
    const atk = p1.stats.attacks.special1;
    expect(p1.cooldowns.special1).toBe(attackCooldownTotal(atk));
    expect(cooldownFraction(p1.cooldowns.special1, atk)).toBe(1);
    for (let i = 0; i < attackCooldownTotal(atk); i++) step();
    expect(p1.cooldowns.special1).toBe(0);
    expect(cooldownFraction(p1.cooldowns.special1, atk)).toBe(0);
  });

  it('un proyectil que choca con dos rivales a la vez solo se notifica una vez', () => {
    const { p1, p2, combat, ended, step } = setup('mohan', 'mohan', 200);
    const mk = (owner: 1 | 2, x: number) => combat.spawnProjectile({
      x, y: GROUND_Y - 30, vx: 0, facing: 1, owner, attack: (owner === 1 ? p1 : p2).stats.attacks.special1,
      hitbox: { x: -14, y: -14, w: 28, h: 26 }, kind: 'fx_orb', life: 100,
    });
    mk(1, 300);
    mk(2, 300);
    mk(2, 302);
    step();
    const ids = ended.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(combat.projectiles.filter((p) => !p.dead).length).toBeLessThanOrEqual(1);
    expect(ended.every((e) => e.reason === 'cancelled')).toBe(true);
  });

  it('un teletransporte interrumpido no deja al luchador invulnerable', () => {
    const { p1, step } = setup('mohan', 'madremonte', 80);
    step(press({ special: true }, true));
    expect(p1.state).toBe('special');
    for (let i = 0; i < 8; i++) step();
    expect(p1.invuln).toBeGreaterThan(0);
    p1.setState('idle'); // interrupción (p. ej. aterrizaje en pleno salto)
    expect(p1.invuln).toBe(0);
    expect(p1.alpha).toBe(1);
    expect(p1.hurtbox()).not.toBeNull();
  });

  it('un teletransporte aéreo cortado por el aterrizaje termina en idle sin invulnerabilidad', () => {
    const { p1, step } = setup('mohan', 'madremonte', 80);
    step(press({ up: true }));
    expect(p1.airborne).toBe(true);
    while (!(p1.vy > 0 && p1.y > GROUND_Y - 60)) step();
    step(press({ special: true }, true));
    expect(p1.state).toBe('special');
    let sawInvuln = false;
    for (let i = 0; i < 40 && !(p1.grounded && p1.state !== 'special'); i++) {
      if (p1.invuln > 0) sawInvuln = true;
      step();
    }
    expect(sawInvuln).toBe(true);
    expect(p1.grounded).toBe(true);
    expect(p1.invuln).toBe(0);
    expect(p1.alpha).toBe(1);
  });

  it('la IA no alterna bloqueo alto/agachado cada frame (hurtbox estable)', () => {
    const { p1, p2, step } = setup('madremonte', 'mohan', 180);
    const rng = seededRandom(5);
    const ai1 = new FighterAI(p1, p2, 'normal', rng);
    const ai2 = new FighterAI(p2, p1, 'normal', rng);
    let flips = 0;
    let blockFrames = 0;
    let prev = '';
    for (let f = 0; f < 2400 && p1.hp > 0 && p2.hp > 0; f++) {
      step(ai1.update(), ai2.update());
      if (p1.state === 'block') {
        blockFrames++;
        if (prev.endsWith('block') && p1.anim !== prev) flips++;
      }
      prev = p1.anim;
    }
    expect(blockFrames).toBeGreaterThan(0);
    expect(flips).toBe(0);
  });
});
