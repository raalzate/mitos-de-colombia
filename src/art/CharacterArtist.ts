import type { FighterId } from '../combat/CombatTypes';
import { Pixmap, hexToRgba, type Rgba } from './PixelPainter';

/**
 * Generador de sprites de personaje: esqueleto 2D con cinemática directa,
 * poses por fotograma y decoración específica por personaje. Resultado: hoja
 * de sprites en cuadrícula + tabla de animaciones (nombre → índices de frame).
 */

export const FRAME_W = 80;
export const FRAME_H = 96;
/** Línea del suelo dentro del frame (los pies tocan aquí). */
export const BASELINE = 93;
export const ORIGIN_Y = BASELINE / FRAME_H;

export interface Palette {
  skin: number;
  skinDark: number;
  hair: number;
  hairDark: number;
  cloth: number;
  clothDark: number;
  accent: number;
  accentLight: number;
  eye: number;
  outline: number;
}

/** Rasgos visuales que el decorador genérico sabe dibujar. */
export interface Look {
  hair: 'vines' | 'wild' | 'long' | 'veil' | 'short' | 'none';
  hat: 'none' | 'wide' | 'straw' | 'ranch';
  beard: 'none' | 'full' | 'mustache';
  lower: 'leaves' | 'loincloth' | 'dress' | 'pants' | 'skirt';
  shirt: boolean;
  scales: boolean;
  jewels: boolean;
  flowers: boolean;
  teeth: boolean;
  tears: boolean;
  oneLeg: boolean;
  claws: boolean;
  sack: boolean;
  fire: boolean;
  machete: boolean;
  female: boolean;
}

const L = (o: Partial<Look>): Look => ({
  hair: 'short', hat: 'none', beard: 'none', lower: 'pants', shirt: false, scales: false, jewels: false, flowers: false,
  teeth: false, tears: false, oneLeg: false, claws: false, sack: false, fire: false, machete: false, female: false, ...o,
});

export const LOOKS: Record<FighterId, Look> = {
  madremonte: L({ hair: 'vines', lower: 'leaves', flowers: true, female: true }),
  patasola: L({ hair: 'wild', lower: 'skirt', oneLeg: true, claws: true, female: true }),
  hombrecaiman: L({ hair: 'short', lower: 'loincloth', scales: true, claws: true }),
  llorona: L({ hair: 'long', lower: 'dress', tears: true, female: true }),
  sombreron: L({ hair: 'long', hat: 'wide', lower: 'pants', shirt: true }),
  mohan: L({ hair: 'wild', beard: 'full', lower: 'loincloth' }),
  muelona: L({ hair: 'long', lower: 'dress', teeth: true, claws: true, female: true }),
  silbon: L({ hair: 'short', hat: 'straw', lower: 'pants', shirt: true, sack: true }),
  juanmachete: L({ hair: 'short', hat: 'ranch', beard: 'mustache', lower: 'pants', shirt: true, fire: true, machete: true }),
  bachue: L({ hair: 'long', lower: 'skirt', jewels: true, female: true }),
};

type PalPair = { p1: Palette; p2: Palette };
const pal = (p: Palette): Palette => p;

