// Synthesised sound for Vice Bay: every noise is built with WebAudio
// oscillators and filtered noise at runtime, so the game ships no audio
// files and makes no network requests. The AudioContext is created lazily
// on the first user gesture (unlock), because browsers refuse to start
// audio before one. A short two-note sting plays when a wanted star lands.
// Internally the module is three small builders — tone(), noise() and a
// looping voice — plus a table of one-shot effects on top of them.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineVoice = null;
  let sirenVoice = null;
  let muted = false;
  let volume = 0.6;

  // A looping oscillator voice (engine hum, siren wail) with its own gain.
  function loopVoice(type, startFreq, filterFreq) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = startFreq;
    const out = ctx.createGain();
    out.gain.value = 0;
    if (filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      osc.connect(filter);
      filter.connect(out);
    } else {
      osc.connect(out);
    }
    out.connect(master);
    osc.start();
    return { osc, out };
  }

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
      // Engine: a low sawtooth whose pitch follows speed, through a low-pass.
      engineVoice = loopVoice('sawtooth', 55, 420);
      // Siren: a two-tone triangle that wails while the police chase you.
      sirenVoice = loopVoice('triangle', 700, 0);
      return true;
    } catch {
      return false;
    }
  }

  function noise(duration, filterFreq, gainValue, type = 'bandpass') {
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

  function tone(freq, duration, type, gainValue, slideTo = null, delay = 0) {
    if (!ensure() || muted) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function arpeggio(notes, step, type, gainValue, noteLen) {
    notes.forEach((f, i) => tone(f, noteLen, type, gainValue, null, (i * step) / 1000));
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setVolume(v) { volume = v; if (master) master.gain.value = muted ? 0 : v; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : volume; },
    isMuted() { return muted; },
    engine(speed01, on) {
      if (!ensure() || muted) return;
      const t = ctx.currentTime;
      engineVoice.out.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.09 : 0, t, 0.08);
      engineVoice.osc.frequency.setTargetAtTime(50 + speed01 * 170, t, 0.08);
    },
    siren(on, wanted) {
      if (!ensure() || muted) return;
      const t = ctx.currentTime;
      sirenVoice.out.gain.setTargetAtTime(on ? 0.03 + wanted * 0.008 : 0, t, 0.2);
      if (on) sirenVoice.osc.frequency.setTargetAtTime(650 + Math.sin(t * 2.2) * 220, t, 0.05);
    },
    skid() { noise(0.18, 900, 0.22, 'highpass'); },
    gunshot() { noise(0.14, 1800, 0.5); tone(160, 0.1, 'square', 0.25, 60); },
    punch() { noise(0.08, 300, 0.45, 'lowpass'); },
    crash() { noise(0.3, 500, 0.6, 'lowpass'); tone(90, 0.25, 'sine', 0.4, 40); },
    pickup() { arpeggio([660, 990], 90, 'sine', 0.3, 0.14); },
    missionDone() { arpeggio([523, 659, 784, 1046], 110, 'triangle', 0.3, 0.22); },
    missionFail() { tone(220, 0.4, 'sawtooth', 0.25, 110); },
    horn() { tone(370, 0.25, 'square', 0.18); tone(466, 0.25, 'square', 0.15); },
    click() { tone(800, 0.05, 'square', 0.12); },
    cash() { arpeggio([1200, 1500], 70, 'sine', 0.25, 0.1); },
    // Short two-note sting when a new wanted star lands — the heat just went up.
    wantedSting() { arpeggio([392, 311], 130, 'square', 0.2, 0.18); },
  };
}
