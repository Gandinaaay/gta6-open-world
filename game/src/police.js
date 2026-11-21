// Wanted system and the Vice Bay police. Heat rises with crime and decays
// when Rico stays out of sight; stars set how many interceptors hunt him.

import { WANTED, POLICE_DEFS } from './config.js';
import { spawnVehicle } from './vehicles.js';
import { makeRng, WORLD_SEED } from './random.js';

export function wantedLevel(G) {
  const th = WANTED.thresholds;
  let stars = 0;
  for (let i = 1; i < th.length; i++) if (G.heat >= th[i]) stars = i;
  return stars;
}

function nearestPoliceDistance(G) {
  let best = Infinity;
  for (const c of G.police) best = Math.min(best, Math.hypot(c.x - G.player.x, c.z - G.player.z));
  return best;
}

export function updatePolice(G, dt) {
  const stars = wantedLevel(G);
  G.wanted = stars;
  const near = nearestPoliceDistance(G);
  G.hidden = near > 80 && stars > 0;
  // heat decay: faster while hidden
  if (stars > 0) {
    G.heat = Math.max(0, G.heat - WANTED.decayPerSecond * (G.hidden ? WANTED.decayHiddenMultiplier : 1) * dt);
  }
  // spawn interceptors up to the star count
  const want = Math.min(POLICE_DEFS.maxActive, stars);
  const rng = makeRng(WORLD_SEED + Math.floor(G.time * 3600));
  while (G.police.length < want) {
    const a = rng.range(0, Math.PI * 2);
    const d = POLICE_DEFS.spawnDistance;
    const x = G.player.x + Math.sin(a) * d;
    const z = G.player.z + Math.cos(a) * d;
    const car = spawnVehicle(G, 'sedan', Math.max(-950, Math.min(950, x)), Math.max(-950, Math.min(950, z)), 0, { police: true, color: POLICE_DEFS.car.color });
    car.topSpeed = POLICE_DEFS.car.topSpeed + stars * 1.5;
    G.police.push(car);
  }
  // despawn when clean
  if (stars === 0 && G.police.length > 0) {
    for (const c of G.police) {
      G.scene.remove(c.group);
      const i = G.vehicles.indexOf(c);
      if (i >= 0) G.vehicles.splice(i, 1);
    }
    G.police = [];
  }
  // chase: steer toward Rico, catch him when close and slow
  const p = G.player;
  const pSpeed = p.inVehicle ? Math.abs(p.inVehicle.speed) : Math.hypot(p.vx, p.vz);
  for (const c of G.police) {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const dist = Math.hypot(dx, dz) || 1;
    const targetYaw = Math.atan2(dx, dz);
    let dy = targetYaw - c.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    c.yaw += Math.max(-2.4 * dt, Math.min(2.4 * dt, dy));
    const cruise = Math.min(c.topSpeed, 14 + stars * 6 + dist * 0.12);
    c.speed += (cruise - c.speed) * Math.min(1, 1.4 * dt);
    c.x += Math.sin(c.yaw) * c.speed * dt;
    c.z += Math.cos(c.yaw) * c.speed * dt;
    c.group.position.set(c.x, 0, c.z);
    c.group.rotation.y = c.yaw;
    for (const w of c.wheels) w.rotation.x += c.speed * dt * 2.2;
    // light bar strobe
    if (c.lightBar) {
      const on = Math.floor(performance.now() / 180) % 2 === 0;
      c.lightBar.material.emissive.setHex(on ? 0xff2222 : 0x2244ff);
    }
    if (dist < POLICE_DEFS.catchRadius && pSpeed < 3) {
      bustPlayer(G);
      return;
    }
  }
}

export function bustPlayer(G) {
  G.bustedCount += 1;
  const fine = Math.min(G.money, POLICE_DEFS.bustedFine);
  G.money -= fine;
  G.heat = 0;
  G.wanted = 0;
  // impound the car, drop Rico at the hospital
  if (G.player.inVehicle) {
    const v = G.player.inVehicle;
    G.scene.remove(v.group);
    const i = G.vehicles.indexOf(v);
    if (i >= 0) G.vehicles.splice(i, 1);
    G.player.inVehicle = null;
    G.player.group.visible = true;
  }
  G.player.x = 260;
  G.player.z = -260;
  G.player.y = 0;
  G.player.vx = 0;
  G.player.vz = 0;
  G.player.group.position.set(260, 0, -260);
  for (const c of G.police) {
    G.scene.remove(c.group);
    const i = G.vehicles.indexOf(c);
    if (i >= 0) G.vehicles.splice(i, 1);
  }
  G.police = [];
  if (G.hud) G.hud.flash(`BUSTED — fined $${fine}. Don Sal is not pleased.`);
  if (G.audio) G.audio.busted();
}

export function addHeat(G, amount) {
  G.heat = Math.min(220, G.heat + amount);
}