export const PALETTES: Record<FighterId, PalPair> = {
  madremonte: {
    p1: pal({ skin: 0x7a9a4a, skinDark: 0x4e6a30, hair: 0x2e6a2c, hairDark: 0x1a4020, cloth: 0x3e7a2a, clothDark: 0x24521c, accent: 0xd84a8a, accentLight: 0xf0d050, eye: 0xffe36a, outline: 0x0f1a0c }),
    p2: pal({ skin: 0x7a6a3a, skinDark: 0x52461f, hair: 0x8a5a22, hairDark: 0x5c3a14, cloth: 0xb0702a, clothDark: 0x7a4a18, accent: 0x5ad0ff, accentLight: 0xfff0a0, eye: 0xa0ffff, outline: 0x1a120a }),
  },
  patasola: {
    p1: pal({ skin: 0x8a9a84, skinDark: 0x5a6a58, hair: 0x1c1816, hairDark: 0x0c0a0a, cloth: 0x4a5a3a, clothDark: 0x2e3a24, accent: 0xc01828, accentLight: 0xff5060, eye: 0xffffff, outline: 0x0a0c0a }),
    p2: pal({ skin: 0x7a8a7a, skinDark: 0x4e5c4e, hair: 0x3a1a3a, hairDark: 0x200c20, cloth: 0x2a3a4a, clothDark: 0x18222e, accent: 0x40c0ff, accentLight: 0xa0e0ff, eye: 0xd0ffd0, outline: 0x0a0c0c }),
  },
  hombrecaiman: {
    p1: pal({ skin: 0x4a7a3a, skinDark: 0x2e5226, hair: 0x3a5a2a, hairDark: 0x1e3618, cloth: 0x8a6a4a, clothDark: 0x5c4630, accent: 0x9ac860, accentLight: 0xe8e0b0, eye: 0xffd020, outline: 0x0c140a }),
    p2: pal({ skin: 0x4a7a7a, skinDark: 0x2e5252, hair: 0x2a2a3a, hairDark: 0x141420, cloth: 0x8a5a30, clothDark: 0x5c3a1e, accent: 0x60d0d0, accentLight: 0xa0ffff, eye: 0xff8020, outline: 0x0a1214 }),
  },
  llorona: {
    p1: pal({ skin: 0xc8c8d0, skinDark: 0x8a8a9c, hair: 0x202028, hairDark: 0x101016, cloth: 0xe8e8f0, clothDark: 0xa8a8bc, accent: 0x70b8ff, accentLight: 0xd8f0ff, eye: 0x202030, outline: 0x141420 }),
    p2: pal({ skin: 0xc8b8c8, skinDark: 0x8a7a90, hair: 0x30303c, hairDark: 0x18181f, cloth: 0x484858, clothDark: 0x2c2c38, accent: 0xb080ff, accentLight: 0xe8d8ff, eye: 0xd8e8ff, outline: 0x100c14 }),
  },
  sombreron: {
    p1: pal({ skin: 0x8a8a90, skinDark: 0x5c5c64, hair: 0x14121a, hairDark: 0x08080c, cloth: 0x1c1a24, clothDark: 0x0e0d14, accent: 0x6040a0, accentLight: 0xc0a0ff, eye: 0xf0f0f0, outline: 0x06060a }),
    p2: pal({ skin: 0x8a7060, skinDark: 0x5c4a40, hair: 0x1c1418, hairDark: 0x0c080a, cloth: 0x4a1c1c, clothDark: 0x2a0e0e, accent: 0xff6040, accentLight: 0xffc0a0, eye: 0xff8040, outline: 0x0a0606 }),
  },
  mohan: {
    p1: pal({ skin: 0xb07a4a, skinDark: 0x7c5230, hair: 0x5a3a1e, hairDark: 0x362210, cloth: 0x7a5a3a, clothDark: 0x4e3a24, accent: 0xe8d8a0, accentLight: 0xffffff, eye: 0x402818, outline: 0x120a06 }),
    p2: pal({ skin: 0x6a6a5a, skinDark: 0x45453a, hair: 0x3c1c2a, hairDark: 0x22101a, cloth: 0x8a2a5a, clothDark: 0x5a1a3c, accent: 0xff7ad0, accentLight: 0xffd8ee, eye: 0xff9af0, outline: 0x140a0e }),
  },
  muelona: {
    p1: pal({ skin: 0xb8a8a8, skinDark: 0x807070, hair: 0x1a1018, hairDark: 0x0c080c, cloth: 0x6a6a48, clothDark: 0x44442c, accent: 0xff2040, accentLight: 0xffffff, eye: 0xff4060, outline: 0x0c060c }),
    p2: pal({ skin: 0xa8b8b0, skinDark: 0x708078, hair: 0x201a10, hairDark: 0x100c08, cloth: 0x10304a, clothDark: 0x0a1c2c, accent: 0x40ff80, accentLight: 0xffffff, eye: 0x60ff90, outline: 0x060c0c }),
  },
  silbon: {
    p1: pal({ skin: 0xd8d0c0, skinDark: 0x9a9080, hair: 0x2a2018, hairDark: 0x14100a, cloth: 0xb8a888, clothDark: 0x7a6e58, accent: 0xe8e0c0, accentLight: 0xffffff, eye: 0x101010, outline: 0x0e0c0a }),
    p2: pal({ skin: 0x9a9070, skinDark: 0x686048, hair: 0x2a2a30, hairDark: 0x14141a, cloth: 0x708a8a, clothDark: 0x4a5c5c, accent: 0xe0f0f0, accentLight: 0xffffff, eye: 0xff2020, outline: 0x0a0c0c }),
  },
  juanmachete: {
    p1: pal({ skin: 0xb07850, skinDark: 0x7c5236, hair: 0x2a1a10, hairDark: 0x160c06, cloth: 0xd8d0c0, clothDark: 0x9a948a, accent: 0xff7020, accentLight: 0xffe060, eye: 0x302010, outline: 0x100a06 }),
    p2: pal({ skin: 0x9a7050, skinDark: 0x6a4a36, hair: 0x1a1a2a, hairDark: 0x0c0c16, cloth: 0x4a4a68, clothDark: 0x2e2e44, accent: 0x40a0ff, accentLight: 0xa0e0ff, eye: 0x60c0ff, outline: 0x08080e }),
  },
  bachue: {
    p1: pal({ skin: 0x8a5a3a, skinDark: 0x5e3c26, hair: 0x1c1410, hairDark: 0x0e0a08, cloth: 0x2a8a8a, clothDark: 0x1a5c5c, accent: 0xe0a830, accentLight: 0x60e0e0, eye: 0x40c0d0, outline: 0x0a0e0e }),
    p2: pal({ skin: 0x8a6a58, skinDark: 0x5c4838, hair: 0x2a1c14, hairDark: 0x160e0a, cloth: 0x8a4a2a, clothDark: 0x5c301a, accent: 0xffb040, accentLight: 0xfff0c0, eye: 0xffd060, outline: 0x0e0a08 }),
  },
};

interface Rig {
  legUpper: number;
  legLower: number;
  torso: number;
  neck: number;
  headRx: number;
  headRy: number;
  armUpper: number;
  armLower: number;
  thighT: number;
  shinT: number;
  armT: number;
  foreT: number;
  hipW: number;
  shoulderW: number;
}

const RIG_BIG: Rig = { legUpper: 15, legLower: 15, torso: 21, neck: 3, headRx: 7, headRy: 7, armUpper: 12, armLower: 11, thighT: 6, shinT: 5, armT: 5, foreT: 4, hipW: 14, shoulderW: 18 };
const RIG_MID: Rig = { legUpper: 15, legLower: 14, torso: 20, neck: 3, headRx: 6, headRy: 7, armUpper: 12, armLower: 11, thighT: 5, shinT: 4, armT: 4, foreT: 4, hipW: 11, shoulderW: 15 };
const RIG_SLIM: Rig = { legUpper: 15, legLower: 14, torso: 19, neck: 3, headRx: 6, headRy: 7, armUpper: 12, armLower: 11, thighT: 5, shinT: 4, armT: 4, foreT: 3, hipW: 10, shoulderW: 13 };
const RIG_TALL: Rig = { legUpper: 17, legLower: 16, torso: 21, neck: 4, headRx: 6, headRy: 7, armUpper: 13, armLower: 12, thighT: 4, shinT: 3, armT: 3, foreT: 3, hipW: 9, shoulderW: 12 };

const RIGS: Record<FighterId, Rig> = {
  madremonte: RIG_BIG,
  patasola: RIG_SLIM,
  hombrecaiman: RIG_BIG,
  llorona: RIG_MID,
  sombreron: RIG_MID,
  mohan: RIG_SLIM,
  muelona: RIG_MID,
  silbon: RIG_TALL,
  juanmachete: RIG_BIG,
  bachue: RIG_MID,
};

/**
 * Pose: ángulos en grados.
 * Piernas: 0 = hacia abajo, + = adelante. Rodilla: - = pie hacia atrás (flexión natural).
 * Brazos: 0 = colgando, 90 = al frente horizontal, 180 = arriba. Codo: + = antebrazo hacia delante/arriba.
 * lean: inclinación del torso (+ adelante). head: inclinación extra de cabeza.
 */
export interface Pose {
  lean: number;
  head: number;
  fHip: number; fKnee: number; // pierna delantera (más cerca del rival)
  bHip: number; bKnee: number; // pierna trasera
  fSh: number; fEl: number;    // brazo delantero
  bSh: number; bEl: number;    // brazo trasero
  /** desplazamiento horizontal del conjunto */
  dx: number;
  /** eleva todo el cuerpo (px) sin tocar los pies: para saltos/caídas */
  lift: number;
  /** altura mínima de cadera: fuerza agacharse / tumbarse */
  hipH: number | null;
}

const P = (o: Partial<Pose> = {}): Pose => ({
  lean: 0, head: 0,
  fHip: 8, fKnee: -6, bHip: -8, bKnee: -4,
  fSh: 40, fEl: 105, bSh: 30, bEl: 110,
  dx: 0, lift: 0, hipH: null,
  ...o,
});

