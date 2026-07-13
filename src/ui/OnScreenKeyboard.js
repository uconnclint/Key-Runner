import { KEY_POOLS } from '../utils/keys.js';

export default class OnScreenKeyboard extends Phaser.GameObjects.Container {
  constructor(scene, x = 0, y = 0) {
    super(scene, x, y);
    this.scene = scene;
    this.keys = [];            // [{ k, cap, txt }]

    const KEY_SPACING = 40, KEY_W = 36;
    const rows = [
      { arr: KEY_POOLS.top,    y: 0,   xOff: 24 },
      { arr: KEY_POOLS.home,   y: 50,  xOff: 44 },
      { arr: KEY_POOLS.bottom, y: 100, xOff: 64 }
    ];

    let maxW = 0;
    rows.forEach(r => {
      let xPos = r.xOff;
      r.arr.forEach(k => {
        const cap = scene.add.image(xPos, r.y, 'keycap').setOrigin(0, 0);
        const txt = scene.add.text(xPos + 18, r.y + 10, k.toUpperCase(), {
          fontFamily: '"Press Start 2P"',
          fontSize: '12px',
          color: '#cfe4ff'
        }).setOrigin(0.5, 0);

        this.add(cap); this.add(txt);
        this.keys.push({ k, cap, txt });
        xPos += KEY_SPACING;
      });

      const rowWidth = r.xOff + (r.arr.length - 1) * KEY_SPACING + KEY_W;
      maxW = Math.max(maxW, rowWidth);
    });

    this.totalWidth = maxW;
    this.totalHeight = 140;
    this.setSize(maxW, this.totalHeight);
  }

  /**
   * Highlight the target key in a specific color.
   * @param {string} target - the letter to highlight (case-insensitive)
   * @param {number} color  - hex color (e.g., 0x7CFFA1); defaults to lane green
   */
  highlight(target, color = 0x7CFFA1) {
    if (!target) return;

    // normalize once
    const t = String(target).toLowerCase();
    const css = '#' + color.toString(16).padStart(6, '0');

    this.keys.forEach(({ k, cap, txt }) => {
      const isHit = (k.toLowerCase() === t);

      // clear any existing tint
      if (cap.clearTint) cap.clearTint();

      if (isHit) {
        // apply highlight tint + matching text color
        if (cap.setTintFill) cap.setTintFill(color);
        else if (cap.setTint) cap.setTint(color);
        else if (cap.setFillStyle) cap.setFillStyle(color);
        if (txt && txt.setColor) txt.setColor(css);
      } else {
        // non-target keys revert to subdued label color
        if (txt && txt.setColor) txt.setColor('#9db2d0');
      }
    });
  }

  /**
   * Optional helper to clear highlight (restores default label color).
   */
  clearHighlight() {
    this.keys.forEach(({ cap, txt }) => {
      if (cap.clearTint) cap.clearTint();
      if (txt && txt.setColor) txt.setColor('#cfe4ff');
    });
  }
}
