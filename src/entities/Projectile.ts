import type { AttackDef, Box, Facing, PlayerSlot, WorldBox } from '../combat/CombatTypes';
import { toWorldBox } from '../combat/HitboxSystem';

let nextProjectileId = 1;

export class Projectile {
  readonly id = nextProjectileId++;
  x: number;
  y: number;
  vx: number;
  facing: Facing;
  owner: PlayerSlot;
  attack: AttackDef;
  hitbox: Box;
  kind: string;
  life: number;
  age = 0;
  hasHit = false;
  dead = false;

  constructor(opts: { x: number; y: number; vx: number; facing: Facing; owner: PlayerSlot; attack: AttackDef; hitbox: Box; kind: string; life: number }) {
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx;
    this.facing = opts.facing;
    this.owner = opts.owner;
    this.attack = opts.attack;
    this.hitbox = opts.hitbox;
    this.kind = opts.kind;
    this.life = opts.life;
  }

  update(): void {
    if (this.dead) return;
    this.x += this.vx;
    this.age++;
    if (this.age >= this.life) this.dead = true;
  }

  worldBox(): WorldBox {
    return toWorldBox(this.hitbox, this.x, this.y, this.facing);
  }
}

export interface ProjectileSpawn {
  x: number;
  y: number;
  vx: number;
  facing: Facing;
  owner: PlayerSlot;
  attack: AttackDef;
  hitbox: Box;
  kind: string;
  life: number;
}
