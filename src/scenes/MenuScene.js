import {
  GameConfig, savePrefs,
  TRACKS, getSelectedTrackIndex, setSelectedTrackIndex,
  CHARACTERS, getSelectedCharIndex, setSelectedCharIndex,
  REMOTE_LB_URL
} from '../config.js';
import { SFX } from '../utils/audio.js';
import { getMissionLines } from '../utils/missions.js';

export default class MenuScene extends Phaser.Scene {
  constructor(){ super('menu'); }

  create(){
    const { width, height } = this.scale;

    // BG + header
    if (this.textures.exists('subwayBg')) this.add.image(width/2, height/2, 'subwayBg').setDisplaySize(width, height);
    this.add.rectangle(0,0,width,height,0x07101d,0.62).setOrigin(0);
    this.add.rectangle(0,0,width,140,0x101a2d,0.88).setOrigin(0);
    this.add.text(width/2, 70, 'KEY RUNNER', {
      fontFamily:'"Press Start 2P"', fontSize:'34px', color:'#e6f3ff'
    }).setOrigin(0.5);
// Directions (avoid clipping)
const descStyle = {
  fontFamily: '"Press Start 2P"',
  fontSize: '14px',
  color: '#9db2d0',
  align: 'center',
  padding: { top: 8, bottom: 2 }   // <-- extra headroom
};
this.add.text(width/2, 152, 'Type the green letter before time runs out. Wrong key ends the run.', descStyle)
  .setOrigin(0.5, 0)   // <-- top-anchored, not centered vertically
  .setResolution(2);   // <-- crisper & better metrics

    // ---- Leaderboard (bottom-right) ----
    const lbRight  = width - 20;
    const lbBottom = height - 20;

    this.add.text(lbRight, lbBottom - 196, 'CLASS TOP 10', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff',
      padding:{ top:8, bottom:2 }
    }).setOrigin(1,0).setResolution(2);

    this.lbText = this.add.text(lbRight, lbBottom, 'Loading…', {
      fontFamily:'"Press Start 2P"', fontSize:'12px', color:'#e6f3ff',
      align:'right', lineSpacing:6
    }).setOrigin(1,1);

    this._loadLeaderboard();
    // ------------------------------------

    // ---- Missions ----
    const missionLines = getMissionLines(3);
    this.add.text(70, 620, 'MISSIONS', {
      fontFamily:'"Press Start 2P"', fontSize:'13px', color:'#fff27a',
      stroke:'#06111f', strokeThickness:3
    });
    this.add.text(70, 646, missionLines.length ? missionLines.join('\n') : 'ALL MISSIONS COMPLETE', {
      fontFamily:'"Press Start 2P"', fontSize:'10px', color:'#e6f3ff',
      lineSpacing:6, stroke:'#06111f', strokeThickness:3
    });
    // ------------------

