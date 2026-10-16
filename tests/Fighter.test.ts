import { describe, expect, it } from 'vitest';
import { Fighter, type FighterEvents } from '../src/entities/Fighter';
import { CombatSystem, type CombatListener, type HitEvent } from '../src/combat/CombatSystem';
import { FIGHTERS } from '../src/data/fighters';
import { EMPTY_INPUT, type InputState } from '../src/combat/CombatTypes';
import { GROUND_Y, MAX_HP, MAX_METER } from '../src/config/game-config';
import { SpecBehavior } from '../src/entities/SpecBehavior';

const press = (partial: Partial<InputState> & { p?: Partial<InputState['pressed']> } = {}): InputState => {
  const { p, ...rest } = partial;
  return { ...EMPTY_INPUT, ...rest, pressed: { ...EMPTY_INPUT.pressed, ...(p ?? {}) } };
};

function setup(d1 = 60) {
  const p1 = new Fighter(1, FIGHTERS.madremonte, 200, 1);
  const p2 = new Fighter(2, FIGHTERS.mohan, 200 + d1, -1);
  p1.behavior = new SpecBehavior();
  p2.behavior = new SpecBehavior();
  const hits: HitEvent[] = [];
  const ults: [Fighter, Fighter][] = [];
  const listener: CombatListener = {
    onHit: (e) => hits.push(e),
    onUltimateConnect: (a, d) => ults.push([a, d]),
    onProjectileSpawn: () => {},
    onProjectileEnd: () => {},
  };
  const sounds: string[] = [];
  const events: FighterEvents = { sound: (n) => sounds.push(n), effect: () => {}, projectile: (p) => combat.spawnProjectile(p) };
  p1.events = events;
  p2.events = events;
  const combat = new CombatSystem(p1, p2, listener);
  const step = (in1 = EMPTY_INPUT, in2 = EMPTY_INPUT) => {
    p1.update(in1);
    p2.update(in2);
    combat.step();
  };
  return { p1, p2, combat, hits, ults, sounds, step };
}

describe('máquina de estados del luchador', () => {
  it('camina, se agacha, bloquea y vuelve a reposo', () => {
    const { p1, step } = setup();
    const x0 = p1.x;
    step(press({ right: true }));
    expect(p1.state).toBe('walk');
    expect(p1.x).toBeGreaterThan(x0);
    step(press({ down: true }));
    expect(p1.state).toBe('crouch');
    step(press({ block: true }));
    expect(p1.state).toBe('block');
    expect(p1.isBlocking()).toBe(true);
    step();
    expect(p1.state).toBe('idle');
  });

  it('salta con gravedad y aterriza en el suelo', () => {
    const { p1, step } = setup();
    step(press({ p: { up: true } }));
    expect(p1.state).toBe('jump');
    expect(p1.grounded).toBe(false);
    let frames = 0;
    while (!p1.grounded && frames < 200) {
      step();
      frames++;
    }
    expect(p1.grounded).toBe(true);
    expect(p1.y).toBe(GROUND_Y);
    expect(p1.state).toBe('idle');
    expect(frames).toBeGreaterThan(10);
  });

  it('no permite moverse durante un ataque ni encadenar ataques infinitos', () => {
    const { p1, step } = setup();
    step(press({ p: { light: true } }));
    expect(p1.state).toBe('attack');
    const x = p1.x;
    step(press({ right: true, p: { heavy: true } }));
    expect(p1.state).toBe('attack');
    expect(p1.attack?.kind).toBe('light');
    expect(p1.x).toBe(x);
    const total = p1.attack!.startup + p1.attack!.active + p1.attack!.recovery;
    for (let i = 0; i < total; i++) step(press({ right: true }));
    expect(p1.state).toBe('walk');
  });

  it('la hitbox solo está activa durante los frames activos', () => {
    const { p1, step } = setup();
    step(press({ p: { light: true } }));
    const a = p1.attack!;
    const active: number[] = [];
    for (let f = 1; f < a.startup + a.active + a.recovery; f++) {
      if (p1.activeHitbox()) active.push(p1.attackFrame);
      step();
    }
    expect(active.length).toBe(a.active);
    expect(Math.min(...active)).toBe(a.startup);
  });

  it('el mismo ataque no golpea dos veces', () => {
    const { p2, hits, step } = setup(30);
    step(press({ p: { light: true } }));
    for (let i = 0; i < 30; i++) step();
    expect(hits.length).toBe(1);
    expect(p2.hp).toBe(MAX_HP - FIGHTERS.madremonte.attacks.light.damage);
  });

  it('el golpe causa hitstun y retroceso; el bloqueo reduce daño y mantiene bloqueo', () => {
    const a = setup(30);
    a.step(press({ p: { heavy: true } }));
    const x2 = a.p2.x;
    for (let i = 0; i < 24; i++) a.step();
    expect(a.hits.length).toBe(1);
    expect(a.p2.state).toBe('hitstun');
    expect(a.p2.x).toBeGreaterThan(x2);
    expect(a.p2.hp).toBe(MAX_HP - FIGHTERS.madremonte.attacks.heavy.damage);

    const b = setup(30);
    b.step(press({ p: { heavy: true } }), press({ block: true }));
    for (let i = 0; i < 24; i++) b.step(EMPTY_INPUT, press({ block: true }));
    expect(b.hits.length).toBe(1);
    expect(b.hits[0].result.blocked).toBe(true);
    expect(b.p2.state).toBe('block');
    expect(b.p2.hp).toBeGreaterThan(MAX_HP - FIGHTERS.madremonte.attacks.heavy.damage);
  });

  it('no hay impacto si el rival está fuera de alcance', () => {
    const { hits, step } = setup(200);
    step(press({ p: { heavy: true } }));
    for (let i = 0; i < 40; i++) step();
    expect(hits.length).toBe(0);
  });

  it('el empuje de cuerpos evita que se superpongan', () => {
    const { p1, p2, step } = setup(5);
    for (let i = 0; i < 5; i++) step();
    expect(Math.abs(p2.x - p1.x)).toBeGreaterThanOrEqual(18);
  });

  it('respeta límites de la arena', () => {
    const { p1, step } = setup();
    for (let i = 0; i < 400; i++) step(press({ left: true }));
    expect(p1.x).toBeGreaterThanOrEqual(0);
    expect(p1.x).toBeLessThan(40);
  });
});

