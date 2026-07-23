import { GameConfig } from './config.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import PlayScene from './scenes/PlayScene.js';
import OverScene from './scenes/OverScene.js';
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GameConfig.width,
  height: GameConfig.height,
  backgroundColor: '#0a0f18',
  pixelArt: true,
  roundPixels: true,
  scene: [BootScene, MenuScene, PlayScene, OverScene]
};
// Exposed for the same reason slime/critter-codex do: browser-automation
// verification (and any future debugging) needs a handle on the live game
// instance -- e.g. to read `window.game.scene.getScene('play')` state
// directly when a backgrounded/automated tab can't be trusted to render
// every frame on its own schedule.
window.game = new Phaser.Game(config);
