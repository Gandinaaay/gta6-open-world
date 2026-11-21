// City layout for Vice Bay: blocks, buildings, palms, lamps and props.
// Data only — world.js turns this into Three.js meshes. Everything is
// derived from the seeded RNG, so the layout is identical on every load.

import { DISTRICTS, WORLD, districtAt } from './config.js';
import { makeRng, WORLD_SEED } from './random.js';

const ROADS = [];
for (let v = -900; v <= 900; v += WORLD.roadSpacing) ROADS.push(v);

function blockCenters() {
  const out = [];
  for (let i = 0; i < ROADS.length - 1; i++) {
    for (let j = 0; j < ROADS.length - 1; j++) {
      const x0 = ROADS[i] + WORLD.roadHalfWidth + WORLD.sidewalkWidth;
      const x1 = ROADS[i + 1] - WORLD.roadHalfWidth - WORLD.sidewalkWidth;
      const z0 = ROADS[j] + WORLD.roadHalfWidth + WORLD.sidewalkWidth;
      const z1 = ROADS[j + 1] - WORLD.roadHalfWidth - WORLD.sidewalkWidth;
      out.push({ x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 });
    }
  }
  return out;
}

function placeBuildings(block, district, rng, out) {
  const w = block.x1 - block.x0;
  const d = block.z1 - block.z0;
  const style = district.style;
  if (style === 'tower') {
    // one tall slab, sometimes a twin
    const n = rng.chance(0.35) ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const bw = rng.range(w * 0.32, w * 0.5);
      const bd = rng.range(d * 0.32, d * 0.5);
      const bx = block.cx + (i === 0 ? -w * 0.18 : w * 0.18) + rng.range(-8, 8);
      const bz = block.cz + rng.range(-8, 8);
      out.push({
        x: bx, z: bz, w: bw, d: bd,
        h: rng.range(district.hMin, district.hMax),
        color: rng.pick(district.palette), style, district: district.id,
        roof: rng.pick(['flat', 'antenna', 'crown']),
      });
    }
    return;
  }
  if (style === 'port') {
    // container stacks
    for (let i = 0; i < rng.int(3, 6); i++) {
      out.push({
        x: block.cx + rng.range(-w / 3, w / 3), z: block.cz + rng.range(-d / 3, d / 3),
        w: rng.range(10, 18), d: rng.range(4, 6), h: rng.range(3, 9),
        color: rng.pick(['#c62828', '#1565c0', '#f9a825', '#2e7d32', '#6a1b9a']),
        style: 'container', district: district.id, roof: 'flat',
      });
    }
    return;
  }
  if (style === 'house') {
    for (let i = 0; i < rng.int(3, 5); i++) {
      out.push({
        x: block.cx + rng.range(-w / 3, w / 3), z: block.cz + rng.range(-d / 3, d / 3),
        w: rng.range(10, 16), d: rng.range(9, 14), h: rng.range(district.hMin, district.hMax),
        color: rng.pick(district.palette), style, district: district.id,
        roof: rng.pick(['gable', 'flat']),
      });
    }
    return;
  }
  // brick / warehouse / campus / marina / beach: 2-4 mid blocks
  const n = rng.int(2, 4);
  for (let i = 0; i < n; i++) {
    out.push({
      x: block.cx + rng.range(-w / 4, w / 4), z: block.cz + rng.range(-d / 4, d / 4),
      w: rng.range(w * 0.2, w * 0.42), d: rng.range(d * 0.2, d * 0.42),
      h: rng.range(district.hMin, district.hMax),
      color: rng.pick(district.palette), style, district: district.id,
      roof: rng.pick(['flat', 'flat', 'gable']),
    });
  }
}

export function buildCity() {
  const rng = makeRng(WORLD_SEED);
  const buildings = [];
  const trees = [];
  const lamps = [];
  const props = [];
  for (const block of blockCenters()) {
    const district = districtAt(block.cx, block.cz);
    if (rng.next() > district.density) continue;
    placeBuildings(block, district, rng, buildings);
    // palms in beach, marina and suburbs
    if (district.style === 'beach' || district.style === 'marina' || district.style === 'house') {
      const n = rng.int(1, 4);
      for (let i = 0; i < n; i++) {
        trees.push({
          x: block.cx + rng.range(-70, 70), z: block.cz + rng.range(-70, 70),
          h: rng.range(5, 9), kind: 'palm',
        });
      }
    }
    if (district.style === 'beach') {
      props.push({ kind: 'umbrella', x: block.cx + rng.range(-50, 50), z: block.cz + rng.range(-50, 50) });
    }
    if (district.style === 'marina') {
      props.push({ kind: 'yacht', x: block.cx + rng.range(-40, 40), z: block.cz + rng.range(-40, 40) });
    }
  }
  // street lamps along every road, every 100 m
  for (const v of ROADS) {
    for (let u = -900; u <= 900; u += 100) {
      lamps.push({ x: v + WORLD.roadHalfWidth + 1.5, z: u });
      lamps.push({ x: u, z: v + WORLD.roadHalfWidth + 1.5 });
    }
  }
  // landmark: the Vice Bay tower in Downtown
  buildings.push({
    x: 0, z: -40, w: 46, d: 46, h: 185,
    color: '#1c2b45', style: 'tower', district: 'downtown',
    roof: 'crown', landmark: true,
  });
  // the bay bridge on the east edge
  props.push({ kind: 'bridge', x: 980, z: 0 });
  return { buildings, trees, lamps, props, roads: ROADS };
}

// Named places the missions and HUD refer to.
export const PLACES = {
  rosaDiner: { name: "Mama Rosa's Diner", x: -120, z: 120 },
  donMansion: { name: 'Don Sal Mansion', x: 760, z: -760 },
  portGate: { name: 'Port Delgado Gate', x: 820, z: 820 },
  beachPier: { name: 'Beachfront Pier', x: 120, z: 940 },
  uniQuad: { name: 'University Quad', x: 0, z: -760 },
  marinaYachts: { name: 'Marina Yachts', x: 880, z: 0 },
  ironworks: { name: 'Ironworks Yard', x: -760, z: 760 },
  towerPlaza: { name: 'Vice Tower Plaza', x: 0, z: -40 },
  garage: { name: 'Rico’s Garage', x: -260, z: 260 },
  hospital: { name: 'Vice General', x: 260, z: -260 },
};

export { DISTRICTS };
