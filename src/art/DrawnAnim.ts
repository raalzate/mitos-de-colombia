import type { FighterId, FighterState } from '../combat/CombatTypes';
import { DRAWN_ANIM, type DrawnAction } from './drawnAnimManifest';
import { DRAWN_METRICS } from './drawnAnimMetrics';
import { GETUP_FRAMES } from '../entities/Fighter';

/**
 * Animación dibujada fotograma a fotograma (tiras de `public/assets/anim`):
 * elige tira y fotograma a partir del estado lógico del luchador. Puro, sin Phaser.
 * Solo se muestra un fotograma original a la vez (TC-04): la fluidez sale del ritmo
 * (poses clave sostenidas) y de transformaciones del fotograma entero (`drawnMotion`).
 */
export interface DrawnFrame {
  action: DrawnAction;
  index: number;
}

export interface AttackProgress { frame: number; startup: number; active: number; recovery: number }

export interface DrawnFrameInput {
  state: FighterState;
  anim: string;
  animFrame: number;
  /** fotograma global del combate (para ciclos) */
  frame: number;
  grounded: boolean;
  /** caminando hacia atrás (vx opuesto a facing): el ciclo se reproduce en reversa */
  backward?: boolean;
  /** distancia recorrida andando (px); si se da, el ciclo avanza por distancia y no por tiempo */
  walkDistance?: number;
  /** subiendo en el salto */
  rising?: boolean;
  /** velocidad vertical (px/frame, negativa = sube): fase continua del salto */
  vy?: number;
  /** velocidad horizontal relativa a la mirada (>0 hacia delante): salto con voltereta */
  vxForward?: number;
  /** frames en el estado actual: transiciones al agacharse y bloquear */
  stateFrame?: number;
  /** avance del golpe en curso: el fotograma sigue preparación → impacto → recuperación */
  attackProgress?: AttackProgress;
  /** frames tumbado tras caer (Fighter.knockdownLying) */
  lying?: number;
  /** frames desde que aterrizó de un salto (undefined = no aterrizó hace poco) */
  landing?: number;
  /** golpe recibido: aturdimiento restante e inicial, y hitstop restante */
  stun?: number;
  stunStart?: number;
  hitstop?: number;
}

/** Transformación del fotograma entero. `center`: gira alrededor del centro del cuerpo (volteretas). */
export interface DrawnPose { dx: number; dy: number; rot: number; sx: number; sy: number; center?: boolean }

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 2;
const easeInOut = (t: number) => { const x = clamp01(t); return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2; };

/** Índice en la tira de un golpe según su avance: preparación (s→e), impacto (e), recuperación (e→E). */
export function attackIndex(s: number, e: number, E: number, p: AttackProgress): number {
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * clamp01(t));
  if (p.frame < p.startup) return lerp(s, e, p.startup > 0 ? p.frame / p.startup : 1);
  if (p.frame < p.startup + p.active) return e;
  const t = p.recovery > 0 ? (p.frame - p.startup - p.active) / p.recovery : 1;
  return E > e ? lerp(e, E, t) : lerp(e, s, t);
}

export function drawnAnimKey(id: FighterId, slot: 'p1' | 'p2', action: DrawnAction): string {
  return `anim_${id}_${slot}_${action}`;
}

export function drawnAnimFile(id: FighterId, slot: 'p1' | 'p2', action: DrawnAction): string {
  return `anim/${id}_${action}_${slot}.png`;
}

const CROUCH_FROM_ATTACK = new Set<FighterId>(['patasola']);

/** Velocidad del ciclo de andar (fotogramas lógicos por fotograma dibujado) cuando no hay distancia. */
export const WALK_FRAME_TICKS = 5;
/** Píxeles recorridos por fotograma clave de andar: los pies no patinan. Con intermedios sintetizados, la mitad. */
export const WALK_STRIDE_PX = 7;

