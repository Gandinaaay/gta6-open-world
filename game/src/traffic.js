// AI traffic on the road grid + pedestrians on sidewalks.
import { CFG } from './config.js';
import { makeRng, range, pick, clamp } from './random.js';

const AXES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

export class Traffic {
  constructor(scene, vehicleMgr, colliders) {
    this.scene = scene;
    this.vm = vehicleMgr;
    this.colliders = colliders;
    this.rng = makeRng(4242);
    this.cars = [];
    this.peds = [];
    this.time = 0;
    const types = ['sedan', 'sedan', 'suv', 'taxi', 'truck', 'sport'];
    for (let i = 0; i < 26; i++) {
      const street = pick(this.rng, [-800, -600, -400, -200, 0, 200, 400, 600, 800]);
      const along = range(this.rng, -850, 850);
      const axis = this.rng() < 0.5 ? 'x' : 'z';
      const heading = pick(this.rng, AXES);
      const x = axis === 'x' ? along : street + (heading === Math.PI / 2 ? 3.5 : -3.5);
      const z = axis === 'x' ? street + (heading === 0 ? 3.5 : -3.5) : along;
      const car = this.vm.spawn(pick(this.rng, types), x, z, heading, { ai: true });
      car.speed = range(this.rng, 8, 14);
      car.targetSpeed = car.speed;
      this.cars.push(car);
    }
    // Pedestrians.
    const pedColors = [0xc0392b, 0x27ae60, 0x8e44ad, 0xe67e22, 0x16a085, 0xd35400];
    for (let i = 0; i < 24; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35), new THREE.MeshLambertMaterial({ color: pick(this.rng, pedColors) }));
      body.position.y = 1.0;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xd8a070 }));
      head.position.y = 1.65;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), new THREE.MeshLambertMaterial({ color: 0x222831 }));
      leg.position.y = 0.3;
      g.add(body, head, leg);
      const street = pick(this.rng, [-700, -400, -100, 100, 400, 700]);
      const along = range(this.rng, -850, 850);
      const axis = this.rng() < 0.5 ? 'x' : 'z';
      const px = axis === 'x' ? along : street + 11;
      const pz = axis === 'x' ? street + 11 : along;
      g.position.set(px, 0, pz);
      scene.add(g);
      this.peds.push({ mesh: g, pos: g.position, heading: pick(this.rng, AXES), speed: range(this.rng, 1.1, 1.8), panic: 0, phase: this.rng() * 6 });
    }
  }

  // True when the light is red for travel along `axis` ('x' or 'z').
  lightRed(axis) {
    const phase = Math.floor(this.time / CFG.lightCycle) % 2;
    return (axis === 'x') === (phase === 1);
  }

  update(dt, world, playerPos, gunshot) {
    this.time += dt;
    const raining = world.weather === 'rain';
    for (const car of this.cars) {
      const axis = Math.abs(Math.sin(car.heading)) < 0.5 ? 'z' : 'x';
      // Stop at red lights near an intersection.
      let want = car.targetSpeed;
      const along = axis === 'z' ? car.pos.z : car.pos.x;
      const near = Math.abs(((along % 100) + 100) % 100);
      const distToLine = Math.min(near, 100 - near);
      if (distToLine < 12 && this.lightRed(axis)) want = 0;
      // Don't rear-end the car ahead.
      for (const o of this.cars) {
        if (o === car) continue;
        const dx = o.pos.x - car.pos.x, dz = o.pos.z - car.pos.z;
        const ahead = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
        const side = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
        if (ahead > 0 && ahead < 12 && side < 3) { want = 0; break; }
      }
      // Swerve gently around a stopped player car.
      car.speed += clamp(want - car.speed, -14 * dt, 8 * dt);
      // At an intersection, sometimes turn.
      if (distToLine < 2 && this.rng() < 0.25) {
        car.heading += pick(this.rng, [-Math.PI / 2, Math.PI / 2]);
      }
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      car.pos.x = clamp(car.pos.x, -CFG.half + 3, CFG.half - 3);
      car.pos.z = clamp(car.pos.z, -CFG.half + 3, CFG.half - 3);
      car.mesh.position.copy(car.pos);
      car.mesh.rotation.y = car.heading - Math.PI / 2;
      for (const w of car.wheels) w.rotation.z -= car.speed * dt * 2.2;
    }
    for (const p of this.peds) {
      // Panic: rain, gunshots, or the player sprinting close.
      if (raining) p.panic = Math.max(p.panic, 1);
      if (gunshot) p.panic = 2;
      if (playerPos && Math.hypot(p.pos.x - playerPos.x, p.pos.z - playerPos.z) < 5) p.panic = Math.max(p.panic, 1.5);
      p.panic = Math.max(0, p.panic - dt * 0.25);
      const speed = p.panic > 0 ? 4.2 : p.speed;
      p.phase += dt * speed * 2;
      // Pedestrians walk along sidewalks; panicking ones run away from the player.
      let hx = Math.sin(p.heading), hz = Math.cos(p.heading);
      if (p.panic > 0 && playerPos) {
        const dx = p.pos.x - playerPos.x, dz = p.pos.z - playerPos.z;
        const d = Math.hypot(dx, dz) || 1;
        hx = dx / d; hz = dz / d;
        p.heading = Math.atan2(hx, hz);
      }
      p.pos.x += hx * speed * dt;
      p.pos.z += hz * speed * dt;
      if (Math.abs(p.pos.x) > 950 || Math.abs(p.pos.z) > 950) {
        p.heading += Math.PI;
        p.pos.x = clamp(p.pos.x, -940, 940);
        p.pos.z = clamp(p.pos.z, -940, 940);
      }
      // Snap back onto a sidewalk line when drifting off-grid.
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.y = p.heading;
      p.mesh.position.y = Math.abs(Math.sin(p.phase)) * 0.06;
    }
  }
}
