// Vice Bay itself: the ground, the road grid, eight districts with their own
// buildings, the beach and the sea, the airport runway, the port container
// yard, trees, lamps, traffic lights, shop fronts and the named places the
// missions send you to. Everything the player can walk or drive into is a
// box collider returned by buildCity; the rest is scenery. The beach gets a
// second neon sign and pier lamps, so it reads at night from both ends.
// Round 3: the district builders live in one STYLE table keyed by style
// name, and the ground/road dressing is built first so the block pass only
// has to place buildings, trees and lamps.
import { WORLD, DISTRICTS, districtAt } from './config.js';
import {
  buildingTexture, houseTexture, roadTexture, sidewalkTexture, grassTexture,
  sandTexture, waterTexture, runwayTexture, containerTexture, billboardTexture,
  neonTexture,
} from './textures.js';

// Named places, in world units. Missions and side missions look these up by
// key, so a place key must never be renamed without updating missions.js too.
export const PLACES = {
  start: { x: 0, z: 120, name: 'Rico\'s Apartment' },
  friendHouse: { x: -260, z: 300, name: 'Marco\'s Place' },
  portDeal: { x: -380, z: -380, name: 'Port Warehouse 7' },
  gangHQ: { x: -80, z: 380, name: 'Vipers Hideout' },
  raceStart: { x: 420, z: -60, name: 'Beach Race Start' },
  cityHall: { x: 60, z: -60, name: 'City Hall' },
  mansion: { x: 300, z: -350, name: 'Kane\'s Mansion' },
  airport: { x: 220, z: 350, name: 'Vice Bay Airport' },
  hospital: { x: 140, z: 60, name: 'Bay General Hospital' },
  club: { x: 420, z: 120, name: 'Neon Tide Club' },
  bank: { x: -60, z: -120, name: 'Bay National Bank' },
  market: { x: -320, z: 220, name: 'Havana Market' },
  pier: { x: 520, z: 60, name: 'Ocean Pier' },
  beach: { x: 430, z: -200, name: 'Ocean Beach' },
};

export const SHOPS = [
  { id: 'arms', kind: 'arms', name: 'Bay Arms', x: -40, z: 140, color: 0x8a2be2 },
  { id: 'motors', kind: 'motors', name: 'Vice Motors', x: 160, z: -40, color: 0xd21f3c },
  { id: 'clothes', kind: 'clothes', name: 'Style House', x: 420, z: 40, color: 0x2ec4b6 },
  { id: 'tuner', kind: 'tuner', name: 'Tuner Garage', x: -280, z: 320, color: 0xf2b705 },
];

