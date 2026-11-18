// The Vice Bay Police Department: a 1–5 star wanted level, patrol cars that become
// pursuit cars, arrests when they catch you on foot, and a search-and-lose system
// that lets you break line of sight and cool off.
import { spawnVehicle } from './vehicles.js';
import { randomRange } from './random.js';

export function addWanted(G, stars) {
  const before = G.wanted;
  G.wanted = Math.max(0, Math.min(5, G.wanted + stars));
  if (G.wanted > before) {
    G.wantedTimer = 0;
    G.crimeFlash = 2;
    if (G.hudFlash) G.hudFlash('WANTED LEVEL ' + G.wanted);
  }
}

export function updatePolice(G, dt, random) {
  // Wanted decays only when no police car can see you for a while.
  if (G.wanted > 0) {
    let nearest = Infinity;
    for (const cop of G.police) nearest = Math.min(nearest, Math.hypot(cop.x - G.player.x, cop.z - G.player.z));
    const px = G.currentVehicle ? G.currentVehicle.x : G.player.x;
    const pz = G.currentVehicle ? G.currentVehicle.z : G.player.z;
    let nearestV = Infinity;
    for (const cop of G.police) nearestV = Math.min(nearestV, Math.hypot(cop.x - px, cop.z - pz));
    if (nearestV > 90) {
      G.wantedTimer += dt;
      if (G.wantedTimer > 14 - G.wanted) {
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
    const px = G.currentVehicle ? G.currentVehicle.x : G.player.x;
    const pz = G.currentVehicle ? G.currentVehicle.z : G.player.z;
    const angle = random() * Math.PI * 2;
    const cop = spawnVehicle(G.scene, 'police', px + Math.sin(angle) * 70, pz + Math.cos(angle) * 70, angle, { driver: 'police' });
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

  // Pursuit: steer toward the player, ram the car, or run the player down on foot.
  const px = G.currentVehicle ? G.currentVehicle.x : G.player.x;
  const pz = G.currentVehicle ? G.currentVehicle.z : G.player.z;
  const playerSpeed = G.currentVehicle ? Math.abs(G.currentVehicle.speed) : G.player.speed;
  for (const cop of G.police) {
    const dx = px - cop.x;
    const dz = pz - cop.z;
    const dist = Math.hypot(dx, dz) || 1;
    const wantYaw = Math.atan2(-dx, -dz);
    let dy = wantYaw - cop.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    cop.yaw += Math.max(-2.4 * dt, Math.min(2.4 * dt, dy));
    const targetSpeed = Math.min(cop.topSpeed, dist * 0.8 + 18);
    cop.speed += (targetSpeed - cop.speed) * Math.min(1, dt * 1.2);
    cop.x -= Math.sin(cop.yaw) * cop.speed * dt;
    cop.z -= Math.cos(cop.yaw) * cop.speed * dt;
    cop.x = Math.max(-495, Math.min(495, cop.x));
    cop.z = Math.max(-495, Math.min(495, cop.z));
    cop.group.position.set(cop.x, 0, cop.z);
    cop.group.rotation.y = cop.yaw;
    for (const w of cop.wheels) w.rotation.x += cop.speed * dt * 2.4;
    // Ram the player's car: damage and a shove.
    if (G.currentVehicle && dist < 4.5) {
      G.currentVehicle.health = Math.max(0, G.currentVehicle.health - 5 * dt);
      if (Math.random() < dt * 0.5 && G.audio) G.audio.crash();
    }
    // Caught on foot: if you are slow and a cop touches you, you are busted.
    if (!G.currentVehicle && dist < 2.6 && playerSpeed < 3) {
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

  // Siren follows the chase.
  if (G.audio) G.audio.siren(G.police.length > 0, G.wanted);
}

// A patrol car that just cruises the streets when there is no heat (ambient police).
export function spawnPatrol(G, random) {
  const cop = spawnVehicle(G.scene, 'police', randomRange(-400, 400), randomRange(-400, 400), random() * Math.PI * 2, { driver: 'police' });
  cop.ai = { axis: 'x', dir: 1, line: cop.x, speed: 14, wait: 0 };
  G.vehicles.push(cop);
  G.patrol = G.patrol || [];
  G.patrol.push(cop);
  return cop;
}
