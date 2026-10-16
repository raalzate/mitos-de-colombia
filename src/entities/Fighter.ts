import { ARENA_MARGIN, ARENA_WIDTH, GRAVITY, GROUND_Y, MAX_FALL_SPEED, MAX_HP } from '../config/game-config';
import type {
  AttackDef, AttackKind, Facing, FighterState, FighterStats, HitResult, InputState, PlayerSlot, WorldBox,
} from '../combat/CombatTypes';
import { toWorldBox } from '../combat/HitboxSystem';
import { addMeter, applyDamage, attackCooldownTotal, canUseSpecial, canUseUltimate, facingToward } from '../combat/CombatRules';
import type { ProjectileSpawn } from './Projectile';
import type { SfxName } from '../audio/Sfx';

export interface EffectRequest {
  kind: string;
  x: number;
  y: number;
  facing: Facing;
  data?: Record<string, number | string | boolean>;
}

/** Canal de salida del luchador hacia la presentación (escena). */
export interface FighterEvents {
  sound(name: SfxName): void;
  effect(e: EffectRequest): void;
  projectile(p: ProjectileSpawn): void;
}

export const NULL_EVENTS: FighterEvents = { sound: () => {}, effect: () => {}, projectile: () => {} };

/** Comportamiento específico por personaje (habilidades). Los datos viven en data/fighters.ts. */
export interface FighterBehavior {
  onAttackStart(f: Fighter, attack: AttackDef): void;
  onAttackFrame(f: Fighter, attack: AttackDef, frame: number): void;
  onAttackEnd(f: Fighter, attack: AttackDef): void;
  /** Permite reubicar la hitbox (ej. erupción bajo el rival). null = usar la del ataque. */
  hitboxOverride(f: Fighter, attack: AttackDef): WorldBox | null;
}

export const NULL_BEHAVIOR: FighterBehavior = {
  onAttackStart: () => {},
  onAttackFrame: () => {},
  onAttackEnd: () => {},
  hitboxOverride: () => null,
};

const LYING_FRAMES = 34;
const GETUP_FRAMES = 14;
const GETUP_INVULN = 20;
const KNOCKBACK_FRICTION = 0.86;

export class Fighter {
  readonly slot: PlayerSlot;
  readonly stats: FighterStats;
  events: FighterEvents = NULL_EVENTS;
  behavior: FighterBehavior = NULL_BEHAVIOR;
  opponent: Fighter | null = null;

  x: number;
  y = GROUND_Y;
  vx = 0;
  vy = 0;
  facing: Facing;
  grounded = true;

  hp = MAX_HP;
  meter = 0;
  state: FighterState = 'idle';
  stateFrame = 0;

  attack: AttackDef | null = null;
  attackFrame = 0;
  attackHasHit = false;
  attackAirborne = false;

  stun = 0;
  hitstop = 0;
  invuln = 0;
  knockdownLying = 0;
  dead = false;
  cooldowns: Record<AttackKind, number> = {
    light: 0, heavy: 0, lightkick: 0, heavykick: 0, special1: 0, special2: 0, ultimate: 0,
  };

  /** Datos libres para comportamientos (p. ej. objetivo de la erupción). */
  scratch: Record<string, number> = {};

  /** Animación actual para la vista. */
  anim = 'idle';
  animFrame = 0;
  /** Visibilidad (niebla) y tinte solicitados por comportamientos. */
  alpha = 1;

  /** Estadísticas de ronda */
  hitsLanded = 0;
  damageTaken = 0;

  constructor(slot: PlayerSlot, stats: FighterStats, x: number, facing: Facing) {
    this.slot = slot;
    this.stats = stats;
    this.x = x;
    this.facing = facing;
  }

  /* ----------------------------- consultas ----------------------------- */

  get airborne(): boolean {
    return !this.grounded;
  }

  get controllable(): boolean {
    return ['idle', 'walk', 'crouch', 'block', 'jump'].includes(this.state) && this.stun <= 0;
  }

  get neutralGrounded(): boolean {
    return this.grounded && ['idle', 'walk', 'crouch', 'block'].includes(this.state) && this.stun <= 0;
  }

  isBlocking(): boolean {
    return this.state === 'block' && this.grounded;
  }

  isCrouching(): boolean {
    return this.state === 'crouch' || (this.state === 'block' && this.anim === 'crouchblock');
  }