describe('habilidades y recursos', () => {
  it('el especial entra en enfriamiento y no puede repetirse hasta que termine', () => {
    const { p1, step } = setup(200);
    step(press({ p: { special: true } }));
    expect(p1.state).toBe('special');
    expect(p1.cooldowns.special1).toBeGreaterThan(0);
    const a = p1.attack!;
    for (let i = 0; i < a.startup + a.active + a.recovery + 1; i++) step();
    expect(p1.state).toBe('idle');
    step(press({ p: { special: true } }));
    expect(p1.state).toBe('idle');
    while (p1.cooldowns.special1 > 0) step();
    step(press({ p: { special: true } }));
    expect(p1.state).toBe('special');
  });

  it('el definitivo exige barra llena y la consume', () => {
    const { p1, step } = setup(200);
    step(press({ p: { ultimate: true } }));
    expect(p1.state).toBe('idle');
    p1.meter = MAX_METER;
    step(press({ p: { ultimate: true } }));
    expect(p1.state).toBe('ultimate');
    expect(p1.meter).toBe(0);
  });

  it('el definitivo que conecta dispara la cinemática en vez de un golpe normal', () => {
    const { p1, p2, ults, hits, step } = setup(40);
    p1.meter = MAX_METER;
    step(press({ p: { ultimate: true } }));
    for (let i = 0; i < 30 && ults.length === 0; i++) step();
    expect(ults.length).toBe(1);
    expect(hits.length).toBe(0);
    expect(p2.hp).toBe(MAX_HP);
  });

  it('la oleada del Mohán crea un proyectil que viaja y golpea', () => {
    const { p1, p2, combat, hits, step } = setup(160);
    step(EMPTY_INPUT, press({ p: { special: true } }));
    expect(p2.state).toBe('special');
    for (let i = 0; i < 20 && combat.projectiles.length === 0; i++) step();
    expect(combat.projectiles.length).toBe(1);
    for (let i = 0; i < 120 && hits.length === 0; i++) step();
    expect(hits.length).toBe(1);
    expect(hits[0].projectile).not.toBeNull();
    expect(p1.hp).toBe(MAX_HP - FIGHTERS.mohan.attacks.special1.damage);
    expect(combat.projectiles.length).toBe(0);
  });

  it('la niebla reposiciona al Mohán con invulnerabilidad temporal', () => {
    const { p2, step } = setup(80);
    const x0 = p2.x;
    step(EMPTY_INPUT, press({ down: true, p: { special: true } }));
    expect(p2.state).toBe('special');
    let sawInvuln = false;
    for (let i = 0; i < 40; i++) {
      step();
      if (p2.invuln > 0) sawInvuln = true;
    }
    expect(sawInvuln).toBe(true);
    expect(p2.x).not.toBe(x0);
    expect(p2.alpha).toBe(1);
  });

  it('la energía sube al golpear y al recibir golpes', () => {
    const { p1, p2, step } = setup(30);
    step(press({ p: { light: true } }));
    for (let i = 0; i < 10; i++) step();
    expect(p1.meter).toBeGreaterThan(0);
    expect(p2.meter).toBeGreaterThan(0);
  });
});

describe('derribo y KO', () => {
  it('un ataque con derribo lanza al rival, cae, queda tumbado y se levanta invulnerable', () => {
    const { p1, p2, step } = setup(30);
    step(press({ p: { heavykick: true } }));
    for (let i = 0; i < 16; i++) step();
    expect(p2.state).toBe('knockdown');
    expect(p2.grounded).toBe(false);
    let frames = 0;
    while (p2.state === 'knockdown' && frames < 300) {
      step();
      frames++;
    }
    expect(p2.state).toBe('getup');
    expect(p2.invuln).toBeGreaterThan(0);
    expect(p2.hurtbox()).toBeNull();
    while (p2.state !== 'idle' && frames < 400) {
      step();
      frames++;
    }
    expect(p2.state).toBe('idle');
    expect(p1.state).toBe('idle');
  });

  it('con vida cero el luchador cae derrotado y no se levanta', () => {
    const { p2, step } = setup(30);
    p2.hp = 3;
    step(press({ p: { light: true } }));
    for (let i = 0; i < 200; i++) step();
    expect(p2.hp).toBe(0);
    expect(p2.state).toBe('defeat');
  });

  it('resetForRound restaura vida, posición y estado', () => {
    const { p2, step } = setup(30);
    step(press({ p: { heavy: true } }));
    for (let i = 0; i < 20; i++) step();
    p2.resetForRound(370, -1);
    expect(p2.hp).toBe(MAX_HP);
    expect(p2.x).toBe(370);
    expect(p2.state).toBe('idle');
    expect(p2.attack).toBeNull();
    expect(p2.cooldowns.special1).toBe(0);
  });
});
