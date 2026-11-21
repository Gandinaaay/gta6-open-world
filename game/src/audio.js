// WebAudio synth: effects + a procedural radio (2 stations) + engine + siren.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let radioTimer = null;
  let radioStation = 0; // 0 off, 1 Vice FM (synthwave), 2 Bay Jazz
  let radioStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch (e) {
      return false;
    }
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ctx.currentTime + dur);
  }
  function noise(dur, vol, freq) {
    if (!ensure() || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq || 1200;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start();
  }
  const BASS = [55, 55, 65.41, 49, 55, 55, 82.41, 73.42];
  const LEAD = [220, 261.63, 329.63, 392, 329.63, 261.63, 220, 196];
  const JAZZ = [146.83, 174.61, 196, 220, 196, 174.61, 146.83, 130.81];
  function radioTick() {
    if (muted || radioStation === 0 || !ctx) return;
    const bass = radioStation === 1 ? BASS : JAZZ;
    const lead = radioStation === 1 ? LEAD : JAZZ;
    const step = radioStep % 8;
    tone(bass[step], 0.5, 'triangle', 0.10);
    if (step % 2 === 0) tone(lead[step] * 2, 0.22, 'sine', 0.05);
    if (radioStation === 1 && step % 4 === 0) noise(0.08, 0.06, 4000);
    radioStep++;
  }
  return {
    shot: () => { noise(0.14, 0.5, 900); tone(180, 0.1, 'square', 0.18, 60); },
    pickup: () => { tone(660, 0.12, 'sine', 0.2); setTimeout(() => tone(880, 0.16, 'sine', 0.2), 90); },
    sting: () => { tone(523, 0.16, 'triangle', 0.22); setTimeout(() => tone(659, 0.16, 'triangle', 0.22), 120); setTimeout(() => tone(784, 0.3, 'triangle', 0.24), 240); },
    crash: () => { noise(0.3, 0.5, 500); tone(90, 0.25, 'sawtooth', 0.2, 40); },
    click: () => tone(440, 0.05, 'square', 0.08),
    radioStation: () => radioStation,
    cycleRadio: () => {
      radioStation = (radioStation + 1) % 3;
      if (radioStation > 0 && ensure()) {
        if (!radioTimer) radioTimer = setInterval(radioTick, 250);
      } else if (radioTimer) {
        clearInterval(radioTimer);
        radioTimer = null;
      }
      return radioStation;
    },
    setEngine: (rpm) => {
      if (!ensure() || muted) return;
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth';
        engineGain.gain.value = 0;
        engineOsc.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      engineOsc.frequency.value = 55 + rpm * 1.6;
      engineGain.gain.value = 0.015 + rpm * 0.0006;
    },
    setSiren: (on) => {
      if (!ensure()) return;
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenGain = ctx.createGain();
        sirenOsc.type = 'sine';
        sirenOsc.frequency.value = 750;
        sirenGain.gain.value = 0.05;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        const wob = setInterval(() => {
          if (!sirenOsc) { clearInterval(wob); return; }
          sirenOsc.frequency.value = sirenOsc.frequency.value > 800 ? 700 : 950;
        }, 450);
        sirenOsc._wob = wob;
      } else if (!on && sirenOsc) {
        clearInterval(sirenOsc._wob);
        sirenOsc.stop();
        sirenOsc = null;
      }
    },
    setMuted: (m) => {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted: () => muted,
  };
}
