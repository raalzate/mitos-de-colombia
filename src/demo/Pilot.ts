import { inputManager } from '../utils/game';

/**
 * Teclado de mentiras: mantiene una flecha y da toques cortos, como lo haría una persona.
 * Se llama una vez por fotograma, antes de que la escena lea las teclas.
 */
export class Pilot {
  private held: string | null = null;
  private tapping: string | null = null;
  /** fotogramas de calma antes del próximo toque */
  private cool = 0;

  hold(code: string | null): void {
    if (code === this.held) return;
    if (this.held) inputManager.setKey(this.held, false);
    this.held = code;
    if (code) inputManager.setKey(code, true);
  }

  /** Toca una tecla si ya pasó la calma del toque anterior; devuelve si la tocó. */
  tap(code: string, cool = 6): boolean {
    if (this.cool > 0 || this.tapping) return false;
    inputManager.setKey(code, true);
    this.tapping = code;
    this.cool = cool;
    return true;
  }

  /** Suelta el toque del fotograma anterior y cuenta la calma. */
  frame(): void {
    if (this.tapping) {
      inputManager.setKey(this.tapping, false);
      this.tapping = null;
    }
    if (this.cool > 0) this.cool--;
  }

  release(): void {
    this.hold(null);
  }
}
