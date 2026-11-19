// Builds the city: ground, road grid, district buildings, signs, pier, runway.
import { CFG } from './config.js';
import { makeRng, range, pick } from './random.js';

export function districtAt(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const d of CFG.districts) {
    if (d.style === 'ring') continue;
    const dx = x - d.cx, dz = z - d.cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < d.r && dist < bestD) { best = d; bestD = dist; }
  }
  return best || CFG.districts[0];
}

export function buildCity(scene, tex) {
  const rng = makeRng(1337);
  const group = new THREE.Group();
  group.name = 'city';
  const colliders = [];
  const lamps = [];
  const H = CFG.half;

  // Ground: grass base, sand beach strip on the west, water beyond.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.world, CFG.world),
    new THREE.MeshLambertMaterial({ map: tex.grass })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(180, CFG.world),
    new THREE.MeshLambertMaterial({ map: tex.sand })
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-H + 90, 0.05, 0);
  group.add(beach);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(300, CFG.world),
    new THREE.MeshLambertMaterial({ map: tex.water })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-H - 150, 0.02, 0);
  group.add(sea);

  // Road grid: streets every 100 m, both axes, plus the highway ring.
  // The road texture repeats along each street's length: (1,16) for streets
  // running north-south, (16,1) for streets running east-west.
  const roadTexH = tex.road.clone();
  roadTexH.needsUpdate = true;
  roadTexH.repeat.set(16, 1);
  const roadMatV = new THREE.MeshLambertMaterial({ map: tex.road });
  const roadMatH = new THREE.MeshLambertMaterial({ map: roadTexH });
  const swMat = new THREE.MeshLambertMaterial({ map: tex.sidewalk });
  const streets = [];
  for (let c = -900; c <= 900; c += CFG.streetStep) {
    streets.push(c);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(CFG.streetWidth, CFG.world), roadMatV);
    v.rotation.x = -Math.PI / 2;
    v.position.set(c, 0.1, 0);
    group.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(CFG.world, CFG.streetWidth), roadMatH);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0.1, c);
    group.add(h);
    // Sidewalk strips along each street.
    const sw1 = new THREE.Mesh(new THREE.PlaneGeometry(CFG.sidewalk * 2, CFG.world), swMat);
    sw1.rotation.x = -Math.PI / 2;
    sw1.position.set(c + CFG.streetWidth / 2 + CFG.sidewalk, 0.08, 0);
    group.add(sw1);
    const sw2 = new THREE.Mesh(new THREE.PlaneGeometry(CFG.world, CFG.sidewalk * 2), swMat);
    sw2.rotation.x = -Math.PI / 2;
    sw2.position.set(0, 0.08, c + CFG.streetWidth / 2 + CFG.sidewalk);
    group.add(sw2);
  }

  // Highway ring road (circle around the city).
  const ringGeo = new THREE.RingGeometry(880, 900, 64);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshLambertMaterial({ color: 0x2b2d33 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.09;
  group.add(ring);

  // Buildings: one per block between streets, style/height by district.
  const facadeByStyle = {
    tower: tex.facadeTower, mid: tex.facadeMid, low: tex.facadeLow,
    industrial: tex.facadeInd, villa: tex.facadeVilla, flat: tex.facadeLow, ring: tex.facadeMid,
  };
  const geoCache = {};
  function boxGeo(w, h, d) {
    const key = `${w}|${h}|${d}`;
    if (!geoCache[key]) geoCache[key] = new THREE.BoxGeometry(w, h, d);
    return geoCache[key];
  }
  for (let bx = -950; bx < 950; bx += CFG.streetStep) {
    for (let bz = -950; bz < 950; bz += CFG.streetStep) {
      const cx = bx + 50, cz = bz + 50;
      if (Math.abs(cx) > 900 || Math.abs(cz) > 900) continue;
      if (cx < -820) continue; // beach stays open
      const d = districtAt(cx, cz);
      if (d.style === 'flat') continue; // airport apron
      if (rng() < 0.12) continue; // empty lots / parks
      const hByStyle = { tower: [40, 110], mid: [14, 34], low: [6, 14], industrial: [8, 18], villa: [5, 10], ring: [10, 24] };
      const [hMin, hMax] = hByStyle[d.style] || [10, 24];
      const h = range(rng, hMin, hMax);
      const w = range(rng, 24, 52);
      const dep = range(rng, 24, 52);
      const mat = new THREE.MeshLambertMaterial({ map: facadeByStyle[d.style], color: d.color });
      const b = new THREE.Mesh(boxGeo(w, h, dep), mat);
      b.position.set(cx + range(rng, -8, 8), h / 2, cz + range(rng, -8, 8));
      b.rotation.y = rng() < 0.3 ? Math.PI / 2 : 0;
      group.add(b);
      colliders.push({ x: b.position.x, z: b.position.z, hw: w / 2 + 1, hd: dep / 2 + 1 });
      // Roof AC box on tall towers.
      if (h > 40 && rng() < 0.6) {
        const ac = new THREE.Mesh(boxGeo(6, 3, 6), new THREE.MeshLambertMaterial({ color: 0x555555 }));
        ac.position.set(b.position.x, h + 1.5, b.position.z);
        group.add(ac);
      }
    }
  }

  // Neon sign "NEON TIDE" on a Downtown tower.
  const neonMat = new THREE.MeshBasicMaterial({ map: tex.neon });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(42, 10.5), neonMat);
  neon.position.set(120, 52, -40);
  neon.rotation.y = -Math.PI / 2;
  group.add(neon);
  const neon2 = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), neonMat);
  neon2.position.set(-320, 26, 820);
  neon2.rotation.y = Math.PI / 4;
  group.add(neon2);

  // Havana Market billboard in Little Havana.
  const bb = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 18),
    new THREE.MeshBasicMaterial({ map: tex.billboard })
  );
  bb.position.set(450, 16, -430);
  bb.rotation.y = Math.PI / 6;
  group.add(bb);
  const bbPole = new THREE.Mesh(boxGeo(2, 8, 2), new THREE.MeshLambertMaterial({ color: 0x333333 }));
  bbPole.position.set(450, 4, -430);
  group.add(bbPole);

  // Pier jutting into the sea at Ocean Beach.
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(160, 1.5, 14),
    new THREE.MeshLambertMaterial({ color: 0x7a5a38 })
  );
  pier.position.set(-H - 60, 1.2, 600);
  group.add(pier);
  for (let i = 0; i < 6; i++) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8 })
    );
    lamp.position.set(-H + 10 - i * 28, 4.5, 600);
    group.add(lamp);
    lamps.push(lamp);
    const pole = new THREE.Mesh(boxGeo(0.4, 4, 0.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    pole.position.set(-H + 10 - i * 28, 2, 600);
    group.add(pole);
  }

  // Airport runway.
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 420),
    new THREE.MeshLambertMaterial({ map: tex.runway })
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(700, 0.12, -750);
  group.add(runway);

  // Street lamps along a few avenues.
  const lampGeo = new THREE.SphereGeometry(0.6, 8, 8);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 6, 6);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (let c = -800; c <= 800; c += 200) {
    for (const [lx, lz] of [[c + 30, 0], [0, c + 30]]) {
      const bulb = new THREE.Mesh(lampGeo, lampMat);
      bulb.position.set(lx, 6.2, lz);
      group.add(bulb);
      lamps.push(bulb);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(lx, 3, lz);
      group.add(pole);
    }
  }

  scene.add(group);
  return {
    colliders,
    lamps,
    streets,
    spawnPlayer: { x: 20, z: 120, heading: 0 },
    carSpawns: [
      { type: 'sport', x: 30, z: 100, heading: Math.PI / 2 },
      { type: 'sedan', x: -60, z: 200, heading: 0 },
      { type: 'taxi', x: 120, z: -100, heading: Math.PI },
      { type: 'suv', x: -200, z: -300, heading: Math.PI / 2 },
      { type: 'truck', x: 800, z: 500, heading: 0 },
      { type: 'bike', x: 60, z: -220, heading: -Math.PI / 2 },
    ],
  };
}
