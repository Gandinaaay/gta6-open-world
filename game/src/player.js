// On-foot player: walk/run/jump, enter and exit cars.
import { CFG } from './config.js';
import { clamp } from './random.js';

function collideAABB(pos, r, colliders) {
  for (const c of colliders) {
    const dx = pos.x - clamp(pos.x, c.x - c.hw, c.x + c.hw);
    const dz = pos.z - clamp(pos.z, c.z - c.hd, c.z + c.hd);
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.001;
      pos.x += (dx / d) * (r - d);
      pos.z += (dz / d) * (r - d);
    }
  }
}

export class Player {
  constructor(scene) {
    this.pos = new THREE.Vector3(20, 0, 120);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.onGround = true;
    this.vy = 0;
    this.health = CFG.startHealth;
    this.inCar = null;
    this.squash = 0; // landing squash timer
    this.strafeLean = 0;
    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2f6fb2 });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd8a070 });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x222831 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), bodyMat);
    body.position.y = 1.05;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
    head.position.y = 1.75;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.7, 0.32), pantsMat);
    legL.position.set(-0.18, 0.35, 0);
    const legR = legL.clone();
    legR.position.x = 0.18;
    this.legL = legL; this.legR = legR;
    this.bodyMesh = body;
    this.group.add(body, head, legL, legR);
    this.group.position.copy(this.pos);
    scene.add(this.group);
    this._walkPhase = 0;
  }

  get speed() { return Math.hypot(this.vel.x, this.vel.z); }

  update(dt, input, camYaw, colliders, audio) {
    if (this.inCar) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    const ax = input.axes();
    const run = input.run;
    const speed = run ? CFG.runSpeed : CFG.walkSpeed;
    const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    // Camera-relative movement: W is away from camera.
    const mx = (-sin * ax.z + cos * ax.x);
    const mz = (-cos * ax.z - sin * ax.x);
    const moving = Math.abs(mx) + Math.abs(mz) > 0;
    if (moving) {
      const len = Math.hypot(mx, mz) || 1;
      this.vel.x = (mx / len) * speed;
      this.vel.z = (mz / len) * speed;
      this.yaw = Math.atan2(mx, mz);
      this._walkPhase += dt * speed * 1.6;
      this.legL.rotation.x = Math.sin(this._walkPhase) * 0.7;
      this.legR.rotation.x = -Math.sin(this._walkPhase) * 0.7;
      this.strafeLean = clamp(ax.x * 0.12, -0.15, 0.15);
    } else {
      this.vel.x *= Math.pow(0.0001, dt);
      this.vel.z *= Math.pow(0.0001, dt);
      this.legL.rotation.x *= 0.8;
      this.legR.rotation.x *= 0.8;
      this.strafeLean *= 0.8;
    }
    // Jump.
    if (input.hit('Space') && this.onGround) {
      this.vy = CFG.jumpSpeed;
      this.onGround = false;
      if (audio) audio.jump();
      input.consume('Space');
    }
    this.vy -= CFG.gravity * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= 0) {
      if (!this.onGround && this.vy < -6) this.squash = 0.18; // landing squash
      this.pos.y = 0;
      this.vy = 0;
      this.onGround = true;
    }
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.x = clamp(this.pos.x, -CFG.half + 5, CFG.half - 5);
    this.pos.z = clamp(this.pos.z, -CFG.half + 5, CFG.half - 5);
    collideAABB(this.pos, 0.6, colliders);
    // Landing squash + strafe lean on the mesh.
    this.squash = Math.max(0, this.squash - dt);
    const sq = 1 - this.squash * 0.9;
    this.group.scale.set(1 + (1 - sq) * 0.6, sq, 1 + (1 - sq) * 0.6);
    this.group.rotation.z = this.strafeLean;
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
  }

  enterCar(car) {
    this.inCar = car;
    this.group.visible = false;
  }

  exitCar() {
    if (!this.inCar) return;
    const c = this.inCar;
    this.inCar = null;
    const side = new THREE.Vector3(Math.cos(c.heading), 0, -Math.sin(c.heading));
    this.pos.set(c.pos.x + side.x * 2.5, 0, c.pos.z + side.z * 2.5);
    this.group.visible = true;
  }
}
