// Vice Bay: Blood & Destiny — game loop, state machine, camera, save.
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

const THREE = window.THREE;

window.__pageError = null;
window.addEventListener('error', (e) => { window.__pageError = String(e.message || e.error); });

const params = new URLSearchParams(location.search);
const seed = parseInt(params.get('seed') || '7', 10) || 7;
const shotName = params.get('shot');
const rng = makeRng(seed);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5e0);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 5000);

const input = createInput();
const audio = createAudio();
const textures = makeTextures(rng);
const city = buildCity(scene, textures, rng);
const world = createWorld(scene);
const player = createPlayer(scene);
const vehicles = createVehicles(scene, city.colliders);
const traffic = createTraffic(scene, city, vehicles, rng);
const hud = createHud();

const ctx = {
  scene, camera, renderer, input, audio, world, city, vehicles, traffic,
  player, hud,
  money: 1000, rep: 0, health: 100, time: 0,
  state: 'title',
  shotCamera: null, shotDrive: null,
  camYaw: 0, camPitch: 0.32,
};

const police = createPolice(scene, city, vehicles, audio, () => {
  ctx.money = Math.max(0, ctx.money - 100);
  ctx.health = 100;
  player.reset(0, 0);
  hud.flash('BUSTED! -$100');
});
ctx.police = police;

const combat = createCombat(scene, audio, () => {
  ctx.money += 50;
  hud.flash('Enemy down +$50');
});
ctx.combat = combat;

const missions = createMissions(ctx);
ctx.missions = missions;

// Parked cars around the map for stealing and driving.
const parkedDefs = [
  ['comet', 220, 180, 0], ['sedan', -200, -200, Math.PI / 2], ['suv', 650, 700, 0],
  ['taxi', 60, 240, Math.PI], ['truck', 800, -600, Math.PI / 2], ['bike', -600, 400, 0],
  ['sedan', 900, 60, Math.PI], ['comet', -450, -500, 0],
];
for (const [type, x, z, h] of parkedDefs) {
  const c = vehicles.spawn(type, x, z, h);
  c.driver = 'parked';
}

world.setTimeOfDay(0.3);
player.reset(0, 0);

// Restore a save, if one exists.
const saved = loadGame();
let canContinue = false;
if (saved) {
  canContinue = true;
  ctx.money = saved.money || 1000;
  ctx.rep = saved.rep || 0;
  ctx.health = saved.health || 100;
  world.setTimeOfDay(saved.timeOfDay || 0.3);
  if (saved.weather) world.setWeather(saved.weather);
  missions.loadState(saved);
  player.reset(saved.px || 0, saved.pz || 0);
}

let state = 'title';
let frame = 0;
let shotFrames = 0;
let saveTimer = 0;
let camYaw = 0;
let camPitch = 0.32;

hud.showTitle(canContinue);

document.getElementById('btn-new').addEventListener('click', () => {
  audio.unlock();
  audio.click();
  ctx.money = 1000; ctx.rep = 0; ctx.health = 100;
  world.setTimeOfDay(0.3);
  player.reset(0, 0);
  hud.hideTitle();
  hud.showHud();
  state = 'playing';
  ctx.state = 'playing';
  hud.flash('Welcome to Vice Bay, Rico!');
});
document.getElementById('btn-continue').addEventListener('click', () => {
  audio.unlock();
  audio.click();
  hud.hideTitle();
  hud.showHud();
  state = 'playing';
  ctx.state = 'playing';
});
document.getElementById('btn-mute').addEventListener('click', () => {
  audio.setMuted(!audio.isMuted());
  document.getElementById('btn-mute').textContent = audio.isMuted() ? 'UNMUTE' : 'MUTE';
});

// Staged screenshot mode (?shot=start|play|chase|night&seed=7).
if (shotName) {
  hud.hideTitle();
  hud.showHud();
  state = 'shot';
  ctx.state = 'shot';
  stageShot(ctx, shotName);
  hud.update(ctx);
}

