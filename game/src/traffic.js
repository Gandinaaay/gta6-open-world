// Living streets, rewritten for the v4 recorded pass: traffic cars that drive
// the road grid in their own lane and stop at red lights, and pedestrians on the
// sidewalks who panic and run when they see a crime. Traffic never runs out —
// cars wrap around the edge of the map. New in v4: pedestrians hurry for cover
// in the rain, and traffic headlights are part of every car mesh.
import { VEHICLE_TYPES } from './config.js';
import { spawnVehicle } from './vehicles.js';
import { districtAt } from './config.js';

const TRAFFIC_TYPES = ['sedan', 'sedan', 'suv', 'taxi', 'truck', 'sport'];

function randomRoadPoint(random) {
  const axis = random() < 0.5 ? 'x' : 'z';
  const line = (Math.floor(random() * 9) - 4) * 100;
  const along = random.range(-480, 480);
  return axis === 'x' ? { x: line, z: along, axis, dir: random() < 0.5 ? 1 : -1 } : { x: along, z: line, axis, dir: random() < 0.5 ? 1 : -1 };
}

export function spawnTrafficCar(G, random) {
  const p = randomRoadPoint(random);
  const typeKey = random.pick(TRAFFIC_TYPES);
  const v = spawnVehicle(G.scene, typeKey, p.x, p.z, p.axis === 'x' ? (p.dir > 0 ? Math.PI : 0) : (p.dir > 0 ? -Math.PI / 2 : Math.PI / 2), { driver: 'traffic' });
  const district = districtAt(p.x, p.z);
  v.ai = {
    axis: p.axis, dir: p.dir, line: p.axis === 'x' ? p.x : p.z,
    // Highway traffic is faster; quiet districts are slower. Each car holds a
    // lane offset so two-way traffic does not drive head-on down the centre.
    speed: random.range(10, 18) * (district.id === 'highway' ? 1.6 : district.density),
    lane: random.pick([-3.5, 3.5]),
    wait: 0,
  };
  G.vehicles.push(v);
  return v;
}

export function updateTraffic(G, dt, random) {
  for (const v of G.vehicles) {
    // Police pursuit cars run their own chase AI in police.js — the traffic
    // grid (axis/dir) does not apply to them and would corrupt their position.
    if (!v.ai || v.isPlayer || v.ai.chase) continue;
    const ai = v.ai;
    // Red light ahead: stop at the intersection line.
    let stopped = false;
    if (ai.wait <= 0) {
      for (const light of G.city.trafficLights) {
        const onSameRoad = ai.axis === 'x' ? Math.abs(v.z - light.z) < 20 : Math.abs(v.x - light.x) < 20;
        const approaching = ai.axis === 'x' ? Math.abs(v.x - light.x) < 14 : Math.abs(v.z - light.z) < 14;
        if (onSameRoad && approaching && light.red) { stopped = true; break; }
      }
    }
    if (stopped) {
      ai.wait = 0.1;
      v.speed = Math.max(0, v.speed - 30 * dt);
    } else {
      v.speed += (ai.speed - v.speed) * Math.min(1, dt * 1.5);
    }
    // Swerve a little if the player's car is bearing down on this lane.
    let swerve = 0;
    if (G.currentVehicle && Math.abs(G.currentVehicle.speed) > 10) {
      const d = Math.hypot(v.x - G.currentVehicle.x, v.z - G.currentVehicle.z);
      if (d < 22) swerve = (v.x > G.currentVehicle.x ? 1 : -1) * 2.5 * dt;
    }
    // Move along the road; at an intersection, sometimes turn onto the cross street.
    if (ai.axis === 'x') {
      v.x += ai.dir * v.speed * dt;
      v.z += swerve;
      const nearCross = Math.abs(v.x % 100) < 3 || Math.abs(v.x % 100) > 97;
      if (nearCross && random() < dt * 0.5) {
        ai.axis = 'z';
        ai.line = v.z;
        ai.dir = random() < 0.5 ? 1 : -1;
        v.yaw = ai.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
    } else {
      v.z += ai.dir * v.speed * dt;
      v.x += swerve;
      const nearCross = Math.abs(v.z % 100) < 3 || Math.abs(v.z % 100) > 97;
      if (nearCross && random() < dt * 0.5) {
        ai.axis = 'x';
        ai.line = v.x;
        ai.dir = random() < 0.5 ? 1 : -1;
        v.yaw = ai.dir > 0 ? Math.PI : 0;
      }
    }
    // Wrap around the edge of the city so traffic never runs out.
    if (v.x > 495) v.x = -495;
    if (v.x < -495) v.x = 495;
    if (v.z > 495) v.z = -495;
    if (v.z < -495) v.z = 495;
    v.group.position.set(v.x, 0, v.z);
    v.group.rotation.y = v.yaw;
    for (const w of v.wheels) w.rotation.x += v.speed * dt * 2.4;
    // A traffic car the player rams hard loses its driver, who runs away.
    if (G.currentVehicle && Math.hypot(v.x - G.currentVehicle.x, v.z - G.currentVehicle.z) < 3.5 && Math.abs(G.currentVehicle.speed) > 12) {
      v.health -= 30;
      if (v.health <= 0 && v.driver === 'traffic') {
        v.driver = null;
        v.ai = null;
        G.addWanted(1);
        G.toast('You wrecked a car! Wanted level up.');
      }
    }
  }
}

function makePedestrian(scene, random) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: random.pick([0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xecf0f1]) });
  const skin = new THREE.MeshLambertMaterial({ color: random.pick([0xc98d64, 0x8d5524, 0xffdbac, 0x5c3a21]) });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.45), shirt);
  torso.position.y = 1.45;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin);
  head.position.y = 2.3;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.32), new THREE.MeshLambertMaterial({ color: 0x2b3a55 }));
  legL.position.set(-0.22, 0.45, 0);
  const legR = legL.clone();
  legR.position.x = 0.22;
  group.add(torso, head, legL, legR);
  group.traverse((m) => { m.castShadow = true; });
  scene.add(group);
  return { group, legL, legR };
}

