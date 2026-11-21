// Vice Bay: Blood & Destiny — deterministic random numbers (sfc32).
// Every system that needs chance takes one of these, so a ?seed=N run replays exactly.

export function createRandom(seed) {
  let a = seed >>> 0;
  let b = (seed ^ 0x9e3779b9) >>> 0;
  let c = (seed * 2654435761) >>> 0;
  let d = (seed ^ 0x85ebca6b) >>> 0;
  // Warm the state up so the first draws are not correlated with the seed.
  for (let i = 0; i < 12; i++) next();
  function next() {
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const out = (t + d) | 0;
    c = (c + out) | 0;
    return (out >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    chance(p) {
      return next() < p;
    },
    angle() {
      return next() * Math.PI * 2;
    },
  };
}

/** A tiny string hash for turning names into stable seeds. */
export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
