// Vice Bay — builds the city: road grid, district buildings, neon signs,
// the beach pier, the airport runway, the port cranes and the highway ring.
// Returns colliders (building AABBs), road data, and spawn points.

import { CFG, DISTRICTS } from './config.js';
import { RNG } from './random.js';
import * as TEX from './textures.js';

const ROAD_Y = 0.02;

function districtAt(x, z) {
  // Ring district is the background; the most specific district wins.
  let best = null;
  for (const d of DISTRICTS) {
    if (d.ring) continue;
    if (Math.abs(x - d.x) <= d.w / 2 && Math.abs(z - d.z) <= d.h / 2) best = d;
  }
  return best || DISTRICTS.find((d) => d.ring);
}

export function buildCity(scene, seed = 1337) {
  const rng = new RNG(seed);
  const colliders = [];
  const carSpawns = [];
  const lampPositions = [];
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  const roadTex = TEX.roadTexture();
  const walkTex = TEX.sidewalkTexture();
  const groundTex = TEX.groundTexture(false);
  const beachTex = TEX.groundTexture(true);

  // Ground plane (grass) + beach sand patch.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.worldSize, CFG.worldSize),
    new THREE.MeshLambertMaterial({ map: groundTex })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 400),
    new THREE.MeshLambertMaterial({ map: beachTex })
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-560, 0.01, 420);
  beach.receiveShadow = true;
  group.add(beach);

  // Road grid: centrelines every blockSize from -800 to 800.
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  const lines = [];
  for (let c = -800; c <= 800; c += CFG.blockSize) lines.push(c);
  for (const c of lines) {
    // Vertical street (along z): same plane as a horizontal street, then
    // rotated 90 degrees about the world Y axis (rotation order YXZ applies
    // the X lay-flat first, then the Y turn). A rotation.z here would fold
    // the plane back into a horizontal strip — the road would vanish.
    const v = new THREE.Mesh(new THREE.PlaneGeometry(CFG.worldSize, CFG.roadWidth), roadMat.clone());
    v.material.map = roadTex.clone();
    v.material.map.repeat.set(16, 1);
    v.material.map.needsUpdate = true;
    v.rotation.order = 'YXZ';
    v.rotation.x = -Math.PI / 2;
    v.rotation.y = Math.PI / 2;
    v.position.set(c, ROAD_Y, 0);
    v.receiveShadow = true;
    group.add(v);
    // Horizontal street (along x): repeat 16 x 1.
    const h = new THREE.Mesh(new THREE.PlaneGeometry(CFG.worldSize, CFG.roadWidth), roadMat.clone());
    h.material.map = roadTex.clone();
    h.material.map.repeat.set(16, 1);
    h.material.map.needsUpdate = true;
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, ROAD_Y, c);
    h.receiveShadow = true;
    group.add(h);
  }

  // Sidewalk strips along every road.
  const walkMat = new THREE.MeshLambertMaterial({ map: walkTex });
  for (const c of lines) {
    for (const off of [-CFG.roadWidth / 2 - CFG.sidewalkWidth / 2, CFG.roadWidth / 2 + CFG.sidewalkWidth / 2]) {
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(CFG.sidewalkWidth, CFG.worldSize), walkMat);
      s1.rotation.x = -Math.PI / 2;
      s1.position.set(c + off, 0.03, 0);
      group.add(s1);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(CFG.worldSize, CFG.sidewalkWidth), walkMat);
      s2.rotation.x = -Math.PI / 2;
      s2.position.set(0, 0.03, c + off);
      group.add(s2);
    }
  }

  // Buildings: one or two per block, skipped on roads, scaled by district.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const buildingMats = new Map();
  const matFor = (color, lit) => {
    const key = `${color}|${lit.toFixed(2)}`;
    if (!buildingMats.has(key)) {
      buildingMats.set(key, new THREE.MeshLambertMaterial({ map: TEX.buildingTexture(color, lit, rng) }));
    }
    return buildingMats.get(key);
  };
  for (let bx = -800; bx < 800; bx += CFG.blockSize) {
    for (let bz = -800; bz < 800; bz += CFG.blockSize) {
      const cx = bx + CFG.blockSize / 2;
      const cz = bz + CFG.blockSize / 2;
      const d = districtAt(cx, cz);
      if (!d || d.ring || d.runway || d.beach) continue;
      if (rng.chance(0.12)) continue; // empty lot / parking
      const count = rng.chance(0.55) ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const w = rng.float(28, 52);
        const dep = rng.float(28, 52);
        const h = rng.float(d.hMin, d.hMax);
        const ox = k === 0 ? -w * 0.45 : w * 0.45;
        const oz = k === 0 ? -dep * 0.4 : dep * 0.4;
        const x = cx + ox;
        const z = cz + oz;
        const color = rng.pick(d.palette);
        const mesh = new THREE.Mesh(boxGeo, matFor(color, d.neon ? 0.45 : 0.25));
        mesh.scale.set(w, h, dep);
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        // Rooftop box so the skyline reads at night.
        if (h > 60 && rng.chance(0.5)) {
          const roof = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x22242a }));
          roof.scale.set(w * 0.3, 4, dep * 0.3);
          roof.position.set(x, h + 2, z);
          group.add(roof);
        }
        colliders.push({ x, z, hx: w / 2 + 0.5, hz: dep / 2 + 0.5 });
      }
    }
  }

  // Neon signs over Downtown and Little Havana.
  const neonSigns = [
    { text: 'NEON TIDE', color: '#ff2e88', x: -40, z: -200, y: 70 },
    { text: 'VICE BAY', color: '#22d3ee', x: 120, z: -80, y: 95 },
    { text: 'HAVANA', color: '#ff9f1c', x: 480, z: 340, y: 34 },
    { text: 'EL DORADO', color: '#c084fc', x: 360, z: 520, y: 26 },
    { text: 'PORT 88', color: '#4ade80', x: -620, z: -480, y: 30 },
  ];
  for (const s of neonSigns) {
    const tex = TEX.neonTexture(s.text, s.color);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(64, 16),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    sign.position.set(s.x, s.y, s.z);
    group.add(sign);
    const sign2 = sign.clone();
    sign2.rotation.y = Math.PI;
    sign2.position.set(s.x, s.y, s.z);
    group.add(sign2);
  }

  // Havana Market billboard.
  const bill = new THREE.Mesh(
    new THREE.PlaneGeometry(56, 28),
    new THREE.MeshBasicMaterial({ map: TEX.billboardTexture('HAVANA MARKET', 'fresh fruit - cold drinks - open late') })
  );
  bill.position.set(420, 22, 470);
  group.add(bill);

  // Airport runway (flat strip with markings).
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 40),
    new THREE.MeshLambertMaterial({ map: TEX.runwayTexture() })
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(-140, 0.04, 760);
  runway.receiveShadow = true;
  group.add(runway);
  // A parked jet shape (boxes) beside the runway.
  const jet = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.BoxGeometry(34, 4, 4), new THREE.MeshLambertMaterial({ color: 0xdde3ea }));
  fus.position.y = 3;
  jet.add(fus);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 30), new THREE.MeshLambertMaterial({ color: 0xb9c2cc }));
  wing.position.y = 3;
  jet.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(6, 7, 0.8), new THREE.MeshLambertMaterial({ color: 0x2e5f8a }));
  tail.position.set(-16, 6, 0);
  jet.add(tail);
  jet.position.set(-140, 0, 700);
  group.add(jet);

  // Port cranes (Industrial Port).
  for (const cx of [-680, -480]) {
    const crane = new THREE.Group();
    const legMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    for (const [lx, lz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(2, 42, 2), legMat);
      leg.position.set(lx, 21, lz);
      crane.add(leg);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(46, 3, 3), legMat);
    beam.position.set(0, 44, 0);
    crane.add(beam);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 8), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    cab.position.set(10, 40, 0);
    crane.add(cab);
    crane.position.set(cx, 0, -640);
    group.add(crane);
    colliders.push({ x: cx, z: -640, hx: 9, hz: 9 });
  }

  // Beach pier: planks out to sea (west edge).
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6f4d });
  for (let i = 0; i < 22; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 4), pierMat);
    plank.position.set(-800 - i * 4.4, 2, 420);
    group.add(plank);
  }
  const pierLampMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  for (let i = 0; i < 6; i++) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), pierLampMat);
    lamp.position.set(-812 - i * 16, 5.5, 420);
    group.add(lamp);
  }

  // Highway ring: raised outer loop road.
  const ringMat = new THREE.MeshLambertMaterial({ color: 0x2b2d33 });
  const ring = new THREE.Mesh(new THREE.BoxGeometry(1980, 1, 18), ringMat);
  ring.position.set(0, 0.5, -990);
  group.add(ring);
  const ring2 = ring.clone();
  ring2.position.set(0, 0.5, 990);
  group.add(ring2);
  const ring3 = new THREE.Mesh(new THREE.BoxGeometry(18, 1, 1980), ringMat);
  ring3.position.set(-990, 0.5, 0);
  group.add(ring3);
  const ring4 = ring3.clone();
  ring4.position.set(990, 0.5, 0);
  group.add(ring4);

  // Street lamps along the spawn avenue (kept off the road itself).
  for (let z = -720; z <= 720; z += 160) {
    lampPositions.push({ x: -12, z });
    lampPositions.push({ x: 12, z: -z });
  }
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3d42 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const lp of lampPositions) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 7, 6), poleMat);
    pole.position.set(lp.x, 3.5, lp.z);
    group.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), bulbMat);
    bulb.position.set(lp.x, 7.2, lp.z);
    group.add(bulb);
  }

  // Car spawns: road-aligned, on the grid, facing along the street.
  const spawnTypes = ['sport', 'sedan', 'suv', 'taxi', 'sedan', 'sport', 'truck', 'sedan'];
  for (let i = 0; i < spawnTypes.length; i++) {
    const along = i % 2 === 0;
    const c = -480 + i * 120;
    carSpawns.push({
      type: spawnTypes[i],
      x: along ? 0 : c,
      z: along ? c : 0,
      heading: along ? 0 : Math.PI / 2,
    });
  }
  // Extra spawns near districts.
  carSpawns.push({ type: 'bike', x: 160, z: 160, heading: Math.PI });
  carSpawns.push({ type: 'taxi', x: -320, z: 320, heading: -Math.PI / 2 });
  carSpawns.push({ type: 'suv', x: 480, z: -320, heading: 0 });

  return {
    group,
    colliders,
    carSpawns,
    lampPositions,
    playerSpawn: { x: 0, z: 40, heading: Math.PI },
    districtAt,
    roads: lines,
  };
}