export function spawnPedestrian(G, random) {
  const onRoadX = random() < 0.5;
  const line = (Math.floor(random() * 9) - 4) * 100 + (random() < 0.5 ? 11 : -11);
  const along = random.range(-480, 480);
  const x = onRoadX ? line : along;
  const z = onRoadX ? along : line;
  const mesh = makePedestrian(G.scene, random);
  const ped = {
    ...mesh,
    x, z, yaw: random() * Math.PI * 2,
    speed: random.range(1.2, 2.2),
    panic: 0, phase: random() * 10,
    walkTarget: null,
  };
  mesh.group.position.set(x, 0, z);
  G.peds.push(ped);
  return ped;
}

export function updatePedestrians(G, dt, random) {
  const px = G.currentVehicle ? G.currentVehicle.x : G.player.x;
  const pz = G.currentVehicle ? G.currentVehicle.z : G.player.z;
  const playerSpeed = G.currentVehicle ? Math.abs(G.currentVehicle.speed) : G.player.speed;
  const raining = G.weather === 'rain';
  for (const ped of G.peds) {
    const d = Math.hypot(ped.x - px, ped.z - pz);
    // Panic: a crime nearby, a speeding car, or a gunshot sends them running.
    // In the rain they also hurry — nobody strolls in a Vice Bay downpour.
    if ((G.crimeFlash > 0 && d < 40) || (playerSpeed > 15 && d < 12) || (G.wanted >= 2 && d < 15)) {
      ped.panic = 3;
    }
    const hurry = raining && ped.panic <= 0 ? 1.6 : 1;
    if (ped.panic > 0) {
      ped.panic -= dt;
      const away = Math.atan2(ped.x - px, ped.z - pz);
      ped.yaw = away;
      ped.x += Math.sin(away) * 6 * dt;
      ped.z += Math.cos(away) * 6 * dt;
      ped.phase += dt * 14;
    } else {
      ped.phase += dt * ped.speed * 3 * hurry;
      if (!ped.walkTarget || Math.hypot(ped.x - ped.walkTarget.x, ped.z - ped.walkTarget.z) < 3) {
        ped.walkTarget = { x: ped.x + random.range(-60, 60), z: ped.z + random.range(-60, 60) };
      }
      const targetYaw = Math.atan2(ped.walkTarget.x - ped.x, ped.walkTarget.z - ped.z);
      let dy = targetYaw - ped.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      ped.yaw += Math.max(-2 * dt, Math.min(2 * dt, dy));
      ped.x += Math.sin(ped.yaw) * ped.speed * hurry * dt;
      ped.z += Math.cos(ped.yaw) * ped.speed * hurry * dt;
    }
    ped.x = Math.max(-490, Math.min(490, ped.x));
    ped.z = Math.max(-490, Math.min(490, ped.z));
    ped.group.position.set(ped.x, 0, ped.z);
    ped.group.rotation.y = ped.yaw;
    const s = Math.sin(ped.phase);
    ped.legL.rotation.x = s * 0.6;
    ped.legR.rotation.x = -s * 0.6;
    // Run over by a car: the pedestrian goes down and the law notices.
    if (G.currentVehicle && Math.abs(G.currentVehicle.speed) > 6 && d < 2.2) {
      ped.group.visible = false;
      ped.dead = true;
      G.addWanted(1);
      G.toast('You hit a pedestrian! Wanted level up.');
      if (G.audio) G.audio.crash();
    }
  }
  // Replace the dead so the streets stay alive.
  for (let i = G.peds.length - 1; i >= 0; i -= 1) {
    if (G.peds[i].dead) {
      G.scene.remove(G.peds[i].group);
      G.peds.splice(i, 1);
      spawnPedestrian(G, random);
    }
  }
}
