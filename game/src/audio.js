// Synthesised sound: every noise in Vice Bay is built with WebAudio oscillators
// and filtered noise at runtime — no audio files, no network, nothing to
// download. The AudioContext is created lazily on the first user gesture
// (unlock), because browsers refuse to start audio before one. Rewritten for
// the v4 recorded pass, with a short wanted sting when the heat rises.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let volume = 0.6;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
      // Engine: a low sawtooth whose pitch follows speed, through a low-pass.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Siren: a two-tone triangle that wails while the police chase you.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function noiseBurst(duration, filterFreq, gainValue, type = 'bandpass') {
    if (!ensure() || muted) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  function tone(freq, duration, type, gainValue, slideTo = null) {
    if (!ensure() || muted) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setVolume(v) { volume = v; if (master) master.gain.value = muted ? 0 : v; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : volume; },
    isMuted() { return muted; },
    engine(speed01, on) {
      if (!ensure() || muted) return;
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.09 : 0, t, 0.08);
      engineOsc.frequency.setTargetAtTime(50 + speed01 * 170, t, 0.08);
    },
    siren(on, wanted) {
      if (!ensure() || muted) return;
      const t = ctx.currentTime;
      sirenGain.gain.setTargetAtTime(on ? 0.03 + wanted * 0.008 : 0, t, 0.2);
      if (on) sirenOsc.frequency.setTargetAtTime(650 + Math.sin(t * 2.2) * 220, t, 0.05);
    },
    skid() { noiseBurst(0.18, 900, 0.22, 'highpass'); },
    gunshot() { noiseBurst(0.14, 1800, 0.5); tone(160, 0.1, 'square', 0.25, 60); },
    punch() { noiseBurst(0.08, 300, 0.45, 'lowpass'); },
    crash() { noiseBurst(0.3, 500, 0.6, 'lowpass'); tone(90, 0.25, 'sine', 0.4, 40); },
    pickup() { tone(660, 0.12, 'sine', 0.3); setTimeout(() => tone(990, 0.16, 'sine', 0.3), 90); },
    missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.3), i * 110)); },
    missionFail() { tone(220, 0.4, 'sawtooth', 0.25, 110); },
    horn() { tone(370, 0.25, 'square', 0.18); tone(466, 0.25, 'square', 0.15); },
    click() { tone(800, 0.05, 'square', 0.12); },
    cash() { tone(1200, 0.08, 'sine', 0.25); setTimeout(() => tone(1500, 0.12, 'sine', 0.25), 70); },
    // Short two-note sting when a new wanted star lands — the heat just went up.
    wantedSting() { tone(392, 0.14, 'square', 0.2); setTimeout(() => tone(311, 0.22, 'square', 0.2), 130); },
  };
}
