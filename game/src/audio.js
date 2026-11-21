// All sound is synthesized with WebAudio — no audio files, no network.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch { return false; }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    shot() { noise(0.12, 0.5, 900); tone(180, 0.08, 'square', 0.25, 60); },
    pickup() { tone(660, 0.12, 'sine', 0.25); setTimeout(() => tone(990, 0.15, 'sine', 0.25), 90); },
    sting() { tone(220, 0.5, 'sawtooth', 0.2, 440); tone(110, 0.6, 'triangle', 0.2, 55); },
    crash() { noise(0.3, 0.5, 500); },
    click() { tone(800, 0.05, 'square', 0.12); },
    setEngine(rpm) {
      if (!ensure() || muted) { if (engineGain) engineGain.gain.value = 0; return; }
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 60;
        engineGain.gain.value = 0;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 400;
        engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master);
        engineOsc.start();
      }
      engineOsc.frequency.value = 50 + rpm * 120;
      engineGain.gain.value = 0.02 + rpm * 0.05;
    },
    setSiren(on) {
      if (!on) { if (sirenGain) sirenGain.gain.value = 0; return; }
      if (!ensure() || muted) return;
      if (!sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenGain = ctx.createGain();
        sirenOsc.type = 'sine';
        sirenOsc.frequency.value = 700;
        sirenGain.gain.value = 0.03;
        sirenOsc.connect(sirenGain); sirenGain.connect(master);
        sirenOsc.start();
        sirenTimer = setInterval(() => { if (sirenOsc) sirenOsc.frequency.value = sirenOsc.frequency.value > 800 ? 650 : 950; }, 450);
      }
      sirenGain.gain.value = 0.03;
    },
    setMuted(v) { muted = v; if (master) master.gain.value = v ? 0 : 0.5; },
  };
}
