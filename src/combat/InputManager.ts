import type { InputState, PlayerSlot } from './CombatTypes';

export type Action =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'block'
  | 'light'
  | 'heavy'
  | 'lightkick'
  | 'heavykick'
  | 'special'
  | 'ultimate';

export const ACTIONS: Action[] = [
  'left', 'right', 'up', 'down', 'block',
  'light', 'heavy', 'lightkick', 'heavykick', 'special', 'ultimate',
];

export type KeyMap = Record<Action, string[]>;

/** Mapas por defecto. Se usan `event.code` para independencia de la distribución del teclado. */
export const DEFAULT_KEYMAPS: Record<PlayerSlot, KeyMap> = {
  // Controles para niños: flechas para moverse y solo dos botones, GOLPE (Z o ESPACIO) y PATADA (X).
  // Lo fuerte, los poderes y el definitivo salen por combinaciones (ver TwoButton.ts).
  1: {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    light: ['KeyZ', 'Space'],
    lightkick: ['KeyX'],
    heavy: [],
    heavykick: [],
    special: [],
    ultimate: [],
    block: [],
  },
  // Sin uso por teclado (el rival es la CPU); se deja en el teclado numérico para no chocar con P1.
  2: {
    left: ['Numpad4'],
    right: ['Numpad6'],
    up: ['Numpad8'],
    down: ['Numpad5'],
    light: ['Numpad1'],
    lightkick: ['Numpad2'],
    heavy: [],
    heavykick: [],
    special: [],
    ultimate: [],
    block: [],
  },
};

/** Botones estándar de Gamepad API (disposición tipo "standard"). */
const GAMEPAD_BUTTONS: Partial<Record<Action, number[]>> = {
  light: [2, 3, 5, 7],     // X / Y / RB / RT: golpe
  lightkick: [0, 1, 4, 6], // A / B / LB / LT: patada
  heavy: [],
  heavykick: [],
  special: [],
  ultimate: [],
  block: [],               // bloquear = echarse para atrás mientras el rival ataca
  up: [12],
  down: [13],
  left: [14],
  right: [15],
};

const BUFFER_FRAMES = 6;
const PRESSED_ACTIONS: (keyof InputState['pressed'] & Action)[] = [
  'up', 'light', 'heavy', 'lightkick', 'heavykick', 'special', 'ultimate',
];

interface SlotState {
  down: Record<Action, boolean>;
  prevDown: Record<Action, boolean>;
  pressedAt: Record<Action, number>;
  consumed: Record<Action, boolean>;
}

function emptyRecord<T>(value: T): Record<Action, T> {
  const r = {} as Record<Action, T>;
  for (const a of ACTIONS) r[a] = value;
  return r;
}

/**
 * Entrada continua con buffer de pulsaciones. Soporta teclado (dos jugadores) y mandos.
 * Se alimenta de keydown/keyup globales y limpia todo al perder el foco.
 */
