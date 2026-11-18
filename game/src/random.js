// Seeded randomness for Vice Bay (mulberry32). One seed builds the same city,
// the same parked cars and the same screenshot scenes every time, which is what
// makes the game — and its screenshots — repeatable. Runtime-only variety that
// must not change the world uses plain Math.random through randomRange() instead.
export function createRandom(seed) {
  let a = seed | 0;
  function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  random.range = (min, max) => min + random() * (max - min);
  random.int = (min, max) => Math.floor(random.range(min, max + 1));
  random.pick = (arr) => arr[Math.floor(random() * arr.length)];
  random.chance = (p) => random() < p;
  random.shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  };
  return random;
}

// Unseeded one-liner for effects, timers and spawn jitter that need no replay.
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
