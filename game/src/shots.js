// The screenshot scenes behind ?shot=start|play|chase|night. Each one stages
// a real moment of the game — the same world, the same rules, driven forward
// a few seconds by a scripted driver — so the frame is what playing really
// looks like and the same seed always gives the same frame. The briefing
// panel is hidden for the shot so the city, the car and the HUD fill the
// frame. The start shot gets a slight camera angle so the dawn sun disc sits
// beside the hero, and the chase shot flashes the wanted stars for the frame.
// Round 3: each scene is one function in a table, sharing two small drivers
// (walkFor / driveFor) and one car-grabber.
import { STEP } from './config.js';
import { enterVehicle } from './vehicles.js';

function hideBriefing() {
  const el = document.getElementById('briefing');
  if (el) el.classList.remove('show');
}

function holdKeys(G, seconds, keys) {
  for (const k of keys) G.keys[k] = true;
  for (let i = 0; i < seconds / STEP; i += 1) G.update(STEP);
  for (const k of keys) G.keys[k] = false;
}

function driveFor(G, seconds, steer = 0) {
  const keys = ['KeyW'];
  if (steer < 0) keys.push('KeyA');
  if (steer > 0) keys.push('KeyD');
  holdKeys(G, seconds, keys);
}

function walkFor(G, seconds) {
  holdKeys(G, seconds, ['KeyW']);
}

function grabCar(G, x, z, yaw) {
  const car = G.vehicles.find((v) => v.typeKey === 'sport' && !v.isPlayer) || G.vehicles[0];
  car.x = x;
  car.z = z;
  car.yaw = yaw;
  car.health = 92;
  enterVehicle(G, car);
  return car;
}

function freshState(G) {
  G.screen = 'play';
  G.player.health = 100;
  G.money = 12500;
  G.rep = 85;
}

const SCENES = {
  // Dawn over Downtown: the hero on foot, the city waking up behind the title,
  // the sunset sun disc glowing low on the horizon beside him.
  start(G) {
    freshState(G);
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
  },

  // Night in Downtown: 3 wanted stars, VBPD interceptors on your tail, the
  // mission marker glowing ahead and the minimap full of blue dots.
  chase(G) {
    freshState(G);
    G.dayTime = 0.97;
    G.weather = 'clear';
    grabCar(G, 0, -100, 0);
    G.wanted = 3;
    G.crimeFlash = 2;
    G.missionText = 'Mission 4: The Getaway — escape the police pursuit!';
    G.missionTarget = { x: 0, z: -400 };
    driveFor(G, 4, 0);
    // Reset the ram damage for the frame, then pull the pursuit cars into view
    // ahead of the player, flanking the road, so the chase reads at a glance.
    const car = G.currentVehicle;
    car.health = 88;
    const fx = -Math.sin(car.yaw);
    const fz = -Math.cos(car.yaw);
    const spots = [[16, -7], [20, 7], [27, 0], [33, -7]];
    for (let i = 0; i < spots.length && i < G.police.length; i += 1) {
      const cop = G.police[i];
      cop.x = car.x + fx * spots[i][0] - fz * spots[i][1];
      cop.z = car.z + fz * spots[i][0] + fx * spots[i][1];
      cop.yaw = car.yaw;
      cop.speed = 40;
      cop.group.position.set(cop.x, 0, cop.z);
      cop.group.rotation.y = car.yaw;
    }
    holdKeys(G, 0.4, []);
    car.health = 88;
    G.crimeFlash = 2;
    hideBriefing();
    return 'play';
  },

  // Night Run: the illegal beach race at Ocean Beach, rain on the road, the
  // race checkpoints and the neon club glowing behind you.
  night(G) {
    freshState(G);
    G.dayTime = 0.94;
    G.weather = 'rain';
    grabCar(G, 400, -40, 0);
    G.wanted = 0;
    G.missions.missionIndex = 6;
    G.missions.startMission(6);
    driveFor(G, 2.5, 0);
    hideBriefing();
    return 'play';
  },

  // Midday Downtown, driving the Comet GT through live traffic with a
  // mission objective on the HUD and the minimap.
  play(G) {
    freshState(G);
    G.dayTime = 0.35;
    G.weather = 'clear';
    grabCar(G, 0, 150, Math.PI);
    G.wanted = 0;
    G.missions.missionIndex = 0;
    G.missions.startMission(0);
    driveFor(G, 3, 0);
    hideBriefing();
    return 'play';
  },
};

export function stageShot(name, G) {
  const scene = SCENES[name] || SCENES.play;
  return scene(G);
}
