// Vice Bay — deterministic seeded random numbers (sfc32).
// Every procedural choice in the city uses one of these so a seed rebuilds
// the same streets, the same skyline, the same traffic.

export function sfc32(seed) {
  let a = seed >>> 0;
  let b = (seed * 0x9e3779b9) >>> 0;
  let c = (seed * 0x85ebca6b) >>> 0;
  let d = (seed * 0xc2b2ae35) >>> 0;
  return function next() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b | 0) + d | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21 | c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Small helper wrapper used by the city and traffic builders. */
export class RNG {
  constructor(seed = 1337) {
    this.next = sfc32(seed);
  }
  float(a = 0, b = 1) {
    return a + this.next() * (b - a);
  }
  int(a, b) {
    return Math.floor(this.float(a, b + 1));
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p) {
    return this.next() < p;
  }
  shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}
