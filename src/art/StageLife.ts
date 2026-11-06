import { GAME_WIDTH } from '../config/game-config';
import { LIFE_ART, drawLife, hazeFrames, type LifeKind } from './LifeArtist';
import type { Pixmap } from './PixelPainter';
import { HOUSE_ANCHORS, STAGES, buildMid, type StageId } from './StageArtist';

/**
 * Vida del fondo de los escenarios: garzas, ganado, gente que pasa, micos, palomas...
 * Lógica pura (sin Phaser): reparte, mueve y espanta a los actores; `StageLifeView` los pinta.
 *
 * Coordenadas: `x` en píxeles de la capa donde viven (la misma imagen que pinta StageArtist),
 * `y` en píxeles de pantalla (las capas no se mueven en vertical). El ancla es el pie del sprite.
 */

export type LifeLayer = 'sky' | 'far' | 'water' | 'mid';

/** Cada capa con el desplazamiento de su imagen, su parallax y cuánto la apaga la lejanía. */
export const LIFE_LAYERS: Record<LifeLayer, { sf: number; ox: number; depth: number; haze: number }> = {
  sky: { sf: 0.15, ox: 0, depth: 1.5, haze: 0.3 },
  far: { sf: 0.25, ox: -60, depth: 2.2, haze: 0.45 },
  water: { sf: 0.4, ox: -40, depth: 3.5, haze: 0.3 },
  mid: { sf: 0.6, ox: -60, depth: 4.5, haze: 0.2 },
};

/** Tope de figuritas vivas a la vez (sprites del pool). */
export const LIFE_MAX_ACTORS = 36;
/** En calidad ligera (celulares) la mitad: el fondo sigue vivo con menos figuritas que mover y pintar. */
export const LIFE_MAX_ACTORS_LITE = 18;

export type LifeMove = 'walk' | 'fly' | 'flutter' | 'perch' | 'event' | 'stay' | 'path';

export interface LifeSpec {
  kind: LifeKind;
  layer: LifeLayer;
  move: LifeMove;
  /** rango de altura del pie en pantalla */
  y: [number, number];
  /** segundos entre apariciones */
  every: [number, number];
  /** cuántos de este tipo a la vez */
  max: number;
  /** píxeles de capa por segundo */
  speed?: [number, number];
  /** bandada: cuántos salen juntos */
  group?: [number, number];
  formation?: 'v' | 'loose';
  /** sitios fijos [x de capa, y de pantalla] (ventanas, cruces, la rockola) */
  anchors?: [number, number][];
  /** segundos que se queda (posados, quietos) */
  ttl?: [number, number];
  /** se espanta con cualquier golpe fuerte (pájaros, gatos, venados); los demás, solo con el KO o el golpe final */
  timid?: boolean;
  /** probabilidad por segundo de pararse a pastar, olfatear o mirar */
  pause?: number;
  /** recorrido fijo (escalera eléctrica): desde → hasta */
  path?: [[number, number], [number, number]];
  /** sentido fijo (balsa río abajo) */
  dir?: 1 | -1;
  /** cómo llega un posado: volando desde fuera o apareciendo despacio */
  arrive?: 'fly' | 'fade';
  /** con qué tira se va volando (la garza parada se va como garza en vuelo) */
  flyAs?: LifeKind;
  /** cómo se va un posado */
  leave?: 'fly' | 'run' | 'fade';
  /** segundos hasta la primera aparición (0 = ya está al empezar la pelea) */
  first?: number;
  /** aparece dentro de la vista (cometas, recolectores) en vez de entrar por un borde */
  inside?: boolean;
  /** hacia dónde mira cuando está quieto */
  face?: 1 | -1;
}

/* ------------------------------------------------------------------ */
/* Qué vive en cada escenario                                          */
/* ------------------------------------------------------------------ */

const MID_FEET = 191;
const midY = (py: number): number => 88 + py;

const BATS: LifeSpec = { kind: 'bat', layer: 'sky', move: 'fly', y: [24, 90], every: [7, 14], max: 4, speed: [34, 48], group: [2, 4], formation: 'loose', timid: true };

