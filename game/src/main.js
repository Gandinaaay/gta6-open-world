// Vice Bay: Blood & Destiny — game loop, state machine, camera, wiring.
// Runs offline from static files; no network request at runtime.

import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { makeTextures } from './textures.js';
import { buildCity } from './city.js';
import { createWorld } from './world.js';
import { createPlayer } from './player.js';
import { createVehicles } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createMissions } from './missions.js';
import { createHud } from './hud.js';
import { saveGame, loadGame } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = parseInt(params.get('seed') || '1', 10) || 1;
const rng = makeRng(seed * 7919 + 13);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87b5e0, 300, 1600);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 4000);

const input = createInput();
const audio = createAudio();
const textures = makeTextures(rng);
const city = buildCity(scene, textures, rng);
const world = createWorld(scene);
const player = createPlayer(scene);
const vehicles = createVehicles(scene, city.colliders);
const traffic = createTraffic(scene, city, vehicles, rng);

const ctx = {
  scene, camera, renderer, input, audio, world, city, vehicles, traffic,
  player,
  money: 1000, rep: 0, health: 100, time: 0,
  shotCamera: null, shotDrive: null,
};
const hud = createHud();
ctx.hud = hud;
const police = createPolice(scene, city, vehicles, audio, () => {
  ctx.money = Math.max(0, ctx.money - 100);
  ctx.health = 100;
  player.reset(0, 0);
  hud.flash('BUSTED! -$100 — back on the streets');
});
ctx.police = police;
const combat = createCombat(scene, audio, () => {
  ctx.money += 50;
  ctx.rep += 1;
  police.addHeat(0); // a kill in public draws attention only via heat below
});
ctx.combat = combat;
const missions = createMissions(ctx);
ctx.missions = missions;

let state = shotName ? 'shot' : 'title';
let camYaw = 0;
let camPitch = 0.32;
let frames = 0;
let saveTimer = 0;
let shotFrames = 0;

if (shotName) {
  const staged = stageShot(ctx, shotName);
  document.getElementById('title').style.display = staged === 'start' ? 'flex' : 'none';
  world.setTimeOfDay(world.getTimeOfDay());
} else {
  const saved = loadGame();
  if (saved) {
    ctx.money = saved.money ?? 1000;
    ctx.rep = saved.rep ?? 0;
    ctx.health = saved.health ?? 100;
    missions.loadState(saved);
    if (saved.timeOfDay !== undefined) world.setTimeOfDay(saved.timeOfDay);
    if (saved.weather) world.setWeather(saved.weather);
    player.reset(saved.px ?? 0, saved.pz ?? 0);
  } else {
    player.reset(0, 0);
    world.setTimeOfDay(0.35);
  }
  hud.showTitle(true);
}

// Title screen buttons.
document.getElementById('btn-new').addEventListener('click', () => {
  audio.unlock();
  startPlaying();
});
document.getElementById('btn-continue').addEventListener('click', () => {
  audio.unlock();
  startPlaying();
});
document.getElementById('btn-mute').addEventListener('click', (e) => {
  audio.setMuted(!e.target.dataset.muted);
  e.target.dataset.muted = e.target.dataset.muted ? '' : '1';
  e.target.textContent = e.target.dataset.muted ? '🔇 Sound: Off' : '🔊 Sound: On';
});

function startPlaying() {
  state = 'playing';
  hud.showTitle(false);
  hud.flash(missions.objectiveText());
  audio.unlock();
}

function enterCar() {
  if (player.inCar) return;
  const car = vehicles.nearest(player.pos.x, player.pos.z, 5);
  if (!car) return;
  const wasTraffic = car.driver === 'traffic';
  car.driver = 'player';
  player.enterCar(car);
  audio.click();
  if (wasTraffic) {
    police.addHeat(1);
    hud.flash('Car stolen! The cops are watching…');
    traffic.panicNear(player.pos.x, player.pos.z, 20);
  }
}

function exitCar() {
  if (!player.inCar) return;
  const car = player.exitCar();
  if (car) car.driver = null;
}

function fireWeapon() {
  if (player.inCar || state !== 'playing') return;
  const from = camera.position.clone();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const w = combat.current;
  const spread = w === 'smg' ? 0.06 : w === 'shotgun' ? 0.12 : 0.01;
  if (combat.fire(from, dir, spread)) {
    traffic.panicNear(player.pos.x, player.pos.z, 30);
    if (police.wanted < 2) police.addHeat(1);
  }
}

function updateCamera(dt) {
  const inCar = player.inCar;
  const target = inCar ? player.car.pos : player.pos;
  const speed = inCar ? Math.abs(player.car.speed) : Math.hypot(0, 0);
  // Mouse-drag pitch.
  if (input.mouse.down) camPitch = Math.max(0.05, Math.min(0.9, camPitch + input.mouse.dy * 0.002));
  // Yaw follows the heading when moving.
  const heading = inCar ? player.car.heading : player.heading;
  const moving = inCar ? Math.abs(player.car.speed) > 1 : input.is('w') || input.is('s') || input.is('a') || input.is('d');
  if (moving) {
    let diff = heading - camYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    camYaw += diff * Math.min(1, dt * 2.5);
  }
  const dist = inCar ? 11 : 8.5;
  const h = inCar ? 4.5 : 3.5;
  const cx = target.x - Math.sin(camYaw) * Math.cos(camPitch) * dist;
  const cz = target.z - Math.cos(camYaw) * Math.cos(camPitch) * dist;
  const cy = target.y + h + Math.sin(camPitch) * dist * 0.6;
  camera.position.set(cx, cy, cz);
  camera.lookAt(target.x, target.y + 1.5, target.z);
  const fov = 62 + Math.min(16, (inCar ? Math.abs(player.car.speed) : 0) * 0.35);
  if (Math.abs(camera.fov - fov) > 0.1) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}

