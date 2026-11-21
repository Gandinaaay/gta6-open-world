// Vice Bay: Blood & Destiny — procedural sound with WebAudio, no audio files.
// Every effect is an oscillator or filtered noise burst, so the game stays silent
// until the player interacts (browsers require a gesture before audio starts).

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.35;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  const shot = () => noise(0.12, 0.4, 900);
  const punch = () => noise(0.08, 0.3, 500);
  const pickup = () => { tone(660, 0.09, 'sine', 0.22); setTimeout(() => tone(990, 0.12, 'sine', 0.22), 80); };
  const mission = () => { tone(523, 0.12, 'triangle', 0.25); setTimeout(() => tone(659, 0.12, 'triangle', 0.25), 110); setTimeout(() => tone(784, 0.2, 'triangle', 0.25), 220); };
  const fail = () => tone(220, 0.35, 'sawtooth', 0.18, 110);
  const siren = () => { tone(720, 0.5, 'sine', 0.07, 980); setTimeout(() => tone(980, 0.5, 'sine', 0.07, 720), 480); };
  const crash = () => noise(0.25, 0.4, 400);

  function engineStart() {
    if (!ensure() || engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 60;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;
    engineOsc.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  }

  function engineSet(speedNorm) {
    if (!engineOsc || !engineGain) return;
    engineOsc.frequency.value = 55 + speedNorm * 130;
    engineGain.gain.value = muted ? 0 : 0.03 + speedNorm * 0.05;
  }

  function engineStop() {
    if (!engineOsc) return;
    try { engineOsc.stop(); } catch { /* already stopped */ }
    engineOsc = null;
    engineGain = null;
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.35;
  }

  return {
    unlock, shot, punch, pickup, mission, fail, siren, crash,
    engineStart, engineSet, engineStop, setMuted,
    get muted() { return muted; },
  };
}