/** Ventanas y aleros del pueblo, leídos de la capa media ya pintada. */
function puebloAnchors(): { windows: [number, number][]; roofs: [number, number][] } {
  if (HOUSE_ANCHORS.windows.length === 0) buildMid(STAGES.pueblo);
  const windows = HOUSE_ANCHORS.windows.map(([wx, wy]) => [Math.round(wx) + 6, midY(Math.round(wy) + 12)] as [number, number]);
  const roofs: [number, number][] = [];
  for (const [x0, x1, y] of HOUSE_ANCHORS.roofs) for (let x = x0 + 8; x < x1 - 6; x += 22) roofs.push([Math.round(x), midY(Math.round(y))]);
  return { windows, roofs };
}

export function lifeSpecs(id: StageId): LifeSpec[] {
  switch (id) {
    case 'ribera':
      return [
        { kind: 'garza', layer: 'sky', move: 'fly', y: [52, 100], every: [7, 13], max: 3, speed: [14, 20], group: [1, 3], formation: 'loose', timid: true, first: 2 },
        { kind: 'canoe', layer: 'water', move: 'walk', y: [176, 180], every: [16, 28], max: 1, speed: [5, 8], first: 1 },
        { kind: 'fish', layer: 'water', move: 'event', y: [176, 188], every: [4, 9], max: 1, inside: true, timid: true },
        { kind: 'garzaPerch', layer: 'water', move: 'perch', y: [186, 190], every: [14, 24], max: 1, ttl: [12, 22], arrive: 'fade', flyAs: 'garza', leave: 'fly', inside: true, timid: true, speed: [16, 20] },
        BATS,
      ];
    case 'llanos':
      return [
        { kind: 'bird', layer: 'sky', move: 'fly', y: [36, 90], every: [8, 14], max: 9, speed: [16, 22], group: [5, 9], formation: 'v', timid: true, first: 2 },
        { kind: 'cattle', layer: 'water', move: 'walk', y: [160, 168], every: [9, 16], max: 3, speed: [3, 5], group: [1, 3], formation: 'loose', pause: 0.15, first: 0.5 },
        { kind: 'rider', layer: 'water', move: 'walk', y: [156, 159], every: [18, 32], max: 1, speed: [16, 22], first: 6 },
        { kind: 'garzaPerch', layer: 'water', move: 'perch', y: [170, 178], every: [16, 26], max: 1, ttl: [10, 18], arrive: 'fade', flyAs: 'garza', leave: 'fly', inside: true, timid: true, speed: [16, 20] },
      ];
    case 'laguna':
      return [
        { kind: 'condor', layer: 'sky', move: 'fly', y: [28, 70], every: [14, 24], max: 1, speed: [8, 12], timid: true, first: 3 },
        { kind: 'deer', layer: 'far', move: 'walk', y: [149, 150], every: [12, 22], max: 2, speed: [4, 6], pause: 0.25, timid: true, first: 1 },
        { kind: 'duck', layer: 'water', move: 'walk', y: [166, 182], every: [8, 14], max: 4, speed: [3, 5], group: [1, 3], formation: 'loose', timid: true, first: 0.5 },
        BATS,
      ];
    case 'pantano':
      return [
        { kind: 'garzaPerch', layer: 'water', move: 'perch', y: [178, 186], every: [10, 18], max: 2, ttl: [12, 24], arrive: 'fade', flyAs: 'garza', leave: 'fly', inside: true, timid: true, speed: [16, 20], first: 0.5 },
        { kind: 'garza', layer: 'sky', move: 'fly', y: [60, 105], every: [10, 18], max: 2, speed: [14, 18], timid: true },
        { kind: 'caiman', layer: 'water', move: 'event', y: [172, 186], every: [7, 13], max: 1, inside: true, timid: true, first: 3 },
        { kind: 'frog', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET + 1], every: [6, 12], max: 2, speed: [10, 14], timid: true },
        BATS,
      ];
    case 'infierno':
      return [
        { kind: 'peon', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [4, 9], max: 3, speed: [40, 54], group: [1, 2], formation: 'loose', first: 1 },
        { kind: 'peonFar', layer: 'water', move: 'walk', y: [156, 162], every: [3, 7], max: 4, speed: [20, 30], group: [1, 3], formation: 'loose', first: 0.5 },
        { kind: 'crow', layer: 'sky', move: 'fly', y: [36, 100], every: [6, 12], max: 5, speed: [26, 36], group: [2, 5], formation: 'loose', timid: true },
      ];
    case 'pueblo': {
      const a = puebloAnchors();
      return [
        { kind: 'peeker', layer: 'mid', move: 'event', y: [0, 0], every: [3, 7], max: 2, anchors: a.windows, first: 1 },
        { kind: 'cat', layer: 'mid', move: 'perch', y: [0, 0], every: [10, 18], max: 1, anchors: a.roofs, ttl: [10, 18], arrive: 'fade', leave: 'run', timid: true, speed: [30, 40], first: 2 },
        { kind: 'dog', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [12, 20], max: 1, speed: [18, 24], pause: 0.3, timid: true, first: 4 },
        { kind: 'ruana', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [10, 18], max: 2, speed: [8, 11], first: 1 },
        BATS,
      ];
    }
    case 'selva':
      return [
        { kind: 'monkey', layer: 'mid', move: 'stay', y: [110, 122], every: [8, 14], max: 2, ttl: [12, 20], arrive: 'fade', leave: 'fade', inside: true, timid: true, first: 1 },
        { kind: 'parrot', layer: 'sky', move: 'fly', y: [56, 100], every: [6, 11], max: 4, speed: [30, 40], group: [2, 4], formation: 'loose', timid: true },
        { kind: 'toucan', layer: 'sky', move: 'fly', y: [66, 100], every: [10, 16], max: 1, speed: [20, 26], timid: true, first: 4 },
        { kind: 'butterfly', layer: 'mid', move: 'flutter', y: [150, 178], every: [6, 12], max: 2, speed: [8, 12], timid: true, first: 2 },
      ];
    case 'robledal':
      return [
        { kind: 'toucan', layer: 'sky', move: 'fly', y: [60, 100], every: [9, 15], max: 2, speed: [20, 26], group: [1, 2], formation: 'loose', timid: true, first: 2 },
        { kind: 'bear', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [22, 36], max: 1, speed: [5, 7], pause: 0.15, timid: true, first: 3 },
        { kind: 'woodcutter', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [14, 24], max: 1, speed: [7, 10], first: 8 },
        { kind: 'bird', layer: 'sky', move: 'fly', y: [40, 90], every: [8, 14], max: 4, speed: [24, 32], group: [2, 4], formation: 'loose', timid: true },
      ];
    case 'cantina':
      return [
        { kind: 'bartender', layer: 'far', move: 'stay', y: [158, 158], every: [30, 40], max: 1, anchors: [[205, 162], [318, 162]], first: 0, face: -1 },
        { kind: 'dancers', layer: 'mid', move: 'stay', y: [MID_FEET, MID_FEET], every: [20, 30], max: 1, anchors: [[262, MID_FEET], [372, MID_FEET]], first: 0 },
        { kind: 'jukebox', layer: 'mid', move: 'stay', y: [MID_FEET, MID_FEET], every: [20, 30], max: 1, anchors: [[186, MID_FEET]], first: 0, face: -1 },
        { kind: 'walkerB', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [16, 26], max: 1, speed: [6, 9], pause: 0.2, first: 6 },
      ];
    case 'cementerio':
      return [
        { kind: 'crowPerch', layer: 'mid', move: 'perch', y: [0, 0], every: [5, 10], max: 3, anchors: [[520, midY(33)], [510, midY(48)], [531, midY(48)], [234, midY(47)], [265, midY(45)]], ttl: [10, 22], arrive: 'fly', leave: 'fly', timid: true, speed: [30, 40], first: 0.5 },
        { kind: 'crow', layer: 'sky', move: 'fly', y: [40, 96], every: [8, 14], max: 3, speed: [24, 32], group: [1, 3], formation: 'loose', timid: true },
        { kind: 'mourner', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [18, 30], max: 1, speed: [4, 6], pause: 0.12, first: 2 },
        { kind: 'owl', layer: 'mid', move: 'perch', y: [0, 0], every: [16, 26], max: 1, anchors: [[250, midY(56)], [130, midY(15)]], ttl: [16, 30], arrive: 'fade', leave: 'fade', timid: true, first: 1 },
      ];
    case 'puente':
      return [
        { kind: 'garza', layer: 'sky', move: 'fly', y: [70, 120], every: [9, 16], max: 2, speed: [14, 20], group: [1, 2], formation: 'loose', timid: true, first: 2 },
        { kind: 'swallow', layer: 'sky', move: 'fly', y: [80, 130], every: [5, 10], max: 4, speed: [50, 66], group: [2, 4], formation: 'loose', timid: true },
        { kind: 'raft', layer: 'water', move: 'walk', y: [176, 180], every: [18, 30], max: 1, speed: [10, 16], dir: -1, first: 3 },
        BATS,
      ];
    case 'cafetal':
      return [
        { kind: 'picker', layer: 'mid', move: 'stay', y: [MID_FEET, MID_FEET], every: [6, 10], max: 2, anchors: [[112, MID_FEET], [168, MID_FEET], [500, MID_FEET], [566, MID_FEET]], ttl: [16, 30], arrive: 'fade', leave: 'fade', first: 0 },
        { kind: 'mule', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [16, 26], max: 1, speed: [8, 11], first: 3 },
        { kind: 'bird', layer: 'sky', move: 'fly', y: [50, 100], every: [6, 12], max: 3, speed: [30, 40], group: [1, 3], formation: 'loose', timid: true },
      ];
    case 'paramo':
      return [
        { kind: 'condor', layer: 'sky', move: 'fly', y: [24, 64], every: [14, 24], max: 1, speed: [8, 12], timid: true, first: 2 },
        { kind: 'deer', layer: 'far', move: 'walk', y: [151, 152], every: [12, 20], max: 2, speed: [4, 6], pause: 0.25, timid: true, first: 1 },
        { kind: 'rabbit', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET + 1], every: [8, 14], max: 1, speed: [12, 16], pause: 0.3, timid: true, first: 4 },
      ];
    case 'botero':
      return [
        { kind: 'pigeon', layer: 'mid', move: 'perch', y: [MID_FEET, MID_FEET + 1], every: [8, 14], max: 6, group: [3, 5], ttl: [10, 20], arrive: 'fly', leave: 'fly', inside: true, timid: true, speed: [36, 46], first: 0.5 },
        { kind: 'walker', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [7, 13], max: 1, speed: [9, 13], first: 1 },
        { kind: 'walkerB', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [9, 16], max: 1, speed: [7, 10], first: 5 },
        { kind: 'walkerC', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [9, 16], max: 1, speed: [10, 14], first: 9 },
        { kind: 'vendor', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [20, 34], max: 1, speed: [6, 8], pause: 0.1, first: 3 },
      ];
    case 'comuna13': {
      const path: [[number, number], [number, number]] = [[360, midY(99)], [519, midY(26)]];
      return [
        { kind: 'rider13', layer: 'mid', move: 'path', y: [0, 0], every: [5, 10], max: 2, speed: [10, 10], path, first: 0 },
        { kind: 'rider13b', layer: 'mid', move: 'path', y: [0, 0], every: [7, 13], max: 2, speed: [10, 10], path, first: 4 },
        { kind: 'rider13c', layer: 'mid', move: 'path', y: [0, 0], every: [8, 14], max: 1, speed: [10, 10], path, first: 8 },
        { kind: 'kids', layer: 'mid', move: 'stay', y: [MID_FEET, MID_FEET], every: [8, 14], max: 1, anchors: [[70, MID_FEET], [300, MID_FEET], [590, MID_FEET]], ttl: [16, 28], arrive: 'fade', leave: 'fade', first: 0 },
        { kind: 'graffiti', layer: 'mid', move: 'stay', y: [MID_FEET, MID_FEET], every: [10, 18], max: 1, anchors: [[150, MID_FEET], [232, MID_FEET], [330, MID_FEET]], ttl: [20, 36], arrive: 'fade', leave: 'fade', first: 2 },
        { kind: 'kite', layer: 'sky', move: 'flutter', y: [22, 60], every: [18, 30], max: 2, speed: [2, 4], ttl: [40, 70], inside: true, first: 0 },
        { kind: 'walkerD', layer: 'mid', move: 'walk', y: [MID_FEET, MID_FEET], every: [10, 18], max: 1, speed: [9, 13], first: 5 },
      ];
    }
  }
}

