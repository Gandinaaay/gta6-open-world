// The city: ground, beach, thin-box roads, crosswalks, buildings, lamps, pier.
import { CONFIG, DISTRICTS } from './config.js';
import { makeRng } from './random.js';

const THREE = window.THREE;

export function buildCity(scene, textures, rng) {
  const group = new THREE.Group();
  const half = CONFIG.worldSize / 2;
  const colliders = [];
  const spawnPoints = [];

  const groundMat = new THREE.MeshLambertMaterial({ map: textures.grass });
  textures.grass.repeat.set(40, 40);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.worldSize, CONFIG.worldSize), groundMat);
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Beach strip along the west edge.
  const sandMat = new THREE.MeshLambertMaterial({ map: textures.sand });
  textures.sand.repeat.set(6, 40);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(120, CONFIG.worldSize), sandMat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-half + 60, 0.05, 0);
  group.add(beach);

  // Roads as thin boxes (never rotated planes: a plane rotated on z folds flat).
  const roadMat = new THREE.MeshLambertMaterial({ map: textures.road });
  const roadLen = CONFIG.worldSize;
  const roadW = 24;
  const coords = [];
  for (let c = -half + CONFIG.roadGap; c < half; c += CONFIG.roadGap) coords.push(c);
  for (const c of coords) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(roadLen, 0.2, roadW), roadMat.clone());
    h.material.map = textures.road.clone();
    h.material.map.repeat.set(roadLen / 64, 1);
    h.material.map.needsUpdate = true;
    h.position.set(0, 0.1, c);
    group.add(h);
    const v = new THREE.Mesh(new THREE.BoxGeometry(roadW, 0.2, roadLen), roadMat.clone());
    v.material.map = textures.road.clone();
    v.material.map.repeat.set(1, roadLen / 64);
    v.material.map.needsUpdate = true;
    v.position.set(c, 0.1, 0);
    group.add(v);
  }

  // Crosswalks at every intersection.
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xd8d8d8 });
  for (const x of coords) {
    for (const z of coords) {
      for (let i = -2; i <= 2; i++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 7), crossMat);
        stripe.position.set(x + i * 4.4, 0.24, z - roadW / 2 - 2);
        group.add(stripe);
      }
    }
  }

  // District buildings: box towers with canvas facades and rooftop beacons.
  const facadeKeys = ['downtown', 'havana', 'port', 'hills'];
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff4040 });
  const localRng = makeRng(99);
  for (const d of DISTRICTS) {
    const n = d.name === 'Downtown' ? 26 : 14;
    for (let i = 0; i < n; i++) {
      const x = d.center[0] + localRng.range(-d.size / 2, d.size / 2);
      const z = d.center[1] + localRng.range(-d.size / 2, d.size / 2);
      // Keep buildings off the roads.
      const onRoad = coords.some((c) => Math.abs(x - c) < 26 || Math.abs(z - c) < 26);
      if (onRoad) continue;
      const w = localRng.range(18, 34);
      const dep = localRng.range(18, 34);
      const hgt = d.name === 'Downtown' ? localRng.range(35, 110) : localRng.range(12, 42);
      const key = facadeKeys[Math.floor(localRng.next() * facadeKeys.length)];
      const tex = textures.facades[key][Math.floor(localRng.next() * 3)];
      const mat = new THREE.MeshLambertMaterial({ map: tex, color: d.color });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, dep), mat);
      b.position.set(x, hgt / 2, z);
      group.add(b);
      colliders.push({ x, z, r: Math.max(w, dep) * 0.62 });
      if (hgt > 70) {
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), beaconMat);
        beacon.position.set(x, hgt + 2, z);
        group.add(beacon);
      }
    }
  }

  // Neon signs on poles.
  const signDefs = [
    { tex: textures.neonVice, x: 60, z: 60, y: 26 },
    { tex: textures.neonHavana, x: -450, z: -500, y: 20 },
    { tex: textures.neonPier, x: -880, z: 660, y: 18 },
    { tex: textures.neonTide, x: 700, z: -650, y: 22 },
  ];
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x30343a });
  for (const s of signDefs) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, s.y, 8), poleMat);
    pole.position.set(s.x, s.y / 2, s.z);
    group.add(pole);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 8.5),
      new THREE.MeshBasicMaterial({ map: s.tex, side: THREE.DoubleSide })
    );
    board.position.set(s.x, s.y + 4, s.z);
    group.add(board);
  }

  // Street lamps along the roads.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x22262c });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const c of coords) {
    for (let k = -half + 120; k < half; k += 240) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7, 6), lampMat);
      pole.position.set(c + 14, 3.5, k);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), bulbMat);
      bulb.position.set(c + 14, 7.2, k);
      group.add(bulb);
    }
  }

  // Pier jutting into the sea at the west edge.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2c });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(90, 1, 18), pierMat);
  pier.position.set(-half - 30, 1.2, 620);
  group.add(pier);
  for (let i = 0; i < 5; i++) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), bulbMat);
    lamp.position.set(-half - 60 + i * 18, 4.5, 620);
    group.add(lamp);
  }

  spawnPoints.push(
    { name: 'Downtown', x: 100, z: 100 },
    { name: 'Ocean Beach', x: -850, z: 500 },
    { name: 'Little Havana', x: -450, z: -550 },
    { name: 'Industrial Port', x: 750, z: -700 },
    { name: 'Rich Hills', x: 650, z: 650 },
    { name: 'Airport', x: 900, z: 0 },
    { name: 'Criminal District', x: -700, z: 750 },
    { name: 'Highway Ring', x: 0, z: -850 },
  );

  scene.add(group);
  return { group, colliders, spawnPoints, half };
}
