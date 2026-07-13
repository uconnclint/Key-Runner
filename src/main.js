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
new Phaser.Game(config);
