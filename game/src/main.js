// Vice Bay: Blood & Destiny — game loop, states, camera, save, garage, shots.
import { CONFIG, VEHICLE_TYPES, WEAPONS } from './config.js';
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

window.addEventListener('error', (e) => { window.__pageError = String(e.message || e.error); });

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = parseInt(params.get('seed') || String(CONFIG.seed), 10);
const rng = makeRng(seed);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('game') });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9db8cc, 500, 2200);
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
const police = createPolice(scene, city, vehicles, audio, () => {
  ctx.money = Math.max(0, ctx.money - 100);
  ctx.health = 100;
  player.reset(0, 0);
  hud.flash('Busted! -$100 — the VBPD let you off with a warning');
});
const combat = createCombat(scene, audio, (enemy) => {
  ctx.money += 50;
  ctx.rep += 1;
  hud.flash('Rival down! +$50');
});
const ctx = {
  scene, camera, renderer, input, audio, world, city, vehicles, traffic,
  player, hud, police,
  money: 1000, rep: 0, health: 100, time: 0,
  shotCamera: null, shotDrive: null,
};
const missions = createMissions(ctx);
ctx.missions = missions;

// Owned garage cars.
const garage = { comet: true, sedan: false, suv: false, bike: false, truck: false };
const garageEl = document.getElementById('garage');
const garageList = document.getElementById('garage-list');
function renderGarage() {
  garageList.innerHTML = '';
  for (const [key, spec] of Object.entries(VEHICLE_TYPES)) {
    if (key === 'taxi' || key === 'police') continue;
    const row = document.createElement('div');
    row.className = 'menu-row';
    const owned = garage[key];
    row.innerHTML = `<b>${spec.name}</b><span>${owned ? 'OWNED — click to spawn' : '$' + spec.price + ' — click to buy'}</span>`;
    row.onclick = () => {
      if (!owned) {
        if (ctx.money < spec.price) { hud.flash('Not enough money!'); return; }
        ctx.money -= spec.price;
        garage[key] = true;
        hud.flash(`${spec.name} bought!`);
      }
      const car = vehicles.spawn(key, player.pos.x + 6, player.pos.z + 6, 0);
      car.driver = 'player';
      hud.flash(`${spec.name} delivered to your location`);
      garageEl.style.display = 'none';
    };
    garageList.appendChild(row);
  }
}
renderGarage();

// Save restore.
const saved = loadGame();
if (saved) {
  ctx.money = saved.money ?? 1000;
  ctx.rep = saved.rep ?? 0;
  ctx.health = saved.health ?? 100;
  world.setTimeOfDay(saved.timeOfDay ?? 0.3);
  world.setWeather(saved.weather ?? 'clear');
  missions.loadState(saved.storyIndex ?? 0);
  if (saved.pos) player.reset(saved.pos.x, saved.pos.z);
  if (saved.garage) Object.assign(garage, saved.garage);
}

let state = shotName ? 'shot' : 'title';
let camYaw = 0;
let camPitch = 0.32;
let frames = 0;
let saveTimer = 0;
let shotFrames = 0;
let currentCar = null;

if (shotName) {
  hud.hideTitle();
  stageShot(ctx, shotName);
  state = 'shot';
} else {
  hud.showTitle();
}

document.getElementById('btn-new').onclick = () => {
  audio.click();
  hud.hideTitle();
  hud.showHud();
  player.reset(0, 0);
  state = 'playing';
};
document.getElementById('btn-continue').onclick = () => {
  audio.click();
  hud.hideTitle();
  hud.showHud();
  state = 'playing';
};
document.getElementById('btn-mute').onclick = () => {
  audio.setMuted(!audio.isMuted());
  document.getElementById('btn-mute').textContent = audio.isMuted() ? 'UNMUTE' : 'MUTE';
};
document.getElementById('btn-garage-close').onclick = () => { garageEl.style.display = 'none'; };

function doSave() {
  saveGame({
    money: ctx.money, rep: ctx.rep, health: ctx.health,
    timeOfDay: world.getTimeOfDay(), weather: world.getWeather(),
    storyIndex: missions.storyIndex,
    pos: { x: player.pos.x, z: player.pos.z },
    garage,
  });
}

