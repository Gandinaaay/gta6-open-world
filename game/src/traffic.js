// AI traffic (lane driving, red lights, swerving) + pedestrians (sidewalks, panic).
import { CONFIG } from './config.js';

export function createTraffic(scene, city, vehicles, rng) {
  const cars = [];
  const peds = [];
  const lights = [];
  const laneTypes = ['sedan', 'taxi', 'suv', 'truck'];
  for (let i = 0; i < 14; i++) {
    const vertical = rng.chance(0.5);
    const road = rng.int(-4, 4) * CONFIG.roadGap;
    const lane = rng.chance(0.5) ? 5 : -5;
    const x = vertical ? road + lane : rng.range(-900, 900);
    const z = vertical ? rng.range(-900, 900) : road + lane;
    const heading = vertical ? (lane > 0 ? 0 : Math.PI) : (lane > 0 ? Math.PI / 2 : -Math.PI / 2);
    const car = vehicles.spawn(rng.pick(laneTypes), x, z, heading);
    car.driver = 'traffic';
    car.speed = rng.range(8, 15);
    car.vertical = vertical;
    car.road = road;
    car.lane = lane;
    cars.push(car);
  }
  // Traffic lights at the central intersections.
  for (const [x, z] of [[0, 0], [200, 0], [0, 200], [-200, -200]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 7, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    pole.position.set(x + 14, 3.5, z + 14);
    scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22ff44 }));
    lamp.position.set(x + 14, 7.2, z + 14);
    scene.add(lamp);
    lights.push({ lamp, state: 'green', timer: rng.range(0, 8) });
  }
  const pedColors = [0xd95f4b, 0x4b8ad9, 0x7fd95f, 0xd9b84b, 0xb05fd9, 0x5fd9c9];
  for (let i = 0; i < 24; i++) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: rng.pick(pedColors), roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.45), mat);
    body.position.y = 1.1;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshStandardMaterial({ color: 0xc98d64 }));
    head.position.y = 1.85;
    g.add(body, head);
    const x = rng.range(-900, 900);
    const z = rng.range(-900, 900);
    g.position.set(x, 0, z);
    scene.add(g);
    peds.push({
      group: g, x, z, heading: rng.range(0, Math.PI * 2),
      speed: rng.range(1, 2.2), panic: 0, bob: rng.range(0, 6),
    });
  }
  function update(dt, playerPos, weather) {
    for (const l of lights) {
      l.timer -= dt;
      if (l.timer <= 0) {
        l.state = l.state === 'green' ? 'red' : 'green';
        l.timer = l.state === 'green' ? 9 : 7;
        l.lamp.material.color.setHex(l.state === 'green' ? 0x22ff44 : 0xff2222);
      }
    }
    for (const car of cars) {
      // Red light stop at the nearest intersection ahead.
      let stop = false;
      if (car.vertical) {
        const next = Math.ceil(car.pos.z / 200) * 200;
        if (Math.abs(next - car.pos.z) < 18 && lights[0].state === 'red') stop = true;
      } else {
        const next = Math.ceil(car.pos.x / 200) * 200;
        if (Math.abs(next - car.pos.x) < 18 && lights[0].state === 'red') stop = true;
      }
      // Swerve from the player.
      const pd = Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z);
      if (pd < 22) {
        car.heading += dt * 1.4;
      }
      const target = stop ? 0 : 12;
      car.speed += (target - car.speed) * Math.min(1, dt * 1.2);
      car.update(dt);
      if (car.vertical) {
        if (car.pos.z > 980) car.pos.z = -980;
        if (car.pos.z < -980) car.pos.z = 980;
      } else {
        if (car.pos.x > 980) car.pos.x = -980;
        if (car.pos.x < -980) car.pos.x = 980;
      }
    }
    for (const p of peds) {
      const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
      if (d < 14 || weather === 'rain') p.panic = 1;
      else p.panic = Math.max(0, p.panic - dt * 0.2);
      const sp = p.speed * (p.panic > 0 ? 3.2 : 1);
      p.bob += dt * 8;
      if (rng.chance(dt * 0.12)) p.heading += rng.range(-1.2, 1.2);
      p.x += Math.sin(p.heading) * sp * dt;
      p.z += Math.cos(p.heading) * sp * dt;
      if (p.x > 980) p.x = -980;
      if (p.x < -980) p.x = 980;
      if (p.z > 980) p.z = -980;
      if (p.z < -980) p.z = 980;
      p.group.position.set(p.x, Math.abs(Math.sin(p.bob)) * 0.12, p.z);
      p.group.rotation.y = p.heading;
    }
  }
  return {
    cars, peds, lights,
    update,
    panicNear: (x, z) => {
      for (const p of peds) {
        if (Math.hypot(p.x - x, p.z - z) < 26) p.panic = 1;
      }
    },
  };
}
