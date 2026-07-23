import ctx from './engine-bridge.js';

// mode/difficulty are read once here (matching the original's read-once-
// at-module-load shape) then mutated directly in memory by MenuScene's
// picker buttons; savePrefs() below remains the explicit "commit to
// storage" checkpoint, now writing through ctx.save instead of raw
// localStorage.
export const GameConfig = {
  mode: ctx.save.get().mode,
  difficulty: ctx.save.get().diff,
  times: { easy: 2.35, medium: 1.95, hard: 1.55 },
  difficultyBonus: { easy: 1, medium: 1.25, hard: 1.6 },
  width: 900,
  height: 720
};

// 🎵 Update titles/urls if you rename files in /assets
export const TRACKS = [
  { id: 't0', title: 'Pixel Quest',           url: 'assets/Pixel Quest_2025-08-09T14_18_09.mp3' },
  { id: 't1', title: 'Type All Day',          url: 'assets/Type All Day.mp3' },
  { id: 't2', title: 'Type It Up!',           url: 'assets/Type It Up!.mp3' },
  { id: 't3', title: 'Typing It UP',  url: 'assets/Typing With Attitude.mp3' },
  { id: 't4', title: 'HR Jam',          url: 'assets/home row jam.mp3' },
  { id: 't5', title: 'Broadway Typing',         url: 'assets/Broadway Typing.mp3' },
  { id: 't6', title: 'Imagine Typing',         url: 'assets/Imagine Typing.mp3' },
  { id: 't7', title: 'Type Rap',         url: 'assets/Type Rap.mp3' },
  { id: 't8', title: 'Backst. Keys',         url: 'assets/Backstreet Keys.mp3' },
  { id: 't9', title: 'Key Pop',         url: 'assets/Key Pop.mp3' },
  { id: 't10', title: 'Typing Drama',         url: 'assets/Typing Drama.mp3' },
  { id: 't11', title: 'Qwerty',         url: 'assets/QWERTY.mp3' },
  { id: 't12', title: 'Top Row',         url: 'assets/Top Row.mp3' },
  { id: 't13', title: 'Bottom Row',         url: 'assets/Bottow Row.mp3' },
  { id: 't14', title: 'Touch Type',         url: 'assets/Touch Type.mp3' },
  { id: 't15', title: 'Home Row',          url: 'assets/Home Row.mp3' }


  
];

// 🧍 Characters — add more by pushing to this array
// `height` is the on-screen height in pixels (we auto-scale the sprite to this).
export const CHARACTERS = [
  { id: 'runner-boy',   title: 'Metro Max',   url: 'assets/generated/runner-boy.png',   height: 108 },
  { id: 'runner-girl',  title: 'Neon Nia',    url: 'assets/generated/runner-girl.png',  height: 108 },
  { id: 'runner-mascot', title: 'Key Mascot', url: 'assets/generated/runner-mascot.png', height: 108 },
  { id: 'eastie', title: 'Eastie', url: 'assets/generated/eastie.png', height: 112 },
  { id: 'runner-skater', title: 'Skater Kai', url: 'assets/generated/runner-skater.png', height: 108 },
  { id: 'runner-robot', title: 'Byte Bot', url: 'assets/generated/runner-robot.png', height: 108 },
  { id: 'runner-hero', title: 'Captain Key', url: 'assets/generated/runner-hero.png', height: 108 }
];

export function savePrefs() {
  ctx.save.patch({ mode: GameConfig.mode, diff: GameConfig.difficulty });
}

// Music helpers
export function getSelectedTrackIndex() {
  const n = ctx.save.get().trackIdx;
  return Number.isFinite(n) ? Math.max(0, Math.min(n, TRACKS.length - 1)) : 0;
}
export function setSelectedTrackIndex(i) {
  ctx.save.patch({ trackIdx: i });
}
  export const REMOTE_LB_URL =
  'https://script.google.com/macros/s/AKfycbx_yj2WazYtxadLvQiEphfweughwsWnuBu_pTh6np6rA-UvdHqVJU7j55Ta0bEZUjCC/exec';
// Character helpers
export function getSelectedCharIndex() {
  const n = ctx.save.get().charIdx;
  return Number.isFinite(n) ? Math.max(0, Math.min(n, CHARACTERS.length - 1)) : 0;
}
export function setSelectedCharIndex(i) {
  ctx.save.patch({ charIdx: i });
}

// Initials helpers (kr_last_name facade) -- used by OverScene's
// Phaser-native initials picker.
export function getLastInitials() {
  return String(ctx.save.get().lastName || '').toUpperCase();
}
export function setLastInitials(s) {
  ctx.save.patch({ lastName: s });
}
