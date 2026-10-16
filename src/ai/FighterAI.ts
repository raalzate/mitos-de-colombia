import type { Difficulty, InputState, SpecialType } from '../combat/CombatTypes';
import { canUseUltimate } from '../combat/CombatRules';
import type { Fighter } from '../entities/Fighter';

/**
 * Oponente controlado por el navegador. No lee entradas futuras del jugador:
 * observa el estado del rival con retraso (memoria de percepción) y decide
 * intenciones de duración variable. Devuelve un InputState como un jugador más.
 * Elige habilidades según su tipo (proyectil, golpe, erupción, teletransporte).
 */

interface AiParams {
  reactionDelay: number;
  thinkInterval: number;
  thinkJitter: number;
  aggression: number;
  blockChance: number;
  specialChance: number;
  jumpChance: number;
  antiAir: number;
  punishChance: number;
  mistakeChance: number;
}

const PARAMS: Record<Difficulty, AiParams> = {
  easy: { reactionDelay: 20, thinkInterval: 22, thinkJitter: 10, aggression: 0.32, blockChance: 0.2, specialChance: 0.15, jumpChance: 0.12, antiAir: 0.15, punishChance: 0.2, mistakeChance: 0.25 },
  normal: { reactionDelay: 11, thinkInterval: 13, thinkJitter: 6, aggression: 0.5, blockChance: 0.5, specialChance: 0.3, jumpChance: 0.15, antiAir: 0.45, punishChance: 0.5, mistakeChance: 0.1 },
  hard: { reactionDelay: 5, thinkInterval: 7, thinkJitter: 3, aggression: 0.66, blockChance: 0.8, specialChance: 0.42, jumpChance: 0.15, antiAir: 0.8, punishChance: 0.85, mistakeChance: 0.03 },
};

type Intent =
  | 'wait' | 'approach' | 'retreat' | 'crouch' | 'block'
  | 'light' | 'heavy' | 'lightkick' | 'heavykick'
  | 'special1' | 'special2' | 'ultimate' | 'jumpForward' | 'jumpBack' | 'jumpNeutral' | 'jumpAttack';

interface Perception {
  dist: number;
  oppAttacking: boolean;
  oppAirborne: boolean;
  oppKnocked: boolean;
  oppBlocking: boolean;
  oppRecovering: boolean;
}

function mkInput(): InputState {
  return {
    left: false, right: false, up: false, down: false, block: false,
    light: false, heavy: false, lightkick: false, heavykick: false, special: false, ultimate: false,
    pressed: { up: false, light: false, heavy: false, lightkick: false, heavykick: false, special: false, ultimate: false },
  };
}

/** Alcance aproximado de una habilidad según su tipo y hitbox. */
function reach(type: SpecialType, hitboxW: number | null): number {
  switch (type) {
    case 'projectile': return 400;
    case 'eruption': return 300;
    case 'teleport': return 999;
    case 'strike': return (hitboxW ?? 40) + 20;
  }
}

export class FighterAI {
  private params: AiParams;
  private history: Perception[] = [];
  private intent: Intent = 'wait';
  private intentFrames = 0;
  private intentAge = 0;
  private nextThink = 0;
  private frame = 0;
  private rng: () => number;

  constructor(private me: Fighter, private opp: Fighter, difficulty: Difficulty, rng: () => number = Math.random) {
    this.params = PARAMS[difficulty];
    this.rng = rng;
  }

  setDifficulty(d: Difficulty): void {
    this.params = PARAMS[d];
  }

  private perceiveNow(): Perception {
    const o = this.opp;
    return {
      dist: Math.abs(o.x - this.me.x),
      oppAttacking: o.isAttacking() && o.attack !== null && o.attackFrame < o.attack.startup + o.attack.active,
      oppAirborne: o.airborne,
      oppKnocked: o.state === 'knockdown' || o.state === 'hitstun' || o.state === 'getup',
      oppBlocking: o.isBlocking(),
      oppRecovering: o.isAttacking() && o.attack !== null && o.attackFrame >= o.attack.startup + o.attack.active,
    };
  }

  private perceive(): Perception {
    const now = this.perceiveNow();
    this.history.push(now);
    const maxLen = this.params.reactionDelay + 1;
    while (this.history.length > maxLen) this.history.shift();
    const delayed = this.history[0];
    return { ...delayed, dist: now.dist };
  }

  private chance(p: number): boolean {
    return this.rng() < p;
  }

  private pick<T>(items: T[]): T {
    return items[Math.floor(this.rng() * items.length)];
  }

  /** Habilidad utilizable a esta distancia, si la hay. */
  private usableSpecial(dist: number, prefer: 'far' | 'mid' | 'close'): Intent | null {
    const me = this.me;
    const opts: { intent: Intent; weight: number }[] = [];
    for (const key of ['special1', 'special2'] as const) {
      if (me.cooldowns[key] > 0) continue;
      const spec = me.stats[key];
      const atk = me.stats.attacks[key];
      const r = reach(spec.type, atk.hitbox ? atk.hitbox.x + atk.hitbox.w : null);
      if (dist > r + 10) continue;
      let w = 1;
      if (prefer === 'far') w = spec.type === 'projectile' ? 3 : spec.type === 'eruption' ? 2 : spec.type === 'teleport' ? 1 : 0.3;
      if (prefer === 'mid') w = spec.type === 'strike' ? 2.5 : spec.type === 'eruption' ? 1.5 : 1;
      if (prefer === 'close') w = spec.type === 'strike' && atk.hitbox && atk.hitbox.x < 12 ? 2 : spec.type === 'teleport' ? 1.5 : 0.5;
      opts.push({ intent: key, weight: w });
    }
    if (!opts.length) return null;
    const total = opts.reduce((a, o) => a + o.weight, 0);
    let roll = this.rng() * total;
    for (const o of opts) {
      roll -= o.weight;
      if (roll <= 0) return o.intent;
    }
    return opts[opts.length - 1].intent;
  }

