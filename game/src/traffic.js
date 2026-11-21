// Vice Bay: Blood & Destiny — traffic cars on the road grid and pedestrians on the
// sidewalks. Traffic follows the roads in loops; pedestrians wander their own block.
// Nothing here needs the player, so the streets feel alive from the title screen on.

import { WORLD } from './config.js';

const THREE = globalThis.THREE;

function makeCarMesh(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.6, 4.1),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 0.55;
  body.castShadow = true;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.5, 2.0),
    new THREE.MeshLambertMaterial({ color: 0x18222e }),
  );
  cabin.position.set(0, 1.05, -0.2);
  group.add(body, cabin);
  return group;
}

function makePedMesh(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.9, 0.4),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 1.0;
  body.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xd9a066 }),
  );
  head.position.y = 1.65;
  group.add(body, head);
  return group;
}

export function createTraffic(scene, rand) {
  const group = new THREE.Group();
  group.name = 'traffic';
  scene.add(group);
  const cars = [];
  const peds = [];
  const palette = [0xb0b8c0, 0x8a2f24, 0x2e5d8a, 0xd9a52e, 0x4a6b3a, 0x6b4a7a, 0xc0c0c0];

  // Traffic cars: each picks a road line and a direction and loops along it.
  for (let i = 0; i < 26; i++) {
    const vertical = rand.chance(0.5);
    const line = (Math.floor(rand.range(-4, 5)) * WORLD.roadGap) + (rand.chance(0.5) ? 4 : -4);
    const dir = rand.chance(0.5) ? 1 : -1;
    const mesh = makeCarMesh(palette[Math.floor(rand.next() * palette.length)]);
    const speed = 8 + rand.next() * 7;
    const along = rand.range(-WORLD.half, WORLD.half);
    mesh.position.set(vertical ? line : along, 0, vertical ? along : line);
    mesh.rotation.y = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    group.add(mesh);
    cars.push({ mesh, vertical, line, dir, speed, along });
  }

  // Pedestrians: each wanders inside one block, turning at random.
  for (let i = 0; i < 40; i++) {
    const bx = Math.floor(rand.range(-4, 5)) * WORLD.roadGap;
    const bz = Math.floor(rand.range(-4, 5)) * WORLD.roadGap;
    const mesh = makePedMesh(palette[Math.floor(rand.next() * palette.length)]);
    mesh.position.set(bx + rand.range(-50, 50), 0, bz + rand.range(-50, 50));
    group.add(mesh);
    peds.push({
      mesh, bx, bz,
      heading: rand.angle(),
      speed: 1 + rand.next() * 1.4,
      turnIn: 1 + rand.next() * 3,
    });
  }

  function update(dt) {
    for (const c of cars) {
      c.along += c.dir * c.speed * dt;
      if (c.along > WORLD.half) c.along = -WORLD.half;
      if (c.along < -WORLD.half) c.along = WORLD.half;
      if (c.vertical) c.mesh.position.set(c.line, 0, c.along);
      else c.mesh.position.set(c.along, 0, c.line);
    }
    for (const p of peds) {
      p.turnIn -= dt;
      if (p.turnIn <= 0) {
        p.heading = rand.angle();
        p.turnIn = 1 + rand.next() * 3;
      }
      p.mesh.position.x += Math.sin(p.heading) * p.speed * dt;
      p.mesh.position.z += Math.cos(p.heading) * p.speed * dt;
      // Stay inside the home block.
      const dx = p.mesh.position.x - p.bx;
      const dz = p.mesh.position.z - p.bz;
      if (Math.abs(dx) > 70 || Math.abs(dz) > 70) p.heading += Math.PI;
      p.mesh.rotation.y = p.heading;
    }
  }

  return { update };
}
