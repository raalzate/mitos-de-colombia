import { describe, expect, it } from 'vitest';
import { FIGHTERS, FIGHTER_IDS } from '../src/data/fighters';
import { Fighter } from '../src/entities/Fighter';
import { SpecBehavior } from '../src/entities/SpecBehavior';
import { CombatSystem } from '../src/combat/CombatSystem';
import { FighterAI } from '../src/ai/FighterAI';
import type { FighterId } from '../src/combat/CombatTypes';
import { seededRandom } from '../src/art/PixelPainter';

/**
 * Balance rápido: IA vs IA (normal) con todas las parejas ordenadas del plantel
 * (cada personaje juega en ambos lados) y varias semillas. Ningún personaje
 * debe ganar más del 75 % ni menos del 25 % de sus combates.
 */

const FRAMES = 2000;
const SEEDS = [11, 23, 37, 51, 73, 97];

function fight(a: FighterId, b: FighterId, seed: number): { winner: 1 | 2 | 0; hpA: number; hpB: number } {
  const p1 = new Fighter(1, FIGHTERS[a], 190, 1);
  const p2 = new Fighter(2, FIGHTERS[b], 370, -1);
  p1.behavior = new SpecBehavior();
  p2.behavior = new SpecBehavior();
  const combat = new CombatSystem(p1, p2, {
    onHit: () => {},
    onUltimateConnect: (at, d) => { d.hp -= at.stats.attacks.ultimate.damage; at.setState('idle'); },
    onProjectileSpawn: () => {},
    onProjectileEnd: () => {},
  });
  for (const f of [p1, p2]) f.events = { sound: () => {}, effect: () => {}, projectile: (s) => combat.spawnProjectile(s) };
  const rng = seededRandom(seed);
  const ai1 = new FighterAI(p1, p2, 'normal', rng);
  const ai2 = new FighterAI(p2, p1, 'normal', rng);
  for (let f = 0; f < FRAMES && p1.hp > 0 && p2.hp > 0; f++) {
    p1.update(ai1.update());
    p2.update(ai2.update());
    combat.step();
  }
  const winner = p1.hp === p2.hp ? 0 : p1.hp > p2.hp ? 1 : 2;
  return { winner, hpA: p1.hp, hpB: p2.hp };
}

export interface WinStats { wins: number; games: number; rate: number }

export function simulateRoster(seeds = SEEDS): Record<FighterId, WinStats> {
  const stats = Object.fromEntries(FIGHTER_IDS.map((id) => [id, { wins: 0, games: 0, rate: 0 }])) as Record<FighterId, WinStats>;
  for (const a of FIGHTER_IDS) {
    for (const b of FIGHTER_IDS) {
      if (a === b) continue;
      for (const seed of seeds) {
        const r = fight(a, b, seed);
        stats[a].games++;
        stats[b].games++;
        if (r.winner === 1) stats[a].wins++;
        else if (r.winner === 2) stats[b].wins++;
        else { stats[a].wins += 0.5; stats[b].wins += 0.5; }
      }
    }
  }
  for (const id of FIGHTER_IDS) stats[id].rate = stats[id].wins / stats[id].games;
  return stats;
}

describe('balance del plantel (IA vs IA, normal)', () => {
  it('ningún personaje gana más del 75 % ni menos del 25 % de sus combates', () => {
    const stats = simulateRoster();
    const rows = FIGHTER_IDS.map((id) => `${id.padEnd(13)} ${(stats[id].rate * 100).toFixed(1).padStart(5)} %  (${stats[id].wins}/${stats[id].games})`);
    console.log('winrate por personaje:\n' + rows.join('\n'));
    for (const id of FIGHTER_IDS) {
      expect(stats[id].rate, `${id} winrate`).toBeGreaterThanOrEqual(0.25);
      expect(stats[id].rate, `${id} winrate`).toBeLessThanOrEqual(0.75);
    }
  });
});