  isAttacking(): boolean {
    return this.state === 'attack' || this.state === 'special' || this.state === 'ultimate';
  }

  /** Hitbox activa en mundo (si el ataque está en frames activos y aún no ha golpeado). */
  activeHitbox(): WorldBox | null {
    if (!this.attack || !this.isAttacking() || this.attackHasHit) return null;
    const a = this.attack;
    if (this.attackFrame < a.startup || this.attackFrame >= a.startup + a.active) return null;
    const override = this.behavior.hitboxOverride(this, a);
    if (override) return override;
    if (!a.hitbox) return null;
    return toWorldBox(a.hitbox, this.x, this.y, this.facing);
  }

  hurtbox(): WorldBox | null {
    if (this.invuln > 0 || this.state === 'cinematic') return null;
    if (this.state === 'knockdown' && this.grounded) return null; // en el suelo no se le puede golpear
    if (this.state === 'defeat' || this.state === 'victory') return null;
    const box = this.airborne ? this.stats.hurtAir : this.isCrouching() ? this.stats.hurtCrouch : this.stats.hurtStand;
    return toWorldBox(box, this.x, this.y, this.facing);
  }

  pushbox(): WorldBox {
    return toWorldBox(this.stats.pushBox, this.x, this.y, this.facing);
  }

  canAct(): boolean {
    return this.controllable;
  }

  /* ----------------------------- ciclo ----------------------------- */

  resetForRound(x: number, facing: Facing): void {
    this.x = x;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.grounded = true;
    this.hp = MAX_HP;
    this.state = 'idle';
    this.stateFrame = 0;
    this.attack = null;
    this.attackFrame = 0;
    this.attackHasHit = false;
    this.attackAirborne = false;
    this.stun = 0;
    this.hitstop = 0;
    this.invuln = 0;
    this.knockdownLying = 0;
    this.dead = false;
    this.alpha = 1;
    this.scratch = {};
    this.hitsLanded = 0;
    this.damageTaken = 0;
    for (const k of Object.keys(this.cooldowns) as AttackKind[]) this.cooldowns[k] = 0;
    this.anim = 'idle';
    this.animFrame = 0;
  }

  setState(s: FighterState): void {
    if (this.state === s) return;
    if (this.isAttacking() && this.attack) this.behavior.onAttackEnd(this, this.attack);
    this.state = s;
    this.stateFrame = 0;
    if (!['attack', 'special', 'ultimate'].includes(s)) {
      this.attack = null;
      this.attackFrame = 0;
      this.attackHasHit = false;
    }
  }

  update(input: InputState): void {
    for (const k of Object.keys(this.cooldowns) as AttackKind[]) if (this.cooldowns[k] > 0) this.cooldowns[k]--;
    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }
    if (this.invuln > 0) this.invuln--;
    this.stateFrame++;

    switch (this.state) {
      case 'idle':
      case 'walk':
      case 'crouch':
      case 'block':
        this.updateNeutral(input);
        break;
      case 'jump':
        this.updateJump(input);
        break;
      case 'attack':
      case 'special':
      case 'ultimate':
        this.updateAttack(input);
        break;
      case 'hitstun':
        this.updateHitstun();
        break;
      case 'knockdown':
        this.updateKnockdown();
        break;
      case 'getup':
        if (this.stateFrame >= GETUP_FRAMES) this.setState('idle');
        break;
      case 'cinematic':
      case 'victory':
      case 'defeat':
        this.vx = 0;
        break;
    }

