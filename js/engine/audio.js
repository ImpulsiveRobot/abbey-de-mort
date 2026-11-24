// Procedural Web Audio API Sound Engine for Abbaye de Mort
// Synthesizes punchy WWII weaponry, abbey stone reverb, rain/thunder, Morse wireless,
// flares, hit confirmations, heartbeat when low ammo/health, and C-47 propellers.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.ambGain = null;
    this.noiseBuffer = null;
    this.reverbNode = null;
    this.rainNode = null;
    this.droneOsc = null;
    this.propNode = null;
    this.muted = false;
    this.volume = 0.75;
    this.initialized = false;
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    this.ambGain = this.ctx.createGain();
    this.ambGain.gain.value = 0.38;
    this.ambGain.connect(this.master);

    // Pre-generate 2 seconds of white noise
    const sr = this.ctx.sampleRate;
    const len = sr * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, len, sr);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // Abbey stone cathedral reverb impulse response
    const irLen = Math.floor(sr * 1.25);
    const ir = this.ctx.createBuffer(2, irLen, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.8) * 0.45;
      }
    }
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = ir;
    const revWet = this.ctx.createGain();
    revWet.gain.value = 0.34;
    this.reverbNode.connect(revWet);
    revWet.connect(this.master);

    this._startRainAmbience();
    this.initialized = true;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  _startRainAmbience() {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.55;

    const g = this.ctx.createGain();
    g.gain.value = 0.24;

    src.connect(filter);
    filter.connect(g);
    g.connect(this.ambGain);
    src.start();
    this.rainNode = g;

    // Subtle dark atmospheric wind/cello pad
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55; // low A1
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 135;
    const dg = this.ctx.createGain();
    dg.gain.value = 0.08;
    osc.connect(lp);
    lp.connect(dg);
    dg.connect(this.ambGain);
    osc.start();
    this.droneOsc = { osc, gain: dg, filter: lp };
  }

  setTension(level) {
    // level 0..1 shifts ambient drone harmonic tension
    if (!this.droneOsc || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.droneOsc.gain.gain.setTargetAtTime(0.06 + level * 0.1, now, 0.5);
    this.droneOsc.filter.frequency.setTargetAtTime(120 + level * 140, now, 0.5);
  }

  playGunshot(weaponId = 'revolver', dist = 0) {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const atten = dist > 0 ? Math.max(0.08, 1 / (1 + dist * 0.065)) : 1.0;

    // 1. Noise crack
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    const ng = this.ctx.createGain();

    let dur = 0.22;
    let freq = 1100;
    let punchFreq = 165;
    let vol = 0.72 * atten;

    if (weaponId === 'rifle') {
      dur = 0.34;
      freq = 850;
      punchFreq = 130;
      vol = 0.92 * atten;
    } else if (weaponId === 'smg') {
      dur = 0.13;
      freq = 1450;
      punchFreq = 210;
      vol = 0.58 * atten;
    } else if (weaponId === 'enemy') {
      dur = 0.2;
      freq = 920;
      punchFreq = 140;
      vol = 0.55 * atten;
    }

    bp.frequency.setValueAtTime(freq, now);
    bp.frequency.exponentialRampToValueAtTime(220, now + dur);
    bp.Q.value = 0.7;

    ng.gain.setValueAtTime(vol, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(bp);
    bp.connect(ng);
    ng.connect(this.sfxGain);
    ng.connect(this.reverbNode);
    src.start(now);
    src.stop(now + dur + 0.02);

    // 2. Low-end ballistic thump
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(punchFreq, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.12);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(vol * 0.85, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(og);
    og.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playEmptyClick() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.03);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playReload() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const clicks = [0, 0.22, 0.56];
    clicks.forEach((delay, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(idx === 2 ? 920 : 620, now + delay);
      osc.frequency.exponentialRampToValueAtTime(240, now + delay + 0.06);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.24, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.08);
    });
  }

  playHitMarker(headshot = false) {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(headshot ? 1320 : 760, now);
    osc.frequency.exponentialRampToValueAtTime(headshot ? 1860 : 520, now + 0.065);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  playPlayerHurt() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playThunder() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(280, now);
    lp.frequency.exponentialRampToValueAtTime(65, now + 1.8);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.65, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start(now);
    src.stop(now + 2.0);
  }

  playMorseBurst() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    // Morse for "S O E" (... --- .)
    const pattern = [0.06, 0.06, 0.06, 0.18, 0.18, 0.18, 0.06];
    let t = now;
    for (const dur of pattern) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 780;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.008);
      g.gain.setValueAtTime(0.14, t + dur - 0.008);
      g.gain.linearRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + dur + 0.01);
      t += dur + 0.065;
    }
  }

  playRadioChirp() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2100;
    bp.Q.value = 2.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.16);
  }

  playFlareLaunch() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(420, now);
    bp.frequency.exponentialRampToValueAtTime(1600, now + 0.7);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.9);
  }

  playIronGateSlam() {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.45);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.connect(this.reverbNode);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  startAirbornePropellers() {
    if (!this.initialized || this.propNode) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.value = 64;
    osc2.frequency.value = 66.8; // rhythmic twin-engine beat!
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 190;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.24, this.ctx.currentTime + 3.5);
    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    osc1.start();
    osc2.start();
    this.propNode = { osc1, osc2, gain: g };
  }

  stopAirbornePropellers() {
    if (!this.propNode || !this.ctx) return;
    try {
      this.propNode.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
      setTimeout(() => {
        try {
          this.propNode?.osc1.stop();
          this.propNode?.osc2.stop();
        } catch {}
        this.propNode = null;
      }, 1500);
    } catch {
      this.propNode = null;
    }
  }
}
