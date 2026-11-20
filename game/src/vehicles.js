// Cars: box-built models, drive physics, damage, headlights, stealing.

import { VEHICLE_TYPES } from './config.js';

function buildCarMesh(type, color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.2), bodyMat);
  body.position.y = 0.7;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.0), darkMat);
  cabin.position.set(0, 1.3, -0.2);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    g.add(w);
    wheels.push(w);
  }
  // Headlights + brake lights.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  for (const x of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), headMat);
    h.position.set(x, 0.75, 2.12);
    g.add(h);
  }
  const brakeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  const brakeL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), brakeMat);
  brakeL.position.set(-0.6, 0.75, -2.12);
  const brakeR = brakeL.clone();
  brakeR.position.x = 0.6;
  g.add(brakeL, brakeR);
  if (type === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    bar.position.set(0, 1.7, -0.2);
    g.add(bar);
    g.userData.lightBar = bar;
  }
  g.userData.brakeMat = brakeMat;
  return { group: g, wheels };
}

export function createVehicles(scene, colliders) {
  const list = [];

  function spawn(type, x, z, heading = 0) {
    const spec = VEHICLE_TYPES[type];
    const { group, wheels } = buildCarMesh(type, spec.color);
    group.position.set(x, 0, z);
    group.rotation.y = heading;
    scene.add(group);
    const car = {
      type, spec, mesh: group, wheels,
      pos: group.position,
      heading,
      speed: 0,
      steer: 0,
      health: 100,
      smoke: null,
      driver: null, // 'player' | 'traffic' | 'police' | null
      update(dt, input, camYaw) {
        if (this.driver !== 'player') return;
        const forward = input.is('w') || input.is('arrowup');
        const back = input.is('s') || input.is('arrowdown');
        const left = input.is('a') || input.is('arrowleft');
        const right = input.is('d') || input.is('arrowright');
        const handbrake = input.is(' ');
        const targetSteer = (left ? 1 : 0) - (right ? 1 : 0);
        this.steer += (targetSteer * 0.55 - this.steer) * Math.min(1, dt * 8);
        const dir = this.speed >= 0 ? 1 : -1;
        if (forward) this.speed += spec.accel * dt;
        if (back) this.speed -= spec.accel * 0.8 * dt;
        if (!forward && !back) this.speed *= Math.max(0, 1 - dt * 0.8);
        if (handbrake) {
          this.speed *= Math.max(0, 1 - dt * 2.2);
          this.heading += this.steer * dir * dt * 1.6;
        }
        this.speed = Math.max(-spec.maxSpeed * 0.4, Math.min(spec.maxSpeed, this.speed));
        this.heading += this.steer * dir * dt * Math.min(1, Math.abs(this.speed) / 8) * 1.4;
        this.pos.x += Math.sin(this.heading) * this.speed * dt;
        this.pos.z += Math.cos(this.heading) * this.speed * dt;
        // Colliders: slide along buildings.
        for (const c of colliders) {
          const dx = this.pos.x - c.x, dz = this.pos.z - c.z;
          const d = Math.hypot(dx, dz);
          if (d < c.r + 1.6 && d > 0.001) {
            const push = (c.r + 1.6 - d) / d;
            this.pos.x += dx * push;
            this.pos.z += dz * push;
            if (Math.abs(this.speed) > 8) this.damage(8);
            this.speed *= 0.6;
          }
        }
        const half = 995;
        this.pos.x = Math.max(-half, Math.min(half, this.pos.x));
        this.pos.z = Math.max(-half, Math.min(half, this.pos.z));
        group.rotation.y = this.heading;
        const tilt = handbrake ? this.steer * 0.06 : 0;
        group.rotation.z = tilt;
        for (const w of wheels) w.rotation.x += this.speed * dt * 2;
        // Brake lights.
        group.userData.brakeMat.color.setHex(back || handbrake ? 0xff5555 : 0xff2222);
        // Damage smoke.
        if (this.health < 40 && !this.smoke) {
          this.smoke = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 }),
          );
          this.smoke.position.set(0, 1.6, 1.2);
          group.add(this.smoke);
        }
        if (this.smoke) this.smoke.scale.setScalar(1 + Math.sin(performance.now() * 0.01) * 0.2);
      },
      damage(n) {
        this.health -= n;
        if (this.health <= 0) this.health = 0;
      },
    };
    list.push(car);
    return car;
  }

  return {
    list,
    spawn,
    update(dt, input, camYaw) {
      for (const car of list) car.update(dt, input, camYaw);
    },
    nearest(x, z, maxDist) {
      let best = null, bd = maxDist;
      for (const car of list) {
        const d = Math.hypot(car.pos.x - x, car.pos.z - z);
        if (d < bd) { bd = d; best = car; }
      }
      return best;
    },
  };
}
