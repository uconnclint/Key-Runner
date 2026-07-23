import ctx from '../engine-bridge.js';

export class TinySFX {
  constructor() {
    this.ctx = null;
  }
  // Always read live from ctx.settings -- no local cache to go stale
  // (matches critter-codex's AudioManager.isMuted()/Math Arcade's
  // AudioManager.muted getter pattern). Adopted once from the legacy
  // kr_muted ('1'/'0') flag by engine-bridge.js's legacySettingsReaders.
  get muted() { return !!ctx.settings.get('muted'); }
  _ctx(){ if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); return this.ctx; }
  _beep(freq=880, ms=80, type='square', gain=0.03){
    if (this.muted) return;
    const actx = this._ctx();
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + ms/1000);
  }
  ok(){ this._beep(880, 70, 'square', 0.03); }
  bad(){ this._beep(140, 140, 'square', 0.05); }
  tick(){ this._beep(600, 40, 'square', 0.02); }
  setMuted(v){ ctx.settings.set('muted', !!v); }
}
export const SFX = new TinySFX();