interface Joint { x: number; y: number }
export interface Skeleton {
  hip: Joint; shoulder: Joint; headC: Joint; neck: Joint;
  fKnee: Joint; fFoot: Joint; bKnee: Joint; bFoot: Joint;
  fElbow: Joint; fHand: Joint; bElbow: Joint; bHand: Joint;
  lean: number;
}

const rad = (d: number) => (d * Math.PI) / 180;
/** vector "hacia abajo" rotado: 0 = abajo, + = adelante */
const down = (len: number, deg: number): Joint => ({ x: len * Math.sin(rad(deg)), y: len * Math.cos(rad(deg)) });
/** vector "hacia arriba" rotado: 0 = arriba, + = adelante */
const up = (len: number, deg: number): Joint => ({ x: len * Math.sin(rad(deg)), y: -len * Math.cos(rad(deg)) });
const add = (a: Joint, b: Joint): Joint => ({ x: a.x + b.x, y: a.y + b.y });

export function solveSkeleton(rig: Rig, pose: Pose, cx: number, groundY: number, oneLeg = false): Skeleton {
  // Piernas relativas a cadera
  const fK = down(rig.legUpper, pose.fHip);
  const fF = add(fK, down(rig.legLower, pose.fHip + pose.fKnee));
  const bK = oneLeg ? fK : down(rig.legUpper, pose.bHip);
  const bF = oneLeg ? fF : add(bK, down(rig.legLower, pose.bHip + pose.bKnee));
  let hipH = Math.max(fF.y, bF.y, 6);
  if (pose.hipH !== null) hipH = pose.hipH;
  const hip: Joint = { x: cx + pose.dx, y: groundY - hipH - pose.lift };
  const shoulder = add(hip, up(rig.torso, pose.lean));
  const neck = add(shoulder, up(rig.neck, pose.lean + pose.head));
  const headC = add(neck, up(rig.headRy, pose.lean + pose.head));
  const fSh = add(shoulder, { x: 1, y: 1 });
  const bSh = add(shoulder, { x: -2, y: 1 });
  const fE = add(fSh, down(rig.armUpper, pose.fSh));
  const fH = add(fE, down(rig.armLower, pose.fSh + pose.fEl));
  const bE = add(bSh, down(rig.armUpper, pose.bSh));
  const bH = add(bE, down(rig.armLower, pose.bSh + pose.bEl));
  return {
    hip, shoulder, neck, headC,
    fKnee: add(hip, fK), fFoot: add(hip, fF), bKnee: add(hip, bK), bFoot: add(hip, bF),
    fElbow: fE, fHand: fH, bElbow: bE, bHand: bH,
    lean: pose.lean,
  };
}

/* ------------------------------------------------------------------ */
/* Biblioteca de poses                                                  */
/* ------------------------------------------------------------------ */

export type AnimTable = Record<string, number[]>;

function walkCycle(n: number): Pose[] {
  const out: Pose[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const a = Math.sin(t) * 28;
    const kneeF = a > 0 ? -Math.max(0, Math.cos(t)) * 40 : -10;
    const kneeB = a < 0 ? -Math.max(0, -Math.cos(t)) * 40 : -10;
    out.push(P({
      fHip: a, fKnee: kneeF, bHip: -a, bKnee: kneeB,
      fSh: 40 - a * 0.4, bSh: 30 + a * 0.4,
      lean: 3,
    }));
  }
  return out;
}

const COMMON_POSES: Record<string, Pose[]> = {
  idle: [
    P(),
    P({ fSh: 42, bSh: 32, lean: 1, head: -1 }),
    P({ fSh: 44, bSh: 34, lean: 2, head: -2, fEl: 102, bEl: 108 }),
    P({ fSh: 42, bSh: 32, lean: 1, head: -1 }),
  ],
  walk: walkCycle(6),
  jump: [
    P({ fHip: 40, fKnee: -100, bHip: 25, bKnee: -90, fSh: 60, fEl: 80, bSh: 150, bEl: 20, lean: 8 }),
    P({ fHip: 15, fKnee: -40, bHip: -20, bKnee: -20, fSh: 70, fEl: 70, bSh: 20, bEl: 60, lean: 4 }),
  ],
  crouch: [
    P({ fHip: 75, fKnee: -140, bHip: 60, bKnee: -140, lean: 20, head: -10, fSh: 70, fEl: 90, bSh: 60, bEl: 100 }),
  ],
  block: [P({ fSh: 70, fEl: 120, bSh: 60, bEl: 125, lean: -4, head: 4 })],
  crouchblock: [
    P({ fHip: 75, fKnee: -140, bHip: 60, bKnee: -140, lean: 14, head: -6, fSh: 75, fEl: 115, bSh: 65, bEl: 120 }),
  ],
  light: [
    P({ fSh: 30, fEl: 120, bSh: 40, bEl: 100, lean: -2 }),
    P({ fSh: 92, fEl: 2, bSh: 40, bEl: 110, lean: 8, fHip: 14, fKnee: -8, bHip: -14 }),
    P({ fSh: 60, fEl: 70, bSh: 40, bEl: 110, lean: 4 }),
  ],
  heavy: [
    P({ bSh: 165, bEl: -30, fSh: 50, fEl: 100, lean: -10, head: -4 }),
    P({ bSh: 95, bEl: 0, fSh: 20, fEl: 90, lean: 22, fHip: 26, fKnee: -14, bHip: -22, bKnee: -4, head: 6 }),
    P({ bSh: 70, bEl: 40, fSh: 30, fEl: 100, lean: 10, fHip: 18, bHip: -16 }),
  ],
  lightkick: [
    P({ fHip: 40, fKnee: -90, bHip: -6, bKnee: -4, lean: -6, fSh: 50, fEl: 100 }),
    P({ fHip: 82, fKnee: -4, bHip: -8, bKnee: -4, lean: -12, fSh: 20, fEl: 90, bSh: 60, bEl: 80 }),
    P({ fHip: 45, fKnee: -80, bHip: -6, bKnee: -4, lean: -4 }),
  ],
  heavykick: [
    P({ fHip: 55, fKnee: -120, bHip: -4, bKnee: -6, lean: -14, fSh: 60, fEl: 90, bSh: 80, bEl: 60 }),
    P({ fHip: 118, fKnee: -2, bHip: -10, bKnee: -6, lean: -26, head: 10, fSh: 10, fEl: 60, bSh: 120, bEl: 30 }),
    P({ fHip: 60, fKnee: -100, bHip: -6, bKnee: -6, lean: -10 }),
  ],
  hit: [
    P({ lean: -16, head: -14, fSh: 70, fEl: 60, bSh: 60, bEl: 50, fHip: 14, bHip: -20, bKnee: -20 }),
    P({ lean: -24, head: -20, fSh: 100, fEl: 30, bSh: 80, bEl: 30, fHip: 20, bHip: -24, bKnee: -24 }),
  ],
  knockdown: [
    P({ lean: -70, head: -20, fHip: 95, fKnee: -40, bHip: 70, bKnee: -60, fSh: 140, fEl: 20, bSh: 120, bEl: 30, hipH: 26, lift: 0 }),
    P({ lean: -92, head: -8, fHip: 88, fKnee: -10, bHip: 82, bKnee: -8, fSh: 130, fEl: 10, bSh: 150, bEl: 10, hipH: 7 }),
  ],
  getup: [
    P({ fHip: 80, fKnee: -150, bHip: 40, bKnee: -140, lean: 40, head: -20, fSh: 80, fEl: 20, bSh: 70, bEl: 30 }),
  ],
  victory: [
    P({ fSh: 175, fEl: -10, bSh: 165, bEl: -10, lean: -4, head: -8, fHip: 10, bHip: -10 }),
    P({ fSh: 160, fEl: 30, bSh: 170, bEl: -20, lean: -2, head: -6, fHip: 12, bHip: -12, lift: 3 }),
  ],
  airlight: [
    P({ fHip: 40, fKnee: -100, bHip: 25, bKnee: -90, fSh: 30, fEl: 120, bSh: 60, bEl: 80, lean: 6 }),
    P({ fHip: 40, fKnee: -100, bHip: 25, bKnee: -90, fSh: 92, fEl: 2, bSh: 60, bEl: 80, lean: 10 }),
    P({ fHip: 40, fKnee: -100, bHip: 25, bKnee: -90, fSh: 60, fEl: 70, bSh: 60, bEl: 80, lean: 6 }),
  ],
  airkick: [
    P({ fHip: 40, fKnee: -100, bHip: 25, bKnee: -90, fSh: 60, fEl: 80, bSh: 140, bEl: 20, lean: 6 }),
    P({ fHip: 75, fKnee: -8, bHip: 30, bKnee: -110, fSh: 40, fEl: 90, bSh: 130, bEl: 20, lean: -4 }),
    P({ fHip: 50, fKnee: -90, bHip: 25, bKnee: -90, fSh: 60, fEl: 80, bSh: 140, bEl: 20, lean: 4 }),
  ],
};

