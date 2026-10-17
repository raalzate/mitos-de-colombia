import Phaser from 'phaser';
import { InputManager } from '../combat/InputManager';
import type { MatchSettings } from '../combat/CombatTypes';

/** Entrada global compartida por todas las escenas. */
export const inputManager = new InputManager();

export const DEFAULT_SETTINGS: MatchSettings = { mode: 'cpu', difficulty: 'normal', p1: 'madremonte', p2: 'mohan', stage: 'random', art: 'drawn', scares: true };

export function getSettings(scene: Phaser.Scene): MatchSettings {
  return { ...DEFAULT_SETTINGS, ...((scene.registry.get('settings') as Partial<MatchSettings> | undefined) ?? {}) };
}

export function setSettings(scene: Phaser.Scene, s: MatchSettings): void {
  scene.registry.set('settings', s);
}

/** Teclas de navegación de menús (cualquiera de los dos jugadores). */
export const MENU_KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  confirm: ['KeyF', 'KeyJ', 'Enter', 'Space'],
  back: ['Escape', 'Backspace'],
  pause: ['Enter', 'Escape'],
  fullscreen: ['KeyZ'],
  debug: ['KeyH'],
};

/** Detector de pulsaciones nuevas para menús sobre teclas crudas. */
export class MenuInput {
  /** Se inicializa con las teclas ya pulsadas: una pulsación heredada de la escena anterior no cuenta. */
  private memory = inputManager.heldKeys();
  pressed(codes: string[]): boolean {
    let any = false;
    for (const c of codes) if (inputManager.justPressedRaw(c, this.memory)) any = true;
    return any;
  }
}

export function toggleFullscreen(scene: Phaser.Scene): void {
  if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
  else scene.scale.startFullscreen();
}

/** Zoom entero para píxeles nítidos. */
export function fitIntegerZoom(game: Phaser.Game): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const gw = Number(game.config.width);
  const gh = Number(game.config.height);
  const z = Math.max(1, Math.floor(Math.min(w / gw, h / gh)));
  if (game.scale.zoom !== z) game.scale.setZoom(z);
}
