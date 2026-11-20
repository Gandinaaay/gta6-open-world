// Vice Bay — all sound is synthesized with WebAudio. No audio files exist.
// Engine hum follows speed, the siren is two detuned oscillators, gunshots
// are filtered noise bursts, and the mission sting is a short minor arpeggio.

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenOn = false;
  }

  /** Must be called from a user gesture (title click / key press). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // Engine hum: sawtooth through a low-pass, pitch follows speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    // Police siren: two tones alternating via LFO on frequency.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 700;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.9;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    lfo.start();
  }

  setEngine(speed01, on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.09 : 0, t, 0.08);
    this.engineOsc.frequency.setTargetAtTime(52 + speed01 * 130, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(380 + speed01 * 900, t, 0.1);
  }

  setSiren(on) {
    if (!this.ctx || this.sirenOn === on) return;
    this.sirenOn = on;
    this.sirenGain.gain.setTargetAtTime(on ? 0.05 : 0, this.ctx.currentTime, 0.2);
  }

  _noiseBurst(duration, filterFreq, gain, type = 'lowpass') {
    if (!this.ctx) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start();
  }

  _tone(freq, duration, gain, type = 'sine', when = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  shot(weapon) {
    if (!this.ctx) return;
    if (weapon === 'shotgun') this._noiseBurst(0.22, 900, 0.5);
    else if (weapon === 'rifle') this._noiseBurst(0.14, 1600, 0.42);
    else if (weapon === 'smg') this._noiseBurst(0.07, 2400, 0.3);
    else if (weapon === 'pistol') this._noiseBurst(0.1, 1800, 0.38);
    else this._noiseBurst(0.06, 700, 0.2);
  }

  punch() { this._noiseBurst(0.08, 500, 0.3); }
  pickup() { this._tone(660, 0.12, 0.22); this._tone(990, 0.16, 0.2, 'sine', 0.07); }
  cash() { this._tone(880, 0.1, 0.2); this._tone(1174, 0.14, 0.2, 'sine', 0.08); }
  sting() {
    // Wanted-star sting: low minor hit.
    this._tone(220, 0.5, 0.3, 'triangle');
    this._tone(233, 0.5, 0.25, 'triangle', 0.02);
  }
  missionDone() {
    // Short rising arpeggio in A minor.
    [440, 523, 659, 880].forEach((f, i) => this._tone(f, 0.22, 0.22, 'sine', i * 0.09));
  }
  crash() { this._noiseBurst(0.3, 300, 0.5); }
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }
}
