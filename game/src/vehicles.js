// Vice Bay: Blood & Destiny — vehicles: arcade driving, entering and exiting,
// and the player's garage of owned cars. A car is a box body, a cabin box and four
// cylinder wheels; physics is deliberately simple so it stays fun and stable.

import { VEHICLES, WORLD } from './config.js';

const THREE = globalThis.THREE;

function collideBox(pos, halfW, halfD, heading, colliders) {
  // Approximate the car as a circle of its half-diagonal for building collisions.
  const r = Math.hypot(halfW, halfD) * 0.85;
  for (const b of colliders) {
    const dx = pos.x - Math.max(b.x - b.hw, Math.min(pos.x, b.x + b.hw));
    const dz = pos.z - Math.max(b.z - b.hd, Math.min(pos.z, b.z + b.hd));
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.001;
      const push = (r - d) / d;
      pos.x += dx * push;
      pos.z += dz * push;
      return true;
    }
  }
  return false;
}

export function buildCarMesh(type) {
  const group = new THREE.Group();
  group.name = `car-${type.name}`;
  const bodyMat = new THREE.MeshLambertMaterial({ color: type.color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x18222e });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
  cabin.position.set(0, 1.1, -0.2);
  cabin.castShadow = true;
  group.add(body, cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    group.add(w);
    wheels.push(w);
  }
  // Headlights so night driving reads.
  const lampGeo = new THREE.SphereGeometry(0.14, 8, 6);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.6, 0.6]) {
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(x, 0.62, 2.21);
    group.add(lamp);
  }
  return { group, wheels };
}

export function createVehicle(scene, type, x, z, heading) {
  const { group, wheels } = buildCarMesh(type);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);
  const pos = group.position;
  let speed = 0;
  let steer = 0;

  function update(dt, input, colliders) {
    const forward = input ? input.forward : false;
    const back = input ? input.back : false;
    const left = input ? input.left : false;
    const right = input ? input.right : false;
    if (forward) speed += type.accel * dt;
    else if (back) speed -= type.accel * 0.7 * dt;
    else speed *= Math.max(0, 1 - 1.6 * dt); // drag
    speed = Math.max(-type.top * 0.4, Math.min(type.top, speed));
    const steerTarget = (left ? 1 : 0) - (right ? 1 : 0);
    steer += (steerTarget - steer) * Math.min(1, dt * 8);
    const dir = speed >= 0 ? 1 : -1;
    heading += steer * type.turn * dir * dt * Math.min(1, Math.abs(speed) / 8 + 0.15);
    const nx = pos.x + Math.sin(heading) * speed * dt;
    const nz = pos.z + Math.cos(heading) * speed * dt;
    pos.x = Math.max(-WORLD.half + 4, Math.min(WORLD.half - 4, nx));
    pos.z = Math.max(-WORLD.half + 4, Math.min(WORLD.half - 4, nz));
    if (collideBox(pos, 1.1, 2.3, heading, colliders)) speed *= 0.4;
    group.rotation.y = heading;
    const spin = (speed * dt) / 0.38;
    for (const w of wheels) w.rotation.x += spin;
  }

  return {
    group, type, get position() { return pos; },
    get heading() { return heading; },
    get speed() { return speed; },
    update,
    stop() { speed = 0; },
  };
}

export function createGarage(scene, colliders, rand) {
  const owned = [VEHICLES[0]];
  const spawned = [];
  function spawn(type, x, z, heading) {
    const v = createVehicle(scene, type, x, z, heading);
    spawned.push(v);
    return v;
  }
  function spawnNear(x, z, count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const type = VEHICLES[rand.int(0, VEHICLES.length - 1)];
      const a = rand.angle();
      const r = 30 + rand.next() * 120;
      out.push(spawn(type, x + Math.cos(a) * r, z + Math.sin(a) * r, rand.angle()));
    }
    return out;
  }
  function nearest(pos, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const v of spawned) {
      const d = Math.hypot(v.position.x - pos.x, v.position.z - pos.z);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }
  return { owned, spawned, spawn, spawnNear, nearest };
}
