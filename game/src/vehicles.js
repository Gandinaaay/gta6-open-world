// Car models (box-built from Three.js geometry) and arcade drive physics.
import { CFG } from './config.js';
import { clamp } from './random.js';

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

export function makeCarMesh(type) {
  const t = CFG.cars[type];
  const g = new THREE.Group();
  const body = box(t.len, 0.65, t.wid, t.color, 0, 0.55, 0);
  g.add(body);
  const cabin = box(t.len * 0.5, 0.55, t.wid * 0.85, 0x1a2733, -t.len * 0.05, 1.1, 0);
  g.add(cabin);
  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [wx, wz] of [[t.len * 0.32, t.wid / 2], [t.len * 0.32, -t.wid / 2], [-t.len * 0.32, t.wid / 2], [-t.len * 0.32, -t.wid / 2]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    g.add(w);
    wheels.push(w);
  }
  // Headlights (front) and brake lights (rear).
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const hlL = box(0.1, 0.18, 0.3, 0xfff2b0, t.len / 2, 0.6, t.wid / 2 - 0.35);
  const hlR = box(0.1, 0.18, 0.3, 0xfff2b0, t.len / 2, 0.6, -t.wid / 2 + 0.35);
  g.add(hlL, hlR);
  const brakeMat = new THREE.MeshBasicMaterial({ color: 0x330000 });
  const brL = box(0.1, 0.18, 0.3, 0x330000, -t.len / 2, 0.6, t.wid / 2 - 0.35);
  const brR = box(0.1, 0.18, 0.3, 0x330000, -t.len / 2, 0.6, -t.wid / 2 + 0.35);
  brL.material = brakeMat; brR.material = brakeMat;
  g.add(brL, brR);
  // Police light bar.
  let barL = null, barR = null;
  if (type === 'police') {
    barL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    barL.position.set(-0.1, 1.5, 0.45);
    barR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    barR.position.set(-0.1, 1.5, -0.45);
    g.add(barL, barR);
    const stripe = box(t.len * 0.9, 0.1, t.wid + 0.02, 0xffffff, 0, 0.85, 0);
    g.add(stripe);
  }
  if (type === 'taxi') {
    const sign = box(0.7, 0.25, 0.5, 0xf5c518, 0, 1.5, 0);
    g.add(sign);
  }
  // Damage smoke puff (hidden until damaged).
  const smoke = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.5 })
  );
  smoke.position.set(t.len * 0.3, 1.2, 0);
  smoke.visible = false;
  g.add(smoke);
  return { group: g, wheels, brakeMat, barL, barR, smoke };
}

export class VehicleManager {
  constructor(scene) {
    this.scene = scene;
    this.cars = [];
    this._smokeT = 0;
  }

  spawn(type, x, z, heading, opts) {
    const parts = makeCarMesh(type);
    const car = {
      type, mesh: parts.group, wheels: parts.wheels, brakeMat: parts.brakeMat,
      barL: parts.barL, barR: parts.barR, smoke: parts.smoke,
      pos: new THREE.Vector3(x, 0, z),
      heading: heading || 0,
      speed: 0, steer: 0, damage: 0,
      isPlayer: !!(opts && opts.player),
      isPolice: type === 'police',
      ai: opts && opts.ai ? opts.ai : null,
      color: CFG.cars[type].color,
    };
    parts.group.position.copy(car.pos);
    parts.group.rotation.y = car.heading - Math.PI / 2;
    this.scene.add(parts.group);
    this.cars.push(car);
    return car;
  }

  remove(car) {
    this.scene.remove(car.mesh);
    const i = this.cars.indexOf(car);
    if (i >= 0) this.cars.splice(i, 1);
  }

  nearest(pos, maxDist, exclude) {
    let best = null, bestD = maxDist;
    for (const c of this.cars) {
      if (c === exclude) continue;
      const d = Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z);
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  // Arcade drive physics for the player-driven car.
  drive(car, input, dt, colliders, grip) {
    const t = CFG.cars[car.type];
    const g = grip || 1;
    if (input.forward) car.speed += t.accel * dt * g;
    if (input.back) car.speed -= (car.speed > 0.5 ? t.brake : t.accel * 0.6) * dt;
    if (!input.forward && !input.back) car.speed *= Math.pow(0.35, dt);
    if (input.handbrake) {
      car.speed *= Math.pow(0.15, dt);
      car.steer += (input.axes().x) * 1.8 * dt;
    }
    car.speed = clamp(car.speed, -14, t.top);
    const steerInput = input.axes().x;
    const steerTarget = steerInput * t.steer * clamp(Math.abs(car.speed) / 12, 0, 1) * (car.speed < 0 ? -1 : 1);
    car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
    car.heading += car.steer * dt * (input.handbrake ? 1.5 : 1);
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    car.pos.x += fx * car.speed * dt;
    car.pos.z += fz * car.speed * dt;
    car.pos.x = clamp(car.pos.x, -CFG.half + 3, CFG.half - 3);
    car.pos.z = clamp(car.pos.z, -CFG.half + 3, CFG.half - 3);
    // Building collision: push out, scrub speed, add damage.
    for (const c of colliders) {
      const dx = car.pos.x - clamp(car.pos.x, c.x - c.hw, c.x + c.hw);
      const dz = car.pos.z - clamp(car.pos.z, c.z - c.hd, c.z + c.hd);
      const d2 = dx * dx + dz * dz;
      const r = 1.6;
      if (d2 < r * r) {
        const d = Math.sqrt(d2) || 0.001;
        car.pos.x += (dx / d) * (r - d);
        car.pos.z += (dz / d) * (r - d);
        if (Math.abs(car.speed) > 8) {
          car.damage += Math.abs(car.speed) * 0.35;
          car.speed *= 0.35;
        } else {
          car.speed *= 0.7;
        }
      }
    }
    this.syncMesh(car, dt, input.back);
  }

  syncMesh(car, dt, braking) {
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading - Math.PI / 2;
    for (const w of car.wheels) w.rotation.z -= car.speed * dt * 2.2;
    car.brakeMat.color.setHex(braking ? 0xff2222 : 0x330000);
    car.smoke.visible = car.damage > 35;
    if (car.smoke.visible) {
      this._smokeT += dt;
      car.smoke.position.y = 1.2 + Math.sin(this._smokeT * 9) * 0.25;
      car.smoke.scale.setScalar(1 + Math.sin(this._smokeT * 7) * 0.2);
    }
  }

  update(dt, colliders) {
    for (const c of this.cars) {
      if (c.ai) continue; // traffic owns AI cars
      if (!c.isPlayer) this.syncMesh(c, dt, false);
    }
  }
}