const POSE_SETS = {
  strike: [
    P({ fSh: 150, fEl: -20, bSh: 120, bEl: -10, lean: -8, head: -6, fHip: 12, bHip: -16 }),
    P({ fSh: 85, fEl: 0, bSh: 70, bEl: 10, lean: 18, fHip: 30, fKnee: -16, bHip: -26, head: 4 }),
    P({ fSh: 70, fEl: 30, bSh: 60, bEl: 40, lean: 10, fHip: 20, bHip: -20 }),
  ],
  eruption: [
    P({ fSh: 170, fEl: -10, bSh: 170, bEl: -10, lean: -6, head: -10, fHip: 10, bHip: -10 }),
    P({ fHip: 70, fKnee: -130, bHip: 50, bKnee: -130, lean: 30, head: -10, fSh: 110, fEl: -20, bSh: 110, bEl: -20 }),
    P({ fHip: 60, fKnee: -120, bHip: 40, bKnee: -120, lean: 20, head: -6, fSh: 90, fEl: 10, bSh: 90, bEl: 10 }),
  ],
  projectile: [
    P({ fSh: 20, fEl: 100, bSh: 150, bEl: -20, lean: -10, head: -4, fHip: 10, bHip: -18 }),
    P({ fSh: 90, fEl: 0, bSh: 90, bEl: 0, lean: 16, fHip: 32, fKnee: -16, bHip: -26, head: 2 }),
    P({ fSh: 80, fEl: 20, bSh: 60, bEl: 40, lean: 8, fHip: 24, bHip: -22 }),
  ],
  teleport: [
    P({ fSh: 110, fEl: 90, bSh: 110, bEl: 90, lean: 4, head: -8, fHip: 6, bHip: -6 }),
    P({ fSh: 160, fEl: 10, bSh: 160, bEl: 10, lean: -6, head: -12, fHip: 30, fKnee: -90, bHip: 10, bKnee: -80, lift: 4 }),
    P({ fSh: 60, fEl: 80, bSh: 50, bEl: 90, lean: 6, fHip: 12, bHip: -12 }),
  ],
  dash: [
    P({ fSh: 60, fEl: 100, bSh: 150, bEl: -20, lean: -6, head: -4, fHip: 20, fKnee: -40, bHip: -24, bKnee: -10 }),
    P({ fSh: 100, fEl: -10, bSh: 20, bEl: 60, lean: 30, head: 6, fHip: 50, fKnee: -30, bHip: -40, bKnee: -10 }),
    P({ fSh: 70, fEl: 40, bSh: 40, bEl: 60, lean: 12, fHip: 24, bHip: -20 }),
  ],
  ring: [
    P({ fSh: 60, fEl: 110, bSh: 60, bEl: 110, lean: 8, head: 10, fHip: 10, bHip: -10 }),
    P({ fSh: 120, fEl: 60, bSh: 120, bEl: 60, lean: -14, head: -22, fHip: 14, bHip: -14, lift: 2 }),
    P({ fSh: 80, fEl: 80, bSh: 80, bEl: 80, lean: -4, head: -8, fHip: 12, bHip: -12 }),
  ],
  ultA: [
    P({ fSh: 100, fEl: 40, bSh: 100, bEl: 40, lean: 6, head: -4, fHip: 14, bHip: -14 }),
    P({ fSh: 95, fEl: 0, bSh: 95, bEl: 0, lean: 14, fHip: 26, fKnee: -10, bHip: -22, head: 2 }),
    P({ fSh: 175, fEl: -5, bSh: 175, bEl: -5, lean: -12, head: -12, fHip: 10, bHip: -10, lift: 2 }),
  ],
  ultB: [
    P({ fSh: 150, fEl: 40, bSh: 150, bEl: 40, lean: -6, head: -10, fHip: 10, bHip: -10 }),
    P({ fSh: 95, fEl: -10, bSh: 95, bEl: -10, lean: 12, fHip: 28, fKnee: -12, bHip: -24 }),
    P({ fSh: 120, fEl: 60, bSh: 40, bEl: 100, lean: -4, head: -6, fHip: 10, bHip: -10 }),
  ],
};

