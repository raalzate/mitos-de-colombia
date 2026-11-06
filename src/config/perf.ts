/**
 * Equipos modestos (celulares): el juego se ve y se juega igual, pero se ahorra lo que más cuesta
 * y menos se nota en una pantalla y un parlante pequeños: la sala de convolución larga (por ecos
 * baratos), el sintetizador a 24 kHz, los adornos y golpes fantasma de la música, la luz con relieve
 * del mapa de noche, el desenfoque del mito que se calma y la mitad de la vida del fondo.
 *
 * Se decide al arrancar (táctil con pantalla pequeña, o un equipo muy justo) y además se
 * vigila el ritmo real: si los primeros segundos de juego van lentos, se baja la calidad sola.
 * `?hq` fuerza la calidad completa y `?lq` la ligera.
 */

export interface DeviceHints {
  cores?: number;
  memoryGb?: number;
  coarsePointer?: boolean;
  /** lado corto de la pantalla en px CSS */
  shortSide?: number;
  query?: string;
}

/** Regla pura (probada en los tests): ¿arranca en calidad ligera? */
export function isLowSpec(h: DeviceHints): boolean {
  const q = new URLSearchParams(h.query ?? '');
  if (q.has('hq')) return false;
  if (q.has('lq')) return true;
  const phone = !!h.coarsePointer && (h.shortSide ?? Infinity) <= 900;
  // un portátil de 4 núcleos no baja de entrada: si no da, lo baja el vigía del ritmo
  return phone || (h.cores ?? 8) <= 2 || (h.memoryGb ?? 8) <= 2;
}

function deviceHints(): DeviceHints {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return {};
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    cores: nav.hardwareConcurrency || undefined,
    memoryGb: nav.deviceMemory,
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    shortSide: typeof screen !== 'undefined' ? Math.min(screen.width, screen.height) : undefined,
    query: window.location?.search ?? '',
  };
}

const hints = deviceHints();
const forcedHigh = new URLSearchParams(hints.query ?? '').has('hq');

/** Calidad actual: `low` puede pasar a true en plena partida (nunca vuelve atrás). */
export const perf = { low: isLowSpec(hints) };

const listeners: (() => void)[] = [];

/** Avisa (una vez) cuando el juego pasa a calidad ligera; si ya lo está, llama enseguida. */
export function onLowSpec(cb: () => void): void {
  if (perf.low) cb();
  else listeners.push(cb);
}

export function goLowSpec(): void {
  if (perf.low || forcedHigh) return;
  perf.low = true;
  for (const cb of listeners.splice(0)) cb();
}

/** Ventana de la vigilancia: fotogramas seguidos medidos y desde cuándo se mide. */
const WATCH_FRAMES = 150;
const WATCH_SKIP = 90;
/** Si la mediana del fotograma pasa de esto (~40 fps), se baja la calidad. */
const SLOW_FRAME_MS = 25;

/**
 * Vigía del ritmo: recibe el tiempo de cada fotograma (ms). Ignora los primeros (carga de la escena)
 * y mira la mediana de una ventana, así un tirón suelto (generar texturas, el recolector) no cuenta.
 */
export class FrameWatch {
  private seen = 0;
  private buf: number[] = [];

  constructor(private readonly onSlow: () => void, private readonly skip = WATCH_SKIP, private readonly size = WATCH_FRAMES, private readonly slowMs = SLOW_FRAME_MS) {}

  /** Empieza de nuevo (escena nueva, pestaña que vuelve). */
  reset(): void {
    this.seen = 0;
    this.buf.length = 0;
  }

  feed(ms: number): void {
    if (++this.seen <= this.skip) return;
    this.buf.push(ms);
    if (this.buf.length < this.size) return;
    const sorted = this.buf.slice().sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.buf.length = 0;
    if (median > this.slowMs) this.onSlow();
  }
}