/** Fotograma del ciclo de andar según la distancia recorrida (sin deslizamiento de pies). */
export function walkFrameByDistance(distance: number, frames: number, stride = WALK_STRIDE_PX): number {
  return Math.floor(Math.max(0, distance) / stride) % frames;
}

/**
 * Fase del ciclo de andar: fotograma actual, siguiente y avance `t` (0..1) entre ambos.
 * `bob` es el balanceo vertical (px, negativo = arriba), máximo en mitad de cada paso;
 * `footfall` es true justo al entrar en un fotograma de contacto (inicio y mitad del ciclo).
 */
export function walkPhase(distance: number, frames: number, stride = WALK_STRIDE_PX, backward = false): { index: number; next: number; t: number; bob: number; footfall: boolean } {
  const d = Math.max(0, distance);
  const k = Math.floor(d / stride);
  const t = d / stride - k;
  const dir = backward ? -1 : 1;
  const index = ((k * dir) % frames + frames) % frames;
  const next = ((index + dir) % frames + frames) % frames;
  const stepLen = stride * frames / 2;
  const phase = (d % stepLen) / stepLen;
  const bob = -Math.round(Math.sin(phase * Math.PI) * 1.5 * 10) / 10;
  const footfall = t < 1e-6 && (index === 0 || index === Math.floor(frames / 2));
  return { index, next, t, bob, footfall };
}

/* --------------------------- poses clave por personaje --------------------------- */

/**
 * Poses clave de la tira de golpes. Cada tira es un solo golpe dibujado
 * (guardia, preparación, golpe, golpe a fondo, recuperación): los golpes ligeros
 * impactan con el primer fotograma de golpe y los fuertes con el de máxima extensión.
 */
export interface StrikeKeys { wind: number; light: number; heavy: number; rec: number[] }

export function strikeKeys(id: FighterId): StrikeKeys {
  const n = DRAWN_ANIM[id].attack.frames;
  const heavy = Math.min(3, n - 2);
  const rec: number[] = [];
  for (let k = heavy + 1; k < n; k++) rec.push(k);
  return { wind: 1, light: 2, heavy, rec };
}

/** Fotogramas de la tira de caída que sirven de reacción al golpe: [golpe ligero, golpe fuerte]. */
const HIT_FRAMES: Partial<Record<FighterId, [number, number]>> = {
  madremonte: [2, 4], patasola: [1, 3], llorona: [4, 5], sombreron: [1, 4],
  mohan: [4, 5], muelona: [4, 5], silbon: [4, 5], juanmachete: [3, 4], bachue: [3, 4],
};
/** En la caída de PixelLab el Hombre Caimán pierde la cola al retroceder: usa su tira de daño original. */
const HIT_FROM_HURT = new Set<FighterId>(['hombrecaiman']);
/** Correcciones a la tira de caída: Juan Machete vuela horizontal en el fotograma 5. */
const FALL_AIR_END: Partial<Record<FighterId, number>> = { juanmachete: 5 };

/** Fracción de la recuperación en la que el golpe se queda extendido (seguimiento). */
export const STRIKE_FOLLOW = 0.4;

/**
 * Fotograma de un golpe con ritmo de pelea de 16 bits: la preparación se sostiene en la
 * anticipación, el impacto aparece justo en los frames activos y se mantiene durante el
 * seguimiento; después la recuperación vuelve a la guardia.
 */
export function strikeIndex(k: StrikeKeys, heavy: boolean, p: AttackProgress): number {
  const hit = heavy ? k.heavy : k.light;
  if (p.frame < p.startup) return p.startup >= 3 && p.frame === 0 ? 0 : k.wind;
  if (p.frame < p.startup + p.active) return hit;
  const t = p.recovery > 0 ? (p.frame - p.startup - p.active) / p.recovery : 1;
  const follow = heavy ? STRIKE_FOLLOW + 0.1 : STRIKE_FOLLOW;
  if (t < follow) return hit;
  // recuperación: los fotogramas posteriores al golpe (el ligero vuelve por la preparación)
  const back = heavy || k.light === k.heavy ? k.rec : [k.wind];
  if (!back.length) return k.wind;
  const u = (t - follow) / (1 - follow);
  return back[Math.min(back.length - 1, Math.floor(u * back.length))];
}