/* ------------------------------------------------------------------ */
/* Texturas                                                            */
/* ------------------------------------------------------------------ */

export interface LifeSheet {
  key: string;
  kind: LifeKind;
  layer: LifeLayer;
  frames: Pixmap[];
}

export const lifeKey = (id: StageId, kind: LifeKind, layer: LifeLayer): string => `life_${id}_${kind}_${layer}`;

/** Color del aire hacia el que se apaga lo lejano: el horizonte del cielo (o la pared, en la cantina). */
export function lifeHaze(id: StageId): number {
  const t = STAGES[id];
  return t.interior ? 0x2a1810 : t.sky[t.sky.length - 1];
}

/** Todas las tiras de un escenario, ya con su bruma de lejanía (se generan una vez por escenario). */
export function buildLifeSheets(id: StageId): LifeSheet[] {
  const seen = new Set<string>();
  const out: LifeSheet[] = [];
  const add = (kind: LifeKind, layer: LifeLayer) => {
    const key = lifeKey(id, kind, layer);
    if (seen.has(key)) return;
    seen.add(key);
    const frames = drawLife(LIFE_ART[kind]);
    hazeFrames(frames, lifeHaze(id), LIFE_LAYERS[layer].haze);
    out.push({ key, kind, layer, frames });
  };
  for (const s of lifeSpecs(id)) {
    add(s.kind, s.layer);
    if (s.flyAs) add(s.flyAs, s.layer);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Simulación                                                          */
/* ------------------------------------------------------------------ */

type Mode = 'in' | 'main' | 'idle' | 'out' | 'flee' | 'flinch';

export interface LifeActor {
  spec: LifeSpec;
  kind: LifeKind;
  x: number;
  y: number;
  baseY: number;
  vx: number;
  vy: number;
  mode: Mode;
  /** segundos en el modo actual */
  t: number;
  /** segundos de vida */
  age: number;
  ttl: number;
  anim: number[];
  fps: number;
  animT: number;
  alpha: number;
  flip: boolean;
  phase: number;
  target: [number, number] | null;
  anchor: number;
  dead: boolean;
}

export interface LifeDraw {
  key: string;
  layer: LifeLayer;
  frame: number;
  /** x de mundo (ya con el desplazamiento de la capa) */
  x: number;
  y: number;
  flip: boolean;
  alpha: number;
}

export type ScareLevel = 'hit' | 'ko' | 'ultimate';

const between = (r: () => number, [a, b]: [number, number]): number => a + (b - a) * r();

export class LifeSim {
  readonly specs: LifeSpec[];
  readonly actors: LifeActor[] = [];
  private timers: number[];
  private viewScroll = 0;
  /** tope de figuritas a la vez (baja en calidad ligera; las que ya están terminan su paso) */
  maxActors = LIFE_MAX_ACTORS;
  /** ya pasó el primer cuadro: lo que aparece de aquí en adelante entra despacio */
  private started = false;

  constructor(readonly stage: StageId, private readonly rnd: () => number = Math.random) {
    this.specs = lifeSpecs(stage);
    this.timers = this.specs.map((s) => s.first ?? between(rnd, s.every) * 0.5);
  }

  /** Rango visible de una capa, en píxeles de esa capa. */
  view(layer: LifeLayer): [number, number] {
    const L = LIFE_LAYERS[layer];
    const left = this.viewScroll * L.sf - L.ox;
    return [left, left + GAME_WIDTH];
  }

  update(dt: number, camScrollX: number): void {
    this.viewScroll = camScrollX;
    if (dt <= 0) return;
    dt = Math.min(dt, 0.1);
    this.specs.forEach((s, i) => {
      this.timers[i] -= dt;
      if (this.timers[i] > 0) return;
      this.timers[i] = between(this.rnd, s.every);
      this.spawn(s);
    });
    this.started = true;
    for (const a of this.actors) this.step(a, dt);
    for (let i = this.actors.length - 1; i >= 0; i--) if (this.actors[i].dead) this.actors.splice(i, 1);
  }

  private count(s: LifeSpec): number {
    let n = 0;
    for (const a of this.actors) if (a.spec === s) n++;
    return n;
  }

  spawn(s: LifeSpec): void {
    const room = Math.min(s.max - this.count(s), this.maxActors - this.actors.length);
    if (room <= 0) return;
    const r = this.rnd;
    const n = Math.min(room, s.group ? Math.round(between(r, s.group)) : 1);
    const art = LIFE_ART[s.kind];
    const [vl, vr] = this.view(s.layer);
    const dir: 1 | -1 = s.dir ?? (r() < 0.5 ? 1 : -1);
    const speed = s.speed ? between(r, s.speed) : 0;
    const baseY = Math.round(between(r, s.y));
    // sitio libre (ventana, cruz, rockola): no se repite el que ya está ocupado
    let anchor = -1;
    let ax = 0;
    let ay = baseY;
    if (s.anchors) {
      const used = new Set(this.actors.filter((a) => a.spec === s).map((a) => a.anchor));
      const free = s.anchors.map((_, i) => i).filter((i) => !used.has(i));
      // los que aparecen sin entrar por el borde prefieren sitios a la vista
      const seen = free.filter((i) => s.anchors![i][0] > vl + 6 && s.anchors![i][0] < vr - 6);
      const pool = s.move === 'event' || s.arrive === 'fly' || s.move === 'perch' ? (seen.length ? seen : free) : free;
      if (!pool.length) return;
      anchor = pool[Math.floor(r() * pool.length)];
      [ax, ay] = s.anchors[anchor];
    } else if (s.inside || s.move === 'event' || s.move === 'perch' || s.move === 'stay') {
      ax = between(r, [vl + 24, vr - 24]);
    }
    for (let k = 0; k < n; k++) {
      const a: LifeActor = {
        spec: s, kind: s.kind, x: 0, y: baseY, baseY, vx: 0, vy: 0, mode: 'main', t: 0, age: 0,
        ttl: s.ttl ? between(r, s.ttl) : Infinity, anim: art.go, fps: art.fps * (0.85 + r() * 0.3), animT: r() * 4,
        alpha: 1, flip: dir < 0, phase: r() * Math.PI * 2, target: null, anchor, dead: false,
      };
      // posición de cada uno en la bandada
      let dx = 0;
      let dy = 0;
      if (k > 0 && s.formation === 'v') {
        const rank = Math.ceil(k / 2);
        dx = -rank * 7;
        dy = rank * 3 * (k % 2 ? 1 : -1);
      } else if (k > 0) {
        dx = -r() * 34;
        dy = (r() - 0.5) * (s.move === 'perch' ? 2 : 16);
      }
      switch (s.move) {
        case 'walk':
        case 'fly':
        case 'flutter': {
          const sp = speed * (s.formation === 'v' ? 1 : 0.9 + r() * 0.2);
          a.vx = dir * sp;
          if (s.inside) {
            a.x = ax + dx * dir;
            a.mode = 'in';
            a.alpha = 0;
          } else {
            a.x = (dir > 0 ? vl - art.w : vr + art.w) + dx * dir;
          }
          a.y = a.baseY = Math.round(baseY + (s.move === 'walk' && s.layer === 'mid' ? 0 : dy));
          break;
        }
        case 'perch': {
          const tx = (anchor >= 0 ? ax : ax + dx) + (k > 0 ? (r() - 0.5) * 30 : 0);
          const ty = anchor >= 0 ? ay : Math.round(baseY + dy * 0.5);
          a.target = [tx, ty];
          a.flip = r() < 0.5;
          if (s.arrive === 'fly') {
            const side = r() < 0.5 ? -1 : 1;
            a.x = tx + side * (150 + r() * 60);
            a.y = ty - 70 - r() * 30;
            a.flip = side > 0;
            a.mode = 'in';
          } else {
            a.x = tx;
            a.y = ty;
            a.mode = 'in';
            a.alpha = 0;
            a.anim = art.idle ?? art.go;
          }
          a.vx = speed || 30;
          break;
        }
        case 'event':
          a.x = ax;
          a.y = anchor >= 0 ? ay : baseY;
          a.flip = r() < 0.5;
          a.animT = 0;
          a.fps = art.fps;
          break;
        case 'stay':
          a.x = ax;
          a.y = anchor >= 0 ? ay : baseY;
          a.flip = s.face ? s.face < 0 : r() < 0.5;
          if ((s.first ?? 1) > 0 || this.started) {
            a.mode = 'in';
            a.alpha = 0;
          }
          break;
        case 'path': {
          const [[x0, y0]] = s.path!;
          a.x = x0;
          a.y = y0;
          a.flip = s.path![1][0] < x0;
          a.mode = 'in';
          a.alpha = 0;
          break;
        }
      }
      this.actors.push(a);
    }
  }

  private setAnim(a: LifeActor, anim: number[], fps?: number): void {
    if (a.anim === anim) return;
    a.anim = anim;
    a.animT = 0;
    if (fps) a.fps = fps;
  }

  private step(a: LifeActor, dt: number): void {
    const s = a.spec;
    const art = LIFE_ART[a.kind];
    a.t += dt;
    a.age += dt;
    a.animT += dt * a.fps;
    const [vl, vr] = this.view(s.layer);
    const margin = art.w + 70;
    const gone = () => a.x < vl - margin || a.x > vr + margin || a.y < -30;

    if (a.mode === 'flinch') {
      a.animT = 0;
      if (a.t > 1.4) { a.mode = 'main'; a.t = 0; }
      return;
    }

    switch (s.move) {
      case 'walk':
      case 'fly':
      case 'flutter': {
        if (a.mode === 'in') {
          a.alpha = Math.min(1, a.t / 0.8);
          if (a.alpha >= 1) { a.mode = 'main'; a.t = 0; }
        }
        if (a.mode === 'idle') {
          if (a.t > a.ttl) { a.mode = 'main'; a.t = 0; this.setAnim(a, art.go); }
          break;
        }
        const frame = a.anim[Math.floor(a.animT) % a.anim.length];
        const moving = !art.moveOn || a.mode === 'flee' || art.moveOn.includes(frame);
        if (moving) a.x += a.vx * dt * (art.moveOn && a.mode !== 'flee' ? a.anim.length / art.moveOn.length : 1);
        a.y += a.vy * dt;
        if (s.move === 'fly') a.y = a.mode === 'flee' ? a.y : a.baseY + Math.round(Math.sin(a.age * 1.3 + a.phase) * 2);
        if (s.move === 'flutter') {
          a.y = a.baseY + Math.round(Math.sin(a.age * (s.kind === 'kite' ? 0.6 : 3.1) + a.phase) * (s.kind === 'kite' ? 3 : 5));
          if (a.age > a.ttl && a.mode !== 'out') { a.mode = 'out'; a.t = 0; }
        }
        if (a.mode === 'out') {
          a.alpha = Math.max(0, 1 - a.t / 1.2);
          if (a.alpha <= 0) a.dead = true;
        }
        if (s.pause && a.mode === 'main' && art.idle !== undefined && this.rnd() < s.pause * dt) {
          a.mode = 'idle';
          a.t = 0;
          a.ttl = 1.5 + this.rnd() * 3;
          this.setAnim(a, art.idle);
        } else if (s.pause && a.mode === 'main' && !art.idle && this.rnd() < s.pause * dt * 0.5) {
          // la gente se para un momento (a rezar, a mirar)
          a.mode = 'idle';
          a.t = 0;
          a.ttl = 1.5 + this.rnd() * 2.5;
          this.setAnim(a, [2], 1);
        }
        if (a.mode === 'flee' && a.vy < 0) a.vy -= 20 * dt;
        if (gone()) a.dead = true;
        break;
      }
      case 'perch': {
        if (!a.target) break;
        const [tx, ty] = a.target;
        if (a.mode === 'in') {
          if (s.arrive === 'fly') {
            const dx = tx - a.x;
            const dy = ty - a.y;
            const d = Math.hypot(dx, dy);
            const step = a.vx * dt;
            if (d <= step) {
              a.x = tx;
              a.y = ty;
              a.mode = 'main';
              a.t = 0;
              this.setAnim(a, art.idle ?? art.go, art.fps * 0.4);
            } else {
              a.x += (dx / d) * step;
              a.y += (dy / d) * step;
              a.flip = dx < 0;
            }
          } else {
            a.alpha = Math.min(1, a.t / 0.8);
            if (a.alpha >= 1) { a.mode = 'main'; a.t = 0; this.setAnim(a, art.idle ?? art.go, art.fps * 0.4); }
          }
          break;
        }
        if (a.mode === 'main') {
          if (a.t > a.ttl) this.leave(a);
          break;
        }
        if (a.mode === 'out') {
          a.x += a.vx * dt;
          a.y += a.vy * dt;
          if (s.leave === 'fly') a.vy -= 6 * dt;
          if (s.leave !== 'fly') a.alpha = Math.max(0, a.alpha - dt / (s.leave === 'run' ? 1.2 : 0.8));
          if (a.alpha <= 0 || gone()) a.dead = true;
        }
        break;
      }
      case 'event':
        if (a.mode === 'out') {
          a.alpha = Math.max(0, a.alpha - dt / 0.25);
          if (a.alpha <= 0) a.dead = true;
        } else if (a.animT >= a.anim.length) a.dead = true;
        break;
      case 'stay':
        if (a.mode === 'in') {
          a.alpha = Math.min(1, a.t / 1);
          if (a.alpha >= 1) { a.mode = 'main'; a.t = 0; }
        } else if (a.mode === 'main' && a.age > a.ttl) {
          a.mode = 'out';
          a.t = 0;
        } else if (a.mode === 'out') {
          a.alpha = Math.max(0, 1 - a.t / 0.8);
          if (a.alpha <= 0) a.dead = true;
        }
        break;
      case 'path': {
        const [[x0, y0], [x1, y1]] = s.path!;
        const len = Math.hypot(x1 - x0, y1 - y0);
        // en la escalera, vx guarda lo recorrido (se detiene mientras se encoge del susto)
        a.vx += (s.speed?.[0] ?? 10) * dt;
        const u = Math.min(1, a.vx / len);
        a.x = x0 + (x1 - x0) * u;
        a.y = y0 + (y1 - y0) * u;
        a.alpha = Math.min(1, a.vx / 6, ((1 - u) * len) / 6);
        if (a.mode === 'in' && a.alpha >= 1) a.mode = 'main';
        if (u >= 1) a.dead = true;
        break;
      }
    }
  }

  private leave(a: LifeActor): void {
    const s = a.spec;
    const [vl, vr] = this.view(s.layer);
    const away = a.x < (vl + vr) / 2 ? -1 : 1;
    a.mode = 'out';
    a.t = 0;
    if (s.flyAs) a.kind = s.flyAs;
    const art = LIFE_ART[a.kind];
    const sp = s.speed ? s.speed[1] : 30;
    a.vx = away * sp * (1 + this.rnd() * 0.4);
    a.flip = away < 0;
    a.vy = s.leave === 'fly' ? -sp * (0.4 + this.rnd() * 0.4) : 0;
    this.setAnim(a, art.go, art.fps * 1.3);
  }

  /**
   * Algo duro pasó en la pelea. Con un golpe fuerte se espantan los pájaros y los bichos asustadizos;
   * con el KO o el golpe final se espanta todo el mundo: la gente sale corriendo o se encoge.
   */
  scare(level: ScareLevel): void {
    const all = level !== 'hit';
    for (const a of this.actors) {
      const s = a.spec;
      if (!all && !s.timid) continue;
      if (a.mode === 'flee' || a.mode === 'out' || a.dead) continue;
      const art = LIFE_ART[a.kind];
      const [vl, vr] = this.view(s.layer);
      const away = a.x < (vl + vr) / 2 ? -1 : 1;
      switch (s.move) {
        case 'fly':
        case 'flutter':
          a.mode = 'flee';
          a.alpha = 1;
          a.vx = (Math.sign(a.vx) || away) * Math.max(Math.abs(a.vx) * 1.8, 30);
          a.vy = -(18 + this.rnd() * 24);
          a.fps *= 1.6;
          break;
        case 'walk':
          a.mode = 'flee';
          a.alpha = 1;
          a.vx = away * Math.max(Math.abs(a.vx) * 3, s.layer === 'mid' ? 34 : 14);
          a.flip = away < 0;
          this.setAnim(a, art.go, art.fps * 2);
          if (art.moveOn) a.fps = art.fps * 1.5;
          break;
        case 'perch':
          if (a.mode === 'in' && s.arrive === 'fly') {
            a.mode = 'out';
            a.vy = -30;
            a.vx = away * 40;
          } else this.leave(a);
          break;
        case 'event':
          a.mode = 'out';
          a.t = 0;
          break;
        case 'stay':
          if (s.timid) { a.mode = 'out'; a.t = 0; }
          else { a.mode = 'flinch'; a.t = 0; }
          break;
        case 'path':
          a.mode = 'flinch';
          a.t = 0;
          break;
      }
    }
  }

  /** Lo que hay que pintar ahora: una entrada por actor. */
  draws(): LifeDraw[] {
    return this.actors.map((a) => {
      const L = LIFE_LAYERS[a.spec.layer];
      const anim = a.anim;
      const i = a.spec.move === 'event' ? Math.min(anim.length - 1, Math.floor(a.animT)) : Math.floor(a.animT) % anim.length;
      const flinchHop = a.mode === 'flinch' && a.t < 0.18 ? -2 : 0;
      return {
        key: lifeKey(this.stage, a.kind, a.spec.layer),
        layer: a.spec.layer,
        frame: a.mode === 'flinch' ? anim[0] : anim[i],
        x: Math.round(a.x + L.ox),
        y: Math.round(a.y + flinchHop),
        flip: a.flip,
        alpha: a.alpha,
      };
    });
  }
}
