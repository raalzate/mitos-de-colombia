import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/game-config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { FightScene } from './scenes/FightScene';
import { ResultScene } from './scenes/ResultScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { fitIntegerZoom, inputManager } from './utils/game';
import { sfx } from './audio/Sfx';

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
  scene: [BootScene, MenuScene, CharacterSelectScene, StageSelectScene, FightScene, ResultScene],
};

const game = new Phaser.Game(config);

inputManager.attach(window);

const refit = () => fitIntegerZoom(game);
window.addEventListener('resize', refit);
document.addEventListener('fullscreenchange', () => setTimeout(refit, 50));
game.events.once(Phaser.Core.Events.READY, refit);

// El audio solo puede arrancar tras un gesto del usuario.
const unlock = () => {
  sfx.unlock();
  sfx.startMusic();
};
window.addEventListener('keydown', unlock, { once: true });
window.addEventListener('pointerdown', unlock, { once: true });

game.events.on(Phaser.Core.Events.BLUR, () => sfx.suspend());
game.events.on(Phaser.Core.Events.FOCUS, () => sfx.resume());

// Evita el scroll de la página con las teclas del juego.
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
});

declare global {
  interface Window { mitosGame?: Phaser.Game; mitosInput?: typeof inputManager }
}
window.mitosGame = game;
window.mitosInput = inputManager;
