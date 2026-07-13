export class TinySFX {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('kr_muted') === '1';
  }
  _ctx(){ if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); return this.ctx; }
  _beep(freq=880, ms=80, type='square', gain=0.03){
    if (this.muted) return;
    const ctx = this._ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + ms/1000);
  }
  ok(){ this._beep(880, 70, 'square', 0.03); }
  bad(){ this._beep(140, 140, 'square', 0.05); }
  tick(){ this._beep(600, 40, 'square', 0.02); }
  setMuted(v){ this.muted = v; localStorage.setItem('kr_muted', v ? '1':'0'); }
}
export const SFX = new TinySFX();