function makeBox(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function makeGround(w, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

export function buildCity(scene, random) {
  const colliders = [];
  const trafficLights = [];
  const lamps = [];
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  const add = (mesh) => { group.add(mesh); return mesh; };
  const registerCollider = (x, z, w, d) => {
    colliders.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });
  };

  // Ground: grass everywhere, sand on the east beach strip, sea beyond it.
  add(makeGround(WORLD.size, WORLD.size, new THREE.MeshLambertMaterial({ map: grassTexture() }), 0, 0, 0));
  add(makeGround(150, WORLD.size, new THREE.MeshLambertMaterial({ map: sandTexture() }), 425, 0.05, 0));
  add(makeGround(400, WORLD.size, new THREE.MeshLambertMaterial({ map: waterTexture() }), 700, 0.02, 0));

  // Roads: a grid every 100 units, sidewalks hugging each road, plus the
  // highway ring drawn as a darker band around the edge of the map.
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture() });
  const sideMat = new THREE.MeshLambertMaterial({ map: sidewalkTexture() });
  for (let c = -400; c <= 400; c += 100) {
    add(makeGround(WORLD.roadWidth, WORLD.size, roadMat, c, 0.08, 0));
    add(makeGround(WORLD.size, WORLD.roadWidth, roadMat, 0, 0.08, c));
    add(makeGround(WORLD.roadWidth + 8, WORLD.size, sideMat, c, 0.06, 0));
    add(makeGround(WORLD.size, WORLD.roadWidth + 8, sideMat, 0, 0.06, c));
  }
  const ringMat = new THREE.MeshLambertMaterial({ color: 0x1f2226 });
  for (const [w, d, x, z] of [[1000, 20, 0, -490], [1000, 20, 0, 490], [20, 1000, -490, 0], [20, 1000, 490, 0]]) {
    add(makeGround(w, d, ringMat, x, 0.09, z));
  }

  // Airport runway and apron.
  add(makeGround(60, 260, new THREE.MeshLambertMaterial({ map: runwayTexture() }), 230, 0.09, 350));

  const towerMats = [
    buildingTexture('#5b6b7a', random, 14),
    buildingTexture('#7a6a5b', random, 18),
    buildingTexture('#3f5a78', random, 10),
  ].map((t) => new THREE.MeshLambertMaterial({ map: t }));
  const houseMats = [
    houseTexture('#e8dcc0', random),
    houseTexture('#c96f4a', random),
    houseTexture('#7fb3a3', random),
  ].map((t) => new THREE.MeshLambertMaterial({ map: t }));
  const villaMat = new THREE.MeshLambertMaterial({ map: houseTexture('#f2e6c9', random) });
  const warehouseMat = new THREE.MeshLambertMaterial({ color: 0x8a7d6b });
  const terminalMat = new THREE.MeshLambertMaterial({ map: towerMats[1].map });

  function placeBuilding(x, z, w, h, d, mat) {
    add(makeBox(w, h, d, mat, x, h / 2, z));
    registerCollider(x, z, w, d);
  }

  function placeTree(x, z, palm) {
    const h = palm ? 7 : 4;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.4, h, 6),
      new THREE.MeshLambertMaterial({ color: palm ? 0x8a6b45 : 0x5a3a28 }),
    );
    trunk.position.set(x, h / 2, z);
    trunk.castShadow = true;
    add(trunk);
    const top = new THREE.Mesh(
      palm ? new THREE.ConeGeometry(3.2, 3, 7) : new THREE.SphereGeometry(2.6, 8, 6),
      new THREE.MeshLambertMaterial({ color: palm ? 0x2e8b57 : 0x2f6b2f }),
    );
    top.position.set(x, h + (palm ? 1.2 : 2), z);
    top.castShadow = true;
    add(top);
  }

  function placeLamp(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    pole.position.set(x, 3, z);
    add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    bulb.position.set(x, 6.1, z);
    add(bulb);
    lamps.push(bulb);
  }

  const containerColors = ['#b03a2e', '#2e86ab', '#e67e22', '#27ae60', '#8e44ad'];
  function placeContainer(x, z, y = 1.5) {
    const cm = new THREE.MeshLambertMaterial({ map: containerTexture(random.pick(containerColors)) });
    add(makeBox(12, 3, 3, cm, x, y, z));
    registerCollider(x, z, 12, 3);
  }

  // One builder per district style, keyed by the style name in config.js.
  // The block pass below picks the style from the district under each
  // 100-unit block and calls the matching builder.
  const STYLE = {
    airport(cx, cz) {
      if (random() < 0.4) placeBuilding(cx, cz, 30, 9, 18, warehouseMat);
    },
    beach(cx, cz) {
      if (cx > 380 && random() < 0.7) placeBuilding(cx, cz, 24, random.range(18, 42), 24, random.pick(towerMats));
      if (random() < 0.8) placeTree(cx + random.range(-30, 30), cz + random.range(-30, 30), true);
    },
    tower(cx, cz) {
      const n = random.int(1, 2);
      for (let i = 0; i < n; i += 1) {
        const w = random.range(20, 34);
        placeBuilding(cx + random.range(-18, 18), cz + random.range(-18, 18), w, random.range(35, 120), w, random.pick(towerMats));
      }
    },
    house(cx, cz) {
      const n = random.int(2, 4);
      for (let i = 0; i < n; i += 1) {
        const w = random.range(12, 20);
        placeBuilding(cx + random.range(-28, 28), cz + random.range(-28, 28), w, random.range(5, 10), random.range(12, 20), random.pick(houseMats));
      }
      if (random() < 0.6) placeTree(cx + random.range(-30, 30), cz + random.range(-30, 30), false);
    },
    villa(cx, cz) {
      const n = random.int(2, 4);
      for (let i = 0; i < n; i += 1) {
        const w = random.range(12, 20);
        placeBuilding(cx + random.range(-28, 28), cz + random.range(-28, 28), w, random.range(8, 16), random.range(12, 20), villaMat);
      }
      if (random() < 0.6) placeTree(cx + random.range(-30, 30), cz + random.range(-30, 30), false);
    },
    warehouse(cx, cz) {
      placeBuilding(cx, cz, random.range(30, 44), random.range(9, 14), random.range(24, 36), warehouseMat);
      if (random() < 0.7) placeContainer(cx + random.range(-20, 20), cz + random.range(-20, 20));
    },
    tenement(cx, cz) {
      const n = random.int(2, 3);
      for (let i = 0; i < n; i += 1) {
        placeBuilding(cx + random.range(-22, 22), cz + random.range(-22, 22), random.range(16, 26), random.range(14, 30), random.range(16, 26), random.pick(towerMats));
      }
    },
  };

  // One building pass per 100-unit block. The airport and beach stay open;
  // the port gets warehouses and container stacks instead of towers.
  for (let bx = -500; bx < 500; bx += 100) {
    for (let bz = -500; bz < 500; bz += 100) {
      const cx = bx + 50;
      const cz = bz + 50;
      const d = districtAt(cx, cz);
      if (random() > d.density) continue;
      const build = STYLE[d.style];
      if (build) build(cx, cz);
      if (random() < 0.35) placeLamp(bx + random.range(10, 90), bz + 12);
    }
  }

  // Airport terminal, hangars, and the port's big container yard.
  placeBuilding(150, 350, 60, 14, 30, terminalMat);
  placeBuilding(300, 280, 34, 10, 24, warehouseMat);
  placeBuilding(300, 430, 34, 10, 24, warehouseMat);
  for (let i = 0; i < 14; i += 1) {
    const x = -460 + (i % 7) * 26;
    const z = -460 + Math.floor(i / 7) * 30;
    placeContainer(x, z, 1.5 + (i % 3 === 0 ? 3 : 0));
  }

  // Billboards over Downtown and the beach strip, plus glowing neon signs
  // for the Neon Tide Club so the beach reads at night from both directions.
  function placeSign(text, bg, fg, w, h, x, y, z, rotY = 0) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: billboardTexture(text, bg, fg) }));
    s.position.set(x, y, z);
    s.rotation.y = rotY;
    add(s);
    return s;
  }
  function placeNeon(text, glow, w, h, x, y, z) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: neonTexture(text, glow) }));
    s.position.set(x, y, z);
    s.rotation.y = -Math.PI / 2;
    add(s);
    return s;
  }
  placeSign('VICE BAY', '#d21f3c', '#ffffff', 30, 15, 0, 26, -195);
  placeSign('NEON TIDE CLUB', '#1a1a2e', '#2ec4b6', 30, 15, 400, 20, 120, -Math.PI / 2);
  placeNeon('NEON TIDE', '#2ec4b6', 22, 8, 420, 12, 112);
  placeNeon('VICE BAY', '#ff5c8a', 18, 7, 420, 11, -20);
  placeSign('HAVANA MARKET', '#c96f4a', '#ffffff', 30, 15, -320, 14, 220);

  // Traffic lights at the big Downtown intersections, cycling green/red.
  for (let x = -200; x <= 200; x += 200) {
    for (let z = -200; z <= 200; z += 200) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7, 6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
      pole.position.set(x + 10, 3.5, z + 10);
      add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3, 1.2), new THREE.MeshLambertMaterial({ color: 0x111111 }));
      head.position.set(x + 10, 7.5, z + 10);
      add(head);
      const lampMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const lampMesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
      lampMesh.position.set(x + 10, 8.2, z + 10.6);
      add(lampMesh);
      trafficLights.push({ x: x + 10, z: z + 10, phase: (x + z) / 200, lampMat, axis: 'x' });
    }
  }

  // Shop fronts: a coloured awning box and a floating sign. Walk up, press E.
  for (const shop of SHOPS) {
    add(makeBox(14, 6, 2, new THREE.MeshLambertMaterial({ color: shop.color }), shop.x, 3, shop.z));
    registerCollider(shop.x, shop.z, 14, 2);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshBasicMaterial({ map: billboardTexture(shop.name.toUpperCase(), '#111111', '#ffffff') }));
    sign.position.set(shop.x, 8, shop.z + 1.2);
    add(sign);
    shop.sign = sign;
  }

  // A wooden pier jutting into the sea at Ocean Beach, lamps along its spine.
  add(makeBox(10, 1, 80, new THREE.MeshLambertMaterial({ color: 0x8a6b45 }), 520, 1, 60));
  placeLamp(516, 30);
  placeLamp(524, 60);
  placeLamp(516, 90);

  return { colliders, trafficLights, lamps, group };
}

// Circle (player or car) against building AABBs: push the circle out through
// whichever face is nearest, so nothing ever ends up inside a building.
export function collideCircle(colliders, x, z, radius) {
  let px = x;
  let pz = z;
  for (const c of colliders) {
    const insideX = px + radius > c.x0 && px - radius < c.x1;
    const insideZ = pz + radius > c.z0 && pz - radius < c.z1;
    if (!insideX || !insideZ) continue;
    const exits = [
      { d: px + radius - c.x0, fn: () => { px = c.x0 - radius; } },
      { d: c.x1 - (px - radius), fn: () => { px = c.x1 + radius; } },
      { d: pz + radius - c.z0, fn: () => { pz = c.z0 - radius; } },
      { d: c.z1 - (pz - radius), fn: () => { pz = c.z1 + radius; } },
    ];
    let best = exits[0];
    for (const e of exits) if (e.d < best.d) best = e;
    best.fn();
  }
  return { x: px, z: pz };
}

export function clampToWorld(x, z, margin = 8) {
  const lo = -WORLD.half + margin;
  const hi = WORLD.half - margin;
  return {
    x: Math.max(lo, Math.min(hi, x)),
    z: Math.max(lo, Math.min(hi, z)),
  };
}
