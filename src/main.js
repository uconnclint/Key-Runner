import { GameConfig } from './config.js';
import { fitConfig, installResizeGuards } from '../engine/phaser/scale.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import PlayScene from './scenes/PlayScene.js';
import OverScene from './scenes/OverScene.js';

// First-ever scale config for this game (previously Scale.NONE: a fixed
// 900x720 canvas, CSS-centered by styles.css's body flexbox, clipped on any
// viewport smaller than that -- see MIGRATION_PLAN.md's Key Runner note).
// FIT + CENTER_BOTH at the game's existing 900x720 base resolution
// (GameConfig.width/height, unchanged) now letterboxes/pillarboxes instead
// of clipping. `scale.width/height` (set by fitConfig) supersede the old
// top-level width/height Game Config keys, which are removed below to
// avoid two competing sources of the base resolution.
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0f18',
  pixelArt: true,
  roundPixels: true,
  scale: fitConfig({ width: GameConfig.width, height: GameConfig.height }),
  scene: [BootScene, MenuScene, PlayScene, OverScene]
};
// Exposed for the same reason slime/critter-codex do: browser-automation
// verification (and any future debugging) needs a handle on the live game
// instance -- e.g. to read `window.game.scene.getScene('play')` state
// directly when a backgrounded/automated tab can't be trusted to render
// every frame on its own schedule.
window.game = new Phaser.Game(config);

// FIT sizing is correct at boot (verified) but can go stale mid-session --
// found empirically during this migration's letterboxing check: a resized/
// backgrounded canvas didn't recompute until something forced a fresh
// updateScale(), even though ScaleManager's own parentSize had already
// picked up the new bounds. installResizeGuards() is the engine's answer
// (resize/orientationchange/focus/visibilitychange + a host ResizeObserver
// + a defensive per-frame bounds check) -- exactly the iPad split-view /
// rotation / classroom-hardware case game-house-style's device-gotchas
// section calls out, not just a fix for this dev-tooling quirk.
installResizeGuards(window.game);
