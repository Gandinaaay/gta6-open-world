// Cars: box-built meshes, player driving physics, damage and smoke.
import { VEHICLE_TYPES, CONFIG } from './config.js';

const THREE = window.THREE;

function buildCarMesh(type) {
  const spec = VEHICLE_TYPES[type];
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: spec.color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x18222e });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.6), bodyMat);
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), glassMat);
  cabin.position.set(0, 1.3, -0.3);
  g.add(cabin);
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);
  for (const [x, z] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.5], [1.0, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    g.add(w);
    wheels.push(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headMat);
    h.position.set(x, 0.7, 2.32);
    g.add(h);
  }
  const brakeMat = new THREE.MeshBasicMaterial({ color: 0xaa1010 });
  for (const x of [-0.7, 0.7]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), brakeMat);
    b.position.set(x, 0.7, -2.32);
    g.add(b);
  }
  if (type === 'police') {
    const barMat = new THREE.MeshBasicMaterial({ color: 0x2244ff });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.5), barMat);
    bar.position.set(0, 1.75, -0.3);
    g.add(bar);
    g.userData.lightBar = bar;
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffe14a })
    );
    sign.position.set(0, 1.75, -0.3);
    g.add(sign);
  }
  g.userData.wheels = wheels;
  return g;
}

export function createVehicles(scene, colliders) {
  const list = [];
  const smokeMat = new THREE.MeshLambertMaterial({ color: 0x555555, transparent: true, opacity: 0.55 });
  const smokes = [];

  function spawn(type, x, z, heading) {
    const spec = VEHICLE_TYPES[type];
    const mesh = buildCarMesh(type);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading || 0;
    scene.add(mesh);
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), smokeMat);
    smoke.visible = false;
    smoke.position.set(x, 1.6, z);
    scene.add(smoke);
    smokes.push(smoke);
    const car = {
      type, spec, mesh, wheels: mesh.userData.wheels,
      pos: mesh.position,
      heading: heading || 0,
      speed: 0,
      steer: 0,
      health: 100,
      smoke,
      driver: 'traffic',
      update(dt, input, isPlayer) {
        if (isPlayer && input) {
          const accel = input.is('w') || input.is('arrowup') ? spec.accel : 0;
          const brake = input.is('s') || input.is('arrowdown') ? spec.accel * 1.4 : 0;
          const hand = input.is(' ') || input.is('spacebar');
          this.speed += (accel - brake) * dt;
          if (!input.is('w') && !input.is('arrowup') && !input.is('s') && !input.is('arrowdown')) {
            this.speed -= Math.sign(this.speed) * 8 * dt;
            if (Math.abs(this.speed) < 0.3) this.speed = 0;
          }
          if (hand) this.speed -= Math.sign(this.speed) * 26 * dt;
          const maxF = spec.topSpeed;
          const maxR = 10;
          this.speed = Math.max(-maxR, Math.min(maxF, this.speed));
          const steerIn = (input.is('a') || input.is('arrowleft') ? 1 : 0) - (input.is('d') || input.is('arrowright') ? 1 : 0);
          const grip = spec.grip * (hand ? 0.55 : 1);
          this.heading += steerIn * grip * dt * Math.min(1, Math.abs(this.speed) / 8) * (this.speed >= 0 ? 1 : -1);
        }
        this.pos.x += Math.sin(this.heading) * this.speed * dt;
        this.pos.z += Math.cos(this.heading) * this.speed * dt;
        // Slide along building colliders, taking damage on hard hits.
        for (const c of colliders) {
          const dx = this.pos.x - c.x;
          const dz = this.pos.z - c.z;
          const d = Math.hypot(dx, dz);
          const minD = c.r + 2.2;
          if (d < minD && d > 0.001) {
            const push = minD - d;
            this.pos.x = c.x + dx / d * minD;
            this.pos.z = c.z + dz / d * minD;
            if (Math.abs(this.speed) > 14) {
              this.health -= Math.abs(this.speed) * 0.7;
              this.speed *= 0.4;
            }
          }
        }
        const h = CONFIG.worldSize / 2;
        this.pos.x = Math.max(-h, Math.min(h, this.pos.x));
        this.pos.z = Math.max(-h, Math.min(h, this.pos.z));
        this.mesh.rotation.y = this.heading;
        for (const w of this.wheels) w.rotation.x += this.speed * dt * 2;
        this.smoke.visible = this.health < 40;
        if (this.smoke.visible) {
          this.smoke.position.set(this.pos.x, 1.6 + Math.sin(Date.now() / 90) * 0.3, this.pos.z);
          this.smoke.scale.setScalar(1 + Math.sin(Date.now() / 130) * 0.25);
        }
      },
      damage(n) { this.health -= n; if (this.health <= 0) this.health = 0; },
    };
    list.push(car);
    return car;
  }

  function nearest(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const c of list) {
      const d = Math.hypot(c.pos.x - x, c.pos.z - z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  return { list, spawn, nearest };
}
