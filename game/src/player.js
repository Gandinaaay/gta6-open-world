// Rico on foot: walk/run/jump, enter and exit cars.

import { CONFIG } from './config.js';

export function createPlayer(scene) {
  const body = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.0, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x1e40af }),
  );
  torso.position.y = 1.1;
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.45, 0.45),
    new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
  );
  head.position.y = 1.85;
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.7, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x111827 }),
  );
  legs.position.y = 0.35;
  body.add(torso, head, legs);
  scene.add(body);

  const pos = new THREE.Vector3(0, 0, 0);
  const vel = new THREE.Vector3();
  let heading = 0;
  let grounded = true;
  let currentCar = null;
  let lean = 0;

  function collide(colliders, p) {
    for (const c of colliders) {
      const dx = p.x - c.x, dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d < c.r + 0.6 && d > 0.001) {
        const push = (c.r + 0.6 - d) / d;
        p.x += dx * push;
        p.z += dz * push;
      }
    }
    const half = CONFIG.worldSize / 2 - 5;
    p.x = Math.max(-half, Math.min(half, p.x));
    p.z = Math.max(-half, Math.min(half, p.z));
  }

  return {
    mesh: body,
    pos,
    get heading() { return heading; },
    get inCar() { return currentCar !== null; },
    get car() { return currentCar; },
    reset(x, z) {
      pos.set(x, 0, z);
      vel.set(0, 0, 0);
      heading = 0;
      currentCar = null;
      body.visible = true;
    },
    enterCar(car) {
      currentCar = car;
      body.visible = false;
    },
    exitCar() {
      if (!currentCar) return null;
      const car = currentCar;
      currentCar = null;
      const side = new THREE.Vector3(Math.cos(car.heading + Math.PI / 2), 0, -Math.sin(car.heading + Math.PI / 2));
      pos.copy(car.pos).addScaledVector(side, 3);
      pos.y = 0;
      body.visible = true;
      return car;
    },
    update(dt, input, colliders, camYaw) {
      if (currentCar) return;
      const run = input.is('shift');
      const speed = run ? CONFIG.runSpeed : CONFIG.walkSpeed;
      let mx = 0, mz = 0;
      if (input.is('w') || input.is('arrowup')) mz -= 1;
      if (input.is('s') || input.is('arrowdown')) mz += 1;
      if (input.is('a') || input.is('arrowleft')) mx -= 1;
      if (input.is('d') || input.is('arrowright')) mx += 1;
      const len = Math.hypot(mx, mz) || 1;
      mx /= len; mz /= len;
      // Camera-relative movement.
      const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
      const wx = (mx * cos - mz * sin) * speed;
      const wz = (mx * sin + mz * cos) * speed;
      vel.x += (wx - vel.x) * Math.min(1, dt * 10);
      vel.z += (wz - vel.z) * Math.min(1, dt * 10);
      if ((input.is(' ') || input.is('spacebar')) && grounded) {
        vel.y = CONFIG.jumpSpeed;
        grounded = false;
      }
      vel.y -= CONFIG.gravity * dt;
      pos.x += vel.x * dt;
      pos.z += vel.z * dt;
      pos.y += vel.y * dt;
      if (pos.y <= 0) { pos.y = 0; vel.y = 0; grounded = true; }
      collide(colliders, pos);
      if (Math.hypot(vel.x, vel.z) > 0.5) {
        heading = Math.atan2(vel.x, vel.z);
      }
      // Strafe lean.
      const targetLean = Math.abs(mx) * 0.15 * Math.sign(mx);
      lean += (targetLean - lean) * Math.min(1, dt * 8);
      body.position.copy(pos);
      body.rotation.y = heading;
      body.rotation.z = lean;
      const squash = grounded ? 1 : 0.92;
      body.scale.y = squash;
      // Walk bob.
      const bob = Math.hypot(vel.x, vel.z) > 1 ? Math.sin(performance.now() * 0.02) * 0.05 : 0;
      torso.position.y = 1.1 + bob;
    },
  };
}
