import { KEY_POOLS } from '../utils/keys.js';

// Widens each key's effective tap target past its drawn 36x36 face to the
// house >=44px floor (36 + 2*8 = 52px) -- same HIT_PAD convention as
// engine/phaser/ui.js's button(). The keycap Image itself keeps its
// original 36x36 size/spacing; only the invisible hit rectangle grows.
const HIT_PAD = 8;
const KEY_W = 36;

export default class OnScreenKeyboard extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} [x=0] @param {number} [y=0]
   * @param {object} [opts]
   * @param {(letter: string) => void} [opts.onKeyPress] fired on tap/click
   *   of any key with the raw lowercase letter -- PlayScene wires this to
   *   `(k) => this._handleKey({ key: k, repeat: false })`, so a tap runs
   *   through the EXACT SAME normalizeKey/isAllowedChar/correct-or-wrong
   *   path a real physical keydown does.
   */
  constructor(scene, x = 0, y = 0, opts = {}) {
    super(scene, x, y);
    this.scene = scene;
    this.keys = [];            // [{ k, cap, txt }]
    this.onKeyPress = opts.onKeyPress ?? null;

    const KEY_SPACING = 40;
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

        // Tappable: padded hit rectangle (origin is (0,0), so local (0,0)
        // is the keycap's own top-left corner -- padding out by HIT_PAD on
        // every side is a plain Image, not a Container, so none of
        // engine/phaser/ui.js's container-displayOrigin gotcha applies
        // here). onKeyPress hands back the raw pool letter; PlayScene's
        // handler does the same normalize/allow/correct-or-wrong work a
        // real keydown gets.
        cap.setInteractive(
          new Phaser.Geom.Rectangle(-HIT_PAD, -HIT_PAD, KEY_W + HIT_PAD * 2, KEY_W + HIT_PAD * 2),
          Phaser.Geom.Rectangle.Contains
        );
        cap.on('pointerover', () => scene.input.setDefaultCursor('pointer'));
        cap.on('pointerout', () => scene.input.setDefaultCursor('default'));
        cap.on('pointerdown', () => this.onKeyPress?.(k));

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

    this.keys.forEach(({ k, cap, txt }) => {
      const isHit = (k.toLowerCase() === t);

      // clear any existing tint
      if (cap.clearTint) cap.clearTint();

      if (isHit) {
        // tint the cap; label goes dark ink so the letter stays legible
        // against the tinted face (matching the tint made it invisible)
        if (cap.setTintFill) cap.setTintFill(color);
        else if (cap.setTint) cap.setTint(color);
        else if (cap.setFillStyle) cap.setFillStyle(color);
        if (txt && txt.setColor) txt.setColor('#06111f');
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