function fireWeapon() {
  if (player.inCar) return;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const from = camera.position.clone();
  combat.fire(from, dir, 0.02);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, 1 / 60);
  ctx.time += dt;
  frames++;
  // Menu keys first (before the playing-state check).
  if (input.wasPressed('m') || input.wasPressed('escape')) {
    if (state === 'playing') { state = 'menu'; hud.showMenu(); }
    else if (state === 'menu') { state = 'playing'; hud.hideMenu(); }
    else if (state === 'paused') { state = 'playing'; hud.hidePause(); }
  }
  if (input.wasPressed('p') && state === 'playing') { state = 'paused'; hud.showPause(); }
  if (input.wasPressed('p') && state === 'paused') { state = 'playing'; hud.hidePause(); }
  if (input.wasPressed('g') && state === 'playing') {
    garageEl.style.display = garageEl.style.display === 'flex' ? 'none' : 'flex';
    renderGarage();
  }
  if (input.wasPressed('q') && state === 'playing') {
    audio.cycleRadio();
    hud.flash(audio.radioStation() === 0 ? 'Radio off' : audio.radioStation() === 1 ? 'Vice FM' : 'Bay Jazz');
  }
  if (state === 'playing') {
    // Enter / exit / steal car.
    if (input.wasPressed('e')) {
      if (player.inCar) {
        const car = player.inCar;
        player.exitCar(car);
        currentCar = null;
        car.driver = 'traffic';
      } else {
        const car = vehicles.nearest(player.pos.x, player.pos.z, 5);
        if (car) {
          if (car.driver === 'traffic' && car.type !== 'police') {
            police.addHeat(1);
            traffic.panicNear(car.pos.x, car.pos.z);
            hud.flash('You stole the car! +1 star');
          }
          player.enterCar(car);
          car.driver = 'player';
          currentCar = car;
        }
      }
    }
    // Weapons 1-5.
    for (const [i, w] of ['fists', 'pistol', 'smg', 'shotgun', 'rifle'].entries()) {
      if (input.wasPressed(String(i + 1))) combat.setWeapon(w);
    }
    if (input.wasPressed('r')) combat.reload();
    if (input.mouse.down) fireWeapon();
    // Side missions 6-9 (number keys conflict with weapons; use F keys instead).
    if (input.wasPressed('f1')) missions.startSide(0);
    if (input.wasPressed('f2')) missions.startSide(1);
    if (input.wasPressed('f3')) missions.startSide(6);
    if (input.wasPressed('f4')) missions.startSide(3);
  }
  // Camera drag.
  camYaw -= input.mouse.dx * 0.004;
  camPitch = Math.max(0.08, Math.min(1.1, camPitch + input.mouse.dy * 0.003));
  if (state === 'playing' || state === 'menu' || state === 'paused') {
    if (player.inCar) {
      const car = player.inCar;
      vehicles.drive(car, dt, input, city.colliders);
      // Sync player position to the car (police + objective + minimap all use it).
      player.pos.copy(car.pos);
      audio.setEngine(Math.abs(car.speed) * 2.2);
      missions.update(dt, car.pos.x, car.pos.z, police.wanted);
      police.update(dt, car.pos, true, Math.abs(car.speed));
    } else {
      player.update(dt, input, city.colliders, camYaw);
      audio.setEngine(0);
      missions.update(dt, player.pos.x, player.pos.z, police.wanted);
      police.update(dt, player.pos, false, 0);
    }
    // Pickups.
    for (const p of [...combat.pickups]) {
      if (Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < 2.5) {
        if (p.kind === 'health') { ctx.health = Math.min(100, ctx.health + 30); hud.flash('+30 health'); }
        else { combat.addAmmo('pistol', 24); hud.flash('+24 pistol ammo'); }
        combat.takePickup(p);
      }
    }
    combat.update(dt, player.pos, null);
    traffic.update(dt, player.pos, world.getWeather());
    world.update(dt, player.pos);
    // Camera follow.
    const target = player.inCar ? player.inCar.pos : player.pos;
    const dist = player.inCar ? 13 : 9;
    const speed = player.inCar ? Math.abs(player.inCar.speed) : 0;
    const camX = target.x - Math.sin(camYaw) * Math.cos(camPitch) * dist;
    const camZ = target.z - Math.cos(camYaw) * Math.cos(camPitch) * dist;
    const camY = (player.inCar ? 2.5 : 2.2) + Math.sin(camPitch) * dist;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(target.x, target.y + 2, target.z);
    const fov = 62 + Math.min(16, speed * 0.35);
    if (Math.abs(camera.fov - fov) > 0.1) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    // HUD.
    const obj = missions.objectivePos();
    hud.update({
      health: ctx.health,
      money: ctx.money,
      rep: ctx.rep,
      wanted: police.wanted,
      speedKmh: (player.inCar ? Math.abs(player.inCar.speed) : 0) * 3.6,
      yaw: camYaw,
      objective: missions.objectiveText(),
      objDist: obj ? Math.hypot(obj.x - player.pos.x, obj.z - player.pos.z) : null,
      radio: audio.radioStation(),
      weapon: { name: WEAPONS[combat.weapon].name, mag: combat.mag[combat.weapon], ammo: combat.ammo[combat.weapon] },
    });
    hud.drawMinimap(player.pos.x, player.pos.z, camYaw, obj, traffic.cars, traffic.peds, police.pursuitCars, police.heli);
    // Autosave.
    saveTimer += dt;
    if (saveTimer > 30) { saveTimer = 0; doSave(); }
  } else if (state === 'title') {
    // Drifting title camera over Downtown.
    const t = ctx.time * 0.05;
    camera.position.set(Math.sin(t) * 320, 90, Math.cos(t) * 320);
    camera.lookAt(0, 20, 0);
    world.update(dt, new THREE.Vector3(0, 0, 0));
    traffic.update(dt, new THREE.Vector3(0, 0, 0), world.getWeather());
  } else if (state === 'shot') {
    shotFrames++;
    if (ctx.shotDrive && player.inCar) {
      const car = player.inCar;
      car.speed = ctx.shotDrive.speed;
      car.heading += ctx.shotDrive.steer * 0.01;
      car.update(1 / 60);
      player.pos.copy(car.pos);
      police.update(1 / 60, car.pos, true, car.speed);
    }
    if (player.inCar) player.pos.copy(player.inCar.pos);
    traffic.update(1 / 60, player.pos, world.getWeather());
    world.update(1 / 60, player.pos);
    if (ctx.shotCamera) {
      camera.position.set(...ctx.shotCamera.pos);
      camera.lookAt(...ctx.shotCamera.look);
    } else {
      const car = player.inCar;
      const target = car ? car.pos : player.pos;
      camera.position.set(target.x - Math.sin(camYaw) * 12, 5, target.z - Math.cos(camYaw) * 12);
      camera.lookAt(target.x, target.y + 2, target.z);
    }
    const obj = missions.objectivePos();
    hud.update({
      health: ctx.health, money: ctx.money, rep: ctx.rep, wanted: police.wanted,
      speedKmh: (player.inCar ? Math.abs(player.inCar.speed) : 0) * 3.6,
      yaw: camYaw, objective: missions.objectiveText(),
      objDist: obj ? Math.hypot(obj.x - player.pos.x, obj.z - player.pos.z) : null,
      radio: 0,
      weapon: { name: WEAPONS[combat.weapon].name, mag: combat.mag[combat.weapon], ammo: combat.ammo[combat.weapon] },
    });
    hud.drawMinimap(player.pos.x, player.pos.z, camYaw, obj, traffic.cars, traffic.peds, police.pursuitCars, police.heli);
    if (shotFrames >= 45 && !window.__shotReady) window.__shotReady = true;
  }
  if (frames === 5 && !window.__gameReady) window.__gameReady = true;
  renderer.render(scene, camera);
  input.endFrame();
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