/** Desplazamiento e inclinación del golpe: recoge atrás, se lanza al impacto y vuelve con suavidad. */
export function strikeMotion(p: AttackProgress, heavy: boolean, kick: boolean): { dx: number; rot: number } {
  const reach = heavy ? 5 : 3;
  const lean = kick ? -3 : heavy ? 4 : 2;
  if (p.frame < p.startup) {
    const t = p.startup > 0 ? (p.frame + 1) / p.startup : 1;
    return { dx: -(heavy ? 3 : 2) * easeOut(t), rot: -2 * easeOut(t) };
  }
  if (p.frame < p.startup + p.active) return { dx: reach, rot: lean };
  const t = p.recovery > 0 ? (p.frame - p.startup - p.active) / p.recovery : 1;
  const follow = heavy ? STRIKE_FOLLOW + 0.1 : STRIKE_FOLLOW;
  const r = t < follow ? 1 : 1 - easeInOut((t - follow) / (1 - follow));
  return { dx: reach * r, rot: lean * r };
}

/** Retroceso al recibir un golpe: máximo y sostenido durante el hitstop, luego vuelve a la guardia. */
export function hitRecoil(stun: number, stunStart: number, heavy: boolean): { dx: number; rot: number } {
  const t = stunStart > 0 ? 1 - stun / stunStart : 1;
  const r = t < 0.25 ? 1 : 1 - easeInOut((t - 0.25) / 0.75);
  const a = heavy ? 1 : 0.6;
  return { dx: -4 * a * r, rot: -9 * a * r };
}

/** Temblor del que recibe el golpe durante el hitstop (px), más fuerte en golpes fuertes. */
export function hitShake(hitstop: number): number {
  if (hitstop <= 0) return 0;
  const amp = hitstop >= 6 ? 2 : 1;
  return hitstop % 2 === 0 ? amp : -amp;
}

/** Aplastamiento al aterrizar: fotograma agachado 3 frames y la figura se estira de vuelta. */
export const LAND_FRAMES = 9;
export const LAND_TUCK = 3;
export function landSquash(n: number): { sx: number; sy: number } {
  if (n < 0 || n >= LAND_FRAMES) return { sx: 1, sy: 1 };
  if (n < LAND_TUCK) return { sx: 1.08, sy: 0.9 };
  const t = (n - LAND_TUCK) / (LAND_FRAMES - LAND_TUCK);
  const s = 0.07 * (1 - easeOut(t));
  return { sx: 1 + s, sy: 1 - s };
}

/** Velocidades verticales entre las que dura la voltereta del salto con dirección. */
const FLIP_FROM = -5;
const FLIP_TO = 4.5;
/** Fase de la voltereta (0..1) o null si no hay voltereta. */
export function flipPhase(vy: number, vxForward: number): number | null {
  if (Math.abs(vxForward) < 0.1 || vy < FLIP_FROM || vy > FLIP_TO) return null;
  return (vy - FLIP_FROM) / (FLIP_TO - FLIP_FROM);
}

/** Ciclo tumbado: rebote al caer y fotogramas desde el impacto hasta la pose tumbada. */
export const LAND_BOUNCE_FRAMES = 8;

/** Fotograma agachado/encogido (pose de voltereta y aterrizaje). */
function tuckFrame(id: FighterId): DrawnFrame {
  if (CROUCH_FROM_ATTACK.has(id)) return { action: 'attack', index: 0 };
  return DRAWN_ANIM[id].trans ? { action: 'trans', index: 1 } : { action: 'walk', index: 0 };
}

