import { describe, expect, it } from 'vitest';
import { FIGHTERS, FIGHTER_IDS, specialHint } from '../src/data/fighters';
import { Fighter } from '../src/entities/Fighter';
import { SpecBehavior } from '../src/entities/SpecBehavior';
import { CombatSystem } from '../src/combat/CombatSystem';
import { FighterAI } from '../src/ai/FighterAI';
import { EMPTY_INPUT, type FighterId } from '../src/combat/CombatTypes';
import { MAX_METER } from '../src/config/game-config';
import { PALETTES, buildCharacterSheet, buildPortrait, LOOKS } from '../src/art/CharacterArtist';
import { seededRandom } from '../src/art/PixelPainter';

const press = (p: Partial<typeof EMPTY_INPUT.pressed>, down = false) => ({ ...EMPTY_INPUT, down, pressed: { ...EMPTY_INPUT.pressed, ...p } });

function pair(a: FighterId, b: FighterId, dist: number) {
  const p1 = new Fighter(1, FIGHTERS[a], 200, 1);
  const p2 = new Fighter(2, FIGHTERS[b], 200 + dist, -1);
  p1.behavior = new SpecBehavior();
  p2.behavior = new SpecBehavior();
  const ults: string[] = [];
  const combat = new CombatSystem(p1, p2, {
    onHit: () => {},
    onUltimateConnect: (at, d) => { ults.push(at.stats.id); d.hp -= 30; at.setState('idle'); },
    onProjectileSpawn: () => {},
    onProjectileEnd: () => {},
  });
  const projectiles: string[] = [];
  const effects: string[] = [];
  for (const f of [p1, p2]) f.events = { sound: () => {}, effect: (e) => effects.push(e.kind), projectile: (s) => { projectiles.push(s.kind); combat.spawnProjectile(s); } };
  return { p1, p2, combat, ults, projectiles, effects };
}

describe('plantel completo', () => {
  it('hay 10 leyendas con datos coherentes', () => {
    expect(FIGHTER_IDS.length).toBe(10);
    for (const id of FIGHTER_IDS) {
      const f = FIGHTERS[id];
      expect(f.attacks.ultimate.meterCost).toBe(MAX_METER);
      expect(f.attacks.special1.kind).toBe('special1');
      expect(f.attacks.special2.kind).toBe('special2');
      expect(f.special1.short.length).toBeLessThanOrEqual(9);
      expect(specialHint(id, 'R', 'T')).toContain('R+T:');
      expect(LOOKS[id]).toBeDefined();
    }
  });

  it('genera hoja de sprites y retratos de cada personaje sin errores', () => {
    for (const id of FIGHTER_IDS) {
      const sheet = buildCharacterSheet(id, PALETTES[id].p1);
      expect(sheet.anims.idle.length).toBe(4);
      expect(sheet.anims.ultimate.length).toBe(3);
      expect(sheet.pixmap.width).toBeGreaterThan(0);
      // algo dibujado en el frame de reposo
      let opaque = 0;
      for (let y = 0; y < sheet.frameHeight; y++) for (let x = 0; x < sheet.frameWidth; x++) if (sheet.pixmap.alpha(x, y) > 0) opaque++;
      expect(opaque).toBeGreaterThan(400);
      const portrait = buildPortrait(id, PALETTES[id].p1, 48);
      expect(portrait.width).toBe(48);
    }
  });

  for (const id of FIGHTER_IDS) {
    it(`${id}: sus dos habilidades se ejecutan y producen efecto o daño`, () => {
      const f = FIGHTERS[id];
      for (const key of ['special1', 'special2'] as const) {
        const spec = f[key];
        const dist = spec.type === 'projectile' ? 150 : spec.type === 'teleport' ? 80 : 40;
        const { p1, p2, projectiles, effects, combat } = pair(id, 'mohan', dist);
        const x0 = p1.x;
        const step = () => { p1.update(EMPTY_INPUT); p2.update(EMPTY_INPUT); combat.step(); };
        p1.update(press({ special: true }, key === 'special2'));
        p2.update(EMPTY_INPUT);
        combat.step();
        expect(p1.state).toBe('special');
        expect(p1.attack?.kind).toBe(key);
        expect(p1.cooldowns[key]).toBeGreaterThan(0);
        for (let i = 0; i < 90; i++) step();
        expect(p1.state).toBe('idle');
        switch (spec.type) {
          case 'projectile':
            expect(projectiles.length).toBe(1);
            expect(p2.hp).toBeLessThan(100);
            break;
          case 'teleport':
            expect(p1.x).not.toBe(x0);
            expect(p1.alpha).toBe(1);
            expect(p1.invuln).toBe(0);
            break;
          case 'strike':
          case 'eruption':
            expect(p2.hp).toBeLessThan(100);
            expect(effects.length).toBeGreaterThan(0);
            break;
        }
      }
    });

    it(`${id}: el definitivo conecta a corta distancia`, () => {
      const { p1, p2, ults, combat } = pair(id, 'madremonte', 40);
      p1.meter = MAX_METER;
      p1.update(press({ ultimate: true }));
      p2.update(EMPTY_INPUT);
      combat.step();
      expect(p1.state).toBe('ultimate');
      for (let i = 0; i < 40 && ults.length === 0; i++) { p1.update(EMPTY_INPUT); p2.update(EMPTY_INPUT); combat.step(); }
      expect(ults).toEqual([id]);
    });
  }

  it('la Muelona recupera vida al morder', () => {
    const { p1, p2, combat } = pair('muelona', 'mohan', 40);
    p1.hp = 50;
    p1.update(press({ special: true }));
    p2.update(EMPTY_INPUT);
    combat.step();
    for (let i = 0; i < 40; i++) { p1.update(EMPTY_INPUT); p2.update(EMPTY_INPUT); combat.step(); }
    expect(p2.hp).toBeLessThan(100);
    expect(p1.hp).toBeGreaterThan(50);
  });

  it('IA vs IA con cada personaje termina sin bloqueos ni valores inválidos', () => {
    const rng = seededRandom(99);
    for (const id of FIGHTER_IDS) {
      const opp = FIGHTER_IDS[(FIGHTER_IDS.indexOf(id) + 3) % FIGHTER_IDS.length];
      const { p1, p2, combat } = pair(id, opp, 180);
      const ai1 = new FighterAI(p1, p2, 'hard', rng);
      const ai2 = new FighterAI(p2, p1, 'normal', rng);
      let attacks = 0;
      for (let f = 0; f < 60 * 60 && p1.hp > 0 && p2.hp > 0; f++) {
        p1.update(ai1.update());
        p2.update(ai2.update());
        combat.step();
        if (p1.isAttacking() && p1.attackFrame === 0) attacks++;
        expect(Number.isFinite(p1.x) && Number.isFinite(p2.x) && Number.isFinite(p1.hp)).toBe(true);
      }
      expect(attacks).toBeGreaterThan(3);
      expect(p1.hp + p2.hp).toBeLessThan(200);
    }
  });
});
