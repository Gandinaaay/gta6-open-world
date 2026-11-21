// Vice Bay: Blood & Destiny — boot and the one loop: input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is there. The
// game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the city. ?shot=start|play|chase|night (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.

import { ECONOMY, PLAYER, VEHICLES, WEAPONS, WORLD } from './config.js';
import { createRandom } from './random.js';
import { makeTextures } from './textures.js';
import { createCity } from './city.js';
import { createWorldState } from './world.js';
import { createPlayer } from './player.js';
import { createGarage } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createMissions } from './missions.js';
import { loadSave, saveSave } from './save.js';
import { createHud } from './hud.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const THREE = globalThis.THREE;
const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const rand = createRandom(seed);

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

function fail(message) {
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.style.display = 'block';
  }
  throw new Error(message);
}

if (!THREE) fail('Three.js did not load: game/vendor/three.min.js is missing.');
if (!canvas) fail('No #game canvas in the page.');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (err) {
  fail(`WebGL is unavailable in this browser (${err.message}).`);
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d6);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2400);

const textures = makeTextures(rand);
const { colliders } = createCity(scene, textures, rand);
const worldState = createWorldState(scene);
const player = createPlayer(scene, colliders);
const garage = createGarage(scene, colliders, rand);
const traffic = createTraffic(scene, rand);
const police = createPolice(scene, colliders, rand);
const combat = createCombat(scene);
const hud = createHud();
const input = createInput(canvas);
const audio = createAudio();

const saved = loadSave();
const state = {
  money: saved ? saved.money : PLAYER.startMoney,
  health: PLAYER.health,
  garage: saved ? saved.garage.slice() : ['Vice Sedan'],
  missionsDone: saved ? saved.missionsDone.slice() : [],
  bestChase: saved ? saved.bestChase : 0,
  muted: saved ? saved.muted : false,
};
audio.setMuted(state.muted);

let screen = 'title';
let currentVehicle = null;
let camYaw = 0;
let camDist = 11;
let camHeight = 6;
let camFixed = false;
let fixedEye = null;
let fixedTarget = null;
let lastDamageAt = -10;
let elapsed = 0;
let saveTimer = 0;
let autoMissionTimer = 4;

const rivals = [];
const pickups = [];
const pickupGeo = new THREE.SphereGeometry(0.9, 12, 10);
const pickupMat = new THREE.MeshBasicMaterial({ color: 0xffd94a });
const rivalMat = new THREE.MeshLambertMaterial({ color: 0x6b1e7a });
const rivalGeo = new THREE.BoxGeometry(0.9, 1.7, 0.5);

function addMoney(n) {
  state.money += n;
  hud.setMoney(state.money);
  persist();
}

function persist() {
  saveSave({
    money: state.money,
    garage: state.garage,
    missionsDone: state.missionsDone,
    bestChase: state.bestChase,
    muted: state.muted,
  });
}

function showScreen(name) {
  screen = name;
  const titleEl = document.getElementById('screen-title');
  if (titleEl) titleEl.style.display = name === 'title' ? 'flex' : 'none';
  const pauseEl = document.getElementById('screen-pause');
  if (pauseEl) pauseEl.style.display = name === 'paused' ? 'flex' : 'none';
  const overEl = document.getElementById('screen-over');
  if (overEl) overEl.style.display = name === 'over' ? 'flex' : 'none';
}

function spawnPickups(n, cx, cz) {
  clearPickups();
  for (let i = 0; i < n; i++) {
    const a = rand.angle();
    const r = 20 + rand.next() * 90;
    const m = new THREE.Mesh(pickupGeo, pickupMat);
    m.position.set(cx + Math.cos(a) * r, 1.2, cz + Math.sin(a) * r);
    scene.add(m);
    pickups.push(m);
  }
}

function clearPickups() {
  for (const m of pickups) scene.remove(m);
  pickups.length = 0;
}

function spawnRivals(n, cx, cz) {
  clearRivals();
  for (let i = 0; i < n; i++) {
    const a = rand.angle();
    const r = 8 + rand.next() * 30;
    const m = new THREE.Mesh(rivalGeo, rivalMat);
    m.position.set(cx + Math.cos(a) * r, 0.85, cz + Math.sin(a) * r);
    m.castShadow = true;
    scene.add(m);
    rivals.push({ mesh: m, hp: 40, position: m.position });
  }
}

function clearRivals() {
  for (const r of rivals) scene.remove(r.mesh);
  rivals.length = 0;
}

