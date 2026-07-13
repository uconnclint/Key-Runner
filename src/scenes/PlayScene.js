import { GameConfig, CHARACTERS, getSelectedCharIndex, TRACKS, getSelectedTrackIndex } from '../config.js';
import { KEY_POOLS, normalizeKey, isAllowedChar, IGNORE_KEYS } from '../utils/keys.js';
import { SFX } from '../utils/audio.js';
import { updateMissionsFromRun } from '../utils/missions.js';
import OnScreenKeyboard from '../ui/OnScreenKeyboard.js';

const HAZARDS = ['barricade', 'cone', 'crackedKey'];
const PICKUPS = [
  { kind: 'star', texture: 'starToken', score: 1000 },
  { kind: 'shield', texture: 'shieldPower' },
  { kind: 'magnet', texture: 'magnetPower' },
  { kind: 'combo', texture: 'comboBadge' }
];

export default class PlayScene extends Phaser.Scene {
  constructor(){ super('play'); }

  preload(){
    if (!this.textures.exists('subwayBg')) this.load.image('subwayBg', 'assets/generated/subway-runner-bg.png');
    if (!this.textures.exists('starToken')) this.load.image('starToken', 'assets/generated/star-token.png');
  }

  init(data){
    this.mode = data.mode || GameConfig.mode || 'mixed';
    this.difficulty = data.difficulty || GameConfig.difficulty || 'easy';
    this.pool = KEY_POOLS[this.mode] || KEY_POOLS.mixed;
    this.charId = data.charId || CHARACTERS[getSelectedCharIndex()].id || 'runner-boy';

    const base = GameConfig.times[this.difficulty] || 2;
    this.baseReaction = base + 0.85;
    this.reaction = this.baseReaction;
    this.minReaction = this.difficulty === 'hard' ? 0.82 : this.difficulty === 'medium' ? 0.96 : 1.15;
    this.rampDelayMs = 30000;
    this.rampEvery = 8;
    this.rampStep = this.difficulty === 'hard' ? 0.08 : this.difficulty === 'medium' ? 0.07 : 0.055;
    this.diffBonus = GameConfig.difficultyBonus?.[this.difficulty] || 1;
  }

  create(){
    const { width, height } = this.scale;
    this.cameras.main.setScroll(0,0);

    this.add.image(width / 2, height / 2, 'subwayBg').setDisplaySize(width, height);
    this.add.rectangle(0,0,width,70,0x08101c,0.82).setOrigin(0);
    this.add.rectangle(0,height - 172,width,172,0x06101a,0.62).setOrigin(0);

    this.timeText = this._hudText(18, 18, 'TIME 0.0');
    this.letText = this._hudText(184, 18, 'LETTERS 0');
    this.scoreText = this._hudText(396, 18, 'SCORE 0');
    this.comboText = this._hudText(640, 18, 'STREAK 0 x1.0');
    this.powerText = this._hudText(18, 48, 'SHIELD 0  MAGNET 0');
    this.tipText = this.add.text(width/2, 84, 'TYPE THE GREEN LANE. GRAB POWER KEYS WHEN THEY FALL.', {
      fontFamily:'"Press Start 2P"', fontSize:'12px', color:'#d9f1ff',
      stroke:'#07101d', strokeThickness:4
    }).setOrigin(0.5);

    this.muteText = this.add.text(width-60, 18, (localStorage.getItem('kr_muted')==='1')?'MUTE':'SOUND', {
      fontFamily:'"Press Start 2P"', fontSize:'10px', color:'#e6f3ff',
      backgroundColor:'#18243a', padding:{x:8,y:7}
    }).setInteractive({useHandCursor:true}).on('pointerdown', () => {
      SFX.setMuted(!SFX.muted);
      this.sound.mute = SFX.muted;
      this.muteText.setText(SFX.muted ? 'MUTE' : 'SOUND');
    });
    this.sound.mute = (localStorage.getItem('kr_muted')==='1');
    this._startPlaylist(getSelectedTrackIndex());

    this.kb = new OnScreenKeyboard(this);
    this.add.existing(this.kb);
    const kbW = this.kb.totalWidth || 460;
    const kbH = this.kb.totalHeight || 140;
    const scale = Math.min(1, (width - 40) / kbW);
    this.kb.setScale(scale);
    this.kb.x = Math.round((width - kbW * scale) / 2);
    this.kb.y = Math.round(height - (kbH * scale) - 20);

    this.kbTopY = this.kb.y;
    this.playerY = this.kbTopY - 56;
    this.spawnY = 118;
    this.stopY = this.kbTopY - 6;
    this.colsX = [width/2 - 170, width/2, width/2 + 170];

    this.colsX.forEach(x => {
      this.add.rectangle(x, 132, 8, this.stopY - 132, 0x62e8ff, 0.12).setOrigin(0.5,0);
    });

    this.playerCol = 1;
    const playerTexture = this.textures.exists(this.charId) ? this.charId : 'runner-boy';
    this.player = this.add.image(this.colsX[this.playerCol], this.playerY, playerTexture).setOrigin(0.5,1);
    this._fitImageHeight(this.player, CHARACTERS.find(c => c.id === playerTexture)?.height || 86);

    this.letterTexts = this.colsX.map(x => this.add.text(x, 126, '', {
      fontFamily:'"Press Start 2P"', fontSize:'24px', color:'#ffffff',
      stroke:'#06111f', strokeThickness:5
    }).setOrigin(0.5));

    this.obGroup = this.add.group();
    this.pickupGroup = this.add.group();
    this.pickups = [];
    this.activeObstacles = 0;
    this.dropSpeed = (this.playerY - this.spawnY) / this.reaction;

    this.lettersTyped = 0;
    this.totalInputs = 0;
    this.mistakes = 0;
    this.perfects = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.stars = 0;
    this.runScore = 0;
    this.reactionTotal = 0;
    this.lastMiss = '';
    this.weakRows = { home:0, top:0, bottom:0 };
    this.shields = this.difficulty === 'easy' ? 1 : 0;
    this.magnetCharges = 0;
    this.gameOver = false;
    this.paused = false;
    this.ready = false;
    this.settling = false;

    this._countdown();
    this.keyHandler = e => this._handleKey(e);
    window.addEventListener('keydown', this.keyHandler);
    this.events.once('shutdown', () => this._cleanup());
    this.events.once('destroy', () => this._cleanup());
  }

