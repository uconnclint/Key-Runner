// engine-bridge.js — bridge between Key Runner's ES-module game code and
// clint-engine. Like slime (already plain ES modules, no build step): this
// builds ONE shared `ctx` service bundle and exports it as a default
// singleton; any module that needs storage/settings does
// `import ctx from './engine-bridge.js'` (or '../engine-bridge.js' from
// src/scenes|utils|ui). window.CE is also set, matching house convention
// (critter-codex's window.CE bridge), in case a future non-module script
// needs it.
//
// SEVEN flat legacy keys fold into this one save blob + one settings key
// (netrunner-style multi-key consolidation — see its src/engine-bridge.js
// for the original worked example this one follows): kr_mode, kr_diff,
// kr_track_idx, kr_char_idx, kr_last_name, kr_mission_progress all fold
// into the save blob below; kr_muted folds into ctx.settings (mute is
// ALWAYS a settings concern, never part of the save blob, per
// CONTRACTS.md's core/settings.js contract). All seven legacy keys are
// left in place, untouched — a rollback to the pre-engine code still
// finds them exactly as it left them.

import { createGameContext } from '../engine/core/context.js';

// ── Save: gate on kr_track_idx, migrate() pulls the rest ──────
//
// Of the six save-blob-bound legacy keys, kr_track_idx (and kr_char_idx)
// are the ONLY ones written UNCONDITIONALLY on every menu visit — the old
// MenuScene.create() always called this._changeTrack(0)/this._changeChar(0)
// (see git history of src/scenes/MenuScene.js before this migration), even
// at delta 0, so ANY returning player who ever opened the menu has these
// two keys set, whether or not they ever pressed Start or finished a run.
// kr_mode/kr_diff only get written on Start (savePrefs()); kr_last_name/
// kr_mission_progress only after finishing >=1 run. Gating adoption here
// (rather than on one of those later-written keys) adopts the WIDEST
// possible set of returning players — matches netrunner's reasoning for
// picking netrunner_progress as ITS gate (the key every real write path
// touches first), just applied to this game's actual write order.
function readLegacyStr(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function readLegacyInt(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  } catch { return fallback; }
}
function readLegacyMissions(fallback) {
  try {
    const raw = localStorage.getItem('kr_mission_progress');
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : fallback;
  } catch { return fallback; }
}

// Mirrors src/config.js's pre-migration defaults ('mixed'/'easy') and
// src/utils/missions.js's empty-progress shape ({}) exactly.
const SAVE_DEFAULTS = {
  mode: 'mixed',
  diff: 'easy',
  trackIdx: 0,
  charIdx: 0,
  lastName: '',
  missions: {},
};

// migrate(data, fromKey): createSave() calls this once, only when
// kr_track_idx has parseable data (the gate above). `data` is that key's
// OWN parsed value (a bare number, e.g. 3) — not a useful shape for the
// whole blob, so every field is instead independently re-read from its own
// legacy key here, netrunner-style, rather than trying to reuse `data`.
function migrateLegacySave(data, fromKey) {
  return {
    mode: readLegacyStr('kr_mode', SAVE_DEFAULTS.mode),
    diff: readLegacyStr('kr_diff', SAVE_DEFAULTS.diff),
    trackIdx: readLegacyInt('kr_track_idx', SAVE_DEFAULTS.trackIdx),
    charIdx: readLegacyInt('kr_char_idx', SAVE_DEFAULTS.charIdx),
    lastName: readLegacyStr('kr_last_name', SAVE_DEFAULTS.lastName),
    missions: readLegacyMissions(SAVE_DEFAULTS.missions),
  };
}

// ── Settings: adopt the old kr_muted flag ──────────────────────
//
// kr_muted was written ONLY as the string '1' or '0' (src/utils/audio.js's
// TinySFX.setMuted — never any other value, never a real boolean). A
// never-set key means no EXPLICIT choice was ever saved, so it correctly
// falls through to the engine's muted-by-default standard (Q11) rather
// than the OLD code's implicit "audible" default (TinySFX's own
// constructor read `=== '1'`, so a missing key meant muted=false there).
// Matches every prior migration's mute-adoption precedent exactly
// (netrunner/critter-codex/slime all read live off ctx.settings the same
// way).
function readLegacyMuted(storage) {
  let raw;
  try { raw = storage.getItem('kr_muted'); } catch { return null; }
  if (raw === null) return null;
  return { muted: raw === '1' };
}

const ctx = createGameContext({
  gameId: 'key-runner',
  saveVersion: 1,
  saveDefaults: SAVE_DEFAULTS,
  legacySaveKeys: ['kr_track_idx'],
  saveMigrate: migrateLegacySave,
  legacySettingsReaders: [readLegacyMuted],
});

// House convention (see critter-codex's window.CE bridge / slime's
// engine-bridge.js): expose the same instance on window.CE for any future
// non-module straggler. Every current Key Runner file is already a module
// and can just `import ctx from './engine-bridge.js'`.
window.CE = ctx;

export default ctx;
