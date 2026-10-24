import type { InputManager } from '../combat/InputManager';

/** Alto mínimo (px CSS) que se reserva debajo del juego para los controles en vertical. */
const PORTRAIT_PAD_HEIGHT = 250;

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('tactil')) return true;
  return window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches);
}

export function touchActive(): boolean {
  return typeof document !== 'undefined' && document.body.classList.contains('tactil');
}

/** Espacio disponible para el lienzo: en vertical se descuenta la franja de controles. */
export function gameArea(): { w: number; h: number; portrait: boolean } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const portrait = touchActive() && h > w;
  return { w, h: portrait ? Math.max(120, h - PORTRAIT_PAD_HEIGHT) : h, portrait };
}

type Dir = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

/** Sectores de 45° empezando en la derecha y girando en sentido horario (y crece hacia abajo). */
const SECTORS: Dir[][] = [
  ['ArrowRight'], ['ArrowRight', 'ArrowDown'], ['ArrowDown'], ['ArrowDown', 'ArrowLeft'],
  ['ArrowLeft'], ['ArrowLeft', 'ArrowUp'], ['ArrowUp'], ['ArrowUp', 'ArrowRight'],
];

const ARROW_CLASS: Record<Dir, string> = { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izq', ArrowRight: 'der' };

const CSS = `
body.tactil { touch-action: none; overscroll-behavior: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
body.tactil #game { position: fixed; top: 0; left: 0; right: 0; }
#tactil { position: fixed; inset: 0; z-index: 10; pointer-events: none; display: none; font: 700 12px/1 ui-monospace, Menlo, monospace; letter-spacing: .04em; color: #f8f0c8; }
body.tactil #tactil { display: block; }
#tactil * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
#tactil .t-btn, #tactil .t-cruz { pointer-events: auto; touch-action: none; }
#tactil .t-btn { position: absolute; display: grid; place-items: center; border: 2px solid #d8b070; background: rgba(16, 12, 24, .62); color: #f8f0c8; border-radius: 50%; padding: 0; font: inherit; }
#tactil .t-btn.activo, #tactil .t-cruz .activo { background: rgba(216, 176, 112, .75); color: #100c18; }
#tactil .t-grande { width: var(--b); height: var(--b); font-size: calc(var(--b) * .34); box-shadow: 0 3px 0 rgba(0,0,0,.45); }
#tactil .t-grande small { display: block; font-size: 9px; margin-top: 2px; opacity: .85; }
#tactil .t-a { background: rgba(160, 32, 44, .72); }
#tactil .t-b { background: rgba(32, 72, 140, .72); }
#tactil .t-ab { width: calc(var(--b) * .62); height: calc(var(--b) * .62); font-size: 11px; }
#tactil .t-pill { border-radius: 999px; height: 30px; min-width: 64px; padding: 0 12px; font-size: 11px; position: static; }
#tactil .t-fila { position: absolute; display: flex; gap: 8px; pointer-events: none; }
#tactil .t-grupo { display: flex; gap: 8px; }
#tactil .t-cruz { position: absolute; width: var(--c); height: var(--c); }
#tactil .t-cruz span { position: absolute; background: rgba(16, 12, 24, .62); border: 2px solid #d8b070; display: grid; place-items: center; font-size: calc(var(--c) * .12); }
#tactil .t-cruz .arriba, #tactil .t-cruz .abajo { left: 33.3%; width: 33.4%; height: 36%; }
#tactil .t-cruz .arriba { top: 0; border-radius: 8px 8px 0 0; border-bottom: 0; }
#tactil .t-cruz .abajo { bottom: 0; border-radius: 0 0 8px 8px; border-top: 0; }
#tactil .t-cruz .izq, #tactil .t-cruz .der { top: 33.3%; height: 33.4%; width: 36%; }
#tactil .t-cruz .izq { left: 0; border-radius: 8px 0 0 8px; border-right: 0; }
#tactil .t-cruz .der { right: 0; border-radius: 0 8px 8px 0; border-left: 0; }
#tactil .t-cruz .centro { left: 33.3%; top: 33.3%; width: 33.4%; height: 33.4%; border: 0; }
#tactil .solo-aventura, #tactil .solo-pelea, #tactil .solo-pantalla { display: none; }
#tactil[data-escena~="AdventureScene"] .solo-aventura { display: grid; }
#tactil[data-escena~="FightScene"] .solo-pelea { display: grid; }
#tactil.con-pantalla .solo-pantalla { display: grid; }

/* Vertical: el juego arriba y los controles en la franja de abajo, como una consola de bolsillo. */
#tactil.vertical { --c: min(44vw, 176px); --b: min(21vw, 84px); }
#tactil.vertical .t-cruz { left: max(16px, env(safe-area-inset-left)); bottom: calc(24px + env(safe-area-inset-bottom)); }
#tactil.vertical .t-a { right: max(16px, env(safe-area-inset-right)); bottom: calc(24px + env(safe-area-inset-bottom) + var(--b) * .7); }
#tactil.vertical .t-b { right: calc(max(16px, env(safe-area-inset-right)) + var(--b) * 1.12); bottom: calc(24px + env(safe-area-inset-bottom)); }
#tactil.vertical .t-ab { right: calc(max(16px, env(safe-area-inset-right)) + var(--b) * .2); bottom: calc(24px + env(safe-area-inset-bottom) - 4px); }
#tactil .t-girar { display: none; position: absolute; left: 0; right: 0; margin: 0; text-align: center; font-size: 11px; color: #9088b0; pointer-events: none; }
#tactil.vertical .t-girar { display: block; bottom: calc(48px + env(safe-area-inset-bottom) + var(--c)); }
#tactil.vertical .t-fila { left: 0; right: 0; justify-content: center; flex-wrap: wrap; row-gap: 8px; top: calc(var(--alto-juego) + 12px); padding: 0 12px; }
#tactil.vertical .t-pill { min-width: 0; padding: 0 10px; }

/* Horizontal: el juego llena la pantalla y los controles quedan encima, semitransparentes. */
#tactil.horizontal { --c: min(34vh, 150px); --b: min(17vh, 72px); }
/* Encima del juego: casi transparentes en reposo para dejar leer los diálogos, sólidos al tocarlos. */
#tactil.horizontal .t-cruz, #tactil.horizontal .t-grande, #tactil.horizontal .t-ab { opacity: .5; transition: opacity .15s; }
#tactil.horizontal .t-cruz.tocando, #tactil.horizontal .t-btn.activo { opacity: .95; }
#tactil.horizontal .t-pill { opacity: .7; }
#tactil.horizontal .t-cruz { left: max(12px, env(safe-area-inset-left)); bottom: 12px; }
#tactil.horizontal .t-a { right: max(12px, env(safe-area-inset-right)); bottom: calc(12px + var(--b) * .7); }
#tactil.horizontal .t-b { right: calc(max(12px, env(safe-area-inset-right)) + var(--b) * 1.12); bottom: 12px; }
#tactil.horizontal .t-ab { right: calc(max(12px, env(safe-area-inset-right)) + var(--b) * .2); bottom: 6px; }
/* Los botones pequeños van a los costados, arriba, para no tapar el reloj ni las barras de vida. */
#tactil.horizontal .t-fila { inset: 8px max(8px, env(safe-area-inset-right)) auto max(8px, env(safe-area-inset-left)); justify-content: space-between; }
#tactil.horizontal .t-grupo { flex-direction: column; align-items: stretch; width: min(var(--margen, 70px), 92px); }
#tactil.horizontal.sobra .t-fila { inset: auto 0 calc(16px + env(safe-area-inset-bottom)) 0; justify-content: center; gap: 8px; }
#tactil.horizontal.sobra .t-grupo { flex-direction: row; width: auto; }
#tactil.horizontal.sobra .t-cruz, #tactil.horizontal.sobra .t-grande, #tactil.horizontal.sobra .t-ab, #tactil.horizontal.sobra .t-pill { opacity: 1; }
#tactil.horizontal .t-pill { height: 26px; min-width: 0; padding: 0 6px; font-size: 10px; }
`;

/**
 * Controles en pantalla para celulares y tabletas. No tienen lógica propia: cada botón pulsa la
 * misma tecla que usaría el teclado, así que menús, aventura y combate funcionan sin cambios.
 */
export class TouchControls {
  private root!: HTMLDivElement;
  private padDirs = new Set<Dir>();
  private padPointer: number | null = null;
  private arms = new Map<Dir, HTMLElement>();
  private onLayout: () => void;

  constructor(private input: InputManager, onLayout: () => void) {
    this.onLayout = onLayout;
  }

  mount(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.id = 'tactil';
    this.root.innerHTML = `
      <div class="t-cruz" aria-label="Cruceta">
        <span class="arriba">▲</span><span class="abajo">▼</span><span class="izq">◀</span><span class="der">▶</span><span class="centro"></span>
      </div>
      <button class="t-btn t-grande t-a" data-keys="Space" aria-label="A: golpe y aceptar">A<small>GOLPE</small></button>
      <button class="t-btn t-grande t-b" data-keys="KeyX" aria-label="B: patada">B<small>PATADA</small></button>
      <button class="t-btn t-ab solo-pelea" data-keys="Space KeyX" aria-label="A y B juntos: definitivo">A+B</button>
      <div class="t-fila">
        <div class="t-grupo">
          <button class="t-btn t-pill" data-keys="Escape">MENÚ</button>
          <button class="t-btn t-pill solo-aventura" data-keys="KeyM">MAPA</button>
          <button class="t-btn t-pill solo-aventura" data-keys="KeyQ">MISIÓN</button>
        </div>
        <div class="t-grupo">
          <button class="t-btn t-pill" data-keys="Enter">START</button>
          <button class="t-btn t-pill solo-pantalla" data-pantalla="1">AMPLIAR</button>
        </div>
      </div>
      <p class="t-girar">Gira el celular para jugar en grande</p>`;
    document.body.appendChild(this.root);

    const cruz = this.root.querySelector<HTMLElement>('.t-cruz')!;
    for (const d of Object.keys(ARROW_CLASS) as Dir[]) this.arms.set(d, cruz.querySelector(`.${ARROW_CLASS[d]}`)!);
    this.bindPad(cruz);
    this.root.querySelectorAll<HTMLButtonElement>('[data-keys]').forEach((b) => this.bindButton(b, b.dataset.keys!.split(' ')));

    const fs = this.root.querySelector<HTMLButtonElement>('[data-pantalla]')!;
    if (document.fullscreenEnabled) this.root.classList.add('con-pantalla');
    fs.addEventListener('click', () => this.toggleFullscreen());

    document.addEventListener('contextmenu', (e) => { if (touchActive()) e.preventDefault(); });
    // Bloquea el gesto de zoom de iOS mientras se juega.
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    if (isTouchDevice()) this.enable();
    else window.addEventListener('touchstart', () => this.enable(), { once: true, passive: true });

    window.setInterval(() => this.syncScene(), 300);
  }

  enable(): void {
    document.body.classList.add('tactil');
    this.layout();
  }

  /** Recalcula orientación y la posición de la fila de botones; luego reajusta el lienzo. */
  layout(): void {
    if (!this.root) return;
    const portrait = window.innerHeight > window.innerWidth;
    this.root.classList.toggle('vertical', portrait);
    this.root.classList.toggle('horizontal', !portrait);
    this.onLayout();
    const canvas = document.querySelector('#game canvas') as HTMLCanvasElement | null;
    const bottom = canvas ? canvas.getBoundingClientRect().bottom : window.innerHeight * 0.5;
    this.root.style.setProperty('--alto-juego', `${Math.round(bottom)}px`);
    // Tabletas en horizontal: si sobra una franja bajo el juego, los controles van ahí y no encima.
    this.root.classList.toggle('sobra', !portrait && window.innerHeight - bottom >= 110);
    const left = canvas ? canvas.getBoundingClientRect().left : 0;
    this.root.style.setProperty('--margen', `${Math.max(54, Math.round(left) - 16)}px`);
  }

  private syncScene(): void {
    const game = window.mitosGame;
    if (!game) return;
    const keys = game.scene.getScenes(true).map((s) => s.scene.key).join(' ');
    if (this.root.dataset.escena !== keys) this.root.dataset.escena = keys;
  }

  private capture(el: HTMLElement, id: number): void {
    try { el.setPointerCapture(id); } catch { /* puntero sintético o ya liberado */ }
  }

  private bindButton(el: HTMLElement, codes: string[]): void {
    let pointer: number | null = null;
    const release = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      el.classList.remove('activo');
      for (const c of codes) this.input.setKey(c, false);
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pointer = e.pointerId;
      this.capture(el, e.pointerId);
      el.classList.add('activo');
      for (const c of codes) this.input.setKey(c, true);
      navigator.vibrate?.(8);
    });
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
  }

  private bindPad(el: HTMLElement): void {
    const move = (e: PointerEvent) => {
      if (e.pointerId !== this.padPointer) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dead = r.width * 0.12;
      let dirs: Dir[] = [];
      if (Math.hypot(dx, dy) > dead) {
        const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
        dirs = SECTORS[(sector + 8) % 8];
      }
      this.setDirs(dirs);
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.padPointer) return;
      this.padPointer = null;
      el.classList.remove('tocando');
      this.setDirs([]);
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.padPointer = e.pointerId;
      el.classList.add('tocando');
      this.capture(el, e.pointerId);
      move(e);
    });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  private setDirs(dirs: Dir[]): void {
    const next = new Set(dirs);
    for (const d of this.padDirs) if (!next.has(d)) this.input.setKey(d, false);
    for (const d of next) if (!this.padDirs.has(d)) {
      this.input.setKey(d, true);
      navigator.vibrate?.(5);
    }
    this.padDirs = next;
    for (const [d, arm] of this.arms) arm.classList.toggle('activo', next.has(d));
  }

  private toggleFullscreen(): void {
    toggleDocumentFullscreen();
  }
}

/**
 * Pantalla completa de todo el documento para que los controles sigan visibles. Debe llamarse
 * dentro de un gesto del usuario; al entrar intenta girar a horizontal (solo Android lo permite).
 */
export function toggleDocumentFullscreen(): void {
  if (!document.fullscreenEnabled) return;
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }
  void document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    orientation.lock?.('landscape').catch(() => undefined);
  }).catch(() => undefined);
}