  _hudText(x, y, text){
    return this.add.text(x, y, text, {
      fontFamily:'"Press Start 2P"', fontSize:'12px', color:'#d9f1ff',
      stroke:'#06111f', strokeThickness:3
    });
  }

  _fitImageHeight(image, targetH){
    const baseH = Math.max(1, image.height || targetH);
    image.setScale(Phaser.Math.Clamp(targetH / baseH, 0.1, 8));
  }

  _countdown(){
    let count = 3;
    const t = this.add.text(this.scale.width/2, this.playerY - 98, '3', {
      fontFamily:'"Press Start 2P"', fontSize:'50px', color:'#ffffff',
      stroke:'#07101d', strokeThickness:6
    }).setOrigin(0.5);

    this.time.addEvent({
      delay: 850,
      repeat: 3,
      callback: () => {
        if (count > 1) {
          count--;
          t.setText(String(count));
          SFX.tick();
        } else if (count === 1) {
          count = 0;
          t.setText('GO!');
          SFX.ok();
        } else {
          t.destroy();
          this.ready = true;
          this.startTime = this.time.now;
          this._nextWave();
          this._schedulePickup();
        }
      }
    });
  }

  _handleKey(e){
    if (e.repeat) return;
    if (IGNORE_KEYS.has(e.key)) {
      if (e.key === 'Escape') this._togglePause();
      if (e.key === 'r' || e.key === 'R') this.scene.restart({mode:this.mode, difficulty:this.difficulty, charId:this.charId});
      return;
    }
    if (this.gameOver || this.paused || this.settling || !this.ready) return;

    const k = normalizeKey(e.key);
    if (!k || !isAllowedChar(k)) return;
    this.totalInputs++;

    if (k === this.greenLetter) {
      this._correctInput(k);
      return;
    }

    if (this._tryConsumePickup(k)) return;

    this.mistakes++;
    this.lastMiss = k.toUpperCase();
    this._trackWeakRow(k);
    this._failOrShield('Wrong key!');
  }

  _correctInput(k){
    const now = this.time.now;
    const reactionMs = Math.max(0, now - this.waveStart);
    this.reactionTotal += reactionMs;

    const ratio = reactionMs / (this.reaction * 1000);
    const perfect = ratio <= 0.36;
    if (perfect) this.perfects++;

    this._goToColumn(this.safeCol);
    this.lettersTyped++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);

