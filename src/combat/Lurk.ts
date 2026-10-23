import type { FighterId } from './CombatTypes';
import type { StageId } from '../art/StageArtist';
import type { SfxName } from '../audio/Sfx';

/**
 * El mito se mete al fondo del escenario y allá hace cosas raras, de miedo, que tienen que ver con el sitio:
 * se hunde en el río, se arrastra por la ciénaga, se acerca a saltos por el llano, se acuesta en el monte...
 * y vuelve de golpe a pelear. Puro: guiones de fotogramas clave, sin Phaser.
 *
 * sx = posición en la pantalla (0 izquierda, 1 derecha); d = profundidad (0 donde se pelea, 1 al fondo).
 */

export type LurkPose = 'idle' | 'walk' | 'hurt' | 'lying' | 'attack' | 'mounted';

export interface LurkKey {
  /** fotogramas desde el anterior */
  dt: number;
  sx?: number;
  d?: number;
  /** grados; 90 = tendido de lado */
  rot?: number;
  /** cuánto del cuerpo está hundido en el agua o la tierra (0..1) */
  sink?: number;
  alpha?: number;
  /** 1 mira a la derecha; si no se dice, mira hacia donde camina */
  face?: 1 | -1;
  pose?: LurkPose;
  /** temblor en píxeles */
  jitter?: number;
  /** altura del brinco en el tramo que llega a esta clave (negativo = flota hacia arriba y baja) */
  hop?: number;
  /** salta de golpe a esta clave en vez de moverse (aparece en otro sitio) */
  snap?: boolean;
  sound?: SfxName;
}

export interface LurkState {
  sx: number; d: number; rot: number; sink: number; alpha: number; face: 1 | -1; pose: LurkPose; jitter: number; lift: number;
  /** aplastamiento vertical al caer de un brinco (1 = normal) */
  sy: number;
}

interface Frozen extends LurkState { t: number; hop: number; snap: boolean; sound?: SfxName; /** apareció en otro sitio de golpe */ moved: boolean }

/** Al aparecer en otro sitio no salta de golpe: el mismo fotograma se aclara en unos pocos pasos. */
export const APPEAR_FRAMES = 10;

export interface LurkScript {
  name: string;
  keys: Frozen[];
  total: number;
  /** fotograma en que arranca la embestida final: ahí se apunta a donde esté Juan */
  aimAt: number;
  /** lo que dice Juan cuando lo ve meterse al fondo */
  line: string;
}

/** Al fondo los pies quedan en esta altura (justo encima del suelo de pelea) y la figura se achica. */
export const FAR_FEET_Y = 152;
export const FAR_SCALE = 0.45;

export const lurkScale = (d: number) => 1 - (1 - FAR_SCALE) * d;
export const lurkFeetY = (d: number, groundY: number) => groundY - (groundY - FAR_FEET_Y) * d;

/** Separación mínima entre dos escapadas al fondo y cuántas caben por ronda. */
export const LURK_GAP = 60 * 9;
export const LURK_PER_ROUND = 2;
export const LURK_CHANCE = 1 / 300;

export interface LurkWish {
  id: FighterId;
  framesSince: number;
  usedRound: number;
  /** los dos andan tranquilos: nadie pega ni está aturdido */
  calm: boolean;
  dist: number;
  hp: number;
}

/** Juan es de carne y hueso: él no se mete al fondo. Los mitos, de vez en cuando, cuando hay distancia. */
export function wantsLurk(w: LurkWish, rnd: number): boolean {
  if (w.id === 'juanmachete' || w.hp <= 0) return false;
  if (w.usedRound >= LURK_PER_ROUND || w.framesSince < LURK_GAP) return false;
  if (!w.calm || w.dist < 70) return false;
  return rnd < LURK_CHANCE;
}

const LINES = [
  '¿Y PA\' DÓNDE SE METIÓ ESO?',
  '¡SE FUE PA\'L FONDO! NO ME GUSTA NADITA...',
  '¿QUÉ ESTÁ HACIENDO ALLÁ ATRÁS?',
  '¡AVE MARÍA! ¡MÍRELO ALLÁ!',
];

type Body = (r: () => number, side: 1 | -1) => LurkKey[];

/** Cuerpo de cada escena: arranca ya al fondo; `side` voltea la escena para que no salga siempre igual. */
const S = (side: 1 | -1, x: number) => (side === 1 ? x : 1 - x);

