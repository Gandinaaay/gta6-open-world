// Vice Bay: Blood & Destiny — the city itself: ground, roads, buildings, props.
// Everything is placed from a seeded random stream, so the same seed builds the same city.

import { DISTRICTS, WORLD } from './config.js';

const THREE = globalThis.THREE;

function districtAt(x, z) {
  // Later districts are smaller overlays; the first match that is not the ring wins.
  let found = null;
  for (const d of DISTRICTS) {
    if (d.ring) continue;
    if (Math.abs(x - d.x) <= d.w / 2 && Math.abs(z - d.z) <= d.h / 2) found = d;
  }
  return found;
}

export function createCity(scene, textures, rand) {
  const group = new THREE.Group();
  group.name = 'city';
  const colliders = [];
  const half = WORLD.half;

  // Ground: grass everywhere, then district tints and the beach.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, WORLD.size),
    new THREE.MeshLambertMaterial({ map: textures.grass }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  group.add(ground);

  const beach = DISTRICTS.find((d) => d.name === 'Ocean Beach');
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(beach.w, beach.h),
    new THREE.MeshLambertMaterial({ map: textures.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(beach.x, 0.02, beach.z);
  sand.receiveShadow = true;
  group.add(sand);

  // Water along the south-west edge, past the beach.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(2200, 320),
    new THREE.MeshLambertMaterial({ map: textures.water }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-880, 0.01, 880);
  group.add(water);

  // Roads: a grid every roadGap metres, asphalt strips with a centre line.
  const roadMat = new THREE.MeshLambertMaterial({ map: textures.asphalt });
  const lineMat = new THREE.MeshLambertMaterial({ map: textures.roadLine });
  const roadGeoX = new THREE.PlaneGeometry(WORLD.roadWidth, WORLD.size);
  const roadGeoZ = new THREE.PlaneGeometry(WORLD.size, WORLD.roadWidth);
  const lineGeoX = new THREE.PlaneGeometry(1.2, WORLD.size);
  const lineGeoZ = new THREE.PlaneGeometry(WORLD.size, 1.2);
  for (let c = -half; c <= half; c += WORLD.roadGap) {
    const rx = new THREE.Mesh(roadGeoX, roadMat);
    rx.rotation.x = -Math.PI / 2;
    rx.position.set(c, 0.05, 0);
    rx.receiveShadow = true;
    group.add(rx);
    const rz = new THREE.Mesh(roadGeoZ, roadMat);
    rz.rotation.x = -Math.PI / 2;
    rz.position.set(0, 0.05, c);
    rz.receiveShadow = true;
    group.add(rz);
    const lx = new THREE.Mesh(lineGeoX, lineMat);
    lx.rotation.x = -Math.PI / 2;
    lx.position.set(c, 0.06, 0);
    group.add(lx);
    const lz = new THREE.Mesh(lineGeoZ, lineMat);
    lz.rotation.x = -Math.PI / 2;
    lz.position.set(0, 0.06, c);
    group.add(lz);
  }

  // Buildings: one or more per block, height and density follow the district.
  const facadeMats = textures.facades.map(
    (map) => new THREE.MeshLambertMaterial({ map }),
  );
  const roofMat = new THREE.MeshLambertMaterial({ map: textures.roof });
  const sideMat = new THREE.MeshLambertMaterial({ color: 0x565b62 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let bx = -half + WORLD.roadGap / 2; bx < half; bx += WORLD.roadGap) {
    for (let bz = -half + WORLD.roadGap / 2; bz < half; bz += WORLD.roadGap) {
      const d = districtAt(bx, bz);
      const density = d ? d.dense : 0.35;
      const count = rand.next() < density ? (rand.next() < 0.45 ? 2 : 1) : 0;
      for (let i = 0; i < count; i++) {
        const w = 22 + rand.next() * 34;
        const dep = 22 + rand.next() * 34;
        const tall = d && d.tall;
        const h = tall ? 24 + rand.next() * 46 : 7 + rand.next() * 14;
        const ox = (rand.next() - 0.5) * (WORLD.block - w - 24);
        const oz = (rand.next() - 0.5) * (WORLD.block - dep - 24);
        const x = bx + ox + (i === 1 ? 30 : 0);
        const z = bz + oz + (i === 1 ? -30 : 0);
        if (Math.abs(x) > half - 20 || Math.abs(z) > half - 20) continue;
        const mats = [
          facadeMats[Math.floor(rand.next() * facadeMats.length)],
          facadeMats[Math.floor(rand.next() * facadeMats.length)],
          roofMat,
          sideMat,
          facadeMats[Math.floor(rand.next() * facadeMats.length)],
          facadeMats[Math.floor(rand.next() * facadeMats.length)],
        ];
        const b = new THREE.Mesh(boxGeo, mats);
        b.scale.set(w, h, dep);
        b.position.set(x, h / 2, z);
        b.castShadow = true;
        b.receiveShadow = true;
        group.add(b);
        colliders.push({ x, z, hw: w / 2, hd: dep / 2, h });
      }
    }
  }

  // Streetlights at every second intersection.
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2c2f33 });
  const lampGeo = new THREE.SphereGeometry(0.45, 8, 6);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let c = -half; c <= half; c += WORLD.roadGap * 2) {
    for (let d = -half; d <= half; d += WORLD.roadGap * 2) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(c + 9, 3.5, d + 9);
      group.add(pole);
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(c + 9, 7.1, d + 9);
      group.add(lamp);
    }
  }

  // Palms along the beach front.
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 6, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5c2e });
  const crownGeo = new THREE.ConeGeometry(2.6, 2.4, 7);
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x2e7a3a });
  for (let i = 0; i < 26; i++) {
    const x = beach.x - beach.w / 2 + rand.next() * beach.w;
    const z = beach.z - beach.h / 2 + rand.next() * beach.h;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 3, z);
    group.add(trunk);
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(x, 7, z);
    group.add(crown);
  }

  scene.add(group);
  return { group, colliders };
}
