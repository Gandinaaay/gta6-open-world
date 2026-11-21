// Seeded PRNG (sfc32) so the city, traffic and shots are deterministic per seed.

export function sfc32(a, b, c, d) {
  let _a = a >>> 0, _b = b >>> 0, _c = c >>> 0, _d = d >>> 0;
  return function next() {
    _a >>>= 0; _b >>>= 0; _c >>>= 0; _d >>>= 0;
    let t = (_a + _b | 0) + _d | 0;
    _d = _d + 1 | 0;
    _a = _b ^ _b >>> 9;
    _b = _c + (_c << 3) | 0;
    _c = _c << 21 | _c >>> 11;
    _c = _c + t | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const rand = sfc32(seed, seed * 31 + 7, seed * 101 + 13, seed * 7 + 1);
  return {
    next: rand,
    range(min, max) { return min + rand() * (max - min); },
    int(min, max) { return Math.floor(this.range(min, max + 1)); },
    pick(arr) { return arr[Math.floor(rand() * arr.length)]; },
    chance(p) { return rand() < p; },
  };
}