const BODIES: Record<string, Body> = {
  // se hunde en el agua y sale por otro lado, despacio, mirando fijo
  hundirse: (_r, s) => [
    { dt: 30, sink: 1, alpha: 0.8, sound: 'wave' },
    { dt: 50, alpha: 0 },
    { dt: 1, snap: true, sx: S(s, 0.75), d: 0.95 },
    { dt: 70, sink: 0, alpha: 1, pose: 'idle', face: s === 1 ? -1 : 1, sound: 'mist' },
    { dt: 30, rot: 18, jitter: 1 },
    { dt: 8, rot: -14, snap: true },
    { dt: 30, rot: -14 },
  ],
  // flota sobre el agua, subiendo y bajando, y gira la cabeza de golpe
  flotar: (_r, s) => [
    { dt: 60, sx: S(s, 0.6), hop: -26, pose: 'idle', sound: 'mist' },
    { dt: 50, sx: S(s, 0.4), hop: -26 },
    { dt: 1, snap: true, face: s === 1 ? 1 : -1, rot: 22 },
    { dt: 30, jitter: 1 },
    { dt: 1, snap: true, face: s === 1 ? -1 : 1, rot: -22, sound: 'whisper' },
    { dt: 40 },
  ],
  // como el Silbón: aparece lejos, luego más cerca, sin moverse nunca
  acercarse: (_r, s) => [
    { dt: 40, pose: 'idle', sound: 'whistle' },
    { dt: 1, snap: true, sx: S(s, 0.25), d: 0.8, alpha: 0.9 },
    { dt: 45, sound: 'whistle' },
    { dt: 1, snap: true, sx: S(s, 0.7), d: 0.55 },
    { dt: 40, jitter: 1 },
    { dt: 1, snap: true, sx: S(s, 0.45), d: 0.35, sound: 'heartbeat' },
    { dt: 30, jitter: 2 },
  ],
  // se arrastra tendido entre el barro, medio hundido
  arrastrarse: (_r, s) => [
    { dt: 20, rot: 90, sink: 0.45, pose: 'idle' },
    { dt: 120, sx: S(s, 0.8), jitter: 1, sound: 'mist' },
    { dt: 20, sink: 1 },
    { dt: 1, snap: true, sx: S(s, 0.35), d: 0.75, rot: 0 },
    { dt: 50, sink: 0, sound: 'creak' },
    { dt: 25, jitter: 1 },
  ],
  // camina entre las llamas y se pierde y aparece con el fuego
  llamas: (_r, s) => [
    { dt: 70, sx: S(s, 0.5), pose: 'walk' },
    { dt: 1, snap: true, alpha: 0.15 },
    { dt: 14 },
    { dt: 1, snap: true, alpha: 1, sx: S(s, 0.62) },
    { dt: 14 },
    { dt: 1, snap: true, alpha: 0.15 },
    { dt: 14 },
    { dt: 1, snap: true, alpha: 1, sx: S(s, 0.4), pose: 'hurt', sound: 'fire' },
    { dt: 40, jitter: 2 },
  ],
  // cruza la calle despacio, se para en la mitad y voltea la cabeza de lado a lado
  calle: (_r, s) => [
    { dt: 90, sx: S(s, 0.5), pose: 'walk' },
    { dt: 20, pose: 'idle' },
    ...[0, 1, 2, 3, 4, 5].map((i): LurkKey => ({ dt: 6, snap: true, face: (i % 2 ? 1 : -1) as 1 | -1 })),
    { dt: 40, jitter: 1, sound: 'whisper' },
  ],
  // el Sombrerón pasa a galope en su caballo negro, de lado a lado del fondo
  galope: (_r, s) => [
    { dt: 1, snap: true, sx: S(s, -0.15), pose: 'mounted', face: s === 1 ? 1 : -1, sound: 'galope' },
    { dt: 70, sx: S(s, 1.15) },
    { dt: 30, alpha: 0 },
    { dt: 1, snap: true, alpha: 1, d: 0.6, face: s === 1 ? -1 : 1, sound: 'relincho' },
    { dt: 60, sx: S(s, 0.5) },
    { dt: 20, jitter: 1 },
    { dt: 1, snap: true, pose: 'idle' },
    { dt: 20 },
  ],
  // salta de árbol en árbol, se esconde y se asoma torcido
  saltos: (_r, s) => [
    { dt: 26, sx: S(s, 0.3), hop: 30, pose: 'walk', sound: 'land' },
    { dt: 26, sx: S(s, 0.55), d: 0.8, hop: 30, sound: 'land' },
    { dt: 26, sx: S(s, 0.8), d: 0.95, hop: 30, sound: 'land' },
    { dt: 10, alpha: 0 },
    { dt: 40 },
    { dt: 1, snap: true, sx: S(s, 0.2), alpha: 1, rot: 35, pose: 'idle' },
    { dt: 40, jitter: 1, sound: 'whisper' },
    { dt: 12, rot: 0 },
  ],
  // al fondo del bar: cuando parpadea la luz, ya está en otro lado
  bombillo: (r, s) => [
    { dt: 40, pose: 'idle', face: s === 1 ? -1 : 1 },
    ...[0.2, 0.8, 0.45, 0.65].flatMap((x): LurkKey[] => [
      { dt: 1, snap: true, alpha: 0 },
      { dt: 10 + Math.floor(r() * 10) },
      { dt: 1, snap: true, alpha: 1, sx: S(s, x), rot: Math.round((r() - 0.5) * 30), sound: 'creak' },
      { dt: 26 },
    ]),
  ],
  // se mete en una tumba y sale de otra a tirones, torcido
  tumba: (_r, s) => [
    { dt: 40, sink: 1, jitter: 1, sound: 'creak' },
    { dt: 30, alpha: 0 },
    { dt: 1, snap: true, sx: S(s, 0.7), alpha: 1, rot: 20, pose: 'hurt' },
    { dt: 1, snap: true, sink: 0.7 },
    { dt: 18 },
    { dt: 1, snap: true, sink: 0.4, sound: 'creak' },
    { dt: 18 },
    { dt: 1, snap: true, sink: 0, rot: -10, pose: 'idle' },
    { dt: 40, jitter: 2 },
  ],
  // la Patasola se acuesta en el monte como una mujer herida... y se para de un brinco
  acostada: (_r, s) => [
    { dt: 20, pose: 'lying', alpha: 0.95 },
    { dt: 100, sound: 'whisper' },
    { dt: 1, snap: true, pose: 'idle', sound: 'land' },
    { dt: 20, sx: S(s, 0.5), hop: 26, sound: 'land' },
    { dt: 20, sx: S(s, 0.42), d: 0.75, hop: 26, sound: 'land' },
  ],
};

