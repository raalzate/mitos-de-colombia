import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/game-config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { FightScene } from './scenes/FightScene';
import { ResultScene } from './scenes/ResultScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { WarningScene } from './scenes/WarningScene';
import { AdventureScene } from './scenes/AdventureScene';
import { EndingScene } from './scenes/EndingScene';
import { IntroScene } from './scenes/IntroScene';
import { fitIntegerZoom, inputManager } from './utils/game';
import { sfx } from './audio/Sfx';
import { isTouchDevice, TouchControls } from './ui/TouchControls';
import { hideLoadingOnSceneReady } from './ui/Loading';
import { sortByDepthStable } from './utils/depthSort';
import { FrameWatch, goLowSpec } from './config/perf';

// Orden por profundidad casi lineal cuando casi nada cambió (mismo resultado que el de Phaser, ver depthSort.ts).
type SortableList = { sortChildrenFlag: boolean; list: Phaser.GameObjects.GameObject[]; sortByDepth: (a: unknown, b: unknown) => number };
(Phaser.GameObjects.DisplayList.prototype as unknown as { depthSort(this: SortableList): void }).depthSort = function (this: SortableList) {
  if (!this.sortChildrenFlag) return;
  sortByDepthStable(this.list as unknown as { _depth: number }[], (l) => Phaser.Utils.Array.StableSort(l, this.sortByDepth));
  this.sortChildrenFlag = false;
};

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#07060d',
  antialias: false,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: { target: 60, forceSetTimeOut: false },
  audio: { noAudio: true },
  scene: [BootScene, WarningScene, MenuScene, CharacterSelectScene, StageSelectScene, FightScene, ResultScene, IntroScene, AdventureScene, EndingScene],
};

// Se marca antes de crear las escenas para que sus textos de ayuda nombren los botones táctiles.
if (isTouchDevice()) document.body.classList.add('tactil');

const game = new Phaser.Game(config);

inputManager.attach(window);

const refit = () => fitIntegerZoom(game);
const touch = new TouchControls(inputManager, refit);
const relayout = () => touch.layout();
window.addEventListener('resize', relayout);
window.addEventListener('orientationchange', () => setTimeout(relayout, 200));
document.addEventListener('fullscreenchange', () => setTimeout(relayout, 50));
game.events.once(Phaser.Core.Events.READY, () => {
  // el arranque quita su aviso él mismo, cuando termina de dibujar el arte
  hideLoadingOnSceneReady(game, ['BootScene']);
  touch.mount();
  relayout();
});

// El audio solo puede arrancar tras un gesto del usuario.
const unlock = () => {
  sfx.unlock();
  sfx.startMusic();
};
window.addEventListener('keydown', unlock, { once: true });
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('touchend', unlock, { once: true });

game.events.on(Phaser.Core.Events.BLUR, () => sfx.suspend());
game.events.on(Phaser.Core.Events.FOCUS, () => sfx.resume());

// Vigía del ritmo: si el equipo no sostiene ~40 cuadros, pasa solo a calidad ligera (ver config/perf.ts).
const watch = new FrameWatch(goLowSpec);
game.events.on(Phaser.Core.Events.POST_STEP, () => {
  if (document.hidden) watch.reset();
  else watch.feed(game.loop.delta);
});
game.events.on(Phaser.Core.Events.VISIBLE, () => watch.reset());

// Evita el scroll de la página con las teclas del juego.
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
});

declare global {
  interface Window { mitosGame?: Phaser.Game; mitosInput?: typeof inputManager }
}
window.mitosGame = game;
window.mitosInput = inputManager;
