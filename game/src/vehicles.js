// Vice Bay — cars: box-built models, arcade drive physics with handbrake
// drift, damage smoke, headlights and brake lights. One class serves the
// player, traffic and police (police steer it by AI instead of input).

import { CFG, CAR_TYPES } from './config.js';

export class Car {
  constructor(scene, type, x, z, heading) {
    this.scene = scene;
    this.type = type;
    this.def = CAR_TYPES[type] || CAR_TYPES.sedan;
    this.pos = new THREE.Vector3(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.driver = null; // 'player' | 'ai' | null
    this.health = 100;
    this.smoking = false;
    this.group = new THREE.Group();
    this.group.name = `car-${type}`;
    this._buildMesh();
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.heading;
    scene.add(this.group);
  }

  _buildMesh() {
    const color = this.def.color;
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x1c2833 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
    body.position.y = 0.62;
    body.castShadow = true;
    this.group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
    cabin.position.set(0, 1.18, -0.25);
    cabin.castShadow = true;
    this.group.add(cabin);
    // Wheels.
    this.wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
    for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.36, wz);
      this.group.add(w);
      this.wheels.push(w);
    }
    // Headlights (front) and brake lights (rear).
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
    for (const sx of [-0.65, 0.65]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), headMat);
      hl.position.set(sx, 0.62, 2.22);
      this.group.add(hl);
    }
    this.brakeMat = new THREE.MeshBasicMaterial({ color: 0x550000 });
    for (const sx of [-0.65, 0.65]) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), this.brakeMat);
      bl.position.set(sx, 0.62, -2.22);
      this.group.add(bl);
    }
    // Police light bar.
    if (this.type === 'police') {
      this.lightBar = new THREE.Group();
      const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      red.position.x = -0.45;
      const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
      blue.position.x = 0.45;
      this.lightBar.add(red);
      this.lightBar.add(blue);
      this.lightBar.position.set(0, 1.52, -0.25);
      this.group.add(this.lightBar);
      this._barRed = red;
      this._barBlue = blue;
    }
    // Damage smoke emitter (a grey sprite that fades in as health drops).
    const smokeCanvas = document.createElement('canvas');
    smokeCanvas.width = 64;
    smokeCanvas.height = 64;
    const g = smokeCanvas.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(120,120,120,0.85)');
    grad.addColorStop(1, 'rgba(120,120,120,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    this.smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(smokeCanvas), transparent: true, opacity: 0, depthWrite: false }));
    this.smoke.position.set(0, 1.4, 1.2);
    this.smoke.scale.set(2.4, 2.4, 1);
    this.group.add(this.smoke);
  }

  /** Drive step. input = {throttle -1..1, steer -1..1, brake, handbrake} or null (coast). */
  update(dt, input, colliders, upgrades = {}) {
    const top = this.def.top * (upgrades.engine ? 1.25 : 1);
    const grip = CFG.carGrip * (upgrades.tires ? 1.3 : 1);
    let throttle = 0;
    let steerTarget = 0;
    let braking = false;
    let handbrake = false;
    if (input) {
      throttle = input.throttle || 0;
      steerTarget = input.steer || 0;
      braking = !!input.brake;
      handbrake = !!input.handbrake;
    }
    // Steering smooths toward target; faster cars steer less.
    const speedFactor = 1 / (1 + Math.abs(this.speed) * 0.045);
    this.steer += (steerTarget * speedFactor - this.steer) * Math.min(1, dt * 8);
    if (throttle > 0) this.speed += this.def.accel * throttle * dt;
    else if (throttle < 0) {
      if (this.speed > 0.5) this.speed -= CFG.carBrake * dt; // brake first
      else this.speed += this.def.accel * 0.5 * throttle * dt; // then reverse
    }
    if (braking) this.speed -= Math.sign(this.speed) * CFG.carBrake * dt;
    // Drag + rolling resistance.
    this.speed -= this.speed * 0.35 * dt;
    if (Math.abs(this.speed) < 0.05 && throttle === 0) this.speed = 0;
    this.speed = Math.max(-CFG.carReverseMax, Math.min(top, this.speed));
    // Heading change, scaled by speed and grip (handbrake kills grip -> drift).
    const turnRate = this.def.turn * (handbrake ? 1.7 : 1) * Math.min(1, Math.abs(this.speed) / 8);
    this.heading += this.steer * turnRate * dt * Math.sign(this.speed || 1);
    const effGrip = handbrake ? CFG.handbrakeGrip : grip;
    // Velocity direction lags heading when grip is low (drift).
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    const vx = this._vx ?? 0;
    const vz = this._vz ?? 0;
    const targetVx = fx * this.speed;
    const targetVz = fz * this.speed;
    const blend = Math.min(1, effGrip * dt);
    this._vx = vx + (targetVx - vx) * blend;
    this._vz = vz + (targetVz - vz) * blend;
    const nx = this.pos.x + this._vx * dt;
    const nz = this.pos.z + this._vz * dt;
    // Building collision: stop on the blocked axis.
    let hit = false;
    for (const c of colliders) {
      if (Math.abs(nx - c.x) < c.hx + 1.1 && Math.abs(nz - c.z) < c.hz + 1.1) { hit = true; break; }
    }
    if (!hit) {
      this.pos.x = nx;
      this.pos.z = nz;
    } else {
      this.speed *= 0.4;
      this._vx *= 0.3;
      this._vz *= 0.3;
      this.damage(2);
    }
    this.pos.x = Math.max(-985, Math.min(985, this.pos.x));
    this.pos.z = Math.max(-985, Math.min(985, this.pos.z));
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.heading;
    // Body roll into turns, brake light glow.
    this.group.rotation.z = -this.steer * 0.06 * Math.min(1, Math.abs(this.speed) / 20);
    this.brakeMat.color.setHex(braking || throttle < 0 ? 0xff2222 : 0x550000);
    // Police light bar flash.
    if (this.lightBar) {
      const phase = Math.floor(performance.now() / 180) % 2 === 0;
      this._barRed.material.color.setHex(phase ? 0xff2222 : 0x550000);
      this._barBlue.material.color.setHex(phase ? 0x111133 : 0x2266ff);
    }
    // Wheels spin with speed.
    for (const w of this.wheels) w.rotation.x += this.speed * dt * 0.8;
    // Damage smoke.
    this.smoking = this.health < 55;
    this.smoke.material.opacity = this.smoking ? (55 - this.health) / 55 * 0.8 : 0;
    if (this.smoking) this.smoke.scale.setScalar(2 + Math.sin(performance.now() / 300) * 0.4);
  }

  damage(n) {
    this.health = Math.max(0, this.health - n);
    return this.health <= 0;
  }

  repair() {
    this.health = 100;
  }
}

export class CarManager {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.cars = [];
  }
  spawn(type, x, z, heading) {
    const car = new Car(this.scene, type, x, z, heading);
    this.cars.push(car);
    return car;
  }
  remove(car) {
    this.scene.remove(car.group);
    this.cars = this.cars.filter((c) => c !== car);
  }
  nearestTo(x, z, maxDist, exclude = null) {
    let best = null;
    let bestD = maxDist;
    for (const car of this.cars) {
      if (car === exclude) continue;
      const d = Math.hypot(car.pos.x - x, car.pos.z - z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }
}