export class InputManager {
  private keyDown = new Set<string>();
  /** Teclas pulsadas desde el último update (captura toques más cortos que un frame). */
  private tapped = new Set<string>();
  private lastTapped = new Set<string>();
  private slots: Record<PlayerSlot, SlotState>;
  private frame = 0;
  private keymaps: Record<PlayerSlot, KeyMap>;
  private gamepadIndex: Record<PlayerSlot, number | null> = { 1: null, 2: null };
  private listening = false;
  private gamepadEnabled: Record<PlayerSlot, boolean> = { 1: true, 2: true };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    this.keyDown.add(e.code);
    this.tapped.add(e.code);
    if (this.isGameKey(e.code) || e.code === 'Space') e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keyDown.delete(e.code);
  };
  private onBlur = () => this.clearAll();

  constructor(keymaps: Record<PlayerSlot, KeyMap> = DEFAULT_KEYMAPS) {
    this.keymaps = keymaps;
    this.slots = { 1: this.newSlot(), 2: this.newSlot() };
  }

  private newSlot(): SlotState {
    return {
      down: emptyRecord(false),
      prevDown: emptyRecord(false),
      pressedAt: emptyRecord(-1000),
      consumed: emptyRecord(false),
    };
  }

  attach(target: Window = window): void {
    if (this.listening) return;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
    this.listening = true;
  }

  detach(target: Window = window): void {
    if (!this.listening) return;
    target.removeEventListener('keydown', this.onKeyDown);
    target.removeEventListener('keyup', this.onKeyUp);
    target.removeEventListener('blur', this.onBlur);
    this.listening = false;
  }

  /** Permite desactivar el mando de un jugador (por ejemplo, el controlado por la IA). */
  setGamepadEnabled(slot: PlayerSlot, enabled: boolean): void {
    this.gamepadEnabled[slot] = enabled;
  }

  isGameKey(code: string): boolean {
    for (const slot of [1, 2] as PlayerSlot[]) {
      for (const a of ACTIONS) if (this.keymaps[slot][a].includes(code)) return true;
    }
    return false;
  }

  /** Inyección directa de tecla (pruebas o entrada simulada). */
  setKey(code: string, down: boolean): void {
    if (down) {
      this.keyDown.add(code);
      this.tapped.add(code);
    } else this.keyDown.delete(code);
  }

  private isDown(code: string): boolean {
    return this.keyDown.has(code) || this.lastTapped.has(code);
  }

  /** Teclas físicamente pulsadas ahora mismo (para que un menú nuevo ignore teclas heredadas). */
  heldKeys(): Set<string> {
    return new Set([...this.keyDown, ...this.lastTapped, ...this.tapped]);
  }

  isRawKeyDown(code: string): boolean {
    return this.keyDown.has(code);
  }

  clearAll(): void {
    this.keyDown.clear();
    this.tapped.clear();
    this.lastTapped.clear();
    for (const slot of [1, 2] as PlayerSlot[]) {
      const s = this.slots[slot];
      for (const a of ACTIONS) {
        s.down[a] = false;
        s.prevDown[a] = false;
        s.consumed[a] = true;
      }
    }
  }

  /** Debe llamarse una vez por frame lógico antes de leer el estado. */
  update(): void {
    this.frame++;
    this.lastTapped = this.tapped;
    this.tapped = new Set();
    this.pollGamepads();
    for (const slot of [1, 2] as PlayerSlot[]) {
      const s = this.slots[slot];
      const map = this.keymaps[slot];
      const pad = this.getPad(slot);
      for (const a of ACTIONS) {
        s.prevDown[a] = s.down[a];
        let down = map[a].some((code) => this.isDown(code));
        if (pad) down = down || this.padAction(pad, a);
        s.down[a] = down;
        if (down && !s.prevDown[a]) {
          s.pressedAt[a] = this.frame;
          s.consumed[a] = false;
        }
      }
    }
  }

  private pollGamepads(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    let pads: (Gamepad | null)[] = [];
    try {
      pads = Array.from(navigator.getGamepads());
    } catch {
      return;
    }
    const connected = pads.filter((p): p is Gamepad => !!p && p.connected);
    // Asignación simple: primer mando → P1, segundo → P2 (si están habilitados).
    const order: PlayerSlot[] = [1, 2];
    let i = 0;
    for (const slot of order) {
      if (!this.gamepadEnabled[slot]) {
        this.gamepadIndex[slot] = null;
        continue;
      }
      this.gamepadIndex[slot] = connected[i] ? connected[i].index : null;
      i++;
    }
  }

  private getPad(slot: PlayerSlot): Gamepad | null {
    const idx = this.gamepadIndex[slot];
    if (idx === null || typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    try {
      return navigator.getGamepads()[idx] ?? null;
    } catch {
      return null;
    }
  }

  private padAction(pad: Gamepad, a: Action): boolean {
    const buttons = GAMEPAD_BUTTONS[a] ?? [];
    for (const b of buttons) if (pad.buttons[b]?.pressed) return true;
    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    if (a === 'left' && ax < -0.5) return true;
    if (a === 'right' && ax > 0.5) return true;
    if (a === 'up' && ay < -0.5) return true;
    if (a === 'down' && ay > 0.5) return true;
    if (a === 'block' && pad.buttons[8]?.pressed) return true;
    return false;
  }

  private isBuffered(slot: PlayerSlot, a: Action): boolean {
    const s = this.slots[slot];
    return !s.consumed[a] && this.frame - s.pressedAt[a] <= BUFFER_FRAMES;
  }

  /** Marca una pulsación como usada para que no dispare dos acciones. */
  consume(slot: PlayerSlot, a: Action): void {
    this.slots[slot].consumed[a] = true;
  }

  snapshot(slot: PlayerSlot): InputState {
    const s = this.slots[slot];
    const pressed = {} as InputState['pressed'];
    for (const a of PRESSED_ACTIONS) pressed[a] = this.isBuffered(slot, a);
    return {
      left: s.down.left,
      right: s.down.right,
      up: s.down.up,
      down: s.down.down,
      block: s.down.block,
      light: s.down.light,
      heavy: s.down.heavy,
      lightkick: s.down.lightkick,
      heavykick: s.down.heavykick,
      special: s.down.special,
      ultimate: s.down.ultimate,
      pressed,
    };
  }

  /** Pulsación "nueva" de una tecla cruda (menús). */
  justPressedRaw(code: string, memory: Set<string>): boolean {
    const down = this.isDown(code);
    if (down && !memory.has(code)) {
      memory.add(code);
      return true;
    }
    if (!down) memory.delete(code);
    return false;
  }
}
