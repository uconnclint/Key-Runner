import { TRACKS, CHARACTERS } from '../config.js';

export default class BootScene extends Phaser.Scene {
  constructor(){ super('boot'); }

  preload(){
    const generatedAssets = {
      subwayBg: 'assets/generated/subway-runner-bg.png',
      starToken: 'assets/generated/star-token.png',
      barricade: 'assets/generated/barricade.png',
      cone: 'assets/generated/cone.png',
      crackedKey: 'assets/generated/cracked-key.png',
      shieldPower: 'assets/generated/shield.png',
      magnetPower: 'assets/generated/magnet.png',
      comboBadge: 'assets/generated/combo-badge.png'
    };

    Object.entries(generatedAssets).forEach(([key, url]) => {
      if (!this.textures.exists(key)) this.load.image(key, url);
    });

    // --- Music (supports single URL or [ogg, mp3] array) ---
    TRACKS.forEach(t => {
      const urls = Array.isArray(t.url) ? t.url : [t.url];
      this.load.audio(t.id, urls);
    });

    // --- Characters ---
    CHARACTERS.forEach(c => {
      if (!this.textures.exists(c.id)) this.load.image(c.id, c.url);
    });

    // --- Legacy bonus star fallback ---
    if (!this.textures.exists('star')) this.load.image('star', 'assets/star.png');

    // Surface any asset issues (super helpful for filename/path mismatches)
    this.load.on('loaderror', file => {
      // eslint-disable-next-line no-console
      console.warn('[Boot] Load error:', file?.key, file?.src);
    });
  }

  create(){
    // Tiny fallback textures used in-game
    const g = this.add.graphics();

    // Placeholder runner
    g.fillStyle(0x66ff99, 1); g.fillRect(0, 0, 16, 16);
    g.fillStyle(0x003322, 1);
    g.fillRect(4, 5, 2, 2); g.fillRect(10, 5, 2, 2); g.fillRect(6, 10, 4, 2);
    g.generateTexture('runner', 16, 16); g.clear();

    // Obstacle block
    g.fillStyle(0xff5566, 1); g.fillRect(0, 0, 24, 24);
    g.fillStyle(0x550000, 1); g.fillRect(3, 3, 18, 18);
    g.generateTexture('ob', 24, 24); g.clear();

    // Keycap outline
    g.fillStyle(0x2b3142, 1); g.fillRect(0, 0, 36, 36);
    g.lineStyle(2, 0x98a1c0, 1); g.strokeRect(1, 1, 34, 34);
    g.generateTexture('keycap', 36, 36);
    g.destroy();

    this.scene.start('menu');
  }
}
