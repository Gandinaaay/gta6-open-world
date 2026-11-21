// Rico on foot: WASD movement, run, jump, enter/exit cars.
import { CONFIG } from './config.js';

const THREE = window.THREE;

export function createPlayer(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a5a8a });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xd8a077 });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x22262c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), bodyMat);
  body.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skinMat);
  head.position.y = 1.9;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.4), pantsMat);
  legL.position.set(-0.25, 0.4, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.4), pantsMat);
  legR.position.set(0.25, 0.4, 0);
  group.add(body, head, legL, legR);
  scene.add(group);

  const pos = new THREE.Vector3(0, 0, 0);
  let velY = 0;
  let grounded = true;
  let heading = 0;
  let inCar = null;
  let bob = 0;

  function collide(colliders) {
    for (const c of colliders) {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d < c.r && d > 0.001) {
        pos.x = c.x + dx / d * c.r;
        pos.z = c.z + dz / d * c.r;
      }
    }
    const h = CONFIG.worldSize / 2;
    pos.x = Math.max(-h, Math.min(h, pos.x));
    pos.z = Math.max(-h, Math.min(h, pos.z));
  }

  return {
    pos,
    group,
    get heading() { return heading; },
    get inCar() { return inCar; },
    get moving() { return this._moving || false; },
    reset(x, z) {
      pos.set(x, 0, z);
      velY = 0; grounded = true; heading = 0; inCar = null;
      group.position.copy(pos);
      group.visible = true;
    },
    enterCar(car) {
      inCar = car;
      group.visible = false;
    },
    exitCar() {
      if (!inCar) return;
      const car = inCar;
      inCar = null;
      const sideX = Math.cos(car.heading);
      const sideZ = -Math.sin(car.heading);
      pos.set(car.pos.x + sideX * 3, 0, car.pos.z + sideZ * 3);
      group.position.copy(pos);
      group.visible = true;
    },
    update(dt, input, colliders, camYaw) {
      if (inCar) return;
      let fx = 0;
      let fz = 0;
      if (input.is('w') || input.is('arrowup')) fz -= 1;
      if (input.is('s') || input.is('arrowdown')) fz += 1;
      if (input.is('a') || input.is('arrowleft')) fx -= 1;
      if (input.is('d') || input.is('arrowright')) fx += 1;
      const len = Math.hypot(fx, fz);
      this._moving = len > 0;
      if (len > 0) {
        const run = input.is('shift');
        const speed = (run ? CONFIG.runSpeed : CONFIG.walkSpeed) * dt;
        const sin = Math.sin(camYaw);
        const cos = Math.cos(camYaw);
        const mx = (fx * cos - fz * sin) * speed / len;
        const mz = (fx * sin + fz * cos) * speed / len;
        pos.x += mx;
        pos.z += mz;
        heading = Math.atan2(mx, mz);
        bob += dt * (run ? 14 : 9);
        body.position.y = 1.05 + Math.abs(Math.sin(bob)) * 0.08;
        legL.rotation.x = Math.sin(bob) * 0.6;
        legR.rotation.x = -Math.sin(bob) * 0.6;
      } else {
        legL.rotation.x = 0;
        legR.rotation.x = 0;
        body.position.y = 1.05;
      }
      if ((input.is(' ') || input.is('spacebar')) && grounded) {
        velY = CONFIG.jumpSpeed;
        grounded = false;
      }
      if (!grounded) {
        velY -= CONFIG.gravity * dt;
        pos.y += velY * dt;
        if (pos.y <= 0) { pos.y = 0; velY = 0; grounded = true; }
      }
      collide(colliders);
      group.position.copy(pos);
      group.rotation.y = heading;
    },
  };
}
