// Ambient life: traffic cars looping the road grid and pedestrians on
// the sidewalks. Traffic follows the roads; pedestrians wander blocks.

import { VEHICLE_DEFS, WORLD } from './config.js';
import { makeRng, WORLD_SEED } from './random.js';
import { createCarMesh } from './vehicles.js';

const PED_COLORS = [0xe53935, 0x1e88e5, 0x43a047, 0xfdd835, 0x8e24aa, 0xfb8c00, 0x00acc1, 0xec407a];

export function spawnTraffic(G, count) {
  const rng = makeRng(WORLD_SEED + 77);
  for (let i = 0; i < count; i++) {
    const def = rng.pick(VEHICLE_DEFS);
    const color = rng.pick(['#9e9e9e', '#37474f', '#6d4c41', '#33691e', '#01579b', '#4e342e', '#b0bec5']);
    const road = rng.pick([-900, -700, -500, -300, -100, 100, 300, 500, 700, 900]);
    const along = rng.range(-900, 900);
    const horizontal = rng.chance(0.5);
    const x = horizontal ? along : road + (rng.chance(0.5) ? 3.5 : -3.5);
    const z = horizontal ? road + (rng.chance(0.5) ? 3.5 : -3.5) : along;
    const { group, wheels } = createCarMesh(def, color, false);
    group.position.set(x, 0, z);
    const yaw = horizontal ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rng.chance(0.5) ? 0 : Math.PI);
    group.rotation.y = yaw;
    G.scene.add(group);
    G.traffic.push({
      group, wheels, def, x, z, yaw, speed: rng.range(8, 13),
      horizontal, road, dir: rng.chance(0.5) ? 1 : -1, wobble: rng.range(0, Math.PI * 2),
    });
  }
}

export function spawnPedestrians(G, count) {
  const rng = makeRng(WORLD_SEED + 131);
  const shirtMat = PED_COLORS.map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xc68863 });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x263238 });
  for (let i = 0; i < count; i++) {
    const grp = new THREE.Group();
    const shirt = rng.pick(shirtMat);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.3), shirt);
    torso.position.y = 1.0;
    grp.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.28), skinMat);
    head.position.y = 1.5;
    grp.add(head);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.22), pantsMat);
    legL.position.set(-0.14, 0.31, 0);
    grp.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.14;
    grp.add(legR);
    const x = rng.range(-900, 900);
    const z = rng.range(-900, 900);
    grp.position.set(x, 0, z);
    G.scene.add(grp);
    G.pedestrians.push({
      group: grp, legL, legR, x, z,
      yaw: rng.range(0, Math.PI * 2), speed: rng.range(1.2, 2.4),
      phase: rng.range(0, Math.PI * 2), down: false, downT: 0,
    });
  }
}

export function updateTraffic(G, dt) {
  for (const t of G.traffic) {
    const step = t.speed * t.dir * dt;
    if (t.horizontal) {
      t.x += step;
      if (t.x > 950 || t.x < -950) {
        t.dir *= -1;
        t.yaw += Math.PI;
      }
    } else {
      t.z += step;
      if (t.z > 950 || t.z < -950) {
        t.dir *= -1;
        t.yaw += Math.PI;
      }
    }
    t.group.position.set(t.x, 0, t.z);
    t.group.rotation.y = t.yaw;
    for (const w of t.wheels) w.rotation.x += t.speed * dt * 2.2;
  }
  for (const ped of G.pedestrians) {
    if (ped.down) {
      ped.downT -= dt;
      ped.group.rotation.x = Math.min(Math.PI / 2, ped.group.rotation.x + dt * 4);
      if (ped.downT <= 0) {
        ped.down = false;
        ped.group.rotation.x = 0;
      }
      continue;
    }
    ped.phase += dt * 6;
    const nx = ped.x + Math.sin(ped.yaw) * ped.speed * dt;
    const nz = ped.z + Math.cos(ped.yaw) * ped.speed * dt;
    if (Math.abs(nx) > 940 || Math.abs(nz) > 940) ped.yaw += Math.PI / 2;
    else {
      ped.x = nx;
      ped.z = nz;
    }
    if (Math.random() < dt * 0.02) ped.yaw += (Math.random() - 0.5) * 1.6;
    ped.group.position.set(ped.x, 0, ped.z);
    ped.group.rotation.y = ped.yaw;
    const swing = Math.sin(ped.phase) * 0.45;
    ped.legL.rotation.x = swing;
    ped.legR.rotation.x = -swing;
  }
}

// A pedestrian hit by a car goes down and raises the heat.
export function hitPedestrian(G, ped) {
  if (ped.down) return;
  ped.down = true;
  ped.downT = 6;
  G.heat += 60;
  G.kills += 1;
  if (G.audio) G.audio.thud();
}