    // Mode picker
    const modes = ['home','top','bottom','mixed'];
    const y1 = 230;
    this.add.text(70, y1-32, 'Practice Mode', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    modes.forEach((m,i)=> this._button(70 + i*200, y1, 160, 44, m.toUpperCase(), () => {
      GameConfig.mode = m; SFX.tick(); this._refresh();
    }));

    // Difficulty picker
    const diffs = ['easy','medium','hard'];
    const y2 = 330;
    this.add.text(70, y2-32, 'Difficulty', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    diffs.forEach((d,i)=> this._button(70 + i*200, y2, 160, 44, d.toUpperCase(), () => {
      GameConfig.difficulty = d; SFX.tick(); this._refresh();
    }));

    // Character picker + preview
    const y3 = 410;
    this.add.text(70, y3-32, 'Character', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    this.charIndex = getSelectedCharIndex();
    this._button(70, y3, 44, 44, '◀', () => this._changeChar(-1));
    this._button(370, y3, 44, 44, '▶', () => this._changeChar(+1));
    this.charLabel = this.add.text(130, y3+10, '', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff'
    }).setOrigin(0,0);

    // Preview sprite on right
    this.charPreview = this.add.image(width - 160, 420, CHARACTERS[this.charIndex].id).setOrigin(0.5,1);
    this._fitPreview();

    // Music picker
    const y4 = 480;
    this.add.text(70, y4-32, 'Music', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    this.trackIndex = getSelectedTrackIndex();
    this._button(70, y4, 44, 44, '◀', () => this._changeTrack(-1));
    this._button(370, y4, 44, 44, '▶', () => this._changeTrack(+1));
    this.trackLabel = this.add.text(130, y4+12, '', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff'
    }).setOrigin(0,0);

    // Start
    this._button(width/2-120, 552, 240, 56, 'START', () => {
      savePrefs(); SFX.ok();
      const charId = CHARACTERS[this.charIndex].id;
      if (this.music && this.music.isPlaying) this.music.stop(); // stop preview
      this.scene.start('play', { mode: GameConfig.mode, difficulty: GameConfig.difficulty, charId });
    });

    // 🔊/🔇 mute
    this.muteText = this.add.text(width-60, 20, (localStorage.getItem('kr_muted')==='1')?'🔇':'🔊', {fontSize:'28px'})
      .setInteractive({useHandCursor:true})
      .on('pointerdown', () => {
        SFX.setMuted(!SFX.muted);
        this.sound.mute = SFX.muted;
        this.muteText.setText(SFX.muted ? '🔇' : '🔊');
      });
    this.sound.mute = (localStorage.getItem('kr_muted')==='1');

    // Init labels + kick off preview
    this._refresh();
    this._changeTrack(0);
    this._changeChar(0);

    // Clean up preview if leaving scene
    this.events.once('shutdown', ()=> { try{ this.music && this.music.stop(); }catch(e){} });
    this.events.once('destroy',  ()=> { try{ this.music && this.music.stop(); }catch(e){} });
  }

  // --- Leaderboard fetch + auto-refresh ---
  async _loadLeaderboard(){
    if (!REMOTE_LB_URL){ this.lbText?.setText('Leaderboard offline'); return; }
    try{
      const data = await fetch(`${REMOTE_LB_URL}?t=${Date.now()}`).then(r=>r.json());
      const list = Array.isArray(data) ? data.slice(0,10) : [];
      const lines = list.length
        ? list.map((r,i)=> `${String(i+1).padStart(2,'0')}  ${String(r.name||'???').padEnd(3,' ')}  ${String(r.score||0).padStart(5,' ')}`).join('\n')
        : 'No scores yet.';
      this.lbText.setText(lines);
    }catch{
      this.lbText.setText('Could not load.');
    }
    this.time.delayedCall(20000, ()=> this._loadLeaderboard()); // refresh every 20s
  }

  // --- Character helpers ---
  _fitPreview(){
    const meta = CHARACTERS[this.charIndex];
    const targetH = meta.height || 64;
    const baseH = this.charPreview.height || targetH;
    const s = targetH / baseH;
    this.charPreview.setScale(s);
  }
  _changeChar(delta){
    this.charIndex = (this.charIndex + delta + CHARACTERS.length) % CHARACTERS.length;
    setSelectedCharIndex(this.charIndex);
    const meta = CHARACTERS[this.charIndex];
    this.charLabel.setText(meta.title.toUpperCase());
    this.charPreview.setTexture(meta.id);
    this._fitPreview();
    SFX.tick();
  }

  // --- Music helpers (robust; avoids preview errors) ---
  _changeTrack(delta){
    this.trackIndex = (this.trackIndex + delta + TRACKS.length) % TRACKS.length;
    setSelectedTrackIndex(this.trackIndex);

    const meta = TRACKS[this.trackIndex];
    if (this.trackLabel) this.trackLabel.setText(meta.title.toUpperCase());

    // Stop previous preview
    try { if (this.music && this.music.isPlaying) this.music.stop(); } catch(e){}

    // Ensure audio is available; if not, load and retry once
    if (!this.cache.audio.exists(meta.id)) {
      this.load.audio(meta.id, meta.url);
      this.load.once('complete', () => this._changeTrack(0));
      this.load.start();
      return;
    }

    // Add or reuse, then play; swallow autoplay/promise issues
    let snd = this.sound.get(meta.id);
    if (!snd) snd = this.sound.add(meta.id, { loop: true, volume: 0.25 });
    const p = snd.play();
    if (p && typeof p.catch === 'function') p.catch(()=>{});
    this.music = snd;

    this.sound.mute = (localStorage.getItem('kr_muted')==='1');
  }

  // --- UI helpers ---
  _button(x,y,w,h,label,cb){
    const bg = this.add.rectangle(x,y,w,h,0x2a334d).setOrigin(0);
    const txt = this.add.text(x+w/2, y+h/2, label, {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#e6f3ff'
    }).setOrigin(0.5);
    bg.setInteractive({useHandCursor:true})
      .on('pointerover', ()=> bg.setFillStyle(0x344062))
      .on('pointerout',  ()=> bg.setFillStyle(0x2a334d))
      .on('pointerdown', cb);
    return {bg, txt};
  }

  _refresh(){
    if (this.sel) this.sel.destroy(true);
    this.sel = this.add.text(70, 590,
      `MODE: ${GameConfig.mode.toUpperCase()}    DIFFICULTY: ${GameConfig.difficulty.toUpperCase()}`,
      {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff'}
    );
    if (this.trackLabel) this.trackLabel.setText(TRACKS[this.trackIndex].title.toUpperCase());
    if (this.charLabel)  this.charLabel.setText(CHARACTERS[this.charIndex].title.toUpperCase());
  }
}
