// Vice Bay city: ground, roads (thin boxes), buildings with shadows, lamps, pier, palms.
import { CONFIG, DISTRICTS } from './config.js';

export function buildCity(scene, textures, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];
  const half = CONFIG.worldSize / 2;
  const box = (w, h, d, mat, x, y, z, shadow) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = !!shadow;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const groundMat = new THREE.MeshStandardMaterial({ map: textures.grass, roughness: 1 });
  groundMat.map.repeat.set(40, 40);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.worldSize + 400, CONFIG.worldSize + 400), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  // Beach strip (west edge) + ocean plane.
  const sandMat = new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 1 });
  sandMat.map.repeat.set(6, 40);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(180, CONFIG.worldSize), sandMat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-half - 60, 0.05, 0);
  beach.receiveShadow = true;
  group.add(beach);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(900, CONFIG.worldSize + 400),
    new THREE.MeshStandardMaterial({ color: 0x1a5f8a, roughness: 0.25, metalness: 0.35 })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-half - 600, 0, 0);
  group.add(ocean);
  // Roads: thin boxes so both directions render (no plane-rotation bug class).
  // The two orientations need DIFFERENT texture repeats, so each gets its own
  // clone — sharing one texture would let the last repeat.set win for all.
  const roadLen = CONFIG.worldSize;
  const roadTexH = textures.road.clone();
  roadTexH.needsUpdate = true;
  roadTexH.repeat.set(roadLen / 64, 1);
  const roadTexV = textures.road.clone();
  roadTexV.needsUpdate = true;
  roadTexV.repeat.set(1, roadLen / 64);
  const roadMat = new THREE.MeshStandardMaterial({ map: textures.road, roughness: 0.95 });
  for (let i = -4; i <= 4; i++) {
    const p = i * CONFIG.roadGap;
    const h = box(roadLen, 0.2, 24, roadMat.clone(), 0, 0.1, p, false);
    h.material.map = roadTexH;
    const v = box(24, 0.2, roadLen, roadMat.clone(), p, 0.1, 0, false);
    v.material.map = roadTexV;
    // Crosswalks at intersections.
    for (let j = -4; j <= 4; j++) {
      const cw = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 3),
        new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.9 })
      );
      cw.rotation.x = -Math.PI / 2;
      cw.position.set(j * CONFIG.roadGap, 0.22, p + 14);
      group.add(cw);
    }
  }
  // Sidewalk strips along roads.
  const walkMat = new THREE.MeshStandardMaterial({ map: textures.sidewalk, roughness: 1 });
  for (let i = -4; i <= 4; i++) {
    const p = i * CONFIG.roadGap;
    for (const off of [-16, 16]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(roadLen, 0.3, 8), walkMat.clone());
      s.material.map = textures.sidewalk;
      s.material.map.repeat.set(roadLen / 32, 1);
      s.position.set(0, 0.15, p + off);
      s.receiveShadow = true;
      group.add(s);
    }
  }
  // Buildings per district, with rooftop detail and lit windows.
  const facadeFor = (d) => {
    if (d.name === 'Little Havana') return textures.facadeHavana;
    if (d.name === 'Industrial Port') return textures.facadePort;
    if (d.name === 'Rich Hills') return textures.facadeHills;
    return textures.facadeDowntown;
  };
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const d of DISTRICTS) {
    if (d.name === 'Highway Ring') continue;
    const facade = facadeFor(d);
    const count = d.name === 'Downtown' ? 26 : 14;
    for (let k = 0; k < count; k++) {
      const bx = d.center[0] + rng.range(-d.size / 2, d.size / 2);
      const bz = d.center[1] + rng.range(-d.size / 2, d.size / 2);
      if (Math.abs(bx % CONFIG.roadGap) < 30 || Math.abs(bz % CONFIG.roadGap) < 30) continue;
      const w = rng.range(28, 52);
      const dep = rng.range(28, 52);
      const h = d.name === 'Downtown' ? rng.range(40, 150) : rng.range(18, 70);
      const tex = facade.clone();
      tex.needsUpdate = true;
      tex.repeat.set(Math.max(1, Math.round(w / 32)), Math.max(1, Math.round(h / 32)));
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
      const b = box(w, h, dep, mat, bx, h / 2, bz, true);
      colliders.push({ x: bx, z: bz, r: Math.max(w, dep) * 0.62 });
      // Rooftop AC unit + antenna.
      box(w * 0.3, 3, dep * 0.3, new THREE.MeshStandardMaterial({ color: 0x555a60, roughness: 0.9 }), bx, h + 1.5, bz, false);
      if (rng.chance(0.4)) {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14, 6), new THREE.MeshStandardMaterial({ color: 0x888888 }));
        ant.position.set(bx + w * 0.25, h + 7, bz);
        group.add(ant);
      }
      if (h > 70) {
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), beaconMat);
        beacon.position.set(bx, h + 2, bz);
        group.add(beacon);
      }
    }
  }
  // Neon signs on poles.
  const signDefs = [
    { tex: textures.neonTide, x: 200, z: 0 },
    { tex: textures.neonHavana, x: 600, z: 560 },
    { tex: textures.neonVice, x: -200, z: -200 },
    { tex: textures.neonPier, x: -980, z: 700 },
  ];
  for (const s of signDefs) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 22, 8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    pole.position.set(s.x, 11, s.z);
    pole.castShadow = true;
    group.add(pole);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 7),
      new THREE.MeshBasicMaterial({ map: s.tex, transparent: false })
    );
    sign.position.set(s.x, 24, s.z);
    sign.rotation.y = Math.PI / 4;
    group.add(sign);
  }
  // Street lamps with warm glow spheres.
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd27f });
  for (let i = -4; i <= 4; i++) {
    for (let j = -4; j <= 4; j++) {
      const x = i * CONFIG.roadGap + 18;
      const z = j * CONFIG.roadGap + 18;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 9, 6), lampMat);
      pole.position.set(x, 4.5, z);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), glowMat);
      bulb.position.set(x, 9.2, z);
      group.add(bulb);
    }
  }
  // Palm trees along the beach.
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f7a2f, roughness: 1 });
  for (let k = 0; k < 40; k++) {
    const x = -half - 30 + rng.range(-40, 40);
    const z = rng.range(-half, half);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 9, 6), trunkMat);
    trunk.position.set(x, 4.5, z);
    trunk.castShadow = true;
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4, 7), leafMat);
    crown.position.set(x, 10.5, z);
    crown.castShadow = true;
    group.add(crown);
  }
  // Pier at (-1040, 700): deck + posts + lamps.
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x7a5a35, roughness: 1 });
  const pier = box(16, 1.5, 120, pierMat, -1060, 1.5, 700, true);
  colliders.push({ x: -1060, z: 700, r: 12 });
  for (let k = 0; k < 6; k++) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), glowMat);
    lamp.position.set(-1060 + (k % 2 === 0 ? -7 : 7), 5, 650 + k * 20);
    group.add(lamp);
  }
  const spawnPoints = [
    { x: 0, z: 0, name: 'Downtown Plaza' },
    { x: -700, z: 700, name: 'Ocean Pier' },
    { x: 600, z: 600, name: 'Havana Market' },
    { x: 800, z: -600, name: 'Port Gate' },
    { x: -600, z: -600, name: 'Hills Overlook' },
    { x: 0, z: -800, name: 'Airport Terminal' },
  ];
  return { group, colliders, spawnPoints, half };
}