/** Escenas que le quedan bien a cada escenario. */
export const STAGE_LURKS: Record<StageId, string[]> = {
  ribera: ['hundirse', 'flotar'],
  laguna: ['hundirse', 'flotar'],
  llanos: ['acercarse', 'calle'],
  pantano: ['arrastrarse', 'hundirse'],
  infierno: ['llamas', 'acercarse'],
  pueblo: ['calle', 'acercarse'],
  selva: ['saltos', 'acercarse'],
  cantina: ['bombillo', 'calle'],
  cementerio: ['tumba', 'acercarse'],
};

/** Lo propio de cada mito: el Sombrerón tiene caballo, la Patasola se acuesta, el Silbón se acerca sin moverse. */
export const MYTH_LURKS: Partial<Record<FighterId, string>> = {
  sombreron: 'galope',
  patasola: 'acostada',
  silbon: 'acercarse',
  llorona: 'flotar',
};

export function lurkOptions(stage: StageId, id: FighterId): string[] {
  const own = MYTH_LURKS[id];
  return own ? [...STAGE_LURKS[stage], own, own] : STAGE_LURKS[stage];
}

/** distancia en pantalla a la que se aparta de Juan mientras anda por el fondo */
export const HERO_CLEAR = 0.2;

const FIELDS = ['sx', 'd', 'rot', 'sink', 'alpha', 'pose', 'jitter'] as const;

