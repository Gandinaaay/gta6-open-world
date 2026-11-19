// All sound is synthesized with WebAudio — no audio files.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenOn = false;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      // Engine hum: sawtooth through a lowpass, pitch follows speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 400;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      // Siren: alternating two-tone square wave.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'square';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
    } catch (e) { this.ctx = null; }
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setEngine(speed01, driving) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(50 + speed01 * 160, t, 0.08);
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + speed01 * 0.06 : 0.0, t, 0.1);
  }

  setSiren(on) {
    if (!this.ctx) return;
    this.sirenOn = on;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.2);
  }

  update(dt) {
    if (!this.ctx || !this.sirenOn) return;
    // Alternate siren tone every 0.35s.
    this._sirenT = (this._sirenT || 0) + dt;
    if (this._sirenT > 0.35) {
      this._sirenT = 0;
      const f = this.sirenOsc.frequency.value > 800 ? 700 : 950;
      this.sirenOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
    }
  }

  _noise(dur, filterFreq, gainVal, type) {
    if (!this.ctx) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = type || 'lowpass';
    flt.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = gainVal;
    src.connect(flt); flt.connect(g); g.connect(this.master);
    src.start();
  }

  _tone(freq, dur, gainVal, type, slideTo) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + dur);
  }

  shot(kind) {
    if (kind === 'shotgun') { this._noise(0.22, 900, 0.5); this._tone(120, 0.15, 0.3, 'square', 50); }
    else if (kind === 'smg') this._noise(0.08, 2400, 0.3);
    else if (kind === 'rifle') { this._noise(0.25, 1400, 0.5); this._tone(90, 0.2, 0.35, 'sawtooth', 40); }
    else if (kind === 'fists') this._noise(0.06, 500, 0.25);
    else this._noise(0.14, 1800, 0.4);
  }

  crash() { this._noise(0.3, 300, 0.5); this._tone(70, 0.25, 0.4, 'sawtooth', 35); }
  pickup() { this._tone(660, 0.09, 0.25); setTimeout(() => this._tone(990, 0.12, 0.25), 90); }
  reload() { this._tone(1200, 0.05, 0.2, 'square'); setTimeout(() => this._tone(900, 0.05, 0.2, 'square'), 120); }
  sting() { this._tone(392, 0.35, 0.22); this._tone(523, 0.35, 0.2); this._tone(659, 0.5, 0.22); }
  wanted() { this._tone(880, 0.12, 0.25, 'square'); setTimeout(() => this._tone(880, 0.12, 0.25, 'square'), 150); }
  fail() { this._tone(220, 0.4, 0.25, 'sawtooth', 110); }
  jump() { this._tone(300, 0.12, 0.15, 'sine', 520); }
}
