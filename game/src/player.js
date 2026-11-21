// Rico on foot: WASD camera-relative movement, run, jump, enter/exit cars.
import { CONFIG } from './config.js';

export function createPlayer(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b6cb0, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.9 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.5), bodyMat);
  body.position.y = 1.15;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
  head.position.y = 1.95;
  head.castShadow = true;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.75, 0.35), pantsMat);
  legL.position.set(-0.22, 0.38, 0);
  const legR = legL.clone();
  legR.position.x = 0.22;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.28), bodyMat);
  armL.position.set(-0.58, 1.15, 0);
  const armR = armL.clone();
  armR.position.x = 0.58;
  group.add(body, head, legL, legR, armL, armR);
  scene.add(group);
  const pos = new THREE.Vector3(0, 0, 0);
  let vy = 0;
  let grounded = true;
  let heading = 0;
  let inCar = null;
  let bob = 0;
  return {
    pos,
    group,
    get inCar() { return inCar; },
    get heading() { return heading; },
    reset: (x, z) => { pos.set(x, 0, z); vy = 0; inCar = null; group.visible = true; },
    enterCar: (car) => { inCar = car; group.visible = false; },
    exitCar: (car) => {
      inCar = null;
      group.visible = true;
      const side = new THREE.Vector3(Math.cos(car.heading + Math.PI / 2), 0, -Math.sin(car.heading + Math.PI / 2));
      pos.copy(car.pos).addScaledVector(side, 3);
      pos.y = 0;
    },
    update: (dt, input, colliders, camYaw) => {
      if (inCar) return;
      const run = input.is('shift');
      const speed = run ? CONFIG.runSpeed : CONFIG.walkSpeed;
      let mx = 0;
      let mz = 0;
      if (input.is('w') || input.is('arrowup')) mz -= 1;
      if (input.is('s') || input.is('arrowdown')) mz += 1;
      if (input.is('a') || input.is('arrowleft')) mx -= 1;
      if (input.is('d') || input.is('arrowright')) mx += 1;
      const len = Math.hypot(mx, mz);
      if (len > 0) {
        mx /= len;
        mz /= len;
        const sin = Math.sin(camYaw);
        const cos = Math.cos(camYaw);
        // Camera sits behind the player at -(sin, cos): W must move the player
        // AWAY from the camera, i.e. along +(sin, cos).
        const wx = mx * cos - mz * sin;
        const wz = -mx * sin - mz * cos;
        pos.x += wx * speed * dt;
        pos.z += wz * speed * dt;
        heading = Math.atan2(wx, wz);
        bob += dt * (run ? 14 : 9);
      }
      vy -= CONFIG.gravity * dt;
      pos.y += vy * dt;
      if (pos.y <= 0) { pos.y = 0; vy = 0; grounded = true; }
      if ((input.is(' ') || input.is('spacebar')) && grounded) {
        vy = CONFIG.jumpSpeed;
        grounded = false;
      }
      // Collider push-out.
      for (const c of colliders) {
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const d = Math.hypot(dx, dz);
        if (d < c.r && d > 0.001) {
          pos.x = c.x + (dx / d) * c.r;
          pos.z = c.z + (dz / d) * c.r;
        }
      }
      const half = CONFIG.worldSize / 2;
      pos.x = Math.max(-half - 100, Math.min(half, pos.x));
      pos.z = Math.max(-half, Math.min(half, pos.z));
      group.position.copy(pos);
      group.rotation.y = heading;
      const lean = len > 0 ? Math.sin(bob) * 0.12 : 0;
      group.rotation.z = lean;
      legL.rotation.x = len > 0 ? Math.sin(bob) * 0.7 : 0;
      legR.rotation.x = len > 0 ? -Math.sin(bob) * 0.7 : 0;
      armL.rotation.x = len > 0 ? -Math.sin(bob) * 0.5 : 0;
      armR.rotation.x = len > 0 ? Math.sin(bob) * 0.5 : 0;
    },
  };
}