/** Arma la escena completa: se mete al fondo, hace lo suyo y se devuelve de una embestida. */
export function buildLurk(stage: StageId, id: FighterId, startSx: number, rnd: () => number, heroSx?: number): LurkScript {
  const opts = lurkOptions(stage, id);
  const name = opts[Math.floor(rnd() * opts.length)];
  const side: 1 | -1 = startSx < 0.5 ? 1 : -1;
  const raw: LurkKey[] = [
    { dt: 0, sx: startSx, d: 0, rot: 0, sink: 0, alpha: 1, pose: 'walk', jitter: 0 },
    // retrocede hacia el fondo, sin prisa
    { dt: 90, sx: S(side, 0.15), d: 1 },
    ...BODIES[name](rnd, side),
  ];
  const aimIndex = raw.length;
  raw.push(
    { dt: 12, jitter: 2, pose: 'attack', rot: 0, sink: 0, alpha: 1, sound: 'screamer' },
    // se viene encima: el destino se apunta cuando arranca, según donde esté Juan
    { dt: 26, d: 0 },
  );
  const keys: Frozen[] = [];
  let t = 0;
  for (const k of raw) {
    t += k.dt;
    const prev = keys[keys.length - 1];
    const f: Frozen = {
      t, hop: k.hop ?? 0, snap: !!k.snap, sound: k.sound, lift: 0, sy: 1, moved: false,
      sx: k.sx ?? prev?.sx ?? startSx, d: k.d ?? prev?.d ?? 0, rot: k.rot ?? prev?.rot ?? 0, sink: k.sink ?? prev?.sink ?? 0,
      alpha: k.alpha ?? prev?.alpha ?? 1, pose: k.pose ?? prev?.pose ?? 'idle', jitter: k.jitter ?? (k.snap ? prev?.jitter ?? 0 : 0),
      face: k.face ?? prev?.face ?? 1,
    };
    // sin cara dada, mira hacia donde camina
    if (k.face === undefined && prev && !k.snap && Math.abs(f.sx - prev.sx) > 0.01) f.face = f.sx > prev.sx ? 1 : -1;
    f.moved = !!prev && f.snap && (Math.abs(f.sx - prev.sx) > 0.02 || Math.abs(f.d - prev.d) > 0.02);
    keys.push(f);
  }
  // lo que hace al fondo no puede quedar tapado detrás de Juan
  if (heroSx !== undefined) for (let i = 1; i < aimIndex; i++) {
    const k = keys[i];
    if (k.sx > -0.05 && k.sx < 1.05 && Math.abs(k.sx - heroSx) < HERO_CLEAR) {
      const away = heroSx < 0.5 ? 1 : -1;
      k.sx = heroSx + away * HERO_CLEAR;
    }
  }
  return { name, keys, total: t, aimAt: keys[aimIndex].t, line: LINES[Math.floor(rnd() * LINES.length)] };
}

/** Destino de la embestida: a unos pasos de Juan, del lado donde hay más espacio. */
export function aimLurk(s: LurkScript, heroSx: number): void {
  const last = s.keys[s.keys.length - 1];
  const sx = heroSx > 0.5 ? heroSx - 0.32 : heroSx + 0.32;
  last.sx = Math.max(0.1, Math.min(0.9, sx));
  last.face = last.sx < heroSx ? 1 : -1;
  s.keys[s.keys.length - 2].face = last.face;
}

const ease = (u: number) => 0.5 - Math.cos(Math.PI * u) / 2;

/** Estado de la escena en un fotograma: lo continuo se interpola, lo discreto (pose, cara) es del tramo. */
export function lurkAt(s: LurkScript, f: number): LurkState {
  const ks = s.keys;
  if (f <= 0) return pick(ks[0]);
  if (f >= s.total) return pick(ks[ks.length - 1]);
  let i = 0;
  while (i < ks.length - 1 && ks[i + 1].t <= f) i++;
  const a = ks[i], b = ks[i + 1];
  // recién aparecido en otro sitio: se aclara despacio en vez de saltar a la vista
  const appear = a.moved ? Math.min(1, (f - a.t) / APPEAR_FRAMES) : 1;
  if (b.snap) { const st = pick(a); st.alpha *= appear; return st; }
  const u = (f - a.t) / Math.max(1, b.t - a.t);
  // los brincos van parejos (sube y cae); lo demás arranca y frena suave
  const e = b.hop > 0 ? u : ease(u);
  const lerp = (p: number, q: number) => p + (q - p) * e;
  return {
    sx: lerp(a.sx, b.sx), d: lerp(a.d, b.d), rot: lerp(a.rot, b.rot), sink: lerp(a.sink, b.sink), alpha: lerp(a.alpha, b.alpha) * appear,
    face: b.face, pose: b.pose, jitter: b.jitter, lift: Math.sin(Math.PI * u) * b.hop,
    sy: b.hop > 0 && u > 0.85 ? 1 - (u - 0.85) * 0.8 : 1,
  };
}

const pick = (k: Frozen): LurkState => {
  const o = {} as Record<string, unknown>;
  for (const f of FIELDS) o[f] = k[f];
  return { ...(o as Omit<LurkState, 'face' | 'lift' | 'sy'>), face: k.face, lift: 0, sy: 1 };
};

/** Sonidos que tocan entre el fotograma anterior y este. */
export function lurkSounds(s: LurkScript, from: number, to: number): SfxName[] {
  return s.keys.filter((k) => k.sound && k.t > from && k.t <= to).map((k) => k.sound!);
}