    this.applyPhysics();
    this.updateAnim();
  }

  private faceOpponent(): void {
    if (this.opponent) this.facing = facingToward(this.x, this.opponent.x, this.facing);
  }


  private updateNeutral(input: InputState): void {
    this.faceOpponent();
    if (this.stun > 0) {
      // blockstun: se mantiene bloqueando
      this.stun--;
      this.vx *= KNOCKBACK_FRICTION;
      if (this.stun <= 0 && !input.block) this.setState('idle');
      return;
    }
    if (this.tryStartAttack(input)) return;
    if (input.pressed.up) {
      this.startJump(input);
      return;
    }
    if (input.block) {
      this.setState('block');
      this.vx = 0;
      this.anim = input.down ? 'crouchblock' : 'block';
      return;
    }
    if (input.down) {
      this.setState('crouch');
      this.vx = 0;
      return;
    }
    if (input.left !== input.right) {
      this.setState('walk');
      const dir: Facing = input.right ? 1 : -1;
      const speed = dir === this.facing ? this.stats.walkSpeed : this.stats.backSpeed;
      this.vx = dir * speed;
      return;
    }
    this.setState('idle');
    this.vx = 0;
  }

  private startJump(input: InputState): void {
    this.setState('jump');
    this.grounded = false;
    this.vy = this.stats.jumpForce;
    this.vx = input.left !== input.right ? (input.right ? 1 : -1) * this.stats.walkSpeed * 1.15 : 0;
    this.events.sound('jump');
    this.events.effect({ kind: 'dust', x: this.x, y: this.y, facing: this.facing });
  }

  private updateJump(input: InputState): void {
    if (this.tryStartAttack(input)) return;
  }

  private tryStartAttack(input: InputState): boolean {
    const atk = this.stats.attacks;
    const order: { pressed: boolean; kind: AttackKind }[] = [
      { pressed: input.pressed.ultimate, kind: 'ultimate' },
      { pressed: input.pressed.special, kind: input.down ? 'special2' : 'special1' },
      { pressed: input.pressed.heavy, kind: 'heavy' },
      { pressed: input.pressed.heavykick, kind: 'heavykick' },
      { pressed: input.pressed.light, kind: 'light' },
      { pressed: input.pressed.lightkick, kind: 'lightkick' },
    ];
    for (const o of order) {
      if (!o.pressed) continue;
      const def = atk[o.kind];
      if (this.airborne && !def.air) continue;
      if (o.kind === 'ultimate' && !canUseUltimate(this.meter)) continue;
      if ((o.kind === 'special1' || o.kind === 'special2') &&
        !canUseSpecial({ meter: this.meter, cooldownRemaining: this.cooldowns[o.kind], meterCost: def.meterCost })) continue;
      this.startAttack(def);
      return true;
    }
    return false;
  }

  startAttack(def: AttackDef): void {
    this.faceOpponent();
    const state: FighterState = def.kind === 'ultimate' ? 'ultimate' : def.kind.startsWith('special') ? 'special' : 'attack';
    this.setState(state);
    this.attack = def;
    this.attackFrame = 0;
    this.attackHasHit = false;
    this.attackAirborne = this.airborne;
    if (this.grounded) this.vx = 0;
    if (def.meterCost > 0) this.meter = addMeter(this.meter, -def.meterCost);
    if (def.cooldown > 0) this.cooldowns[def.kind] = attackCooldownTotal(def);
    this.behavior.onAttackStart(this, def);
    if (def.kind === 'light' || def.kind === 'lightkick' || def.kind === 'heavy' || def.kind === 'heavykick') {
      this.events.sound('whoosh');
    }
  }

  private updateAttack(input: InputState): void {
    const a = this.attack;
    if (!a) {
      this.setState('idle');
      return;
    }
    if (this.grounded && this.attackFrame < a.startup && a.forwardStep > 0) {
      this.vx = a.forwardStep * this.facing;
    } else if (this.grounded) {
      this.vx *= 0.7;
    }
    this.behavior.onAttackFrame(this, a, this.attackFrame);
    this.attackFrame++;
    const total = a.startup + a.active + a.recovery;
    if (this.attackFrame >= total) {
      this.setState(input.down && this.grounded ? 'crouch' : this.grounded ? 'idle' : 'jump');
    }
  }

  private updateHitstun(): void {
    this.stun--;
    this.vx *= KNOCKBACK_FRICTION;
    if (this.stun <= 0) this.setState('idle');
  }

  private updateKnockdown(): void {
    if (!this.grounded) return;
    this.vx *= 0.8;
    this.knockdownLying++;
    if (this.knockdownLying >= LYING_FRAMES) {
      if (this.dead || this.hp <= 0) {
        this.setState('defeat');
        return;
      }
      this.setState('getup');
      this.invuln = GETUP_INVULN;
    }
  }

  private applyPhysics(): void {
    this.x += this.vx;
    if (!this.grounded) {
      this.vy = Math.min(MAX_FALL_SPEED, this.vy + GRAVITY * (this.state === 'knockdown' ? 0.9 : 1));
      this.y += this.vy;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.grounded = true;
        this.onLand();
      }
    }
    const minX = ARENA_MARGIN;
    const maxX = ARENA_WIDTH - ARENA_MARGIN;
    if (this.x < minX) {
      this.x = minX;
      if (this.vx < 0) this.vx = 0;
    }
    if (this.x > maxX) {
      this.x = maxX;
      if (this.vx > 0) this.vx = 0;
    }
  }

  private onLand(): void {
    this.events.sound('land');
    if (this.state === 'knockdown') {
      this.knockdownLying = 0;
      this.vx *= 0.3;
      this.events.effect({ kind: 'dust', x: this.x, y: this.y, facing: this.facing, data: { big: true } });
      return;
    }
    if (this.state === 'jump' || this.isAttacking()) {
      this.setState('idle');
      this.vx = 0;
      this.events.effect({ kind: 'dust', x: this.x, y: this.y, facing: this.facing });
    }
  }

  /* ----------------------------- recibir golpes ----------------------------- */

  /**
   * Aplica un impacto ya resuelto. `pushDir` es la dirección en la que sale despedido.
   */
  takeHit(result: HitResult, pushDir: Facing, hitstop: number): void {
    this.hp = applyDamage(this.hp, result.damage);
    this.damageTaken += result.damage;
    this.meter = addMeter(this.meter, result.blocked ? 1 : 3);
    this.hitstop = hitstop;
    if (this.isAttacking() && this.attack) this.behavior.onAttackEnd(this, this.attack);
    if (result.blocked) {
      this.setState('block');
      this.stun = result.hitstun;
      this.vx = result.knockback * pushDir;
      return;
    }
    if (this.hp <= 0) {
      this.dead = true;
      this.setState('knockdown');
      this.grounded = false;
      this.vy = Math.min(-4, result.launch || -4);
      this.vx = Math.max(2.5, result.knockback) * pushDir;
      this.y -= 1;
      return;
    }
    if (result.knockdown || this.airborne) {
      this.setState('knockdown');
      this.grounded = false;
      this.vy = result.launch !== 0 ? result.launch : -3.5;
      this.vx = result.knockback * pushDir;
      this.y -= 1;
      return;
    }
    this.setState('hitstun');
    this.stun = result.hitstun;
    this.vx = result.knockback * pushDir;
  }

  /* ----------------------------- animación ----------------------------- */

  private updateAnim(): void {
    const f = this.stateFrame;
    switch (this.state) {
      case 'idle':
        this.anim = 'idle';
        this.animFrame = Math.floor(f / 10) % 4;
        break;
      case 'walk':
        this.anim = 'walk';
        this.animFrame = Math.floor(f / 6) % 6;
        break;
      case 'crouch':
        this.anim = 'crouch';
        this.animFrame = 0;
        break;
      case 'block':
        this.anim = this.anim === 'crouchblock' ? 'crouchblock' : 'block';
        this.animFrame = 0;
        break;
      case 'jump':
        this.anim = 'jump';
        this.animFrame = this.vy < -1 ? 0 : 1;
        break;
      case 'attack':
      case 'special':
      case 'ultimate': {
        const a = this.attack!;
        let name = a.kind as string;
        if (this.attackAirborne && (a.kind === 'light' || a.kind === 'heavy')) name = 'airlight';
        if (this.attackAirborne && (a.kind === 'lightkick' || a.kind === 'heavykick')) name = 'airkick';
        this.anim = name;
        this.animFrame = this.attackFrame < a.startup ? 0 : this.attackFrame < a.startup + a.active ? 1 : 2;
        break;
      }
      case 'hitstun':
        this.anim = 'hit';
        this.animFrame = this.stun > 8 ? 1 : 0;
        break;
      case 'knockdown':
        this.anim = 'knockdown';
        this.animFrame = this.grounded ? 1 : 0;
        break;
      case 'getup':
        this.anim = 'getup';
        this.animFrame = 0;
        break;
      case 'cinematic':
        this.anim = this.anim === 'ultimate' ? 'ultimate' : 'hit';
        break;
      case 'victory':
        this.anim = 'victory';
        this.animFrame = Math.floor(f / 14) % 2;
        break;
      case 'defeat':
        this.anim = 'knockdown';
        this.animFrame = 1;
        break;
    }
  }
}