const missions = createMissions((event) => {
  if (event.type === 'mission-start') {
    hud.setMission(`${event.def.name}: ${event.def.brief}`);
    hud.toast(`New job: ${event.def.name}`);
    audio.mission();
    if (event.def.kind === 'collect') spawnPickups(event.def.count, event.def.x, event.def.z);
    if (event.def.kind === 'eliminate') spawnRivals(event.def.count, event.def.x, event.def.z);
    if (event.def.kind === 'chase') police.addCrime(1.6);
  } else if (event.type === 'mission-done') {
    state.missionsDone.push(event.def.id);
    hud.toast(`Job done: ${event.def.name} +$${event.reward}`);
    hud.setMission('Job complete. The next job starts soon.');
    audio.mission();
    clearPickups();
    clearRivals();
    persist();
  } else if (event.type === 'mission-fail') {
    hud.toast(`Job failed: ${event.why}`);
    hud.setMission('Job failed. The next job starts soon.');
    audio.fail();
    clearPickups();
    clearRivals();
  } else if (event.type === 'objective') {
    hud.toast(`Objective ${event.progress}/${event.need}`);
    audio.pickup();
  }
});
missions.setDone(state.missionsDone);

function enterVehicle(v) {
  currentVehicle = v;
  player.group.visible = false;
  if (!state.garage.includes(v.type.name)) {
    state.garage.push(v.type.name);
    persist();
  }
  police.addCrime(0.25);
  audio.engineStart();
  hud.toast(`Driving the ${v.type.name} — E to get out`);
}

function exitVehicle() {
  if (!currentVehicle) return;
  const v = currentVehicle;
  v.stop();
  currentVehicle = null;
  player.group.visible = true;
  player.teleport(v.position.x + 3, v.position.z + 3);
  audio.engineStop();
}

function spawnCar(typeName, x, z, heading) {
  const type = VEHICLES.find((t) => t.name === typeName) || VEHICLES[0];
  return garage.spawn(type, x, z, heading);
}

function damagePlayer(n) {
  if (elapsed - lastDamageAt < 0.8) return;
  lastDamageAt = elapsed;
  state.health = Math.max(0, state.health - n);
  hud.setHealth(state.health);
  audio.crash();
  if (state.health <= 0) {
    showScreen('over');
    audio.fail();
  }
}

// Camera: drag to orbit; while driving it eases behind the car.
let dragging = false;
let lastPointerX = 0;
canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastPointerX = e.clientX;
});
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  camYaw -= (e.clientX - lastPointerX) * 0.005;
  lastPointerX = e.clientX;
  camFixed = false;
});
window.addEventListener('pointerup', () => { dragging = false; });

const cameraApi = {
  set(x, y, z, tx, ty, tz) {
    fixedEye = new THREE.Vector3(x, y, z);
    fixedTarget = new THREE.Vector3(tx, ty, tz);
    camFixed = true;
    camera.position.copy(fixedEye);
    camera.lookAt(fixedTarget);
  },
};

function updateCamera(dt) {
  if (camFixed) return;
  const target = currentVehicle ? currentVehicle.position : player.position;
  if (currentVehicle) {
    let dh = currentVehicle.heading - camYaw;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    camYaw += dh * Math.min(1, dt * 1.2);
    camDist = 13;
    camHeight = 7;
  } else {
    camDist = 11;
    camHeight = 6;
  }
  const eye = new THREE.Vector3(
    target.x + Math.sin(camYaw) * camDist,
    target.y + camHeight,
    target.z + Math.cos(camYaw) * camDist,
  );
  camera.position.lerp(eye, Math.min(1, dt * 6));
  camera.lookAt(target.x, target.y + 2, target.z);
}

