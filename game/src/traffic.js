// Traffic AI cars, pedestrians and traffic lights.
import { CONFIG, VEHICLE_TYPES } from './config.js';

const THREE = window.THREE;

export function createTraffic(scene, city, vehicles, rng) {
  const cars = [];
  const peds = [];
  const lights = [];
  const half = CONFIG.worldSize / 2;
  const roadCoords = [];
  for (let c = -half + CONFIG.roadGap; c < half; c += CONFIG.roadGap) roadCoords.push(c);

  const types = ['sedan', 'sedan', 'suv', 'taxi', 'truck', 'comet'];
  for (let i = 0; i < 14; i++) {
    const type = types[i % types.length];
    const horizontal = rng.chance(0.5);
    const road = roadCoords[Math.floor(rng.next() * roadCoords.length)];
    const along = rng.range(-half + 100, half - 100);
    const lane = rng.chance(0.5) ? 5 : -5;
    const x = horizontal ? along : road + lane;
    const z = horizontal ? road + lane : along;
    const heading = horizontal ? (lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (lane > 0 ? 0 : Math.PI);
    const car = vehicles.spawn(type, x, z, heading);
    car.driver = 'traffic';
    car.speed = rng.range(9, 15);
    car.cruise = car.speed;
    cars.push({ car, horizontal, road, lane });
  }

  // Pedestrians on the sidewalks.
  const pedMats = [0xc04040, 0x40a040, 0x4040c0, 0xc0a040, 0x9040a0].map(
    (c) => new THREE.MeshLambertMaterial({ color: c })
  );
  for (let i = 0; i < 24; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.45), pedMats[i % pedMats.length]);
    const x = rng.range(-half + 50, half - 50);
    const z = rng.range(-half + 50, half - 50);
    mesh.position.set(x, 0.9, z);
    scene.add(mesh);
    peds.push({ mesh, x, z, dir: rng.range(0, Math.PI * 2), speed: rng.range(1, 2.4), panic: 0 });
  }

  // Traffic lights at four central intersections.
  const lightMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (const [x, z] of [[0, 0], [200, 0], [0, 200], [-200, -200]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5, 6), lightMat);
    pole.position.set(x + 14, 2.5, z + 14);
    scene.add(pole);
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.6, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x30ff30 })
    );
    lamp.position.set(x + 14, 5.2, z + 14);
    scene.add(lamp);
    lights.push({ lamp, state: 'green', timer: rng.range(0, 6) });
  }

  function update(dt, playerPos, weather) {
    // Lights cycle green -> yellow -> red.
    for (const l of lights) {
      l.timer -= dt;
      if (l.timer <= 0) {
        if (l.state === 'green') { l.state = 'yellow'; l.timer = 2; l.lamp.material.color.setHex(0xffd020); }
        else if (l.state === 'yellow') { l.state = 'red'; l.timer = 6; l.lamp.material.color.setHex(0xff2020); }
        else { l.state = 'green'; l.timer = 7; l.lamp.material.color.setHex(0x30ff30); }
      }
    }
    for (const t of cars) {
      const c = t.car;
      // Stop at a red light near an intersection.
      let stop = false;
      for (const l of lights) {
        if (l.state === 'red' && Math.abs(c.pos.x - (l.lamp.position.x - 14)) < 26 && Math.abs(c.pos.z - (l.lamp.position.z - 14)) < 26) { stop = true; break; }
      }
      // Swerve away from the player.
      const pdx = c.pos.x - playerPos.x;
      const pdz = c.pos.z - playerPos.z;
      const pd = Math.hypot(pdx, pdz);
      if (pd < 14) {
        c.heading += (pdx > 0 ? 1 : -1) * dt * 1.5;
      }
      const target = stop ? 0 : c.cruise;
      c.speed += (target - c.speed) * dt * 1.5;
      c.update(dt, null, false);
      // Wrap around the map edges to keep traffic flowing.
      if (c.pos.x > half - 20 || c.pos.x < -half + 20 || c.pos.z > half - 20 || c.pos.z < -half + 20) {
        const road = roadCoords[Math.floor(rng.next() * roadCoords.length)];
        const along = rng.range(-half + 100, half - 100);
        if (t.horizontal) { c.pos.x = along; c.pos.z = road + t.lane; }
        else { c.pos.x = road + t.lane; c.pos.z = along; }
        c.speed = c.cruise;
      }
    }
    for (const p of peds) {
      if (weather === 'rain') p.panic = Math.max(p.panic, 1);
      const dx = p.x - playerPos.x;
      const dz = p.z - playerPos.z;
      const d = Math.hypot(dx, dz);
      if (d < 12) p.panic = 3;
      if (p.panic > 0) {
        p.panic -= dt;
        p.dir = Math.atan2(dx, dz);
        p.speed = 5;
      } else {
        p.speed = 1.6;
        if (rng.chance(dt * 0.2)) p.dir += rng.range(-1, 1);
      }
      p.x += Math.sin(p.dir) * p.speed * dt;
      p.z += Math.cos(p.dir) * p.speed * dt;
      p.x = Math.max(-half, Math.min(half, p.x));
      p.z = Math.max(-half, Math.min(half, p.z));
      p.mesh.position.set(p.x, 0.9, p.z);
      p.mesh.rotation.y = p.dir;
    }
  }

  function panicNear(x, z, radius) {
    for (const p of peds) {
      if (Math.hypot(p.x - x, p.z - z) < radius) p.panic = 3;
    }
  }

  return { cars, peds, lights, update, panicNear };
}
