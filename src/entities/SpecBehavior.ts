import type { AttackDef, SpecialSpec, WorldBox } from '../combat/CombatTypes';
import { ARENA_MARGIN, ARENA_WIDTH, GROUND_Y } from '../config/game-config';
import type { Fighter, FighterBehavior } from './Fighter';

/**
 * Comportamiento genérico de habilidades dirigido por datos (SpecialSpec).
 *  - strike: golpe con efecto visual (látigo, zarpazo, grito...).
 *  - projectile: crea un proyectil con el efecto indicado.
 *  - eruption: hitbox y efecto bajo la posición del rival al iniciar.
 *  - teleport: desvanecimiento, invulnerabilidad y reposicionamiento.
 * El definitivo solo anuncia su inicio; la cinemática la ejecuta la escena.
 */
export class SpecBehavior implements FighterBehavior {
  private spec(f: Fighter, attack: AttackDef): SpecialSpec | null {
    if (attack.kind === 'special1') return f.stats.special1;
    if (attack.kind === 'special2') return f.stats.special2;
    return null;
  }

  onAttackStart(f: Fighter, attack: AttackDef): void {
    if (attack.kind === 'ultimate') {
      f.events.power?.(f.stats.ultimateSpec.sound, 'cast');
      f.events.effect({ kind: 'particles', x: f.x, y: f.y - 30, facing: f.facing, data: { count: 24, particle: f.stats.ultimateSpec.particle } });
      return;
    }
    const s = this.spec(f, attack);
    if (!s) return;
    switch (s.type) {
      case 'eruption': {
        const ox = f.opponent ? f.opponent.x : f.x + f.facing * 60;
        f.scratch.targetX = Math.max(30, Math.min(ARENA_WIDTH - 30, ox));
        f.events.power?.(s.sound, 'cast');
        break;
      }
      case 'teleport':
        f.scratch.dir = f.opponent ? (f.opponent.x > f.x ? 1 : -1) : f.facing;
        f.events.power?.(s.sound, 'cast');
        f.events.effect({ kind: 'puff', x: f.x, y: f.y, facing: f.facing, data: { fx: s.fx, tint: s.tint } });
        break;
      case 'strike':
      case 'projectile':
        f.events.power?.(s.sound, 'cast');
        break;
    }
    if (s.particle !== 'none' && s.type !== 'projectile') {
      f.events.effect({ kind: 'particles', x: f.x, y: f.y - 36, facing: f.facing, data: { count: 8, particle: s.particle } });
    }
  }

  onAttackFrame(f: Fighter, attack: AttackDef, frame: number): void {
    if (attack.kind === 'ultimate') {
      if (frame === attack.startup - 2) {
        f.events.effect({ kind: 'ultwind', x: f.x + f.facing * 40, y: f.y - 28, facing: f.facing, data: { style: f.stats.ultimateSpec.style, tint: f.stats.ultimateSpec.tint } });
        f.events.power?.(f.stats.ultimateSpec.sound, 'release');
      }
      return;
    }
    const s = this.spec(f, attack);
    if (!s) return;
    switch (s.type) {
      case 'strike':
        if (frame === attack.startup - 2) {
          const hb = attack.hitbox;
          const cx = hb ? hb.x + hb.w / 2 : 30;
          const cy = hb ? hb.y + hb.h / 2 : -30;
          f.events.effect({ kind: 'strikefx', x: f.x + f.facing * cx, y: f.y + cy, facing: f.facing, data: { fx: s.fx, tint: s.tint, w: hb ? hb.w : 40 } });
          f.events.power?.(s.sound, 'release');
        }
        break;
      case 'projectile':
        if (frame === attack.startup) {
          f.events.power?.(s.sound, 'release');
          f.events.projectile({
            x: f.x + f.facing * 22,
            y: f.y + (s.offsetY ?? 0),
            vx: (s.speed ?? 3) * f.facing,
            facing: f.facing,
            owner: f.slot,
            attack,
            hitbox: { x: -14, y: -14 + Math.min(0, (s.offsetY ?? 0) === 0 ? -12 : 0), w: 28, h: 26 },
            kind: s.fx,
            life: s.life ?? 140,
          });
          if (s.particle !== 'none') {
            f.events.effect({ kind: 'particles', x: f.x + f.facing * 20, y: f.y - 20, facing: f.facing, data: { count: 8, particle: s.particle } });
          }
        }
        break;
      case 'eruption':
        if (frame === 6) f.events.effect({ kind: 'warning', x: f.scratch.targetX, y: GROUND_Y, facing: f.facing, data: { tint: s.tint } });
        if (frame === attack.startup - 3) {
          f.events.effect({ kind: 'eruption', x: f.scratch.targetX, y: GROUND_Y, facing: f.facing, data: { fx: s.fx, tint: s.tint, particle: s.particle } });
          f.events.power?.(s.sound, 'release');
          f.events.effect({ kind: 'shake', x: 0, y: 0, facing: 1, data: { power: 3 } });
        }
        break;
      case 'teleport': {
        if (frame === attack.startup) {
          f.invuln = attack.active + 2;
          f.alpha = 0.25;
        }
        if (frame === attack.startup + Math.floor(attack.active / 2)) {
          const opp = f.opponent;
          const dir = f.scratch.dir;
          let target = f.x + dir * (s.distance ?? 110);
          if (opp && Math.abs(opp.x - f.x) < 150) target = opp.x + dir * 48;
          f.x = Math.max(ARENA_MARGIN + 4, Math.min(ARENA_WIDTH - ARENA_MARGIN - 4, target));
          f.events.effect({ kind: 'puff', x: f.x, y: f.y, facing: f.facing, data: { fx: s.fx, tint: s.tint } });
          f.events.power?.(s.sound, 'release');
          if (opp) f.facing = opp.x >= f.x ? 1 : -1;
        }
        if (frame === attack.startup + attack.active) f.alpha = 1;
        break;
      }
    }
  }

  onAttackEnd(f: Fighter, attack: AttackDef): void {
    const s = this.spec(f, attack);
    if (s?.type === 'teleport') {
      // Si el teletransporte se interrumpe (p. ej. aterrizar en pleno salto) no debe quedar invulnerable.
      f.alpha = 1;
      f.invuln = 0;
    }
  }

  hitboxOverride(f: Fighter, attack: AttackDef): WorldBox | null {
    const s = this.spec(f, attack);
    if (!s || s.type !== 'eruption' || !attack.hitbox) return null;
    const b = attack.hitbox;
    const x = f.scratch.targetX;
    return { left: x + b.x, top: GROUND_Y + b.y, right: x + b.x + b.w, bottom: GROUND_Y + b.y + b.h };
  }
}