function nearestCar(maxDist) {
  return vehicles.nearest(player.pos.x, player.pos.z, maxDist);
}

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, 0.016);
  frame++;
  ctx.time += dt;
  ctx.camYaw = camYaw;

  // Menu / pause keys are handled BEFORE the playing-state check.
  if (input.wasPressed('m')) {
    if (state === 'playing') { state = 'menu'; ctx.state = 'menu'; hud.showMenu(missions); }
    else if (state === 'menu') { state = 'playing'; ctx.state = 'playing'; hud.hideMenu(); }
  }
  if (input.wasPressed('escape')) {
    if (state === 'menu') { state = 'playing'; ctx.state = 'playing'; hud.hideMenu(); }
    else if (state === 'playing') { state = 'paused'; ctx.state = 'paused'; hud.showPause(true); }
    else if (state === 'paused') { state = 'playing'; ctx.state = 'playing'; hud.showPause(false); }
  }
  if (input.wasPressed('p') && state === 'playing') {
    state = 'paused'; ctx.state = 'paused'; hud.showPause(true);
  }

  if (state === 'playing') {
    // Mouse-drag camera pitch.
    camYaw -= input.mouse.dx * 0.004;
    camPitch = Math.max(0.05, Math.min(1.1, camPitch + input.mouse.dy * 0.003));

    const car = player.inCar;
    if (car) {
      car.update(dt, input, true);
      audio.setEngine(Math.abs(car.speed));
    } else {
      player.update(dt, input, city.colliders, camYaw);
      audio.setEngine(0);
    }

    // E: enter / exit / steal.
    if (input.wasPressed('e')) {
      if (player.inCar) {
        player.exitCar();
      } else {
        const target = nearestCar(5);
        if (target) {
          if (target.driver === 'traffic') {
            police.addHeat(1);
            traffic.panicNear(target.pos.x, target.pos.z, 20);
            hud.flash('Car stolen! The cops saw that.');
          }
          target.driver = 'player';
          player.enterCar(target);
          audio.click();
        }
      }
    }

    // Weapons 1-5, R reload, click to fire.
    if (input.wasPressed('1')) combat.setWeapon('fists');
    if (input.wasPressed('2')) combat.setWeapon('pistol');
    if (input.wasPressed('3')) combat.setWeapon('smg');
    if (input.wasPressed('4')) combat.setWeapon('shotgun');
    if (input.wasPressed('5')) combat.setWeapon('rifle');
    if (input.wasPressed('r')) combat.reload();
    if (input.mouse.down && !player.inCar) {
      const dir = new THREE.Vector3(Math.sin(camYaw + Math.PI), 0, Math.cos(camYaw + Math.PI));
      combat.fire(player.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), dir);
    }

    // Side missions: T taxi, G race, Y delivery, U escape, H packages, J territory, K timetrial, L rescue.
    const sideKeys = { t: 'taxi', g: 'race', y: 'delivery', u: 'escape', h: 'packages', j: 'territory', k: 'timetrial', l: 'rescue' };
    for (const [key, id] of Object.entries(sideKeys)) {
      if (input.wasPressed(key)) missions.startSide(id);
    }

    const combatResult = combat.update(dt, player.pos, !!player.inCar);
    if (combatResult && combatResult.hit) {
      ctx.health = Math.max(0, ctx.health - combatResult.damage);
      if (ctx.health <= 0) {
        ctx.health = 100;
        ctx.money = Math.max(0, ctx.money - 150);
        player.reset(0, 0);
        hud.flash('WASTED! -$150');
      }
    }
    if (combatResult && combatResult.pickup === 'health') ctx.health = Math.min(100, ctx.health + 40);
    if (combatResult && combatResult.pickup === 'ammo') {
      combat.ammo[combat.weapon] += 24;
      hud.flash('Ammo +24');
    }

    // While driving, the player's position is the car's (pursuit, minimap
    // and objectives all read player.pos).
    if (player.inCar) player.pos.copy(player.inCar.pos);
    traffic.update(dt, player.pos, world.getWeather());
    police.update(dt, player.pos, !!player.inCar, player.inCar ? Math.abs(player.inCar.speed) : 0);
    missions.update(dt, player.pos);
    world.update(dt, player.pos);

    // Camera follow.
    const focus = player.inCar ? player.inCar.pos : player.pos;
    const speed = player.inCar ? Math.abs(player.inCar.speed) : 0;
    const dist = player.inCar ? 13 : 9;
    const cx = focus.x - Math.sin(camYaw) * dist * Math.cos(camPitch);
    const cz = focus.z - Math.cos(camYaw) * dist * Math.cos(camPitch);
    const cy = (player.inCar ? 5 : 4.5) + Math.sin(camPitch) * dist;
    camera.position.set(cx, cy, cz);
    camera.lookAt(focus.x, focus.y + 1.6, focus.z);
    camera.fov = 62 + Math.min(16, speed * 0.35);
    camera.updateProjectionMatrix();

    hud.update(ctx);
    hud.drawMinimap(player.pos.x, player.pos.z, camYaw, missions.objectivePos(),
      traffic.cars.map((t) => t.car), traffic.peds, police.pursuit);

    saveTimer += dt;
    if (saveTimer > 30) {
      saveTimer = 0;
      saveGame({
        money: ctx.money, rep: ctx.rep, health: ctx.health,
        timeOfDay: world.getTimeOfDay(), weather: world.getWeather(),
        storyIndex: missions.storyIndex, stepIndex: missions.stepIndex,
        px: player.pos.x, pz: player.pos.z,
      });
    }
  } else if (state === 'shot') {
    shotFrames++;
    const drive = ctx.shotDrive;
    if (drive && player.inCar) {
      player.inCar.speed = drive.speed;
      player.inCar.update(dt, null, false);
    }
    if (player.inCar) player.pos.copy(player.inCar.pos);
    traffic.update(dt, player.pos, world.getWeather());
    police.update(dt, player.pos, !!player.inCar, player.inCar ? Math.abs(player.inCar.speed) : 0);
    world.update(dt, player.pos);
    const cam = ctx.shotCamera;
    if (cam) {
      if (cam.mode === 'fixed') {
        camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
        camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);
      } else if (cam.mode === 'follow' && cam.car) {
        camera.position.set(cam.car.pos.x + cam.off[0], cam.off[1], cam.car.pos.z + cam.off[2]);
        camera.lookAt(cam.car.pos.x, 1.5, cam.car.pos.z);
      }
    }
    hud.update(ctx);
    hud.drawMinimap(player.pos.x, player.pos.z, camYaw, missions.objectivePos(),
      traffic.cars.map((t) => t.car), traffic.peds, police.pursuit);
    if (shotFrames >= 45) window.__shotReady = true;
  } else if (state === 'title') {
    // Drifting title camera over Downtown.
    const t = ctx.time * 0.05;
    camera.position.set(Math.sin(t) * 300, 120, Math.cos(t) * 300);
    camera.lookAt(100, 20, 100);
    world.update(dt, { x: 0, z: 0 });
  }

  renderer.render(scene, camera);
  input.endFrame();
  if (frame === 5) window.__gameReady = true;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(tick);