/** Qué conjunto de poses usa cada habilidad de cada personaje. */
const CHARACTER_POSES: Record<FighterId, { special1: Pose[]; special2: Pose[]; ultimate: Pose[] }> = {
  madremonte: { special1: POSE_SETS.strike, special2: POSE_SETS.eruption, ultimate: POSE_SETS.ultA },
  patasola: { special1: POSE_SETS.dash, special2: POSE_SETS.ring, ultimate: POSE_SETS.dash },
  hombrecaiman: { special1: POSE_SETS.dash, special2: POSE_SETS.teleport, ultimate: POSE_SETS.ultB },
  llorona: { special1: POSE_SETS.projectile, special2: POSE_SETS.eruption, ultimate: POSE_SETS.ring },
  sombreron: { special1: POSE_SETS.strike, special2: POSE_SETS.teleport, ultimate: POSE_SETS.dash },
  mohan: { special1: POSE_SETS.projectile, special2: POSE_SETS.teleport, ultimate: POSE_SETS.ultB },
  muelona: { special1: POSE_SETS.dash, special2: POSE_SETS.ring, ultimate: POSE_SETS.ultA },
  silbon: { special1: POSE_SETS.projectile, special2: POSE_SETS.eruption, ultimate: POSE_SETS.eruption },
  juanmachete: { special1: POSE_SETS.strike, special2: POSE_SETS.eruption, ultimate: POSE_SETS.eruption },
  bachue: { special1: POSE_SETS.projectile, special2: POSE_SETS.eruption, ultimate: POSE_SETS.ultB },
};

/* ------------------------------------------------------------------ */
/* Dibujo                                                              */
/* ------------------------------------------------------------------ */

type Layer = 'back' | 'front';
type Decorator = (pm: Pixmap, sk: Skeleton, pal: Palette, layer: Layer, anim: string, frame: number) => void;

function limb(pm: Pixmap, a: Joint, b: Joint, t: number, c: Rgba): void {
  pm.line(a.x, a.y, b.x, b.y, t, c);
}

function drawBody(pm: Pixmap, rig: Rig, sk: Skeleton, pal: Palette, dec: Decorator, anim: string, frame: number, look: Look): void {
  const skin = hexToRgba(pal.skin);
  const skinD = hexToRgba(pal.skinDark);
  const cloth = hexToRgba(pal.cloth);
  const clothD = hexToRgba(pal.clothDark);

  dec(pm, sk, pal, 'back', anim, frame);

  // brazo trasero
  limb(pm, add(sk.shoulder, { x: -2, y: 1 }), sk.bElbow, rig.armT, skinD);
  limb(pm, sk.bElbow, sk.bHand, rig.foreT, skinD);
  pm.dab(sk.bHand.x, sk.bHand.y, rig.foreT / 2 + 0.6, skinD);
  // pierna trasera (La Patasola solo tiene una)
  if (!look.oneLeg) {
    limb(pm, sk.hip, sk.bKnee, rig.thighT, clothD);
    limb(pm, sk.bKnee, sk.bFoot, rig.shinT, skinD);
    pm.ellipse(sk.bFoot.x + 1, sk.bFoot.y, 3.5, 2, skinD);
  }

  // torso (polígono cadera-hombros)
  const l = rad(sk.lean);
  const px = Math.cos(l);
  const py = Math.sin(l);
  const hw = rig.hipW / 2;
  const sw = rig.shoulderW / 2;
  pm.polygon(
    [
      [sk.hip.x - hw * px, sk.hip.y - hw * py],
      [sk.hip.x + hw * px, sk.hip.y + hw * py],
      [sk.shoulder.x + sw * px, sk.shoulder.y + sw * py],
      [sk.shoulder.x - sw * px, sk.shoulder.y - sw * py],
    ],
    skin,
  );
  // cadera / ropa
  pm.ellipse(sk.hip.x, sk.hip.y + 1, hw + 1, 4, cloth);

  // pierna delantera
  const legT = look.oneLeg ? rig.thighT + 2 : rig.thighT;
  limb(pm, sk.hip, sk.fKnee, legT, cloth);
  limb(pm, sk.fKnee, sk.fFoot, look.oneLeg ? rig.shinT + 1 : rig.shinT, skin);
  pm.ellipse(sk.fFoot.x + 1, sk.fFoot.y, look.oneLeg ? 4.5 : 3.5, 2, skin);

  // cuello y cabeza
  limb(pm, sk.shoulder, sk.neck, 3, skin);
  pm.ellipse(sk.headC.x, sk.headC.y, rig.headRx, rig.headRy, skin);

  dec(pm, sk, pal, 'front', anim, frame);

  // brazo delantero
  limb(pm, add(sk.shoulder, { x: 1, y: 1 }), sk.fElbow, rig.armT, skin);
  limb(pm, sk.fElbow, sk.fHand, rig.foreT, skin);
  pm.dab(sk.fHand.x, sk.fHand.y, rig.foreT / 2 + 0.8, skin);
}

function leaf(pm: Pixmap, x: number, y: number, dir: number, c: Rgba, size = 3): void {
  for (let i = 0; i < size; i++) {
    const w = i < size - 1 ? 1 : 0;
    pm.hline(x + dir * i - w, x + dir * i + w, y - i, c);
  }
}

