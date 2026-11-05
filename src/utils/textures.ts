import Phaser from 'phaser';
import type { Pixmap } from '../art/PixelPainter';
import { FONT_CHARS, buildFontSheet, fontCellSize, type FontStyle } from '../art/PixelFont';
import { PALETTES, buildCharacterSheet, type AnimTable } from '../art/CharacterArtist';
import type { FighterId } from '../combat/CombatTypes';
import { STAGES, buildStage, type StageId } from '../art/StageArtist';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/game-config';

/** Registro de tablas de animación por clave de textura (relleno en BootScene). */
export const ANIM_TABLES: Record<string, AnimTable> = {};

export function addPixmap(scene: Phaser.Scene, key: string, pm: Pixmap): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, pm.toCanvas());
}

/** Añade una hoja en cuadrícula con frames numerados 0..n-1. */
export function addSheet(scene: Phaser.Scene, key: string, pm: Pixmap, fw: number, fh: number, count?: number): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, pm.toCanvas());
  if (!tex) throw new Error(`No se pudo crear la textura ${key}`);
  const cols = Math.floor(pm.width / fw);
  const rows = Math.floor(pm.height / fh);
  const total = count ?? cols * rows;
  for (let i = 0; i < total; i++) {
    tex.add(i, 0, (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh);
  }
}

export function addRetroFont(scene: Phaser.Scene, key: string, style: FontStyle): void {
  const { pixmap, charsPerRow } = buildFontSheet(style);
  const cell = fontCellSize(style);
  addPixmap(scene, `${key}_img`, pixmap);
  const config: Phaser.Types.GameObjects.BitmapText.RetroFontConfig = {
    image: `${key}_img`,
    width: cell.w,
    height: cell.h,
    chars: FONT_CHARS,
    charsPerRow,
    'offset.x': 0,
    'offset.y': 0,
    'spacing.x': 0,
    'spacing.y': 0,
    lineSpacing: 2,
  };
  if (scene.cache.bitmapFont.exists(key)) scene.cache.bitmapFont.remove(key);
  scene.cache.bitmapFont.add(key, Phaser.GameObjects.RetroFont.Parse(scene, config));
}

export function text(scene: Phaser.Scene, x: number, y: number, str: string, scale = 1, tint = 0xffffff): Phaser.GameObjects.BitmapText {
  return scene.add.bitmapText(x, y, 'font', str.toUpperCase()).setScale(scale).setTint(tint).setOrigin(0.5);
}

/** Genera la hoja de un personaje bajo demanda (clave `${id}_${p1|p2}`) y la cachea. */
export function ensureCharacterSheet(scene: Phaser.Scene, id: FighterId, slot: 'p1' | 'p2'): string {
  const key = `${id}_${slot}`;
  if (ANIM_TABLES[key] && scene.textures.exists(key)) return key;
  const sheet = buildCharacterSheet(id, PALETTES[id][slot]);
  addSheet(scene, key, sheet.pixmap, sheet.frameWidth, sheet.frameHeight);
  ANIM_TABLES[key] = sheet.anims;
  return key;
}

/* ------------------------------------------------------------------ */
/* Escenarios                                                          */
/* ------------------------------------------------------------------ */

export interface StageKeys {
  sky: string;
  clouds: string;
  far: string;
  river: (frame: number) => string;
  mid: string;
  ground: string;
  fore: string;
  mist: string;
}

export function stageKeys(id: StageId): StageKeys {
  const p = `st_${id}_`;
  return {
    sky: p + 'sky', clouds: p + 'clouds', far: p + 'far', river: (f) => `${p}river${f}`,
    mid: p + 'mid', ground: p + 'ground', fore: p + 'fore', mist: p + 'mist',
  };
}

/** Genera las capas de un escenario bajo demanda y las cachea como texturas. */
export function ensureStage(scene: Phaser.Scene, id: StageId): StageKeys {
  const keys = stageKeys(id);
  if (scene.textures.exists(keys.sky)) return keys;
  const layers = buildStage(STAGES[id]);
  addPixmap(scene, keys.sky, layers.sky);
  addPixmap(scene, keys.clouds, layers.clouds);
  addPixmap(scene, keys.far, layers.far);
  layers.river.forEach((pm, i) => addPixmap(scene, keys.river(i), pm));
  addPixmap(scene, keys.mid, layers.mid);
  addPixmap(scene, keys.ground, layers.ground);
  addPixmap(scene, keys.fore, layers.fore);
  addPixmap(scene, keys.mist, layers.mist);
  return keys;
}

/** Fondo estático de escenario para menús (sin parallax). */
export function addStageBackdrop(scene: Phaser.Scene, id: StageId, dim = 0.45): void {
  const k = ensureStage(scene, id);
  scene.add.image(0, 0, k.sky).setOrigin(0);
  scene.add.image(-60, 60, k.far).setOrigin(0);
  scene.add.image(-40, 150, k.river(0)).setOrigin(0);
  scene.add.image(-80, 88, k.mid).setOrigin(0);
  scene.add.image(-40, 156, k.ground).setOrigin(0);
  if (dim > 0) scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07060d, dim).setOrigin(0);
}

/* ------------------------------------------------------------------ */
/* Retratos y arte de cuerpo entero                                    */
/* ------------------------------------------------------------------ */

export type PortraitSize = 24 | 48 | 64 | 96;

/**
 * Clave del retrato: prefiere la cara dibujada (`assets/portraits`) y, si no se cargó,
 * usa el retrato procedimental.
 */
export function portraitKey(scene: Phaser.Scene, id: FighterId, slot: 'p1' | 'p2', size: PortraitSize): string {
  const face = `face_${id}_${slot}_${size}`;
  if (scene.textures.exists(face)) return face;
  const proc = `portrait_${id}_${slot}_${size === 96 ? 64 : size}`;
  return proc;
}

/** Clave del arte de cuerpo entero (`assets/splash`), o null si no se cargó. */
export function splashKey(scene: Phaser.Scene, id: FighterId, slot: 'p1' | 'p2', size: 72 | 128): string | null {
  const key = `splash_${id}_${slot}_${size}`;
  return scene.textures.exists(key) ? key : null;
}
