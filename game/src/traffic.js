// Traffic cars on lanes + pedestrians on sidewalks.

import { CONFIG } from './config.js';

export function createTraffic(scene, city, vehicles, rng) {
  const cars = [];
  const peds = [];
  const carTypes = ['sedan', 'suv', 'taxi', 'truck', 'comet'];

  // Traffic lights at the main intersections (cycle with time).
  const lights = [];
  for (let ix = -2; ix <= 2; ix++) {
    for (let iz = -2; iz <= 2; iz++) {
      lights.push({ x: ix * CONFIG.roadGap, z: iz * CONFIG.roadGap, phase: rng.next() * 8 });
    }
  }

  function spawnCar() {
    const type = rng.pick(carTypes);
    const horizontal = rng.chance(0.5);
    const lane = rng.int(-4, 4) * CONFIG.roadGap + (rng.chance(0.5) ? 6 : -6);
    const x = horizontal ? rng.range(-900, 900) : lane;
    const z = horizontal ? lane : rng.range(-900, 900);
    const car = vehicles.spawn(type, x, z, horizontal ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rng.chance(0.5) ? 0 : Math.PI));
    car.driver = 'traffic';
    car.cruise = rng.range(10, 18);
    car.horizontal = horizontal;
    cars.push(car);
    return car;
  }

  function spawnPed() {
    const g = new THREE.Group();
    const color = rng.pick([0xdc2626, 0x2563eb, 0x16a34a, 0xf59e0b, 0x9333ea, 0xec4899]);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.35), new THREE.MeshLambertMaterial({ color }));
    body.position.y = 0.9;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
    head.position.y = 1.7;
    g.add(body, head);
    const x = rng.range(-900, 900);
    const z = rng.range(-900, 900);
    g.position.set(x, 0, z);
    scene.add(g);
    const ped = { mesh: g, pos: g.position, heading: rng.next() * Math.PI * 2, speed: rng.range(1, 2.2), panic: 0 };
    peds.push(ped);
    return ped;
  }

  for (let i = 0; i < 14; i++) spawnCar();
  for (let i = 0; i < 24; i++) spawnPed();

  return {
    cars, peds, lights,
    count: { cars: () => cars.length, peds: () => peds.length },
    update(dt, playerPos, weather, time) {
      // Traffic light phase.
      for (const l of lights) l.phase = (l.phase + dt) % 16;
      for (const car of cars) {
        // Stop at a red light near an intersection.
        let stop = false;
        for (const l of lights) {
          const d = Math.hypot(car.pos.x - l.x, car.pos.z - l.z);
          if (d < 30 && l.phase < 8) { stop = true; break; }
        }
        // Swerve away from the player.
        const pd = Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z);
        const target = stop ? 0 : car.cruise;
        car.speed += (target - car.speed) * Math.min(1, dt * 2);
        if (pd < 12 && pd > 0.01) {
          car.pos.x += (car.pos.x - playerPos.x) / pd * dt * 6;
          car.pos.z += (car.pos.z - playerPos.z) / pd * dt * 6;
        }
        car.pos.x += Math.sin(car.heading) * car.speed * dt;
        car.pos.z += Math.cos(car.heading) * car.speed * dt;
        // Wrap around the city edge.
        if (car.pos.x > 980) car.pos.x = -980;
        if (car.pos.x < -980) car.pos.x = 980;
        if (car.pos.z > 980) car.pos.z = -980;
        if (car.pos.z < -980) car.pos.z = 980;
        car.mesh.rotation.y = car.heading;
        for (const w of car.wheels) w.rotation.x += car.speed * dt * 2;
      }
      for (const ped of peds) {
        if (weather === 'rain' || ped.panic > 0) ped.speed = 5;
        else ped.speed = 1.6;
        ped.pos.x += Math.sin(ped.heading) * ped.speed * dt;
        ped.pos.z += Math.cos(ped.heading) * ped.speed * dt;
        if (Math.abs(ped.pos.x) > 950 || Math.abs(ped.pos.z) > 950 || rng.chance(dt * 0.05)) {
          ped.heading = rng.next() * Math.PI * 2;
        }
        ped.panic = Math.max(0, ped.panic - dt);
        ped.mesh.rotation.y = ped.heading;
        ped.mesh.position.y = Math.abs(Math.sin(time * 6 + ped.pos.x)) * 0.05;
      }
    },
    panicNear(x, z, r) {
      for (const ped of peds) {
        if (Math.hypot(ped.pos.x - x, ped.pos.z - z) < r) {
          ped.panic = 3;
          ped.heading = Math.atan2(ped.pos.x - x, ped.pos.z - z);
        }
      }
    },
  };
}
