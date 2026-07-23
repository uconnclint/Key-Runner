// InitialsPicker.js — Phaser-native 3-letter initials picker (A-Z cycle
// per slot), built from engine/phaser/ui.js's CEP.button/panel/header/
// toast. Replaces window.prompt()/alert(), which game-house-style's
// device-gotchas flags as policy-blocked on managed Chromebooks ("never
// use them"). No free text, ever -- same COPPA-safe-by-construction
// principle as core/naming.js's word-picker names, just applied to
// 3-letter arcade-style initials instead of a full name.

import { button, iconButton, panel, header, toast } from '../../engine/phaser/ui.js';
import { SFX } from '../utils/audio.js';
import ctx from '../engine-bridge.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const FONT = '"Press Start 2P"';

/**
 * Show a modal 3-letter initials picker over the current scene and
 * resolve with the chosen string once confirmed. Destroys every game
 * object it created before resolving, so the caller's own scene is clean
 * to keep building on top of.
 * @param {Phaser.Scene} scene
 * @param {object} [opts]
 * @param {string} [opts.seed] 3-char starting value (e.g. from
 *   config.js's getLastInitials()); anything not exactly 3 A-Z letters
 *   falls back to 'A' per slot
 * @param {Set<string>} [opts.banned] uppercase 3-letter combos to reject
 *   (re-shown with a toast instead of confirming)
 * @returns {Promise<string>} the confirmed 3-letter initials
 */
export function pickInitials(scene, opts = {}) {
  const banned = opts.banned ?? new Set();
  const seed = String(opts.seed || '').toUpperCase();
  const { width, height } = scene.scale;

  return new Promise((resolve) => {
    const cx = width / 2;
    const cy = height / 2;
    const depth = 300;
    const group = [];
    const own = (o) => { group.push(o); return o; };

    own(scene.add.rectangle(0, 0, width, height, 0x000000, 0.78).setOrigin(0).setDepth(depth));
    own(panel(scene, cx, cy, 560, 300, {
      fill: 0x101a2d, stroke: 0x2f6ef2, strokeW: 3, depth: depth + 1,
    }));
    own(header(scene, 'ENTER YOUR INITIALS', {
      x: cx, y: cy - 118, size: 20, fontFamily: FONT, color: '#e6f3ff',
    })).setDepth(depth + 2);
    own(scene.add.text(cx, cy - 82, 'ARCADE-STYLE, A-Z ONLY', {
      fontFamily: FONT, fontSize: '9px', color: '#9db2d0',
    }).setOrigin(0.5)).setDepth(depth + 2);

    // 320px between slot centers, +/-52px arrow offset within each slot --
    // iconButton()'s circular hit area is a fixed 44px diameter (the
    // MIN_TAP floor: button()'s own rect-shape width floor is 96px, which
    // would swallow the letter between a slot's own two arrows if used
    // here -- found and fixed during this migration's browser check).
    const slotXs = [cx - 160, cx, cx + 160];
    const letterY = cy + 6;
    const indices = slotXs.map((_, i) => {
      const ch = seed.length === 3 ? seed[i] : '';
      const idx = LETTERS.indexOf(ch);
      return idx >= 0 ? idx : 0;
    });
    const letterTexts = [];

    slotXs.forEach((x, i) => {
      own(iconButton(scene, x - 52, letterY, '◀', () => {
        indices[i] = (indices[i] - 1 + LETTERS.length) % LETTERS.length;
        letterTexts[i].setText(LETTERS[indices[i]]);
        SFX.tick();
      }, {
        size: 44, fill: 0x2a334d, textColor: '#e6f3ff',
        fontFamily: FONT, settings: ctx.settings,
      })).setDepth(depth + 2);

      const letterTxt = scene.add.text(x, letterY, LETTERS[indices[i]], {
        fontFamily: FONT, fontSize: '36px', color: '#7CFFA1',
        stroke: '#06111f', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(depth + 2);
      letterTexts.push(letterTxt);
      own(letterTxt);

      own(iconButton(scene, x + 52, letterY, '▶', () => {
        indices[i] = (indices[i] + 1) % LETTERS.length;
        letterTexts[i].setText(LETTERS[indices[i]]);
        SFX.tick();
      }, {
        size: 44, fill: 0x2a334d, textColor: '#e6f3ff',
        fontFamily: FONT, settings: ctx.settings,
      })).setDepth(depth + 2);
    });

    own(button(scene, cx, cy + 104, 'CONFIRM', () => {
      const s = indices.map((i) => LETTERS[i]).join('');
      if (banned.has(s)) {
        SFX.bad();
        toast(scene, 'TRY A DIFFERENT COMBO!', {
          x: cx, y: cy + 60, fontFamily: FONT, fontSize: 12, depth: depth + 5, settings: ctx.settings,
        });
        return;
      }
      SFX.ok();
      group.forEach((o) => o.destroy());
      resolve(s);
    }, {
      width: 220, height: 54, fontSize: 16, fill: 0x2fae5f, textColor: '#06111f',
      fontFamily: FONT, settings: ctx.settings,
    })).setDepth(depth + 2);
  });
}