function standFrame(id: FighterId): DrawnFrame {
  return DRAWN_ANIM[id].idle ? { action: 'idle', index: 0 } : { action: 'walk', index: 0 };
}

const isKick = (anim: string) => anim.includes('kick') || anim === 'special2';
const isHeavy = (anim: string) => anim === 'heavy' || anim === 'heavykick' || anim === 'airkick' || anim === 'special2';

/**
 * Devuelve la tira y el fotograma para cualquier estado: todo el personaje sale de las
 * mismas tiras, así nunca cambia de "dibujo" entre acciones (estilo Mortal Kombat).
 * null solo si el personaje no tiene tiras.
 */
export function drawnFrame(id: FighterId, i: DrawnFrameInput): DrawnFrame | null {
  const m = DRAWN_ANIM[id];
  if (!m) return null;
  const walkN = m.walk.frames;
  const hurtN = m.hurt.frames;
  const keys = strikeKeys(id);
  const strike = (heavy: boolean, f: number): DrawnFrame => {
    if (i.attackProgress) return { action: 'attack', index: strikeIndex(keys, heavy, i.attackProgress) };
    return { action: 'attack', index: [keys.wind, heavy ? keys.heavy : keys.light, keys.rec[0] ?? keys.wind][Math.min(2, f)] };
  };
  const trans = m.trans;
  const fall = m.fall;
  /** fotograma tumbado de la tira de caída (~60 % de la tira) */
  const fallLying = fall ? fall.lying ?? Math.round(0.6 * (fall.frames - 1)) : 0;
  const fallAir = fall ? fall.air ?? 4 : 0;
  const fallAirEnd = fall ? FALL_AIR_END[id] ?? fall.airEnd ?? Math.max(fallAir, fallLying - 1) : 0;
  const getup = hurtN >= 6 ? 4 : hurtN - 2;
  switch (i.anim) {
    case 'idle':
      if (i.landing !== undefined && i.landing < LAND_TUCK) return tuckFrame(id);
      // postura de guardia: ciclo de 8 fotogramas (sube y baja la guardia) a 12 fps; la postura de MK II tiene 7 a 12,5 fps
      return m.idle ? { action: 'idle', index: Math.floor(i.frame / 5) % m.idle.frames } : { action: 'walk', index: 0 };
    case 'walk': {
      const stride = m.walk.interpolated ? WALK_STRIDE_PX / 2 : WALK_STRIDE_PX;
      if (i.walkDistance !== undefined) return { action: 'walk', index: walkPhase(i.walkDistance, walkN, stride, i.backward).index };
      const k = Math.floor(i.frame / WALK_FRAME_TICKS) % walkN;
      return { action: 'walk', index: i.backward ? (walkN - k) % walkN : k };
    }
    case 'jump': {
      // impulso y aterrizaje encogido; voltereta encogida con dirección; en vertical, encogido en la cima
      const vy = i.vy ?? (i.rising ? -5 : 5);
      if ((i.stateFrame ?? 99) < 2) return tuckFrame(id);
      if (flipPhase(vy, i.vxForward ?? 0) !== null) return tuckFrame(id);
      if (Math.abs(vy) < 2.6) return tuckFrame(id);
      return standFrame(id);
    }
    case 'crouch':
    case 'crouchblock': {
      const sf = i.stateFrame ?? 99;
      // en la hoja, el fotograma de levantarse de Patasola es ella tumbada: se agacha con su pose encorvada
      if (CROUCH_FROM_ATTACK.has(id)) return sf < 3 && trans ? { action: 'trans', index: 0 } : { action: 'attack', index: 0 };
      if (trans && sf < 3) return { action: 'trans', index: 0 };
      if (trans && sf < 6) return { action: 'trans', index: 1 };
      return { action: 'hurt', index: getup };
    }
    case 'block':
      if (trans && (i.stateFrame ?? 99) < 4) return { action: 'trans', index: 2 };
      return { action: 'attack', index: 0 };
    case 'special1':
      return strike(false, i.animFrame);
    case 'special2':
      return strike(true, i.animFrame);
    case 'ultimate':
      return [{ action: 'attack' as const, index: keys.wind }, { action: 'attack' as const, index: keys.heavy }, { action: 'hurt' as const, index: hurtN - 1 }][Math.min(2, i.animFrame)];
    case 'hit': {
      // con caída de PixelLab: sus primeros fotogramas son el retroceso del golpe (mismo dibujo que la caída)
      if (fall && !HIT_FROM_HURT.has(id)) {
        const [light, heavy] = HIT_FRAMES[id] ?? [1, 2];
        return { action: 'fall', index: Math.min(fall.frames - 1, i.animFrame > 0 ? heavy : light) };
      }
      return { action: 'hurt', index: i.animFrame > 0 ? Math.min(1, hurtN - 1) : 0 };
    }
    case 'light':
    case 'heavy':
    case 'lightkick':
    case 'heavykick':
    case 'airlight':
    case 'airkick':
      return strike(isHeavy(i.anim), i.animFrame);
    // tira de daño: [golpe, golpe fuerte, caída, tumbado, levantarse, victoria]; con 5 fotogramas
    // falta uno de los intermedios, así que se cuenta desde el final.
    case 'knockdown': {
      if (fall) {
        // tira de PixelLab: [de pie, retroceso…, en el aire, impacto, tumbado, levantándose…, de pie]
        if (i.state === 'defeat') return { action: 'fall', index: fallLying };
        if (i.grounded) {
          // impacto contra el suelo: los fotogramas entre el vuelo y la pose tumbada, 3 frames cada uno
          const k = Math.floor((i.lying ?? 99) / 3);
          return { action: 'fall', index: Math.min(fallLying, fallAirEnd + 1 + k) };
        }
        const t = clamp01(((i.vy ?? 0) + 4) / 8);
        return { action: 'fall', index: Math.round(fallAir + (fallAirEnd - fallAir) * t) };
      }
      if (i.state === 'defeat' || i.grounded) return { action: 'hurt', index: hurtN >= 6 ? 3 : hurtN - 2 };
      return { action: 'hurt', index: Math.min(2, hurtN - 1) };
    }
    case 'getup': {
      if (fall) {
        const first = fallLying + 1;
        const k = Math.floor(((i.stateFrame ?? 0) / GETUP_FRAMES) * (fall.frames - first));
        return { action: 'fall', index: Math.min(fall.frames - 1, first + Math.max(0, k)) };
      }
      return { action: 'hurt', index: getup };
    }
    case 'victory':
      return { action: 'hurt', index: hurtN - 1 };
    default:
      return m.idle ? { action: 'idle', index: 0 } : { action: 'walk', index: 0 };
  }
}

