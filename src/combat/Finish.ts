/**
 * Remate al estilo Mortal Kombat: tras el KO que decide el combate, el ganador tiene unos
 * segundos para hacer la FATALIDAD (definitivo o golpe fuerte). Reglas puras, sin Phaser.
 */

/** Frames (60 Hz) que dura la ventana de «¡ACÁBALO!». */
export const FINISH_FRAMES = 60 * 4;

/** Texto del aviso según el género del rival. */
export function finishPrompt(defenderFemale: boolean): string {
  return defenderFemale ? '¡ACÁBALA!' : '¡ACÁBALO!';
}

export interface FinishInput {
  ultimate: boolean;
  heavy: boolean;
  heavykick: boolean;
}

/** La fatalidad sale con el definitivo o con cualquier golpe fuerte dentro de la ventana. */
export function isFatalityInput(i: FinishInput): boolean {
  return i.ultimate || i.heavy || i.heavykick;
}

/** La CPU, si gana, remata a veces: más a menudo cuanto más difícil. */
export function cpuWantsFatality(difficulty: 'easy' | 'normal' | 'hard', rnd: number): boolean {
  const p = difficulty === 'hard' ? 0.9 : difficulty === 'normal' ? 0.6 : 0.3;
  return rnd < p;
}

/** Gotas de sangre por impacto: más con golpes fuertes, ninguna si se bloquea. */
export function bloodDrops(blocked: boolean, heavy: boolean, damage: number): number {
  if (blocked) return 0;
  return Math.min(40, Math.round((heavy ? 14 : 7) + damage * 1.2));
}