/** Decorador genérico: dibuja rasgos según Look. */
function makeDecorator(look: Look): Decorator {
  return (pm, sk, pal, layer, anim, frame) => {
    const hair = hexToRgba(pal.hair);
    const hairD = hexToRgba(pal.hairDark);
    const cloth = hexToRgba(pal.cloth);
    const clothD = hexToRgba(pal.clothDark);
    const acc = hexToRgba(pal.accent);
    const accL = hexToRgba(pal.accentLight);
    const eye = hexToRgba(pal.eye);
    const dark = hexToRgba(pal.outline);
    const skinD = hexToRgba(pal.skinDark);
    const h = sk.headC;
    const hx = sk.hip.x;
    const hy = sk.hip.y;
    const sway = anim === 'walk' ? Math.sin((frame / 6) * Math.PI * 2) * 2 : 0;

    if (layer === 'back') {
      // melenas largas por la espalda
      if (look.hair === 'vines' || look.hair === 'wild' || look.hair === 'long') {
        const len = look.hair === 'wild' ? 1 : 0.8;
        pm.polygon(
          [[h.x - 8, h.y - 6], [h.x + 4, h.y - 10], [h.x + 8, h.y - 2], [h.x + 5, h.y + 8],
            [hx - 4 + sway, hy + 4 * len], [hx - 12 + sway, hy + 8 * len], [hx - 14 + sway, hy - 10], [h.x - 12, h.y + 6]],
          hairD,
        );
        pm.polygon(
          [[h.x - 5, h.y - 5], [h.x + 3, h.y - 8], [h.x + 2, h.y + 6], [hx - 6 + sway, hy], [hx - 10 + sway, hy - 8], [h.x - 9, h.y + 4]],
          hair,
        );
        if (look.hair === 'vines') for (let i = 0; i < 3; i++) pm.vline(hx - 12 + i * 3, hy - 2, hy + 6 + i * 2, hairD);
      }
      if (look.hair === 'veil') {
        pm.polygon([[h.x - 10, h.y - 8], [h.x + 10, h.y - 8], [h.x + 12, hy + 6], [hx - 16, hy + 8]], hairD);
        pm.polygon([[h.x - 8, h.y - 6], [h.x + 8, h.y - 6], [h.x + 9, hy + 2], [hx - 12, hy + 4]], hair);
      }
      if (look.sack) {
        pm.ellipse(sk.shoulder.x - 9, sk.shoulder.y + 8, 6, 8, clothD);
        pm.ellipse(sk.shoulder.x - 9, sk.shoulder.y + 7, 4, 6, cloth);
        pm.rect(sk.shoulder.x - 11, sk.shoulder.y + 2, 2, 3, accL);
        pm.rect(sk.shoulder.x - 8, sk.shoulder.y + 1, 2, 3, accL);
      }
      if (look.fire) {
        for (let i = 0; i < 5; i++) {
          const fx = hx - 10 + i * 5 + ((frame + i) % 2);
          const fh = 4 + ((frame * 3 + i * 7) % 5);
          pm.polygon([[fx - 2, hy + 10], [fx + 2, hy + 10], [fx, hy + 10 - fh]], i % 2 === 0 ? acc : accL);
        }
      }
      if (look.machete) {
        const hnd = sk.bHand;
        pm.line(hnd.x, hnd.y, hnd.x + 10, hnd.y - 14, 2, hexToRgba(0xc8d0d8));
        pm.set(hnd.x + 10, hnd.y - 14, hexToRgba(0xffffff));
      }
      return;
    }

    // ---- capa frontal ----
    // parte inferior
    switch (look.lower) {
      case 'leaves': {
        const skirt: [number, number][] = [[hx - 9, hy - 2], [hx + 9, hy - 2]];
        for (let i = 5; i >= -5; i--) skirt.push([hx + i * 2, hy + 10 + ((i & 1) === 0 ? 4 : 0)]);
        pm.polygon(skirt, cloth);
        for (let i = -4; i <= 4; i += 2) pm.vline(hx + i, hy + 2, hy + 9, clothD);
        break;
      }
      case 'loincloth':
        pm.polygon([[hx - 7, hy - 1], [hx + 7, hy - 1], [hx + 5, hy + 9], [hx + 1, hy + 7], [hx - 3, hy + 10], [hx - 6, hy + 7]], cloth);
        pm.vline(hx - 2, hy + 1, hy + 8, clothD);
        pm.vline(hx + 3, hy + 1, hy + 6, clothD);
        break;
      case 'dress': {
        // vestido largo hasta el suelo que cubre las piernas
        const bottom = Math.max(sk.fFoot.y, sk.bFoot.y) - 1;
        pm.polygon([[hx - 8, hy - 2], [hx + 8, hy - 2], [hx + 14 + sway, bottom], [hx - 14 + sway, bottom]], cloth);
        pm.polygon([[hx - 3, hy], [hx + 3, hy], [hx + 5 + sway, bottom], [hx - 1 + sway, bottom]], clothD);
        break;
      }
      case 'skirt':
        pm.polygon([[hx - 8, hy - 2], [hx + 8, hy - 2], [hx + 11, hy + 14], [hx - 11, hy + 14]], cloth);
        pm.vline(hx - 3, hy + 2, hy + 13, clothD);
        pm.vline(hx + 4, hy + 2, hy + 13, clothD);
        break;
      case 'pants':
        pm.ellipse(hx, hy + 1, 8, 4, clothD);
        pm.rect(hx - 7, hy - 2, 14, 3, dark);
        pm.set(hx, hy - 1, accL);
        break;
    }
    if (look.shirt) {
      const l = rad(sk.lean);
      const px = Math.cos(l);
      const py = Math.sin(l);
      const sw = 7;
      pm.polygon(
        [[hx - 6 * px, hy - 6 * py], [hx + 6 * px, hy + 6 * py],
          [sk.shoulder.x + sw * px, sk.shoulder.y + sw * py + 2], [sk.shoulder.x - sw * px, sk.shoulder.y - sw * py + 2]],
        cloth,
      );
      pm.line(sk.shoulder.x, sk.shoulder.y + 3, hx, hy - 2, 1, clothD);
    }
    if (look.scales) {
      for (let i = 0; i < 6; i++) {
        pm.set(sk.shoulder.x - 4 + (i % 3) * 3, sk.shoulder.y + 5 + Math.floor(i / 3) * 4, skinD);
        pm.set(h.x - 4 + (i % 3) * 3, h.y + 3 + Math.floor(i / 3) * 2 - 6, skinD);
      }
      pm.rect(h.x + 3, h.y + 2, 5, 3, hexToRgba(pal.skin)); // hocico
      pm.set(h.x + 7, h.y + 3, dark);
      pm.hline(h.x + 3, h.x + 7, h.y + 4, accL); // dientes
    }
    if (look.jewels) {
      pm.hline(sk.shoulder.x - 4, sk.shoulder.x + 4, sk.shoulder.y + 3, acc);
      pm.set(sk.shoulder.x, sk.shoulder.y + 5, accL);
      pm.hline(h.x - 6, h.x + 6, h.y - 4, acc);
      pm.set(h.x, h.y - 5, accL);
      pm.set(h.x - 8, h.y + 1, acc);
      pm.set(h.x + 8, h.y + 1, acc);
    }
    // cabello frontal / corona / sombrero
    switch (look.hair) {
      case 'vines':
        pm.polygon([[h.x - 8, h.y - 3], [h.x - 5, h.y - 9], [h.x - 1, h.y - 12], [h.x + 3, h.y - 9], [h.x + 7, h.y - 4], [h.x + 4, h.y - 6], [h.x, h.y - 7], [h.x - 4, h.y - 6]], hair);
        leaf(pm, h.x - 2, h.y - 11, -1, hairD, 3);
        leaf(pm, h.x + 2, h.y - 11, 1, hair, 3);
        leaf(pm, sk.shoulder.x + 6, sk.shoulder.y - 1, 1, hair, 4);
        leaf(pm, sk.shoulder.x - 6, sk.shoulder.y - 1, -1, hair, 4);
        break;
      case 'wild':
      case 'long':
        pm.polygon([[h.x - 7, h.y - 3], [h.x - 3, h.y - 9], [h.x + 2, h.y - 10], [h.x + 7, h.y - 5], [h.x + 8, h.y - 1], [h.x + 4, h.y - 4], [h.x - 1, h.y - 5], [h.x - 5, h.y - 2]], hair);
        if (look.hair === 'wild') {
          pm.polygon([[h.x - 9, h.y - 2], [h.x - 7, h.y - 8], [h.x - 5, h.y + 4]], hairD);
        } else {
          pm.polygon([[h.x - 8, h.y - 4], [h.x - 6, h.y + 8], [h.x - 4, h.y - 2]], hair);
        }
        break;
      case 'veil':
        pm.polygon([[h.x - 9, h.y - 6], [h.x + 9, h.y - 6], [h.x + 9, h.y + 10], [h.x + 7, h.y - 2], [h.x - 7, h.y - 2], [h.x - 9, h.y + 10]], hair);
        break;
      case 'short':
        pm.polygon([[h.x - 7, h.y - 2], [h.x - 5, h.y - 8], [h.x + 2, h.y - 9], [h.x + 7, h.y - 4], [h.x + 7, h.y - 1], [h.x + 3, h.y - 4], [h.x - 3, h.y - 5], [h.x - 6, h.y]], hair);
        break;
      case 'none':
        break;
    }
    switch (look.hat) {
      case 'wide':
        pm.rect(h.x - 14, h.y - 7, 28, 2, hairD);
        pm.polygon([[h.x - 8, h.y - 7], [h.x + 8, h.y - 7], [h.x + 7, h.y - 17], [h.x - 7, h.y - 17]], hairD);
        pm.hline(h.x - 7, h.x + 7, h.y - 9, acc);
        break;
      case 'straw':
        pm.rect(h.x - 12, h.y - 6, 24, 2, cloth);
        pm.polygon([[h.x - 7, h.y - 6], [h.x + 7, h.y - 6], [h.x + 5, h.y - 13], [h.x - 5, h.y - 13]], cloth);
        pm.hline(h.x - 6, h.x + 6, h.y - 8, clothD);
        break;
      case 'ranch':
        pm.rect(h.x - 11, h.y - 6, 22, 2, hexToRgba(0x6a4a2a));
        pm.polygon([[h.x - 7, h.y - 6], [h.x + 7, h.y - 6], [h.x + 6, h.y - 14], [h.x - 6, h.y - 14]], hexToRgba(0x6a4a2a));
        pm.hline(h.x - 6, h.x + 6, h.y - 8, hexToRgba(0x3a2a18));
        break;
      case 'none':
        break;
    }
    // barba
    if (look.beard === 'full') {
      pm.polygon([[h.x - 4, h.y + 3], [h.x + 6, h.y + 2], [h.x + 7, h.y + 8], [h.x + 3, h.y + 13], [h.x - 1, h.y + 11], [h.x - 4, h.y + 7]], hairD);
      pm.polygon([[h.x - 2, h.y + 4], [h.x + 5, h.y + 3], [h.x + 4, h.y + 9], [h.x + 1, h.y + 10]], hair);
    } else if (look.beard === 'mustache') {
      pm.hline(h.x - 1, h.x + 6, h.y + 3, hairD);
      pm.set(h.x - 2, h.y + 4, hairD);
      pm.set(h.x + 7, h.y + 4, hairD);
    }
    // ojos
    pm.rect(h.x + 2, h.y - 1, 2, 2, eye);
    pm.rect(h.x - 2, h.y - 1, 2, 2, eye);
    pm.set(h.x + 3, h.y - 1, accL);
    if (look.tears) {
      pm.vline(h.x + 3, h.y + 1, h.y + 6, acc);
      pm.vline(h.x - 1, h.y + 1, h.y + 5, acc);
      pm.rect(h.x, h.y + 4, 3, 2, dark); // boca abierta
    }
    if (look.teeth) {
      pm.rect(h.x - 2, h.y + 3, 8, 3, dark);
      for (let i = 0; i < 4; i++) pm.set(h.x - 1 + i * 2, h.y + 3, accL);
      pm.set(h.x + 1, h.y + 5, accL);
      pm.set(h.x + 5, h.y + 5, accL);
    }
    if (look.flowers) {
      pm.set(h.x - 5, h.y - 8, acc);
      pm.set(h.x + 5, h.y - 7, accL);
      pm.set(h.x + 1, h.y - 12, acc);
      pm.set(sk.shoulder.x + 7, sk.shoulder.y - 4, acc);
    }
    if (look.claws) {
      for (const hnd of [sk.fHand]) {
        pm.set(hnd.x + 3, hnd.y - 1, accL);
        pm.set(hnd.x + 3, hnd.y + 1, accL);
        pm.set(hnd.x + 4, hnd.y, accL);
      }
    }
    if (anim === 'victory' && !look.teeth && !look.tears) pm.hline(h.x - 1, h.x + 3, h.y + 4, dark);
  };
}

