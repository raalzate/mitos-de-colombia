import Phaser from 'phaser';

/**
 * Aviso de carga en HTML (ver index.html): su animación es CSS, así que sigue moviéndose
 * aunque el juego esté ocupado armando la escena siguiente.
 */
let switching = false;

const overlay = () => document.getElementById('loading');

export function showLoading(label = ''): Promise<void> {
  const el = overlay();
  if (!el) return Promise.resolve();
  el.querySelector('.loading-label')!.textContent = label.toUpperCase();
  setLoadingProgress(null);
  el.classList.add('on');
  // dos cuadros: el navegador alcanza a pintar el aviso antes de que el trabajo pesado ocupe el hilo
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

export function hideLoading(): void {
  overlay()?.classList.remove('on', 'boot');
}

/** Barra de avance (0 a 1); null la esconde. */
export function setLoadingProgress(p: number | null): void {
  const bar = overlay()?.querySelector<HTMLElement>('.loading-bar');
  if (!bar) return;
  bar.hidden = p === null;
  bar.style.setProperty('--p', String(p ?? 0));
}

/** Hay un cambio de escena en espera: la escena que se va ya no debe atender teclas. */
export function isSwitching(): boolean {
  return switching;
}

/** Cambia de escena (o la reinicia) con el aviso de carga; las llamadas repetidas mientras espera se ignoran. */
export function startWithLoading(scene: Phaser.Scene, key: string, data?: object, label = ''): void {
  if (switching) return;
  switching = true;
  void showLoading(label).then(() => {
    switching = false;
    if (key === scene.scene.key) scene.scene.restart(data);
    else scene.scene.start(key, data);
  });
}

/** Cada escena, al terminar de armarse y pintar su primer cuadro, quita el aviso. */
export function hideLoadingOnSceneReady(game: Phaser.Game, except: string[]): void {
  for (const s of game.scene.scenes) {
    if (except.includes(s.scene.key)) continue;
    s.events.on(Phaser.Scenes.Events.CREATE, () => game.events.once(Phaser.Core.Events.POST_RENDER, hideLoading));
  }
}
