// The screenshot scenes behind ?shot=start|play|chase|night, rewritten for the
// v4 recorded pass. Each one stages a real moment of the game — the same world,
// the same rules, driven forward a few seconds by a scripted driver — so the
// frame is what playing really looks like and the same seed always gives the
// same frame. The briefing panel is hidden for the shot so the city, the car
// and the HUD fill the frame. New in v4: the start shot gets a slight camera
// angle so the dawn sun disc sits beside the hero, and the chase shot flashes
// the wanted stars for the frame.
import { STEP } from './config.js';
import { enterVehicle } from './vehicles.js';

function hideBriefing() {
  const el = document.getElementById('briefing');
  if (el) el.classList.remove('show');
}

function driveFor(G, seconds, steer = 0) {
  G.keys.KeyW = true;
  if (steer < 0) G.keys.KeyA = true;
  if (steer > 0) G.keys.KeyD = true;
  for (let i = 0; i < seconds / STEP; i += 1) G.update(STEP);
  G.keys.KeyW = false;
  G.keys.KeyA = false;
  G.keys.KeyD = false;
}

function walkFor(G, seconds) {
  G.keys.KeyW = true;
  for (let i = 0; i < seconds / STEP; i += 1) G.update(STEP);
  G.keys.KeyW = false;
}

function takeCar(G, x, z, yaw) {
  const car = G.vehicles.find((v) => v.typeKey === 'sport' && !v.isPlayer) || G.vehicles[0];
  car.x = x;
  car.z = z;
  car.yaw = yaw;
  car.health = 92;
  enterVehicle(G, car);
  return car;
}

export function stageShot(name, G) {
  G.screen = 'play';
  G.player.health = 100;
  G.money = 12500;
  G.rep = 85;
  if (name === 'start') {
    // Dawn over Downtown: the hero on foot, the city waking up behind the title,
    // the sunset sun disc glowing low on the horizon beside him.
    G.dayTime = 0.05;
    G.weather = 'clear';
    G.player.x = 0;
    G.player.z = 140;
    G.player.yaw = Math.PI;
    G.camOrbit = 0.15;
    G.wanted = 0;
    G.missionText = 'Mission 1: Welcome to Vice Bay — go to Rico\'s apartment';
    walkFor(G, 1.2);
    hideBriefing();
    G.screen = 'title';
    return 'title';
  }
  if (name === 'chase') {
    // Night in Downtown: 3 wanted stars, VBPD interceptors on your tail, the
    // mission marker glowing ahead and the minimap full of blue dots.
    G.dayTime = 0.97;
    G.weather = 'clear';
    takeCar(G, 0, -100, 0);
    G.wanted = 3;
    G.crimeFlash = 2;
    G.missionText = 'Mission 4: The Getaway — escape the police pursuit!';
    G.missionTarget = { x: 0, z: -400 };
    driveFor(G, 4, 0);
    // Reset the ram damage for the frame, then pull the pursuit cars into view
    // ahead of the player, flanking the road, so the chase reads at a glance.
    G.currentVehicle.health = 88;
    const px = G.currentVehicle.x;
    const pz = G.currentVehicle.z;
    const yaw = G.currentVehicle.yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const spots = [[16, -7], [20, 7], [27, 0], [33, -7]];
    for (let i = 0; i < spots.length && i < G.police.length; i += 1) {
      const cop = G.police[i];
      cop.x = px + fx * spots[i][0] - fz * spots[i][1];
      cop.z = pz + fz * spots[i][0] + fx * spots[i][1];
      cop.yaw = yaw;
      cop.speed = 40;
      cop.group.position.set(cop.x, 0, cop.z);
      cop.group.rotation.y = yaw;
    }
    for (let i = 0; i < 0.4 / STEP; i += 1) G.update(STEP);
    G.currentVehicle.health = 88;
    G.crimeFlash = 2;
    hideBriefing();
    return 'play';
  }
  if (name === 'night') {
    // Night Run: the illegal beach race at Ocean Beach, rain on the road, the
    // race checkpoints and the neon club glowing behind you.
    G.dayTime = 0.94;
    G.weather = 'rain';
    takeCar(G, 400, -40, 0);
    G.wanted = 0;
    G.missions.missionIndex = 6;
    G.missions.startMission(6);
    driveFor(G, 2.5, 0);
    hideBriefing();
    return 'play';
  }
  // play: midday Downtown, driving the Comet GT through live traffic with a
  // mission objective on the HUD and the minimap.
  G.dayTime = 0.35;
  G.weather = 'clear';
  takeCar(G, 0, 150, Math.PI);
  G.wanted = 0;
  G.missions.missionIndex = 0;
  G.missions.startMission(0);
  driveFor(G, 3, 0);
  hideBriefing();
  return 'play';
}
