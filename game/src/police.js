// The Vice Bay Police Department: a 1–5 star wanted level, patrol cars that
// become pursuit cars, arrests when they catch you on foot, and a
// search-and-lose system that lets you break line of sight and cool off.
// More stars means more cars, faster cars, and a shorter fuse before they
// give up. Pursuit cars flash their light bars even though they never call
// driveVehicle — the chase reads from far away. Round 2: the chase steers
// with a small heading helper and the heat decay is one table lookup.
import { spawnVehicle } from './vehicles.js';
import { randomRange } from './random.js';
import { WANTED_COOLOFF_BASE, WANTED_FLASH_TIME } from './config.js';

// Seconds you must stay out of sight before one star drops, by wanted level.
function cooloffSeconds(wanted) {
  return Math.max(6, WANTED_COOLOFF_BASE - wanted);
}

export function addWanted(G, stars) {
  const before = G.wanted;
  G.wanted = Math.max(0, Math.min(5, G.wanted + stars));
  if (G.wanted > before) {
    G.wantedTimer = 0;
    G.crimeFlash = WANTED_FLASH_TIME;
    if (G.hudFlash) G.hudFlash('WANTED LEVEL ' + G.wanted);
  }
}

function playerPos(G) {
  const focus = G.currentVehicle || G.player;
  const vx = G.currentVehicle ? -Math.sin(G.currentVehicle.yaw) * G.currentVehicle.speed : 0;
  const vz = G.currentVehicle ? -Math.cos(G.currentVehicle.yaw) * G.currentVehicle.speed : 0;
  return {
    x: focus.x, z: focus.z, vx, vz,
    speed: G.currentVehicle ? Math.abs(G.currentVehicle.speed) : G.player.speed,
  };
}

function turnToward(yaw, wantYaw, maxTurn, dt) {
  let dy = wantYaw - yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  return yaw + Math.max(-maxTurn * dt, Math.min(maxTurn * dt, dy));
}

function flashLightBar(cop, dt) {
  if (!cop.group.userData.lightBar) return;
  cop.lightPhase += dt * 6;
  cop.group.userData.lightBar.material.color.setHex(Math.sin(cop.lightPhase) > 0 ? 0xff0000 : 0x0000ff);
}

export function updatePolice(G, dt, random) {
  const p = playerPos(G);
  // Wanted decays only when no police car is near you for a while. The hotter
  // you are, the longer you have to stay hidden before a star drops.
  if (G.wanted > 0) {
    let nearestV = Infinity;
    for (const cop of G.police) nearestV = Math.min(nearestV, Math.hypot(cop.x - p.x, cop.z - p.z));
    if (nearestV > 90) {
      G.wantedTimer += dt;
      if (G.wantedTimer > cooloffSeconds(G.wanted)) {
        G.wanted -= 1;
        G.wantedTimer = 0;
        G.toast(G.wanted === 0 ? 'You lost the police.' : 'Heat is cooling down — wanted level ' + G.wanted + '.');
      }
    } else {
      G.wantedTimer = 0;
    }
  }

  // Spawn pursuit cars up to the wanted level (more stars, more cars, faster).
  const wantCount = G.wanted === 0 ? 0 : Math.min(4, G.wanted + 1);
  while (G.police.length < wantCount) {
    const angle = random() * Math.PI * 2;
    const cop = spawnVehicle(G.scene, 'police', p.x + Math.sin(angle) * 70, p.z + Math.cos(angle) * 70, angle, { driver: 'police' });
    cop.ai = { chase: true, speed: 0 };
    cop.topSpeed = 56 + G.wanted * 2;
    G.police.push(cop);
    G.vehicles.push(cop);
  }
  // Extra cars leave when the heat dies down.
  while (G.police.length > wantCount) {
    const cop = G.police.pop();
    const i = G.vehicles.indexOf(cop);
    if (i >= 0) G.vehicles.splice(i, 1);
    G.scene.remove(cop.group);
  }

  // Pursuit: steer toward where the player will be, not where he is — the
  // intercept point is half a second ahead — then ram the car, or run the
  // player down on foot.
  for (const cop of G.police) {
    const tx = p.x + p.vx * 0.5;
    const tz = p.z + p.vz * 0.5;
    const dist = Math.hypot(p.x - cop.x, p.z - cop.z) || 1;
    cop.yaw = turnToward(cop.yaw, Math.atan2(-(tx - cop.x), -(tz - cop.z)), 2.6, dt);
    const targetSpeed = Math.min(cop.topSpeed, dist * 0.8 + 18);
    cop.speed += (targetSpeed - cop.speed) * Math.min(1, dt * 1.2);
    cop.x -= Math.sin(cop.yaw) * cop.speed * dt;
    cop.z -= Math.cos(cop.yaw) * cop.speed * dt;
    cop.x = Math.max(-495, Math.min(495, cop.x));
    cop.z = Math.max(-495, Math.min(495, cop.z));
    cop.group.position.set(cop.x, 0, cop.z);
    cop.group.rotation.y = cop.yaw;
    for (const w of cop.wheels) w.rotation.x += cop.speed * dt * 2.4;
    flashLightBar(cop, dt);
    // Ram the player's car: damage and a shove.
    if (G.currentVehicle && dist < 4.5) {
      G.currentVehicle.health = Math.max(0, G.currentVehicle.health - 5 * dt);
      if (Math.random() < dt * 0.5 && G.audio) G.audio.crash();
    }
    // Caught on foot: if you are slow and a cop touches you, you are busted.
    if (!G.currentVehicle && dist < 2.6 && p.speed < 3) {
      G.bustedTimer = (G.bustedTimer || 0) + dt;
      if (G.bustedTimer > 1.2) {
        G.bustedTimer = 0;
        G.busted();
      }
    } else {
      G.bustedTimer = 0;
    }
    // A cop car wrecked hard enough stops chasing.
    if (cop.health <= 0) {
      cop.ai = null;
      cop.speed = 0;
      const i = G.police.indexOf(cop);
      if (i >= 0) G.police.splice(i, 1);
      G.toast('You wrecked a police car!');
    }
  }

  // The siren follows the chase.
  if (G.audio) G.audio.siren(G.police.length > 0, G.wanted);
}

// A patrol car that just cruises the streets when there is no heat (ambient police).
// Its ai uses the same heading-vector shape as traffic cars (hx/hz).
export function spawnPatrol(G, random) {
  const cop = spawnVehicle(G.scene, 'police', randomRange(-400, 400), randomRange(-400, 400), random() * Math.PI * 2, { driver: 'police' });
  cop.ai = { hx: 1, hz: 0, speed: 14, wait: 0 };
  G.vehicles.push(cop);
  G.patrol = G.patrol || [];
  G.patrol.push(cop);
  return cop;
}
