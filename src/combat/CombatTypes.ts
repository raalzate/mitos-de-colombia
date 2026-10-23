import type { SampleId } from '../audio/Samples';
import type { SfxName } from '../audio/Sfx';

export type FighterId =
  | 'madremonte'
  | 'patasola'
  | 'hombrecaiman'
  | 'llorona'
  | 'sombreron'
  | 'mohan'
  | 'muelona'
  | 'silbon'
  | 'juanmachete'
  | 'bachue';

/** Tipos de habilidad especial resueltos por el comportamiento genérico. */
export type SpecialType = 'strike' | 'projectile' | 'eruption' | 'teleport';

/** Estilo de la cinemática del definitivo. */
export type UltimateStyle = 'bloom' | 'vortex' | 'storm' | 'slash';

/** Una capa de sonido: una grabación (s) o un sonido sintetizado (fx), con su tono, volumen y retraso en segundos. */
export interface SoundLayer { s?: SampleId; fx?: SfxName; rate?: number; vol?: number; at?: number }

/**
 * Sonido declarado con cada poder: lo que suena al arrancar (cast) y cuando el poder sale o pega (release).
 * `voice` = el luchador grita con su propia voz al soltarlo.
 */
export interface PowerSound { cast?: SoundLayer[]; release: SoundLayer[]; voice?: boolean }

export interface SpecialSpec {
  type: SpecialType;
  /** Nombre corto para el HUD (≤ 9 caracteres). */
  short: string;
  /** Clave de efecto visual (hoja fx_*) */
  fx: string;
  /** Tinte del efecto (0xffffff = sin tinte). */
  tint: number;
  sound: PowerSound;
  /** Partículas al activar: leaf | drop | spark | ember | none */
  particle: 'leaf' | 'drop' | 'spark' | 'ember' | 'none';
  /** projectile: velocidad px/frame y vida en frames */
  speed?: number;
  life?: number;
  /** projectile/teleport: desplazamiento vertical del efecto */
  offsetY?: number;
  /** strike: fracción del daño que cura al atacante */
  drain?: number;
  /** teleport: distancia de salto si el rival está lejos */
  distance?: number;
}

export interface UltimateSpec {
  style: UltimateStyle;
  short: string;
  tint: number;
  particle: 'leaf' | 'drop' | 'spark' | 'ember';
  sound: PowerSound;
}

export type FighterState =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'crouch'
  | 'attack'
  | 'special'
  | 'ultimate'
  | 'block'
  | 'hitstun'
  | 'knockdown'
  | 'getup'
  | 'cinematic'
  | 'victory'
  | 'defeat';

export type Facing = 1 | -1;

/** Caja relativa al origen del luchador (pies, centro), mirando a la derecha. +x adelante, -y arriba. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WorldBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type AttackKind =
  | 'light'
  | 'heavy'
  | 'lightkick'
  | 'heavykick'
  | 'special1'
  | 'special2'
  | 'ultimate';

export interface AttackDef {
  id: string;
  name: string;
  kind: AttackKind;
  /** Frames antes de que la hitbox se active. */
  startup: number;
  /** Frames con la hitbox activa. */
  active: number;
  /** Frames de recuperación tras la fase activa. */
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  /** Retroceso horizontal (px/frame inicial). */
  knockback: number;
  /** Impulso vertical al golpear (negativo = hacia arriba). 0 = sin lanzamiento. */
  launch: number;
  knockdown: boolean;
  blockable: boolean;
  /** Hitbox mientras está activa. Puede ser null si el ataque crea su propia entidad (proyectil). */
  hitbox: Box | null;
  /** Energía ganada por el atacante al conectar. */
  meterOnHit: number;
  /** Energía que cuesta usar (0 si no). */
  meterCost: number;
  /** Frames de enfriamiento tras usarse. */
  cooldown: number;
  /** Frames de congelación al impactar. */
  hitstop: number;
  /** Se puede usar en el aire. */
  air: boolean;
  /** Pasos de avance durante el ataque (px/frame) mientras está en startup. */
  forwardStep: number;
}

export interface FighterStats {
  id: FighterId;
  name: string;
  title: string;
  description: string;
  walkSpeed: number;
  backSpeed: number;
  jumpForce: number;
  weight: number;
  /** Hurtbox de pie / agachado / en el aire */
  hurtStand: Box;
  hurtCrouch: Box;
  hurtAir: Box;
  pushBox: Box;
  attacks: Record<AttackKind, AttackDef>;
  special1: SpecialSpec;
  special2: SpecialSpec;
  ultimateSpec: UltimateSpec;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  block: boolean;
  light: boolean;
  heavy: boolean;
  lightkick: boolean;
  heavykick: boolean;
  special: boolean;
  ultimate: boolean;
  /** Pulsaciones nuevas (con buffer) este frame. */
  pressed: {
    up: boolean;
    light: boolean;
    heavy: boolean;
    lightkick: boolean;
    heavykick: boolean;
    special: boolean;
    ultimate: boolean;
    /** controles de dos botones: el poder 2 sale directo, sin flecha abajo */
    special2?: boolean;
  };
}

export const EMPTY_INPUT: InputState = Object.freeze({
  left: false,
  right: false,
  up: false,
  down: false,
  block: false,
  light: false,
  heavy: false,
  lightkick: false,
  heavykick: false,
  special: false,
  ultimate: false,
  pressed: Object.freeze({
    up: false,
    light: false,
    heavy: false,
    lightkick: false,
    heavykick: false,
    special: false,
    ultimate: false,
  }),
}) as InputState;

export type PlayerSlot = 1 | 2;
export type RoundWinner = PlayerSlot | 'draw';

export interface HitResult {
  blocked: boolean;
  damage: number;
  hitstun: number;
  knockback: number;
  launch: number;
  knockdown: boolean;
}

export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameMode = 'cpu' | 'versus';

export type StageChoice =
  | 'ribera' | 'llanos' | 'laguna' | 'pantano' | 'infierno' | 'pueblo'
  | 'selva' | 'cantina' | 'cementerio' | 'random';

export interface MatchSettings {
  mode: GameMode;
  difficulty: Difficulty;
  p1: FighterId;
  p2: FighterId;
  stage: StageChoice;
  /** 'drawn': arte de cuerpo entero dibujado; 'procedural': esqueleto generado por código. */
  art: ArtMode;
  /** screamers (sustos repentinos) activados */
  scares: boolean;
}

export type ArtMode = 'drawn' | 'procedural';