    const mult = this._multiplier();
    const speedBonus = perfect ? 80 : ratio < 0.65 ? 35 : 0;
    const points = Math.floor((100 + speedBonus) * this.diffBonus * mult);
    this.runScore += points;

    this._floatText(perfect ? `PERFECT +${points}` : `+${points}`, this.colsX[this.safeCol], this.playerY - 90, perfect ? '#fff27a' : '#7CFFA1');
    this.cameras.main.flash(70, 124, 255, 161, false, null, 0.18);
    if (SFX.ok) SFX.ok();

    if (this._canRamp() && this.lettersTyped % this.rampEvery === 0) {
      this.reaction = Math.max(this.minReaction, this.reaction - this.rampStep);
      this.dropSpeed = (this.playerY - this.spawnY) / this.reaction;
      this._floatText('SPEED UP', this.scale.width/2, 112, '#ffcf66');
    }

    this._clearWaveTimer();
    this.settling = true;
    this.letterTexts[this.safeCol].setText('');
    this._tryConsumePickup(k);

    if (this.activeObstacles === 0) {
      this.settling = false;
      this._nextWave();
    }
  }

  _multiplier(){
    return Math.min(4, 1 + Math.floor(this.streak / 10) * 0.5);
  }

  _canRamp(){
    return this.startTime && (this.time.now - this.startTime) >= this.rampDelayMs;
  }

  _trackWeakRow(k){
    const row = Object.entries(KEY_POOLS).find(([name, keys]) => name !== 'mixed' && keys.includes(k));
    if (row) this.weakRows[row[0]]++;
  }

  _goToColumn(colIndex){
    this.playerCol = colIndex;
    this.tweens.add({ targets: this.player, x: this.colsX[colIndex], duration: 92, ease: 'Back.easeOut' });
  }

  _nextWave(){
    if (!this.ready) return;
    this._clearObstacles();
    this._clearWaveTimer();
    this.settling = false;

    this.safeCol = this._chooseSafeColumn();
    this.greenLetter = Phaser.Utils.Array.GetRandom(this.pool);
    const wrongs = Phaser.Utils.Array.Shuffle(this.pool.filter(ch => ch !== this.greenLetter)).slice(0,2);
    const lettersByCol = [];
    lettersByCol[this.safeCol] = this.greenLetter;
    let wi = 0;
    [0,1,2].forEach(c => { if (c !== this.safeCol) lettersByCol[c] = wrongs[wi++]; });

    this.letterTexts.forEach((txt, c) => {
      txt.setText(lettersByCol[c].toUpperCase());
      txt.setColor(c === this.safeCol ? '#7CFFA1' : '#ff6c7c');
    });
    this.kb?.highlight?.(this.greenLetter, 0x7CFFA1);

    const toPlayerDur = ((this.playerY - this.spawnY) / this.dropSpeed) * 1000;
    const toStopDur = ((this.stopY - this.playerY) / this.dropSpeed) * 1000;
    [0,1,2].forEach(c => {
      if (c === this.safeCol) return;
      this._spawnHazard(c, toPlayerDur, toStopDur);
    });

    this.waveStart = this.time.now;
    this._startWaveTimer();
  }

  _chooseSafeColumn(){
    const wave = this.lettersTyped + 1;
    if (wave > 14 && wave % 4 === 0) return 2 - this.playerCol;
    if (wave > 8 && wave % 3 === 0) return Phaser.Math.Wrap(this.playerCol + Phaser.Math.Between(1,2), 0, 3);
    return Phaser.Math.Between(0,2);
  }

  _spawnHazard(col, toPlayerDur, toStopDur){
    const texture = Phaser.Utils.Array.GetRandom(HAZARDS);
    const ob = this.add.image(this.colsX[col], this.spawnY, texture).setOrigin(0.5);
    this._fitImageHeight(ob, texture === 'cone' ? 72 : 58);
    this.obGroup.add(ob);
    this.activeObstacles++;

    this.tweens.add({
      targets: ob,
      y: this.playerY - 24,
      scale: ob.scale * 1.18,
      duration: toPlayerDur,
      ease: 'Linear',
      onComplete: () => {
        if (!this.gameOver && this.playerCol === col) {
          this._failOrShield('Collision!');
          return;
        }
        this.tweens.add({
          targets: ob,
          y: this.stopY,
          alpha: 0,
          duration: toStopDur,
          ease: 'Linear',
          onComplete: () => {
            ob.destroy();
            this.activeObstacles--;
            if (this.settling && this.activeObstacles === 0) {
              this.settling = false;
              this._nextWave();
            }
          }
        });
      }
    });
  }

  _schedulePickup(){
    if (this.pickupTimer) this.pickupTimer.remove();
    this.pickupTimer = this.time.addEvent({
      delay: 15000,
      loop: true,
      callback: () => this._spawnPickup()
    });
    this.time.delayedCall(7000, () => this._spawnPickup());
  }

  _spawnPickup(){
    if (!this.ready || this.gameOver || this.paused || this.pickups.length > 2) return;
    const meta = Phaser.Utils.Array.GetRandom(PICKUPS);
    const col = Phaser.Math.Between(0,2);
    const available = this.pool.filter(ch => ch !== this.greenLetter && !this.pickups.some(p => p.letter === ch));
    const letter = Phaser.Utils.Array.GetRandom(available.length ? available : this.pool);
    const icon = this.add.image(this.colsX[col], this.spawnY, meta.texture).setOrigin(0.5);
    this._fitImageHeight(icon, meta.kind === 'star' ? 58 : 62);
    const label = this.add.text(this.colsX[col], this.spawnY, letter.toUpperCase(), {
      fontFamily:'"Press Start 2P"', fontSize:'18px', color:'#ffffff',
      stroke:'#06111f', strokeThickness:4
    }).setOrigin(0.5);
    this.pickupGroup.addMultiple([icon, label]);
    const item = { ...meta, icon, label, letter, col };
    this.pickups.push(item);

    const dur = ((this.stopY - this.spawnY) / this.dropSpeed) * 1000;
    this.tweens.add({
      targets: [icon, label],
      y: this.stopY,
      duration: dur,
      ease: 'Linear',
      onUpdate: () => {
        if (this.magnetCharges > 0 && item.kind === 'star' && Math.abs(icon.y - this.playerY) < 80) {
          this._consumePickup(item);
        }
      },
      onComplete: () => this._removePickup(item)
    });
  }

  _tryConsumePickup(k){
    const item = this.pickups.find(p => p.letter.toLowerCase() === k.toLowerCase() && p.icon.active);
    if (!item) return false;
    this._consumePickup(item);
    return true;
  }

  _consumePickup(item){
    if (!item || !item.icon?.active) return;
    if (item.kind === 'star') {
      this.stars++;
      this.runScore += Math.floor(item.score * this._multiplier());
      this._floatText(`+${Math.floor(item.score * this._multiplier())}`, item.icon.x, item.icon.y - 8, '#fff27a');
    } else if (item.kind === 'shield') {
      this.shields = Math.min(3, this.shields + 1);
      this._floatText('SHIELD +1', item.icon.x, item.icon.y - 8, '#85e7ff');
    } else if (item.kind === 'magnet') {
      this.magnetCharges = Math.min(3, this.magnetCharges + 1);
      this._floatText('MAGNET +1', item.icon.x, item.icon.y - 8, '#85e7ff');
    } else if (item.kind === 'combo') {
      this.streak += 5;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this._floatText('STREAK +5', item.icon.x, item.icon.y - 8, '#ff9cff');
    }
    if (SFX.ok) SFX.ok();
    this._removePickup(item);
  }

  _removePickup(item){
    if (!item) return;
    if (item.icon?.active) item.icon.destroy();
    if (item.label?.active) item.label.destroy();
    this.pickups = this.pickups.filter(p => p !== item && p.icon?.active);
  }

  _failOrShield(reason){
    if (this.shields > 0) {
      this.shields--;
      this.streak = 0;
      this._clearWaveTimer();
      this._goToColumn(this.safeCol);
      this.cameras.main.shake(130, 0.006);
      this._floatText('SHIELD SAVED YOU', this.scale.width/2, this.playerY - 120, '#85e7ff');
      this.settling = true;
      this.time.delayedCall(260, () => {
        this.settling = false;
        this._nextWave();
      });
      return;
    }
    this._endGame(reason);
  }

  _floatText(msg, x, y, color='#ffffff'){
    const t = this.add.text(x, y, msg, {
      fontFamily:'"Press Start 2P"', fontSize:'13px', color,
      stroke:'#06111f', strokeThickness:4
    }).setOrigin(0.5);
    this.tweens.add({
      targets: t, y: y-34, alpha: 0, duration: 720, ease: 'Quad.easeOut',
      onComplete: () => t.destroy()
    });
  }

  _clearObstacles(){
    this.obGroup.getChildren().forEach(o => o.destroy());
    this.obGroup.clear(false, true);
    this.activeObstacles = 0;
  }

  _clearWaveTimer(){
    if (this.waveTimer) {
      this.waveTimer.remove();
      this.waveTimer = null;
    }
  }

  _startWaveTimer(){
    this._clearWaveTimer();
    this.waveTimer = this.time.delayedCall(this.reaction * 1000, () => {
      if (!this.gameOver && !this.paused) this._failOrShield('Too slow!');
    });
  }

  _togglePause(){
    if (this.gameOver || !this.ready) return;
    this.paused = !this.paused;
    if (this.paused) {
      this._clearWaveTimer();
      this.tweens.pauseAll();
      this.pauseOverlay = this.add.rectangle(this.scale.width/2, this.scale.height/2, 520, 190, 0x000000, 0.68);
      this.pauseText = this.add.text(this.scale.width/2, this.scale.height/2, 'PAUSED\nESC TO RESUME', {
        fontFamily:'"Press Start 2P"', fontSize:'18px', color:'#ffffff', align:'center',
        lineSpacing:10
      }).setOrigin(0.5);
    } else {
      this.pauseOverlay?.destroy();
      this.pauseText?.destroy();
      this.tweens.resumeAll();
      if (!this.settling) this._startWaveTimer();
    }
  }

  _startPlaylist(startIdx){
    if (!TRACKS || !TRACKS.length) return;
    this.currentTrack = ((startIdx|0) + TRACKS.length) % TRACKS.length;
    this._playCurrentTrack();
  }

  _playCurrentTrack(){
    const meta = TRACKS[this.currentTrack];
    if (!meta) return;
    try { if (this.music?.isPlaying) this.music.stop(); } catch(e){}
    let snd = this.sound.get(meta.id);
    if (!snd) snd = this.sound.add(meta.id, { volume: 0.22 });
    snd.once('complete', () => {
      this.currentTrack = (this.currentTrack + 1) % TRACKS.length;
      this._playCurrentTrack();
    });
    const p = snd.play({ loop:false });
    if (p && typeof p.catch === 'function') p.catch(()=>{});
    this.music = snd;
    this.sound.mute = (localStorage.getItem('kr_muted')==='1');
  }

  _cleanup(){
    window.removeEventListener('keydown', this.keyHandler);
    this._clearWaveTimer();
    if (this.pickupTimer) this.pickupTimer.remove();
    try { if (this.music?.isPlaying) this.music.stop(); } catch(e){}
  }

  _endGame(reason){
    if (this.gameOver) return;
    this.gameOver = true;
    this._clearWaveTimer();
    if (SFX.bad) SFX.bad();
    window.removeEventListener('keydown', this.keyHandler);

    const timeSec = Math.max(0, ((this.time.now - (this.startTime || this.time.now)) / 1000));
    const survival = Math.floor(timeSec * 8 * this.diffBonus);
    const score = Math.floor(this.runScore + survival);
    const accuracy = this.totalInputs ? Math.max(0, (this.totalInputs - this.mistakes) / this.totalInputs) : 1;
    const avgReaction = this.lettersTyped ? this.reactionTotal / this.lettersTyped : 0;
    const weakest = Object.entries(this.weakRows).sort((a,b) => b[1] - a[1])[0];
    const run = {
      time: timeSec,
      letters: this.lettersTyped,
      score,
      stars: this.stars,
      perfects: this.perfects,
      bestStreak: this.bestStreak
    };
    updateMissionsFromRun(run);

    this.time.delayedCall(180, () => {
      this.scene.start('over', {
        ...run,
        accuracy,
        avgReaction,
        weakestRow: weakest && weakest[1] > 0 ? weakest[0] : 'none',
        lastMiss: this.lastMiss,
        mode: this.mode,
        difficulty: this.difficulty,
        charId: this.charId,
        reason
      });
    });
  }

  update(){
    if (this.gameOver || !this.ready) return;
    const t = Math.max(0, (this.time.now - this.startTime)/1000);
    const score = Math.floor(this.runScore + t * 8 * this.diffBonus);
    this.timeText.setText(`TIME ${t.toFixed(1)}`);
    this.letText.setText(`LETTERS ${this.lettersTyped}`);
    this.scoreText.setText(`SCORE ${score}`);
    this.comboText.setText(`STREAK ${this.streak} x${this._multiplier().toFixed(1)}`);
    this.powerText.setText(`SHIELD ${this.shields}  MAGNET ${this.magnetCharges}`);
  }
}