export interface CharacterSheet {
  pixmap: Pixmap;
  frameWidth: number;
  frameHeight: number;
  anims: AnimTable;
  columns: number;
}

/** Orden fijo de animaciones para que la tabla sea estable. */
const ANIM_ORDER = [
  'idle', 'walk', 'jump', 'crouch', 'block', 'crouchblock', 'light', 'heavy', 'lightkick', 'heavykick',
  'hit', 'knockdown', 'getup', 'victory', 'airlight', 'airkick', 'special1', 'special2', 'ultimate',
];

export function buildCharacterSheet(id: FighterId, pal: Palette): CharacterSheet {
  const rig = RIGS[id];
  const look = LOOKS[id];
  const dec = makeDecorator(look);
  const poses: Record<string, Pose[]> = { ...COMMON_POSES, ...CHARACTER_POSES[id] };
  const frames: Pixmap[] = [];
  const anims: AnimTable = {};
  for (const name of ANIM_ORDER) {
    const list = poses[name];
    anims[name] = [];
    list.forEach((pose, i) => {
      const pm = new Pixmap(FRAME_W, FRAME_H);
      const sk = solveSkeleton(rig, pose, FRAME_W / 2 - 2, BASELINE, look.oneLeg);
      drawBody(pm, rig, sk, pal, dec, name, i, look);
      pm.shade([255, 255, 255, 255], [0, 0, 0, 255], 40, 60);
      pm.outline(hexToRgba(pal.outline));
      anims[name].push(frames.length);
      frames.push(pm);
    });
  }
  const columns = 12;
  const rows = Math.ceil(frames.length / columns);
  const sheet = new Pixmap(FRAME_W * columns, FRAME_H * rows);
  frames.forEach((f, i) => sheet.blit(f, (i % columns) * FRAME_W, Math.floor(i / columns) * FRAME_H));
  return { pixmap: sheet, frameWidth: FRAME_W, frameHeight: FRAME_H, anims, columns };
}