/* --------------------------- alineación entre tiras --------------------------- */

const metric = (id: FighterId, action: DrawnAction, index: number) => DRAWN_METRICS[id]?.[action]?.[index];
const refMetric = (id: FighterId) => metric(id, 'idle', 0) ?? metric(id, 'walk', 0);

/** Altura visible del personaje de pie (px). */
export function standHeight(id: FighterId): number {
  return refMetric(id)?.[2] ?? 70;
}

/** Altura (px sobre el borde inferior del fotograma) del centro del cuerpo visible. */
export function frameCenterY(id: FighterId, action: DrawnAction, index: number): number {
  const mm = metric(id, action, index);
  return mm ? mm[1] + mm[2] / 2 : 36;
}

/**
 * Corrección para que todas las tiras compartan eje y línea de suelo: el fotograma de guardia
 * de cada tira se centra como el de reposo y, en el suelo, los pies tocan la misma línea.
 * Las tiras de golpe conservan su altura dibujada (saltos y estocadas en el aire).
 */
export function stripAnchor(id: FighterId, action: DrawnAction, index: number, grounded: boolean): { dx: number; dy: number } {
  const ref = refMetric(id);
  const first = metric(id, action, 0);
  const cur = metric(id, action, index);
  if (!ref || !first || !cur) return { dx: 0, dy: 0 };
  const dx = ref[0] - first[0];
  const dy = grounded && action !== 'attack' ? cur[1] - ref[1] : 0;
  return { dx, dy };
}

