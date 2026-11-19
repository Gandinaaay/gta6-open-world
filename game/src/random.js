// Seeded randomness for Vice Bay, built on the sfc32 generator. One seed
// builds the same city, the same parked cars and the same screenshot scenes
// every time — that is what makes the game, and its screenshots, repeatable.
// The generator keeps four 32-bit words of state and mixes them on every
// draw; the helpers hanging off it (range, int, pick, chance, shuffle,
// gauss) are the only randomness the world builder is allowed to touch.
// Anything that only needs variety at runtime and must not change the world
// uses plain Math.random through randomRange() instead.
export function createRandom(seed) {
  let s0 = (seed | 0) >>> 0;
  let s1 = (seed ^ 0x9e3779b9) >>> 0;
  let s2 = ((seed << 13) ^ (seed >>> 7)) >>> 0;
  let s3 = ((seed >> 3) ^ 0x85ebca6b) >>> 0;

  function next() {
    const t = (s0 + s1 + s3) >>> 0;
    s3 = (s3 + 1) >>> 0;
    s0 = s1 ^ (s1 >>> 9);
    s1 = (s2 + ((s2 << 3) >>> 0)) >>> 0;
    s2 = ((s2 << 21) | (s2 >>> 11)) >>> 0;
    s2 = (s2 + t) >>> 0;
    return t / 4294967296;
  }

  // A bell-ish draw around the middle of a range, for heights and prices
  // that should cluster instead of spreading evenly.
  next.gauss = (min, max) => {
    const mid = (min + max) / 2;
    const spread = (max - min) / 4;
    const roll = next() + next() + next() - 1.5;
    return Math.max(min, Math.min(max, mid + roll * spread));
  };
  next.range = (min, max) => min + next() * (max - min);
  next.int = (min, max) => Math.floor(next.range(min, max + 1));
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.chance = (p) => next() < p;
  next.shuffle = (list) => {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  };
  return next;
}

// Unseeded one-liner for effects, timers and spawn jitter that need no replay.
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
