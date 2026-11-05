import Phaser from 'phaser';
import { InputManager } from '../combat/InputManager';
import type { MatchSettings } from '../combat/CombatTypes';
import { gameArea, toggleDocumentFullscreen, touchActive } from '../ui/TouchControls';

/** Entrada global compartida por todas las escenas. */
export const inputManager = new InputManager();

export const DEFAULT_SETTINGS: MatchSettings = { mode: 'cpu', difficulty: 'normal', p1: 'madremonte', p2: 'mohan', stage: 'random', art: 'drawn', scares: true };

export function getSettings(scene: Phaser.Scene): MatchSettings {
  // un jugador contra la CPU: el modo de dos jugadores está oculto
  return { ...DEFAULT_SETTINGS, ...((scene.registry.get('settings') as Partial<MatchSettings> | undefined) ?? {}), mode: 'cpu' };
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
  confirm: ['Enter', 'Space'],
  back: ['Escape', 'Backspace'],
  pause: ['Enter', 'Escape'],
  fullscreen: ['KeyF'],
  map: ['KeyM'],
  mission: ['KeyQ'],
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
  if (touchActive()) {
    // El botón táctil se procesa en el bucle del juego, fuera del gesto: se espera a que se suelte el dedo.
    window.addEventListener('pointerup', toggleDocumentFullscreen, { once: true });
    return;
  }
  if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
  else scene.scale.startFullscreen();
}

/**
 * Zoom entero para píxeles nítidos en escritorio. En pantallas táctiles se usa zoom fraccional:
 * con zoom entero un celular quedaría casi siempre en 1x y el juego se vería diminuto.
 */
export function fitIntegerZoom(game: Phaser.Game): void {
  const { w, h } = gameArea();
  const gw = Number(game.config.width);
  const gh = Number(game.config.height);
  const fit = Math.min(w / gw, h / gh);
  const z = touchActive() ? Math.max(0.5, Math.floor(fit * 100) / 100) : Math.max(1, Math.floor(fit));
  const parent = document.getElementById('game');
  // En táctil el juego se pega arriba: todo el espacio sobrante queda abajo, donde van los controles.
  if (parent) parent.style.height = touchActive() ? `${Math.ceil(gh * z)}px` : '';
  if (game.scale.zoom !== z) game.scale.setZoom(z);
  game.scale.refresh();
}