/* --------------------------- transformación del fotograma --------------------------- */

/**
 * Pose (desplazamiento, giro, escala) del fotograma entero según el estado: anticipación e
 * impacto de los golpes, retroceso del golpe recibido, estirarse y encogerse en el salto,
 * voltereta, aplastamiento al aterrizar y rebote al caer. Determinista por frame lógico.
 */
export function drawnMotion(id: FighterId, i: DrawnFrameInput): DrawnPose {
  const pose: DrawnPose = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 };
  switch (i.anim) {
    case 'idle': {
      if (i.landing !== undefined && i.landing < LAND_FRAMES) {
        const s = landSquash(i.landing);
        pose.sx = s.sx; pose.sy = s.sy;
      } else if (id === 'patasola') pose.dy = -Math.abs(Math.round(Math.sin(i.frame / 13) * 2));
      else pose.sy = 1 + Math.sin(i.frame / 11) * 0.008;
      break;
    }
    case 'walk': {
      const n = DRAWN_ANIM[id].walk.frames;
      if (i.walkDistance !== undefined) pose.dy = walkPhase(i.walkDistance, n, WALK_STRIDE_PX, i.backward).bob;
      if (i.landing !== undefined && i.landing < LAND_FRAMES) {
        const s = landSquash(Math.max(LAND_TUCK, i.landing));
        pose.sx = s.sx; pose.sy = s.sy;
      }
      break;
    }
    case 'jump': {
      const vy = i.vy ?? 0;
      const sf = i.stateFrame ?? 99;
      const flip = flipPhase(vy, i.vxForward ?? 0);
      if (sf < 2) { pose.sx = 1.06; pose.sy = 0.92; break; }
      if (flip !== null) {
        pose.center = true;
        pose.rot = 360 * easeInOut(flip) * Math.sign(i.vxForward ?? 0);
        break;
      }
      if (Math.abs(vy) < 2.6) { pose.center = true; break; }
      // estirado al subir (más al despegar) y ligeramente al bajar buscando el suelo
      const s = vy < 0 ? 0.03 + 0.05 * clamp01((-vy - 2.6) / 4) : 0.03;
      pose.sx = 1 - s * 0.6; pose.sy = 1 + s;
      break;
    }
    case 'crouch':
    case 'crouchblock':
      if ((i.stateFrame ?? 99) < 3) { pose.sy = 0.94; pose.sx = 1.03; }
      break;
    case 'hit': {
      const r = hitRecoil(i.stun ?? 0, i.stunStart ?? 0, (i.stunStart ?? 0) > 14);
      pose.dx = r.dx; pose.rot = r.rot;
      break;
    }
    case 'knockdown': {
      if (i.state === 'defeat') break;
      if (!i.grounded) {
        // en el aire se inclina hacia atrás según baja
        const down = clamp01(((i.vy ?? 0) + 4) / 10);
        pose.rot = -(3 + 9 * down);
      } else if ((i.lying ?? 99) < LAND_BOUNCE_FRAMES) {
        pose.dy = -Math.round(4 * Math.sin(Math.PI * (i.lying ?? 0) / LAND_BOUNCE_FRAMES));
      }
      break;
    }
    default:
      if (i.attackProgress && (i.state === 'attack' || i.state === 'special')) {
        const m = strikeMotion(i.attackProgress, isHeavy(i.anim), isKick(i.anim));
        pose.dx = m.dx; pose.rot = m.rot;
      }
  }
  return pose;
}