function step(dt) {
  elapsed += dt;
  worldState.update(dt);
  traffic.update(dt);
  input.refresh();

  if (input.consumePause() && (screen === 'play' || screen === 'paused')) {
    showScreen(screen === 'play' ? 'paused' : 'play');
  }
  if (input.consumeMute()) {
    state.muted = !state.muted;
    audio.setMuted(state.muted);
    hud.toast(state.muted ? 'Sound off' : 'Sound on');
    persist();
  }
  if (screen !== 'play') return;

  // Missions start themselves: the next main job begins a few seconds after the
  // last one ends, so the story never stalls waiting for a key.
  if (!missions.active) {
    autoMissionTimer -= dt;
    if (autoMissionTimer <= 0) {
      const next = missions.nextMain;
      if (next !== null) missions.start('main', next);
      autoMissionTimer = 8;
    }
  }

  const st = input.state;
  // Weapon switching.
  const weaponNames = ['fist', 'pistol', 'smg', 'shotgun'];
  const wantWeapon = weaponNames[st.weaponSlot] || 'pistol';
  if (wantWeapon !== combat.weapon) combat.setWeapon(wantWeapon);

  if (currentVehicle) {
    currentVehicle.update(dt, st, colliders);
    player.position.set(currentVehicle.position.x, 0, currentVehicle.position.z);
    audio.engineSet(Math.abs(currentVehicle.speed) / currentVehicle.type.top);
    if (st.interact) {
      exitVehicle();
      st.interact = false; // consume the press
    }
    // Ramming a cruiser at speed hurts the player too.
    for (const c of police.cruisers) {
      const d = Math.hypot(c.position.x - currentVehicle.position.x, c.position.z - currentVehicle.position.z);
      if (d < 3.4 && Math.abs(c.speed) > 6) damagePlayer(8);
    }
  } else {
    player.update(dt, st, camYaw);
    audio.engineSet(0);
    if (st.interact) {
      const near = garage.nearest(player.position, 5);
      if (near) enterVehicle(near);
      st.interact = false; // consume the press
    }
    if (st.firing) {
      const dir = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      const from = player.position.clone();
      from.y = 1.3;
      const hit = combat.fire(from, dir, rivals, (t, dmg) => {
        t.hp -= dmg;
        if (t.hp <= 0) {
          scene.remove(t.mesh);
          rivals.splice(rivals.indexOf(t), 1);
          missions.eliminate();
          addMoney(20);
        }
      });
      if (hit && combat.weapon !== 'fist') {
        police.addCrime(0.12);
        audio.shot();
      } else if (hit) {
        audio.punch();
      }
    }
    // Police contact on foot.
    for (const c of police.cruisers) {
      const d = Math.hypot(c.position.x - player.position.x, c.position.z - player.position.z);
      if (d < 3.2 && Math.abs(c.speed) > 6) damagePlayer(12);
    }
  }

  // Mission pickups.
  for (let i = pickups.length - 1; i >= 0; i--) {
    const m = pickups[i];
    const d = Math.hypot(m.position.x - player.position.x, m.position.z - player.position.z);
    m.rotation.y += dt * 2;
    m.position.y = 1.2 + Math.sin(elapsed * 3 + i) * 0.25;
    if (d < 3.5) {
      scene.remove(m);
      pickups.splice(i, 1);
      missions.collect();
      addMoney(25);
    }
  }

  police.update(dt, player.position, currentVehicle ? currentVehicle.speed : 0);
  combat.update(dt);

  // Mission progress (goto / chase / eliminate timers).
  missions.update(dt, {
    playerPos: player.position,
    wanted: police.stars,
    addMoney,
  });

  // Health regen when the heat is off.
  if (police.stars === 0 && state.health > 0 && state.health < PLAYER.health && elapsed - lastDamageAt > 5) {
    state.health = Math.min(PLAYER.health, state.health + 2 * dt);
    hud.setHealth(state.health);
  }

  // HUD.
  hud.setHealth(state.health);
  hud.setMoney(state.money);
  hud.setWanted(police.stars);
  hud.setClock(worldState.clockText(), worldState.isNight());
  hud.update(dt);
  const target = missions.currentTarget();
  hud.drawMinimap(
    player.position,
    target,
    police.cruisers.map((c) => c.position),
    currentVehicle ? currentVehicle.position : null,
  );

  // Periodic save.
  saveTimer += dt;
  if (saveTimer > 15) {
    saveTimer = 0;
    persist();
  }

  updateCamera(dt);
}

function render() {
  renderer.render(scene, camera);
}

function loop(now) {
  requestAnimationFrame(loop);
  if (screen === 'title' || screen === 'over') {
    // Idle orbit behind the title screen so the city is visible.
    const t = now * 0.0001;
    camera.position.set(Math.sin(t) * 180, 90, Math.cos(t) * 180);
    camera.lookAt(0, 10, 0);
    render();
    return;
  }
  const dt = Math.min(MAX_FRAME, (now - loop.last) / 1000 || 0.016);
  loop.last = now;
  let acc = dt;
  while (acc > 0) {
    const h = Math.min(STEP, acc);
    step(h);
    acc -= h;
  }
  render();
}
loop.last = performance.now();

function startGame() {
  audio.unlock();
  showScreen('play');
  hud.setMoney(state.money);
  hud.setHealth(state.health);
  hud.setWanted(0);
  hud.setMission('Explore Vice Bay — your first job starts shortly.');
  hud.toast('Welcome to Vice Bay. Good luck, Rico.');
  // A few parked cars near the start so the player can drive at once.
  garage.spawnNear(0, 120, 4);
  requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Buttons on the overlays.
const startBtn = document.getElementById('btn-start');
if (startBtn) startBtn.addEventListener('click', startGame);
const resumeBtn = document.getElementById('btn-resume');
if (resumeBtn) resumeBtn.addEventListener('click', () => showScreen('play'));
const restartBtn = document.getElementById('btn-restart');
if (restartBtn) restartBtn.addEventListener('click', () => window.location.reload());
const titleBtn = document.getElementById('btn-title');
if (titleBtn) titleBtn.addEventListener('click', () => window.location.reload());

hud.setMoney(state.money);
hud.setHealth(state.health);
hud.setWanted(0);
showScreen('title');

// Shot staging: paint the scene and stop — no loop, no input.
if (shot) {
  showScreen('play');
  const api = {
    player,
    camera: cameraApi,
    worldState,
    police,
    garage,
    hud,
    spawnCar,
    enterVehicle,
    render,
  };
  garage.spawnNear(0, 120, 3);
  traffic.update(2);
  stageShot(shot, api);
} else {
  // Title orbit until the player starts.
  requestAnimationFrame(loop);
}
