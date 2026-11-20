// Vice Bay — ambient life: AI traffic cars that follow the road grid and
// stop at red lights, plus pedestrians who walk the sidewalks and panic
// (run away from the player) in the rain or when a gun fires.

import { CFG } from './config.js';
import { RNG } from './random.js';

const LIGHT_CYCLE = 14; // seconds of green/red per phase

export class Traffic {
  constructor(scene, city, carManager, seed = 4242) {
    this.scene = scene;
    this.city = city;
    this.carManager = carManager;
    this.rng = new RNG(seed);
    this.cars = [];
    this.peds = [];
    this.lightTimer = 0;
    this.lightGreenNS = true; // north-south green, east-west red
    this._spawnCars();
    this._spawnPeds();
  }

  _spawnCars() {
    const types = ['sedan', 'sedan', 'suv', 'taxi', 'truck', 'sport'];
    for (let i = 0; i < CFG.maxTrafficCars; i++) {
      const alongX = this.rng.chance(0.5);
      const road = this.rng.pick(this.city.roads);
      const lane = this.rng.chance(0.5) ? 3.5 : -3.5;
      const t = this.rng.float(-780, 780);
      const type = this.rng.pick(types);
      const car = this.carManager.spawn(type, alongX ? t : road + lane, alongX ? road + lane : t, alongX ? 0 : Math.PI / 2);
      car.driver = 'ai';
      car.ai = {
        alongX,
        road,
        lane,
        speed: this.rng.float(9, 15),
        dir: this.rng.chance(0.5) ? 1 : -1,
      };
      this.cars.push(car);
    }
  }

  _spawnPeds() {
    const shirtColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xecf0f1, 0x1abc9c];
    for (let i = 0; i < CFG.maxPedestrians; i++) {
      const g = new THREE.Group();
      const shirt = new THREE.MeshLambertMaterial({ color: this.rng.pick(shirtColors) });
      const skin = new THREE.MeshLambertMaterial({ color: 0xc98d5e });
      const pants = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), shirt);
      torso.position.y = 1.0;
      g.add(torso);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.36), skin);
      head.position.y = 1.58;
      g.add(head);
      for (const sx of [-0.15, 0.15]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.22), pants);
        leg.position.set(sx, 0.33, 0);
        g.add(leg);
      }
      const x = this.rng.float(-780, 780);
      const z = this.rng.float(-780, 780);
      g.position.set(x, 0, z);
      this.scene.add(g);
      this.peds.push({
        group: g,
        pos: g.position,
        heading: this.rng.float(0, Math.PI * 2),
        speed: this.rng.float(1.2, 2.4),
        panic: 0,
        phase: this.rng.float(0, Math.PI * 2),
        targetRoad: this.rng.pick(this.city.roads),
      });
    }
  }

  panicAt(x, z, radius = 40) {
    for (const p of this.peds) {
      const d = Math.hypot(p.pos.x - x, p.pos.z - z);
      if (d < radius) {
        p.panic = 3 + Math.random() * 3;
        p.heading = Math.atan2(p.pos.x - x, p.pos.z - z);
      }
    }
  }

  update(dt, playerPos, raining) {
    this.lightTimer += dt;
    if (this.lightTimer > LIGHT_CYCLE) {
      this.lightTimer = 0;
      this.lightGreenNS = !this.lightGreenNS;
    }
    // Traffic cars: cruise along their road, stop at red, swerve around
    // anything slow ahead of them.
    for (const car of this.cars) {
      const ai = car.ai;
      const atIntersection = Math.abs((ai.alongX ? car.pos.z : car.pos.x) % CFG.blockSize) < 12;
      const green = ai.alongX ? !this.lightGreenNS : this.lightGreenNS;
      let targetSpeed = ai.speed;
      if (atIntersection && !green) targetSpeed = 0;
      // Car ahead in the same lane?
      for (const other of this.carManager.cars) {
        if (other === car) continue;
        const dx = other.pos.x - car.pos.x;
        const dz = other.pos.z - car.pos.z;
        const ahead = ai.alongX ? Math.abs(dz) < 4 && dx * ai.dir > 0 && dx * ai.dir < 12
          : Math.abs(dx) < 4 && dz * ai.dir > 0 && dz * ai.dir < 12;
        if (ahead) { targetSpeed = 0; break; }
      }
      const desired = targetSpeed * ai.dir;
      car.speed += (desired - car.speed) * Math.min(1, dt * 1.5);
      car.heading = ai.alongX ? (ai.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (ai.dir > 0 ? 0 : Math.PI);
      // Move along the road (bypass the arcade physics: traffic is scripted).
      if (ai.alongX) {
        car.pos.x += car.speed * dt;
        car.pos.z = ai.road + ai.lane;
        if (car.pos.x > 820) car.pos.x = -820;
        if (car.pos.x < -820) car.pos.x = 820;
      } else {
        car.pos.z += car.speed * dt;
        car.pos.x = ai.road + ai.lane;
        if (car.pos.z > 820) car.pos.z = -820;
        if (car.pos.z < -820) car.pos.z = 820;
      }
      car.group.position.copy(car.pos);
      car.group.rotation.y = car.heading;
      for (const w of car.wheels) w.rotation.x += car.speed * dt * 0.8;
    }
    // Pedestrians: stroll the sidewalks, run when panicked or in rain.
    for (const p of this.peds) {
      if (raining && p.panic <= 0) p.panic = 0.5;
      const speed = p.panic > 0 ? 6.5 : p.speed;
      if (p.panic > 0) p.panic -= dt;
      p.pos.x += Math.sin(p.heading) * speed * dt;
      p.pos.z += Math.cos(p.heading) * speed * dt;
      // Wander: gently change direction, stay in the city.
      if (Math.random() < dt * 0.15) p.heading += (Math.random() - 0.5) * 1.2;
      if (Math.abs(p.pos.x) > 780 || Math.abs(p.pos.z) > 780) p.heading += Math.PI;
      p.phase += dt * speed * 3;
      p.group.rotation.y = p.heading;
      p.group.position.y = Math.abs(Math.sin(p.phase)) * 0.06;
      // Scare pedestrians when the player drives at them.
      if (playerPos) {
        const d = Math.hypot(p.pos.x - playerPos.x, p.pos.z - playerPos.z);
        if (d < 6 && p.panic <= 0) {
          p.panic = 2;
          p.heading = Math.atan2(p.pos.x - playerPos.x, p.pos.z - playerPos.z);
        }
      }
    }
  }
}