  private decide(p: Perception): void {
    const P = this.params;
    const me = this.me;
    const ultReady = canUseUltimate(me.meter);
    const close = p.dist < 58;
    const mid = p.dist >= 58 && p.dist < 130;
    const far = p.dist >= 130;
    const atWall = me.x < 40 || me.x > 520;

    if (p.oppAttacking && p.dist < 110 && !p.oppAirborne) {
      if (this.chance(P.blockChance)) return this.set('block', 14 + Math.floor(this.rng() * 10));
      if (this.chance(0.25)) return this.set(atWall ? 'jumpBack' : 'retreat', 12);
    }
    if (p.oppAirborne && p.dist < 90 && this.chance(P.antiAir)) {
      return this.set(this.chance(0.5) ? 'heavy' : 'heavykick', 6);
    }
    if (p.oppRecovering && close && this.chance(P.punishChance)) {
      return this.set(this.pick(['heavy', 'heavykick', 'light']), 6);
    }
    if (ultReady && p.dist < 80 && !p.oppKnocked && this.chance(0.55)) return this.set('ultimate', 6);
    if (this.chance(P.mistakeChance)) return this.set(this.pick(['wait', 'crouch', 'retreat']), 10 + Math.floor(this.rng() * 10));

    if (p.oppKnocked) {
      if (p.dist > 70) return this.set('approach', 14);
      return this.set(this.chance(0.5) ? 'wait' : 'retreat', 10);
    }

    if (far) {
      const sp = this.usableSpecial(p.dist, 'far');
      if (sp && this.chance(P.specialChance + 0.25)) return this.set(sp, 6);
      if (this.chance(P.jumpChance)) return this.set('jumpForward', 6);
      return this.set('approach', 16 + Math.floor(this.rng() * 14));
    }
    if (mid) {
      const sp = this.usableSpecial(p.dist, 'mid');
      if (sp && this.chance(P.specialChance + 0.15)) return this.set(sp, 6);
      if (this.chance(P.jumpChance)) return this.set(this.chance(0.6) ? 'jumpAttack' : 'jumpForward', 6);
      if (this.chance(P.aggression)) return this.set('approach', 10 + Math.floor(this.rng() * 10));
      return this.set(this.pick(['wait', 'approach', 'crouch', 'retreat']), 8 + Math.floor(this.rng() * 10));
    }
    if (p.oppBlocking && this.chance(0.3)) {
      const sp = this.usableSpecial(p.dist, 'close');
      if (sp) return this.set(sp, 6);
      return this.set(this.pick(['heavykick', 'retreat', 'lightkick']), 8);
    }
    if (this.chance(P.aggression + 0.15)) {
      return this.set(this.pick(['light', 'light', 'lightkick', 'heavy', 'heavykick']), 6);
    }
    if (this.chance(0.3)) return this.set('block', 10);
    return this.set(this.pick([atWall ? 'jumpForward' : 'retreat', 'wait', 'crouch']), 8 + Math.floor(this.rng() * 8));
  }

  private set(intent: Intent, frames: number): void {
    this.intent = intent;
    this.intentFrames = frames;
    this.intentAge = 0;
  }

  update(): InputState {
    this.frame++;
    const input = mkInput();
    const p = this.perceive();
    const me = this.me;
    const forward = me.facing === 1 ? 'right' : 'left';
    const back = me.facing === 1 ? 'left' : 'right';

    if (this.frame >= this.nextThink || this.intentFrames <= 0) {
      this.decide(p);
      this.nextThink = this.frame + this.params.thinkInterval + Math.floor(this.rng() * this.params.thinkJitter);
    }
    this.intentFrames--;
    const first = this.intentAge === 0;
    this.intentAge++;

    switch (this.intent) {
      case 'wait':
        break;
      case 'approach':
        input[forward] = true;
        break;
      case 'retreat':
        input[back] = true;
        break;
      case 'crouch':
        input.down = true;
        break;
      case 'block':
        input.block = true;
        if (this.chance(0.3)) input.down = true;
        break;
      case 'light':
      case 'heavy':
      case 'lightkick':
      case 'heavykick':
        if (first) {
          input.pressed[this.intent] = true;
          input[this.intent] = true;
        }
        break;
      case 'special1':
        if (first) {
          input.pressed.special = true;
          input.special = true;
        }
        break;
      case 'special2':
        input.down = true;
        if (first) {
          input.pressed.special = true;
          input.special = true;
        }
        break;
      case 'ultimate':
        if (first) {
          input.pressed.ultimate = true;
          input.ultimate = true;
        }
        break;
      case 'jumpForward':
        input[forward] = true;
        if (first) input.pressed.up = true;
        break;
      case 'jumpBack':
        input[back] = true;
        if (first) input.pressed.up = true;
        break;
      case 'jumpNeutral':
        if (first) input.pressed.up = true;
        break;
      case 'jumpAttack':
        input[forward] = true;
        if (first) input.pressed.up = true;
        if (me.airborne && me.vy > -1 && p.dist < 70) {
          input.pressed.lightkick = true;
          input.lightkick = true;
        }
        break;
    }
    if (first && !me.canAct() && this.intent !== 'wait') this.intentFrames = 2;
    return input;
  }
}
