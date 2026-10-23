import type { InputState } from './CombatTypes';

/**
 * Controles para niños: solo dos botones, GOLPE (A) y PATADA (B). Los ataques fuertes,
 * los poderes y el definitivo salen solos por combinación, por tiempo o por patrones:
 *
 * - A / B solos: golpe / patada.
 * - Tres seguidos del mismo (A A A, B B B): el tercero sale fuerte.
 * - Patrones: A B A → poder 1, B A B → poder 2.
 * - Mantener A y soltar → poder 1. Mantener B y soltar → poder 2.
 * - A + B juntos: con la barra llena, el definitivo; si no, golpe fuerte.
 *
 * Puro: no depende de Phaser, se prueba en Node.
 */

export type Intent = 'light' | 'lightkick' | 'heavy' | 'heavykick' | 'special1' | 'special2' | 'ultimate';
type Btn = 'a' | 'b';

/** fotogramas para considerar dos botones "juntos" */
export const SIMUL_FRAMES = 3;
/** máximo entre toques para que cuenten como seguidos */
export const CHAIN_FRAMES = 24;
/** fotogramas manteniendo el botón para cargar el poder */
export const CHARGE_FRAMES = 26;
/** cuánto espera una intención a que el luchador pueda atacar */
export const QUEUE_FRAMES = 12;

const PATTERNS: [string, Intent][] = [
  ['aaa', 'heavy'],
  ['bbb', 'heavykick'],
  ['aba', 'special1'],
  ['bab', 'special2'],
];

export class TwoButtonReader {
  private frame = 0;
  private prev = { a: false, b: false };
  private held = { a: 0, b: 0 };
  /** el botón ya se usó en una combinación: soltarlo no dispara el poder cargado */
  private spent = { a: false, b: false };
  private pending: { btn: Btn; frame: number } | null = null;
  private history: { btn: Btn; frame: number }[] = [];
  private queued: { intent: Intent; age: number } | null = null;

  /** 0..1 mientras se carga un poder (para el brillo del luchador) */
  charge = 0;

  reset(): void {
    this.prev = { a: false, b: false };
    this.held = { a: 0, b: 0 };
    this.spent = { a: false, b: false };
    this.pending = null;
    this.history = [];
    this.queued = null;
    this.charge = 0;
  }

  /** Lee los dos botones de este fotograma y devuelve la intención lista para atacar (o null). */
  update(a: boolean, b: boolean, meterFull: boolean): Intent | null {
    this.frame++;
    const press = { a: a && !this.prev.a, b: b && !this.prev.b };
    const release = { a: !a && this.prev.a, b: !b && this.prev.b };
    let out: Intent | null = null;

    const together = (press.a && press.b)
      || (press.a && this.pending?.btn === 'b')
      || (press.b && this.pending?.btn === 'a');
    if (together) {
      out = meterFull ? 'ultimate' : 'heavy';
      this.pending = null;
      this.history = [];
      this.spent = { a: true, b: true };
    } else {
      for (const k of ['a', 'b'] as const) {
        if (!press[k]) continue;
        if (this.pending) out = this.tap(this.pending.btn);
        this.pending = { btn: k, frame: this.frame };
        this.spent[k] = false;
      }
    }
    if (this.pending && this.frame - this.pending.frame >= SIMUL_FRAMES) {
      out = this.tap(this.pending.btn);
      this.pending = null;
    }
    for (const k of ['a', 'b'] as const) {
      if (release[k] && this.held[k] >= CHARGE_FRAMES && !this.spent[k]) {
        out = k === 'a' ? 'special1' : 'special2';
        this.history = [];
      }
      this.held[k] = (k === 'a' ? a : b) ? this.held[k] + 1 : 0;
      if (release[k]) this.spent[k] = false;
    }
    this.charge = Math.min(1, Math.max(this.spent.a ? 0 : this.held.a, this.spent.b ? 0 : this.held.b) / CHARGE_FRAMES);
    this.prev = { a, b };

    if (out) this.queued = { intent: out, age: 0 };
    else if (this.queued && ++this.queued.age > QUEUE_FRAMES) this.queued = null;
    return this.queued?.intent ?? null;
  }

  /** El luchador ya empezó el ataque: la intención se gastó. */
  consume(): void {
    this.queued = null;
  }

  private tap(btn: Btn): Intent {
    const last = this.history[this.history.length - 1];
    if (last && this.frame - last.frame > CHAIN_FRAMES) this.history = [];
    this.history.push({ btn, frame: this.frame });
    const seq = this.history.slice(-3).map((t) => t.btn).join('');
    const hit = PATTERNS.find(([p]) => p === seq);
    if (hit) {
      this.history = [];
      return hit[1];
    }
    return btn === 'a' ? 'light' : 'lightkick';
  }
}

/**
 * Convierte la intención en la entrada que entiende el luchador. Bloquear es automático:
 * echarse para atrás mientras el rival ataca.
 */
export function toInput(base: InputState, intent: Intent | null, back: boolean, threatened: boolean): InputState {
  const pressed = { up: base.pressed.up, light: false, heavy: false, lightkick: false, heavykick: false, special: false, special2: false, ultimate: false };
  if (intent === 'special2') pressed.special2 = true;
  else if (intent === 'special1') pressed.special = true;
  else if (intent) pressed[intent] = true;
  return {
    ...base,
    light: false, heavy: false, lightkick: false, heavykick: false, special: false, ultimate: false,
    block: back && threatened,
    pressed,
  };
}
