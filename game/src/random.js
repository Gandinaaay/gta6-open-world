// Seeded randomness for Vice Bay, built on the sfc32 generator. One seed
// builds the same city, the same parked cars and the same screenshot scenes
// every time, which is what makes the game — and its screenshots —
// repeatable. The generator keeps four 32-bit words of state and mixes them
// on every draw; the helpers on top (range, int, pick, chance, shuffle,
// gauss) are the only randomness the world builder is allowed to touch.
// Anything that only needs variety at runtime and must not change the world
// uses plain Math.random through randomRange() instead.
export function createRandom(seed) {
  let a = (seed | 0) >>> 0;
  let b = (seed ^ 0x9e3779b9) >>> 0;
  let c = ((seed << 13) ^ (seed >>> 7)) >>> 0;
  let d = ((seed >> 3) ^ 0x85ebca6b) >>> 0;

  function random() {
    const t = (a + b + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + ((c << 3) >>> 0)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    c = (c + t) >>> 0;
    return t / 4294967296;
  }

  random.range = (min, max) => min + random() * (max - min);
  random.int = (min, max) => Math.floor(random.range(min, max + 1));
  random.pick = (list) => list[Math.floor(random() * list.length)];
  random.chance = (p) => random() < p;
  random.shuffle = (list) => {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  };
  // A bell-ish draw around the middle of a range, for heights and prices
  // that should cluster instead of spreading evenly.
  random.gauss = (min, max) => {
    const mid = (min + max) / 2;
    const spread = (max - min) / 4;
    const roll = random() + random() + random() - 1.5;
    return Math.max(min, Math.min(max, mid + roll * spread));
  };
  return random;
}

// Unseeded one-liner for effects, timers and spawn jitter that need no replay.
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
