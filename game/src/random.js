// Seeded PRNG (sfc32) and small random helpers. Deterministic per seed.
export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  let b = (seed * 2654435761) >>> 0;
  let c = (seed ^ 0x6d2b79f5) >>> 0;
  let d = ((seed << 13) ^ 0x1b873593) >>> 0;
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b | 0) + d | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function range(rng, a, b) {
  return a + rng() * (b - a);
}

export function intRange(rng, a, b) {
  return Math.floor(range(rng, a, b + 1));
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function shuffle(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
