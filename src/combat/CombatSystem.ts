import { ARENA_MARGIN, ARENA_WIDTH, BODY_PUSH_DISTANCE } from '../config/game-config';
import type { AttackDef, Facing, HitResult, PlayerSlot, WorldBox } from './CombatTypes';
import { resolveHit, addMeter, applyDamage } from './CombatRules';
import { boxesOverlap, intersectionCenter, overlapAmountX } from './HitboxSystem';
import { Fighter } from '../entities/Fighter';
import { Projectile, type ProjectileSpawn } from '../entities/Projectile';

export interface HitEvent {
  attacker: Fighter;
  defender: Fighter;
  result: HitResult;
  x: number;
  y: number;
  heavy: boolean;
  projectile: Projectile | null;
}

export interface CombatListener {
  onHit(e: HitEvent): void;
  onUltimateConnect(attacker: Fighter, defender: Fighter): void;
  onProjectileSpawn(p: Projectile): void;
  onProjectileEnd(p: Projectile, reason: 'hit' | 'expired' | 'cancelled'): void;
}

/**
 * Orquesta cada frame lógico: actualiza luchadores, proyectiles, colisiones y empuje de cuerpos.
 */
export class CombatSystem {
  readonly projectiles: Projectile[] = [];
  private listener: CombatListener;

  constructor(public readonly p1: Fighter, public readonly p2: Fighter, listener: CombatListener) {
    this.listener = listener;
    p1.opponent = p2;
    p2.opponent = p1;
  }

  spawnProjectile(spawn: ProjectileSpawn): void {
    const p = new Projectile(spawn);
    this.projectiles.push(p);
    this.listener.onProjectileSpawn(p);
  }

  clearProjectiles(): void {
    for (const p of this.projectiles) this.listener.onProjectileEnd(p, 'cancelled');
    this.projectiles.length = 0;
  }

  /** Paso de colisiones tras actualizar a ambos luchadores. */
  step(): void {
    this.resolveBodyPush();
    this.checkStrikes();
    this.updateProjectiles();
  }

  private resolveBodyPush(): void {
    const a = this.p1;
    const b = this.p2;
    if (a.state === 'cinematic' || b.state === 'cinematic') return;
    if (a.invuln > 0 && a.state === 'special') return; // niebla: atraviesa
    if (b.invuln > 0 && b.state === 'special') return;
    const pa = a.pushbox();
    const pb = b.pushbox();
    if (!boxesOverlap(pa, pb)) return;
    const overlap = overlapAmountX(pa, pb);
    if (overlap <= 0) return;
    const dir: Facing = a.x <= b.x ? 1 : -1;
    const minX = ARENA_MARGIN;
    const maxX = ARENA_WIDTH - ARENA_MARGIN;
    let moveA = overlap / 2;
    let moveB = overlap / 2;
    // si uno está contra la pared, el otro absorbe todo el empuje
    if (a.x - dir * moveA < minX || a.x - dir * moveA > maxX) {
      moveB += moveA;
      moveA = 0;
    }
    if (b.x + dir * moveB < minX || b.x + dir * moveB > maxX) {
      moveA += moveB;
      moveB = 0;
    }
    a.x -= dir * moveA;
    b.x += dir * moveB;
    a.x = Math.max(minX, Math.min(maxX, a.x));
    b.x = Math.max(minX, Math.min(maxX, b.x));
    if (Math.abs(a.x - b.x) < 1) {
      a.x -= dir * (BODY_PUSH_DISTANCE / 2);
      b.x += dir * (BODY_PUSH_DISTANCE / 2);
    }
  }

  private checkStrikes(): void {
    const hitA = this.p1.activeHitbox();
    const hitB = this.p2.activeHitbox();
    const hurtA = this.p1.hurtbox();
    const hurtB = this.p2.hurtbox();
    const aHits = !!hitA && !!hurtB && boxesOverlap(hitA, hurtB);
    const bHits = !!hitB && !!hurtA && boxesOverlap(hitB, hurtA);
    // Se capturan los ataques antes de aplicar: un intercambio simultáneo cambia el estado del otro.
    const attackA = this.p1.attack;
    const attackB = this.p2.attack;
    if (aHits && attackA) this.applyStrike(this.p1, this.p2, hitA!, hurtB!, null, attackA);
    if (bHits && attackB) this.applyStrike(this.p2, this.p1, hitB!, hurtA!, null, attackB);
  }

  private applyStrike(attacker: Fighter, defender: Fighter, hit: WorldBox, hurt: WorldBox, projectile: Projectile | null, attack: AttackDef): void {
    if (projectile) projectile.hasHit = true;
    else attacker.attackHasHit = true;
    const point = intersectionCenter(hit, hurt);
    const pushDir: Facing = defender.x >= attacker.x ? 1 : -1;

    if (attack.kind === 'ultimate' && !defender.isBlocking()) {
      this.listener.onUltimateConnect(attacker, defender);
      return;
    }
    const result = resolveHit(attack, defender.isBlocking());
    if (attack.kind === 'ultimate' && result.blocked) {
      // no debería ocurrir (no bloqueable), pero se protege la lógica
      return;
    }
    const hitstop = attack.hitstop;
    defender.takeHit(result, pushDir, hitstop);
    if (!projectile) attacker.hitstop = hitstop;
    if (!result.blocked) {
      attacker.meter = addMeter(attacker.meter, attack.meterOnHit);
      attacker.hitsLanded++;
      const spec = attack.kind === 'special1' ? attacker.stats.special1 : attack.kind === 'special2' ? attacker.stats.special2 : null;
      if (spec?.drain) attacker.hp = applyDamage(attacker.hp, -Math.round(result.damage * spec.drain));
    } else {
      attacker.meter = addMeter(attacker.meter, Math.ceil(attack.meterOnHit / 3));
    }
    this.listener.onHit({
      attacker,
      defender,
      result,
      x: point.x,
      y: point.y,
      heavy: attack.damage >= 9,
      projectile,
    });
  }

  private updateProjectiles(): void {
    for (const p of this.projectiles) {
      if (p.dead) continue;
      p.update();
      if (p.x < -40 || p.x > ARENA_WIDTH + 40) p.dead = true;
      if (p.dead) {
        this.listener.onProjectileEnd(p, 'expired');
        continue;
      }
      const defender = p.owner === 1 ? this.p2 : this.p1;
      const attacker = p.owner === 1 ? this.p1 : this.p2;
      const hurt = defender.hurtbox();
      const box = p.worldBox();
      if (hurt && !p.hasHit && boxesOverlap(box, hurt)) {
        this.applyStrike(attacker, defender, box, hurt, p, p.attack);
        p.dead = true;
        this.listener.onProjectileEnd(p, 'hit');
        continue;
      }
      // choque entre proyectiles de distintos dueños: se anulan (uno por uno, sin notificar dos veces)
      for (const q of this.projectiles) {
        if (q === p || q.dead || q.owner === p.owner) continue;
        if (boxesOverlap(box, q.worldBox())) {
          p.dead = true;
          q.dead = true;
          this.listener.onProjectileEnd(p, 'cancelled');
          this.listener.onProjectileEnd(q, 'cancelled');
          break;
        }
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (this.projectiles[i].dead) this.projectiles.splice(i, 1);
    }
  }

  fighter(slot: PlayerSlot): Fighter {
    return slot === 1 ? this.p1 : this.p2;
  }
}
