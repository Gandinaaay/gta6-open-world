// Vice Bay — on-foot player: walk/run/jump, camera-relative movement, and
// entering/exiting cars. The player is a simple articulated figure built
// from boxes so it reads at any distance.

import { CFG } from './config.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.pos = new THREE.Vector3(0, 0, 40);
    this.vel = new THREE.Vector3();
    this.heading = Math.PI;
    this.onGround = true;
    this.health = 100;
    this.maxHealth = 100;
    this.vehicle = null;
    this.group = new THREE.Group();
    this.group.name = 'player';
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x2e86c1 });
    const pants = new THREE.MeshLambertMaterial({ color: 0x222831 });
    const hair = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    // Torso, head, limbs.
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), shirt);
    torso.position.y = 1.05;
    torso.castShadow = true;
    this.group.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.4), skin);
    head.position.y = 1.68;
    head.castShadow = true;
    this.group.add(head);
    const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.42), hair);
    hairMesh.position.y = 1.92;
    this.group.add(hairMesh);
    this.legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), pants);
    this.legL.position.set(-0.17, 0.36, 0);
    this.group.add(this.legL);
    this.legR = this.legL.clone();
    this.legR.position.x = 0.17;
    this.group.add(this.legR);
    this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.66, 0.22), shirt);
    this.armL.position.set(-0.42, 1.1, 0);
    this.group.add(this.armL);
    this.armR = this.armL.clone();
    this.armR.position.x = 0.42;
    this.group.add(this.armR);
    this.walkPhase = 0;
    this.group.position.copy(this.pos);
    scene.add(this.group);
  }

  get speed() {
    return this.vel.length();
  }

  update(dt, input, camYaw, colliders, cars) {
    if (this.vehicle) return; // driving is the car's job
    const run = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = run ? CFG.playerRun : CFG.playerWalk;
    const fwd = input.axis('KeyS', 'KeyW');
    const strafe = input.axis('KeyA', 'KeyD');
    const sin = Math.sin(camYaw);
    const cos = Math.cos(camYaw);
    // Camera-relative movement: camera sits at +sin/cos behind the target,
    // so forward (away from camera) is (-sin, -cos) and right is (cos, -sin).
    const mx = -sin * fwd + cos * strafe;
    const mz = -cos * fwd - sin * strafe;
    const len = Math.hypot(mx, mz);
    if (len > 0.01) {
      const nx = mx / len;
      const nz = mz / len;
      this.vel.x = nx * speed;
      this.vel.z = nz * speed;
      this.heading = Math.atan2(nx, nz);
      this.walkPhase += dt * speed * 1.6;
    } else {
      this.vel.x *= Math.max(0, 1 - dt * 10);
      this.vel.z *= Math.max(0, 1 - dt * 10);
    }
    // Jump + gravity.
    if (input.pressed('Space') && this.onGround) {
      this.vel.y = CFG.playerJump;
      this.onGround = false;
    }
    this.vel.y -= CFG.gravity * dt;
    const nx2 = this.pos.x + this.vel.x * dt;
    const nz2 = this.pos.z + this.vel.z * dt;
    // Collide with building AABBs (slide along the blocked axis).
    const blocked = (x, z) => {
      for (const c of colliders) {
        if (Math.abs(x - c.x) < c.hx + 0.4 && Math.abs(z - c.z) < c.hz + 0.4) return true;
      }
      return false;
    };
    if (!blocked(nx2, this.pos.z)) this.pos.x = nx2;
    if (!blocked(this.pos.x, nz2)) this.pos.z = nz2;
    this.pos.x = Math.max(-980, Math.min(980, this.pos.x));
    this.pos.z = Math.max(-980, Math.min(980, this.pos.z));
    this.pos.y += this.vel.y * dt;
    if (this.pos.y <= 0) { this.pos.y = 0; this.vel.y = 0; this.onGround = true; }
    // Walk-cycle limb swing.
    const swing = len > 0.01 ? Math.sin(this.walkPhase) * 0.6 : 0;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.armL.rotation.x = -swing * 0.7;
    this.armR.rotation.x = swing * 0.7;
    // Lean into strafes, squash on landing.
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.heading;
    this.group.rotation.z = strafe * -0.06;
    const landSquash = this.onGround ? 1 : 1.04;
    this.group.scale.set(1, landSquash, 1);
  }

  nearestCar(cars, maxDist = 4) {
    let best = null;
    let bestD = maxDist;
    for (const car of cars) {
      const d = Math.hypot(car.pos.x - this.pos.x, car.pos.z - this.pos.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  enterVehicle(car) {
    this.vehicle = car;
    car.driver = this;
    this.group.visible = false;
  }

  exitVehicle() {
    if (!this.vehicle) return;
    const car = this.vehicle;
    car.driver = null;
    this.vehicle = null;
    // Step out to the side of the car.
    const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    this.pos.copy(car.pos).addScaledVector(side, 2.4);
    this.pos.y = 0;
    this.group.visible = true;
    this.group.position.copy(this.pos);
  }

  takeDamage(n) {
    this.health = Math.max(0, this.health - n);
    return this.health <= 0;
  }

  heal(n) {
    this.health = Math.min(this.maxHealth, this.health + n);
  }
}