/** Retrato cuadrado (cabeza grande) para HUD y selección, según Look. */
export function buildPortrait(id: FighterId, pal: Palette, size: number): Pixmap {
  const look = LOOKS[id];
  const pm = new Pixmap(size, size);
  const s = size / 32;
  const cx = size / 2;
  const cy = size / 2 + 2 * s;
  const skin = hexToRgba(pal.skin);
  const skinD = hexToRgba(pal.skinDark);
  const hair = hexToRgba(pal.hair);
  const hairD = hexToRgba(pal.hairDark);
  const cloth = hexToRgba(pal.cloth);
  const eye = hexToRgba(pal.eye);
  const acc = hexToRgba(pal.accent);
  const accL = hexToRgba(pal.accentLight);
  const dark = hexToRgba(pal.outline);
  const R = (x: number, y: number, w: number, h: number, c: Rgba) => pm.rect(cx + x * s, cy + y * s, w * s, h * s, c);
  const Pg = (pts: [number, number][], c: Rgba) => pm.polygon(pts.map(([x, y]) => [cx + x * s, cy + y * s] as [number, number]), c);

  pm.clear(hexToRgba(0x141018));
  pm.dither(0, 0, size, size, hexToRgba(0x1e1826));
  if (look.fire) for (let i = 0; i < 6; i++) Pg([[-16 + i * 6, 16], [-12 + i * 6, 16], [-14 + i * 6, 4 - (i % 3) * 3]], i % 2 ? acc : accL);

  // pelo trasero / velo
  if (look.hair === 'vines' || look.hair === 'wild' || look.hair === 'long') {
    Pg([[-14, 16], [-12, -10], [0, -16], [12, -10], [14, 16]], hairD);
    Pg([[-11, 16], [-9, -8], [0, -13], [9, -8], [11, 16]], hair);
  }
  if (look.hair === 'veil') {
    Pg([[-15, 16], [-13, -12], [0, -17], [13, -12], [15, 16]], hairD);
    Pg([[-12, 16], [-10, -10], [0, -14], [10, -10], [12, 16]], hair);
  }
  // cuello / ropa
  R(-5, 8, 10, 8, skinD);
  if (look.shirt || look.lower === 'dress') Pg([[-16, 16], [-8, 10], [8, 10], [16, 16]], cloth);
  // cabeza
  pm.ellipse(cx, cy, 8 * s, 10 * s, skin);
  if (look.scales) {
    for (let i = 0; i < 10; i++) R(-6 + (i % 5) * 3, -6 + Math.floor(i / 5) * 3, 1, 1, skinD);
    R(2, 2, 7, 4, skin);
    R(2, 5, 7, 1, accL);
    R(8, 3, 1, 1, dark);
  }
  // flequillo
  if (look.hair === 'vines') {
    Pg([[-9, -3], [-5, -11], [0, -14], [5, -11], [9, -3], [4, -7], [-4, -7]], hair);
  } else if (look.hair === 'wild' || look.hair === 'long' || look.hair === 'short') {
    Pg([[-8, -4], [-3, -11], [4, -12], [9, -6], [9, -2], [3, -6], [-4, -5]], hair);
    if (look.hair === 'wild') Pg([[-10, -2], [-8, -9], [-6, 6]], hairD);
  } else if (look.hair === 'veil') {
    Pg([[-9, -6], [9, -6], [9, 10], [7, -2], [-7, -2], [-9, 10]], hair);
  }
  // sombreros
  if (look.hat === 'wide') {
    R(-15, -9, 30, 2, hairD);
    Pg([[-9, -9], [9, -9], [8, -20], [-8, -20]], hairD);
    R(-8, -12, 16, 1, acc);
  } else if (look.hat === 'straw') {
    R(-13, -8, 26, 2, cloth);
    Pg([[-8, -8], [8, -8], [6, -16], [-6, -16]], cloth);
    R(-7, -10, 14, 1, hexToRgba(pal.clothDark));
  } else if (look.hat === 'ranch') {
    R(-12, -8, 24, 2, hexToRgba(0x6a4a2a));
    Pg([[-8, -8], [8, -8], [7, -17], [-7, -17]], hexToRgba(0x6a4a2a));
    R(-7, -10, 14, 1, hexToRgba(0x3a2a18));
  }
  // ojos
  R(-5, -1, 3, 2, eye);
  R(2, -1, 3, 2, eye);
  R(4, -1, 1, 1, accL);
  // boca / barba / dientes / lágrimas
  if (look.teeth) {
    R(-4, 4, 9, 4, dark);
    for (let i = 0; i < 5; i++) R(-4 + i * 2, 4, 1, 2, accL);
    R(-3, 7, 1, 1, accL);
    R(3, 7, 1, 1, accL);
  } else if (look.tears) {
    R(-4, 1, 1, 6, acc);
    R(4, 1, 1, 7, acc);
    R(-2, 5, 4, 3, dark);
  } else if (look.beard === 'full') {
    Pg([[-6, 4], [7, 3], [8, 12], [2, 16], [-4, 13]], hairD);
    Pg([[-3, 5], [5, 4], [4, 11], [0, 12]], hair);
  } else if (look.beard === 'mustache') {
    R(-4, 3, 9, 2, hairD);
    R(-5, 4, 1, 2, hairD);
    R(5, 4, 1, 2, hairD);
    R(-2, 6, 5, 1, dark);
  } else {
    R(-3, 5, 6, 1, dark);
  }
  if (look.flowers) {
    R(-6, -12, 2, 2, acc);
    R(3, -13, 2, 2, accL);
    R(-2, -15, 2, 2, acc);
  }
  if (look.jewels) {
    R(-6, -5, 12, 1, acc);
    R(0, -6, 1, 1, accL);
    R(-9, 2, 1, 3, acc);
    R(9, 2, 1, 3, acc);
    R(-10, -10, 3, 3, accL);
    R(8, -10, 3, 3, accL);
  }
  pm.rectOutline(0, 0, size, size, dark);
  return pm;
}