function updateHud(dt) {
  hud.setHealth(ctx.health);
  hud.setMoney(ctx.money);
  hud.setRep(ctx.rep);
  hud.setWanted(police.wanted, police.flash < 1);
  const speed = player.inCar ? player.car.speed * 3.6 : 0;
  hud.setSpeed(speed);
  hud.setCompass(camYaw);
  const obj = missions.objectivePos();
  const dist = obj ? Math.hypot(obj.x - player.pos.x, obj.z - player.pos.z) : null;
  hud.setObjective(missions.objectiveText(), dist);
  hud.update(dt);
  const cops = police.wanted > 0 ? [] : [];
  hud.drawMinimap(player.pos.x, player.pos.z, camYaw, obj, traffic.cars, traffic.peds, cops);
  if (combat.takeHealthPickup()) {
    ctx.health = Math.min(100, ctx.health + 30);
    hud.flash('+30 health');
  }
}

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  ctx.time += dt;
  frames++;

  if (state === 'title') {
    // Slow drifting title camera over the city.
    const t = ctx.time * 0.05;
    camera.position.set(Math.sin(t) * 500, 180, Math.cos(t) * 500);
    camera.lookAt(0, 20, 0);
    world.update(dt, { x: 0, z: 0 });
    traffic.update(dt, player.pos, world.getWeather(), ctx.time);
  } else if (state === 'shot') {
    // Scripted drive for the screenshot scenes.
    if (ctx.shotDrive && player.inCar) {
      const car = player.car;
      car.speed += (ctx.shotDrive.speed - car.speed) * Math.min(1, dt * 2);
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      car.mesh.rotation.y = car.heading;
      for (const w of car.wheels) w.rotation.x += car.speed * dt * 2;
    }
    updateCamera(dt);
    world.update(dt, player.pos);
    traffic.update(dt, player.pos, world.getWeather(), ctx.time);
    police.update(dt, player.pos, player.inCar, player.inCar ? Math.abs(player.car.speed) : 0);
    updateHud(dt);
    shotFrames++;
    if (shotFrames === 45) window.__shotReady = true;
  } else if (state === 'playing') {
    // Menu keys are handled BEFORE the playing-state check (round-4 lesson).
    if (input.wasPressed('m')) {
      state = 'menu';
      const rows = [
        ...missions.storyList().map((m) => ({ name: `Story ${m.id}: ${m.name}`, desc: m.desc, current: m.current, done: m.done })),
        ...missions.sideList().map((m) => ({ name: `Side: ${m.name}`, desc: m.desc, current: m.active, done: false })),
      ];
      hud.showMenu(true, rows);
    } else if (input.wasPressed('escape')) {
      state = 'paused';
      hud.showPause(true);
    } else {
      if (input.wasPressed('e')) {
        if (player.inCar) exitCar();
        else enterCar();
      }
      if (input.wasPressed('r')) combat.reload();
      if (input.wasPressed('1')) combat.setWeapon('fists');
      if (input.wasPressed('2')) combat.setWeapon('pistol');
      if (input.wasPressed('3')) combat.setWeapon('smg');
      if (input.wasPressed('4')) combat.setWeapon('shotgun');
      if (input.wasPressed('5')) combat.setWeapon('rifle');
      if (input.mouse.down) fireWeapon();

      player.update(dt, input, city.colliders, camYaw);
      vehicles.update(dt, input, camYaw);
      traffic.update(dt, player.pos, world.getWeather(), ctx.time);
      police.update(dt, player.pos, player.inCar, player.inCar ? Math.abs(player.car.speed) : 0);
      const dir = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
      combat.update(dt, player.pos, dir);
      missions.update(dt, player.pos);
      world.update(dt, player.pos);
      updateCamera(dt);
      updateHud(dt);
      audio.setEngine(player.inCar ? Math.abs(player.car.speed) / 52 : 0);

      saveTimer += dt;
      if (saveTimer > 30) {
        saveTimer = 0;
        saveGame({
          money: ctx.money, rep: ctx.rep, health: ctx.health,
          storyIndex: missions.storyIndex,
          timeOfDay: world.getTimeOfDay(), weather: world.getWeather(),
          px: player.pos.x, pz: player.pos.z,
        });
      }
    }
  } else if (state === 'menu') {
    if (input.wasPressed('m') || input.wasPressed('escape')) {
      state = 'playing';
      hud.showMenu(false);
    }
  } else if (state === 'paused') {
    if (input.wasPressed('escape')) {
      state = 'playing';
      hud.showPause(false);
    }
  }

  input.endFrame();
  renderer.render(scene, camera);
  if (frames === 5) window.__gameReady = true;
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

window.addEventListener('error', (e) => {
  window.__pageError = String(e.message || e.error);
});

loop();
