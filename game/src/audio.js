// Procedural sound for Vice Bay: engine hum, sirens, gunshots and jingles.
// Everything is synthesised with WebAudio — no audio files. All calls are
// guarded so a missing AudioContext never breaks the game.

export function createAudio(G) {
  const audio = {
    ctx: null, master: null, engineOsc: null, engineGain: null,
    sirenOsc: null, sirenGain: null, enabled: false,
    ensure() {
      if (this.ctx) return true;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.4;
        this.master.connect(this.ctx.destination);
        // engine: sawtooth through a lowpass, pitch follows speed
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 55;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 420;
        this.engineOsc.connect(filt);
        filt.connect(this.engineGain);
        this.engineGain.connect(this.master);
        this.engineOsc.start();
        // siren: two-tone triangle
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenOsc.type = 'triangle';
        this.sirenOsc.frequency.value = 700;
        this.sirenGain = this.ctx.createGain();
        this.sirenGain.gain.value = 0;
        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.master);
        this.sirenOsc.start();
        this.enabled = true;
        return true;
      } catch (e) {
        return false;
      }
    },
    blip(freq, dur, type, vol, when) {
      if (!this.ensure()) return;
      try {
        const t = this.ctx.currentTime + (when || 0);
        const o = this.ctx.createOscillator();
        o.type = type || 'sine';
        o.frequency.value = freq;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol || 0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g);
        g.connect(this.master);
        o.start(t);
        o.stop(t + dur + 0.02);
      } catch (e) { /* ignore */ }
    },
    noise(dur, vol, freq) {
      if (!this.ensure()) return;
      try {
        const t = this.ctx.currentTime;
        const len = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = freq || 1200;
        const g = this.ctx.createGain();
        g.gain.value = vol || 0.5;
        src.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        src.start(t);
      } catch (e) { /* ignore */ }
    },
    shot() { this.noise(0.16, 0.6, 2400); this.blip(160, 0.1, 'square', 0.3); },
    punch() { this.noise(0.09, 0.4, 500); },
    thud() { this.noise(0.2, 0.5, 300); },
    horn() { this.blip(370, 0.22, 'square', 0.2); this.blip(466, 0.22, 'square', 0.2); },
    chime() { this.blip(660, 0.12, 'sine', 0.25); this.blip(880, 0.18, 'sine', 0.25, 0.1); },
    fanfare() {
      this.blip(523, 0.14, 'triangle', 0.3);
      this.blip(659, 0.14, 'triangle', 0.3, 0.12);
      this.blip(784, 0.22, 'triangle', 0.3, 0.24);
      this.blip(1046, 0.3, 'triangle', 0.3, 0.36);
    },
    busted() { this.blip(392, 0.3, 'sawtooth', 0.25); this.blip(311, 0.5, 'sawtooth', 0.25, 0.25); },
    update(G) {
      if (!this.enabled) return;
      try {
        const p = G.player;
        const speed = p.inVehicle ? Math.abs(p.inVehicle.speed) : 0;
        this.engineGain.gain.value = p.inVehicle ? 0.05 + Math.min(0.12, speed * 0.002) : 0;
        this.engineOsc.frequency.value = 55 + speed * 3.2;
        const sirenOn = G.wanted > 0;
        this.sirenGain.gain.value = sirenOn ? 0.05 : 0;
        if (sirenOn) {
          const t = performance.now() / 500;
          this.sirenOsc.frequency.value = t % 2 < 1 ? 700 : 950;
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { /* ignore */ }
    },
  };
  G.audio = audio;
  // first gesture unlocks audio
  const unlock = () => audio.ensure();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  return audio;
}
