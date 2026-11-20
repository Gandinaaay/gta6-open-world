// The city: ground, road grid, district buildings, neon signs, lamps, pier.
// Roads run along x and z every 200 m; blocks between them hold buildings.

import { CONFIG, DISTRICTS } from './config.js';

export function buildCity(scene, textures, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = []; // {x, z, r} circles the player/cars cannot pass
  const spawnPoints = [];
  const half = CONFIG.worldSize / 2;

  // Ground base.
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x3f4a3a });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.worldSize, CONFIG.worldSize), groundMat);
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Beach strip on the west edge (Ocean Beach).
  const sandMat = new THREE.MeshLambertMaterial({ map: textures.sand });
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(180, CONFIG.worldSize), sandMat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-half + 90, 0.05, 0);
  group.add(beach);

  // Roads: thin boxes along x and along z, with the road texture repeated
  // along the road length (U runs along X, V along Z on a box top face).
  const roadLen = CONFIG.worldSize;
  const roadWidth = 24;
  const mkRoad = (x, z, vertical) => {
    const geo = vertical
      ? new THREE.BoxGeometry(roadWidth, 0.2, roadLen)
      : new THREE.BoxGeometry(roadLen, 0.2, roadWidth);
    const mat = new THREE.MeshLambertMaterial({ map: textures.road.clone() });
    mat.map.needsUpdate = true;
    mat.map.repeat.set(vertical ? 1 : roadLen / 64, vertical ? roadLen / 64 : 1);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 0.1, z);
    group.add(m);
  };
  for (let i = -4; i <= 4; i++) {
    const p = i * CONFIG.roadGap;
    mkRoad(0, p, false);
    mkRoad(p, 0, true);
  }

  // Crosswalks at intersections.
  const crossMat = new THREE.MeshLambertMaterial({ color: 0xe5e7eb });
  for (let ix = -4; ix <= 4; ix++) {
    for (let iz = -4; iz <= 4; iz++) {
      const x = ix * CONFIG.roadGap, z = iz * CONFIG.roadGap;
      for (let k = -2; k <= 2; k++) {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(2, 8), crossMat);
        s.rotation.x = -Math.PI / 2;
        s.position.set(x + k * 4, 0.15, z + 14);
        group.add(s);
      }
    }
  }

  // Buildings: one per block, height by district.
  const facadeFor = (d) => {
    if (d.name === 'Little Havana') return textures.facadeHavana;
    if (d.name === 'Industrial Port' || d.name === 'Airport') return textures.facadePort;
    if (d.name === 'Rich Hills') return textures.facadeHills;
    return textures.facadeDowntown;
  };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (const d of DISTRICTS) {
    const mat = new THREE.MeshLambertMaterial({ map: facadeFor(d) });
    const cols = Math.max(1, Math.floor(d.w / CONFIG.blockSize));
    const rows = Math.max(1, Math.floor(d.h / CONFIG.blockSize));
    for (let cx = 0; cx < cols; cx++) {
      for (let cz = 0; cz < rows; cz++) {
        const bx = d.x - d.w / 2 + (cx + 0.5) * (d.w / cols);
        const bz = d.z - d.h / 2 + (cz + 0.5) * (d.h / rows);
        // Keep the spawn avenue (the road at x=0 / z=0) clear.
        if (Math.abs(bx) < 40 || Math.abs(bz) < 40) continue;
        if (rng.chance(0.15)) continue; // empty lot / park
        const h = d.name === 'Downtown' ? rng.range(40, 110) : rng.range(12, 45);
        const w = rng.range(28, 52);
        const dep = rng.range(28, 52);
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, h, dep);
        b.position.set(bx, h / 2, bz);
        group.add(b);
        colliders.push({ x: bx, z: bz, r: Math.max(w, dep) * 0.62 });
        // Rooftop beacon on tall towers.
        if (h > 70) {
          const beacon = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff2222 }),
          );
          beacon.position.set(bx, h + 1.5, bz);
          group.add(beacon);
        }
      }
    }
  }

  // Neon signs on tall poles in their districts.
  const sign = (texture, x, z, y) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(48, 12),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    m.position.set(x, y, z);
    group.add(m);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, y, 8),
      new THREE.MeshLambertMaterial({ color: 0x1f2937 }),
    );
    pole.position.set(x, y / 2, z);
    group.add(pole);
  };
  sign(textures.neonVice, 0, -120, 42);
  sign(textures.neonTide, -700, 650, 26);
  sign(textures.neonHavana, -750, -700, 24);
  sign(textures.neonPier, -860, 700, 20);

  // Street lamps along the main roads (kept off the spawn avenue x=0).
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
  const lampGlow = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let i = -4; i <= 4; i++) {
    for (const z of [-400, -200, 200, 400]) {
      const x = i * CONFIG.roadGap + 60;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 9, 6), lampMat);
      pole.position.set(x, 4.5, z);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), lampGlow);
      bulb.position.set(x, 9.2, z);
      group.add(bulb);
    }
  }

  // Pier jutting into the sea at the west edge.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x6b4f2a });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(120, 2, 24), pierMat);
  pier.position.set(-half - 40, 1, 700);
  group.add(pier);
  colliders.push({ x: -half - 40, z: 700, r: 12 });

  // Spawn points on roads.
  spawnPoints.push({ x: 0, z: 0 }, { x: 0, z: 200 }, { x: 200, z: 0 }, { x: -200, z: 200 });

  return { group, colliders, spawnPoints, half };
}
