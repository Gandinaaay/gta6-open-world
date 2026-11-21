// WebAudio synthesiser: every sound is generated, no audio files.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch (e) { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }

  function noise(dur, vol, low) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = low || 1200;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
  }

  return {
    unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); },
    setMuted(m) { muted = m; if (m) this.setEngine(0); },
    isMuted() { return muted; },
    shot() { noise(0.14, 0.5, 2600); tone(170, 0.1, 'square', 0.22, 55); },
    pickup() { tone(660, 0.1, 'sine', 0.3); setTimeout(() => tone(990, 0.16, 'sine', 0.3), 90); },
    sting() { tone(392, 0.22, 'triangle', 0.32); setTimeout(() => tone(523, 0.22, 'triangle', 0.32), 130); setTimeout(() => tone(784, 0.4, 'triangle', 0.32), 260); },
    crash() { noise(0.3, 0.55, 700); tone(70, 0.25, 'sawtooth', 0.3, 40); },
    click() { tone(880, 0.05, 'square', 0.12); },
    setEngine(rpm) {
      if (muted || rpm <= 0) {
        if (engineOsc) { try { engineOsc.stop(); } catch (e) {} engineOsc = null; }
        return;
      }
      const c = ensure();
      if (!c) return;
      if (!engineOsc) {
        engineOsc = c.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = c.createGain();
        engineGain.gain.value = 0.045;
        engineOsc.connect(engineGain).connect(c.destination);
        engineOsc.start();
      }
      engineOsc.frequency.setTargetAtTime(55 + rpm * 1.5, c.currentTime, 0.08);
    },
    setSiren(on) {
      if (!on) {
        if (sirenTimer) { clearInterval(sirenTimer); sirenTimer = null; }
        if (sirenOsc) { try { sirenOsc.stop(); } catch (e) {} sirenOsc = null; }
        return;
      }
      const c = ensure();
      if (!c || sirenOsc) return;
      sirenOsc = c.createOscillator();
      sirenOsc.type = 'sine';
      sirenGain = c.createGain();
      sirenGain.gain.value = 0.05;
      sirenOsc.connect(sirenGain).connect(c.destination);
      sirenOsc.start();
      let hi = true;
      sirenTimer = setInterval(() => {
        if (!sirenOsc) return;
        hi = !hi;
        sirenOsc.frequency.setTargetAtTime(hi ? 950 : 650, c.currentTime, 0.05);
      }, 380);
    },
  };
}
