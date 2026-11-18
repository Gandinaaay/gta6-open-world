// Vice Bay itself: ground, the road grid, eight districts with their own buildings,
// the beach and sea, the airport runway, the port containers, trees, lamps, traffic
// lights, shops and the named places the missions send you to.
import { WORLD, DISTRICTS, districtAt } from './config.js';
import {
  buildingTexture, houseTexture, roadTexture, sidewalkTexture, grassTexture,
  sandTexture, waterTexture, runwayTexture, containerTexture, billboardTexture,
} from './textures.js';

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
};

export const SHOPS = [
  { id: 'arms', kind: 'arms', name: 'Bay Arms', x: -40, z: 140, color: 0x8a2be2 },
  { id: 'motors', kind: 'motors', name: 'Vice Motors', x: 160, z: -40, color: 0xd21f3c },
  { id: 'clothes', kind: 'clothes', name: 'Style House', x: 420, z: 40, color: 0x2ec4b6 },
  { id: 'tuner', kind: 'tuner', name: 'Tuner Garage', x: -280, z: 320, color: 0xf2b705 },
];

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
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

  const grassTex = grassTexture();
  const sandTex = sandTexture();
  const waterTex = waterTexture();
  const roadTex = roadTexture();
  const sidewalkTex = sidewalkTexture();

  // Ground: grass base, sand on the east beach, sea beyond it.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, WORLD.size), new THREE.MeshLambertMaterial({ map: grassTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(150, WORLD.size), new THREE.MeshLambertMaterial({ map: sandTex }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(425, 0.05, 0);
  sand.receiveShadow = true;
  group.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, WORLD.size), new THREE.MeshLambertMaterial({ map: waterTex }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(700, 0.02, 0);
  group.add(sea);

  // Roads: a grid every 100 units, plus the highway ring around the edge.
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  const sideMat = new THREE.MeshLambertMaterial({ map: sidewalkTex });
  for (let c = -400; c <= 400; c += 100) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, WORLD.size), roadMat);
    v.rotation.x = -Math.PI / 2;
    v.position.set(c, 0.08, 0);
    v.receiveShadow = true;
    group.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, WORLD.roadWidth), roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0.08, c);
    h.receiveShadow = true;
    group.add(h);
    const sv = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth + 8, WORLD.size), sideMat);
    sv.rotation.x = -Math.PI / 2;
    sv.position.set(c, 0.06, 0);
    group.add(sv);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, WORLD.roadWidth + 8), sideMat);
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(0, 0.06, c);
    group.add(sh);
  }

  // Airport runway + terminal apron.
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(60, 260), new THREE.MeshLambertMaterial({ map: runwayTexture() }));
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(230, 0.09, 350);
  runway.receiveShadow = true;
  group.add(runway);

  const towerTex = buildingTexture('#5b6b7a', random, 14);
  const towerTex2 = buildingTexture('#7a6a5b', random, 18);
  const towerTex3 = buildingTexture('#3f5a78', random, 10);
  const houseTex = houseTexture('#e8dcc0', random);
  const houseTex2 = houseTexture('#c96f4a', random);
  const houseTex3 = houseTexture('#7fb3a3', random);
  const wareMat = new THREE.MeshLambertMaterial({ color: 0x8a7d6b });
  const villaTex = houseTexture('#f2e6c9', random);

  const towerMats = [towerTex, towerTex2, towerTex3].map((t) => new THREE.MeshLambertMaterial({ map: t }));
  const houseMats = [houseTex, houseTex2, houseTex3].map((t) => new THREE.MeshLambertMaterial({ map: t }));
  const villaMat = new THREE.MeshLambertMaterial({ map: villaTex });

  function addBuilding(x, z, w, h, d, mat) {
    const b = box(w, h, d, mat, x, h / 2, z);
    group.add(b);
    colliders.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });
    return b;
  }

  function addTree(x, z, palm) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.4, palm ? 7 : 4, 6),
      new THREE.MeshLambertMaterial({ color: palm ? 0x8a6b45 : 0x5a3a28 }),
    );
    trunk.position.set(x, (palm ? 7 : 4) / 2, z);
    trunk.castShadow = true;
    group.add(trunk);
    const top = new THREE.Mesh(
      palm ? new THREE.ConeGeometry(3.2, 3, 7) : new THREE.SphereGeometry(2.6, 8, 6),
      new THREE.MeshLambertMaterial({ color: palm ? 0x2e8b57 : 0x2f6b2f }),
    );
    top.position.set(x, (palm ? 7 : 4) + (palm ? 1.2 : 2), z);
    top.castShadow = true;
    group.add(top);
  }

  function addLamp(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    pole.position.set(x, 3, z);
    group.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    bulb.position.set(x, 6.1, z);
    group.add(bulb);
    lamps.push(bulb);
  }

  // Buildings block by block. The airport and beach blocks stay open; the port gets
  // warehouses and container stacks instead of towers.
  const containerColors = ['#b03a2e', '#2e86ab', '#e67e22', '#27ae60', '#8e44ad'];
  for (let bx = -500; bx < 500; bx += 100) {
    for (let bz = -500; bz < 500; bz += 100) {
      const cx = bx + 50;
      const cz = bz + 50;
      const district = districtAt(cx, cz);
      if (random() > district.density) continue;
      if (district.style === 'airport') {
        if (random() < 0.4) addBuilding(cx, cz, 30, 9, 18, wareMat);
        continue;
      }
      if (district.style === 'beach') {
        if (cx > 380 && random() < 0.7) addBuilding(cx, cz, 24, random.range(18, 42), 24, random.pick(towerMats));
        if (random() < 0.8) addTree(cx + random.range(-30, 30), cz + random.range(-30, 30), true);
        continue;
      }
      if (district.style === 'tower') {
        const n = random.int(1, 2);
        for (let i = 0; i < n; i += 1) {
          const w = random.range(20, 34);
          const h = random.range(35, 120);
          addBuilding(cx + random.range(-18, 18), cz + random.range(-18, 18), w, h, w, random.pick(towerMats));
        }
      } else if (district.style === 'house' || district.style === 'villa') {
        const n = random.int(2, 4);
        for (let i = 0; i < n; i += 1) {
          const w = random.range(12, 20);
          const h = district.style === 'villa' ? random.range(8, 16) : random.range(5, 10);
          addBuilding(cx + random.range(-28, 28), cz + random.range(-28, 28), w, h, random.range(12, 20), district.style === 'villa' ? villaMat : random.pick(houseMats));
        }
        if (random() < 0.6) addTree(cx + random.range(-30, 30), cz + random.range(-30, 30), false);
      } else if (district.style === 'warehouse') {
        addBuilding(cx, cz, random.range(30, 44), random.range(9, 14), random.range(24, 36), wareMat);
        if (random() < 0.7) {
          const ct = containerTexture(random.pick(containerColors));
          const cm = new THREE.MeshLambertMaterial({ map: ct });
          const cont = box(12, 3, 3, cm, cx + random.range(-20, 20), 1.5, cz + random.range(-20, 20));
          group.add(cont);
          colliders.push({ x0: cont.position.x - 6, z0: cont.position.z - 1.5, x1: cont.position.x + 6, z1: cont.position.z + 1.5 });
        }
      } else { // tenement
        const n = random.int(2, 3);
        for (let i = 0; i < n; i += 1) {
          addBuilding(cx + random.range(-22, 22), cz + random.range(-22, 22), random.range(16, 26), random.range(14, 30), random.range(16, 26), random.pick(towerMats));
        }
      }
      if (random() < 0.3) addLamp(bx + random.range(10, 90), bz + 12);
    }
  }

  // Airport terminal + hangars, and the port's big container yard.
  addBuilding(150, 350, 60, 14, 30, new THREE.MeshLambertMaterial({ map: towerTex2 }));
  addBuilding(300, 280, 34, 10, 24, wareMat);
  addBuilding(300, 430, 34, 10, 24, wareMat);
  for (let i = 0; i < 14; i += 1) {
    const ct = containerTexture(random.pick(containerColors));
    const cm = new THREE.MeshLambertMaterial({ map: ct });
    const x = -460 + (i % 7) * 26;
    const z = -460 + Math.floor(i / 7) * 30;
    const cont = box(12, 3, 3, cm, x, 1.5 + (i % 3 === 0 ? 3 : 0), z);
    group.add(cont);
    colliders.push({ x0: x - 6, z0: z - 1.5, x1: x + 6, z1: z + 1.5 });
  }

  // Billboards over Downtown and the beach strip.
  const bb1 = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), new THREE.MeshBasicMaterial({ map: billboardTexture('VICE BAY', '#d21f3c', '#ffffff') }));
  bb1.position.set(0, 26, -195);
  group.add(bb1);
  const bb2 = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), new THREE.MeshBasicMaterial({ map: billboardTexture('NEON TIDE CLUB', '#1a1a2e', '#2ec4b6') }));
  bb2.position.set(400, 20, 120);
  bb2.rotation.y = -Math.PI / 2;
  group.add(bb2);

  // Traffic lights at the big intersections, cycling green/red by axis.
  for (let x = -200; x <= 200; x += 200) {
    for (let z = -200; z <= 200; z += 200) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7, 6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
      pole.position.set(x + 10, 3.5, z + 10);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3, 1.2), new THREE.MeshLambertMaterial({ color: 0x111111 }));
      head.position.set(x + 10, 7.5, z + 10);
      group.add(head);
      const lampMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const lampMesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
      lampMesh.position.set(x + 10, 8.2, z + 10.6);
      group.add(lampMesh);
      trafficLights.push({ x: x + 10, z: z + 10, phase: (x + z) / 200, lampMat, axis: 'x' });
    }
  }

  // Shop fronts: a coloured awning box + a floating sign, walk up and press E.
  for (const shop of SHOPS) {
    const front = box(14, 6, 2, new THREE.MeshLambertMaterial({ color: shop.color }), shop.x, 3, shop.z);
    group.add(front);
    colliders.push({ x0: shop.x - 7, z0: shop.z - 1, x1: shop.x + 7, z1: shop.z + 1 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshBasicMaterial({ map: billboardTexture(shop.name.toUpperCase(), '#111111', '#ffffff') }));
    sign.position.set(shop.x, 8, shop.z + 1.2);
    group.add(sign);
    shop.sign = sign;
  }

  // A pier jutting into the sea at Ocean Beach.
  const pier = box(10, 1, 80, new THREE.MeshLambertMaterial({ color: 0x8a6b45 }), 520, 1, 60);
  group.add(pier);

  return { colliders, trafficLights, lamps, group };
}

// Circle (player / car) vs building AABBs: push the circle out of any box it overlaps.
export function collideCircle(colliders, x, z, radius) {
  let px = x;
  let pz = z;
  for (const c of colliders) {
    if (px + radius > c.x0 && px - radius < c.x1 && pz + radius > c.z0 && pz - radius < c.z1) {
      const dxl = px + radius - c.x0;
      const dxr = c.x1 - (px - radius);
      const dzl = pz + radius - c.z0;
      const dzr = c.z1 - (pz - radius);
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) px = c.x0 - radius;
      else if (m === dxr) px = c.x1 + radius;
      else if (m === dzl) pz = c.z0 - radius;
      else pz = c.z1 + radius;
    }
  }
  return { x: px, z: pz };
}

export function clampToWorld(x, z, margin = 8) {
  return {
    x: Math.max(-WORLD.half + margin, Math.min(WORLD.half - margin, x)),
    z: Math.max(-WORLD.half + margin, Math.min(WORLD.half - margin, z)),
  };
}
