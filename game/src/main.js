// Vice Bay: Blood & Destiny — bootstrap and main loop.
// An original open-world crime game: a 2 km x 2 km coastal city, on foot
// and by car, traffic and pedestrians, stealing cars, a wanted system and
// police, missions and a story, combat, a HUD with a minimap, a start
// screen and a save. Runs offline from its own static files.

import { createState, ECONOMY } from './config.js';
import { createWorld, setTimeOfDay } from './world.js';
import { createPlayer, updatePlayer } from './player.js';
import { createInput, endFrameInput } from './input.js';
import { createAudio } from './audio.js';
import { createSave } from './save.js';
import { createHud } from './hud.js';
import { spawnVehicle, updateVehicles, retrieveOwnedCar } from './vehicles.js';
import { spawnTraffic, spawnPedestrians, updateTraffic } from './traffic.js';
import { updatePolice } from './police.js';
import { updateCombat } from './combat.js';
import { updateMissions, nextMainMission, startMission } from './missions.js';
import { stageShot } from './shots.js';

const G = createState();
window.__VICEBAY__ = { G, stageShot };

function boot() {
  const params = new URLSearchParams(window.location.search);
  const shotParam = params.get('shot');
  createWorld(G);
  createPlayer(G);
  createInput(G);
  createAudio(G);
  const save = createSave(G);
  // screenshot runs start from a clean state, never a previous session's save
  if (shotParam) save.clear();
  const hadSave = shotParam ? false : save.read();
  createHud(G);
  // parked cars around the city for Rico to find (and steal)
  spawnVehicle(G, 'sedan', -140, 140, 0.4, {});
  spawnVehicle(G, 'suv', 220, -180, -1.2, {});
  spawnVehicle(G, 'taxi', 60, -120, 2.2, {});
  spawnVehicle(G, 'van', -420, 320, 0.9, {});
  spawnVehicle(G, 'coupe', 700, -420, -0.6, {});
  spawnVehicle(G, 'muscle', -700, -700, 1.8, {});
  // Rico's own sedan waits at the garage
  retrieveOwnedCar(G, 'sedan');
  spawnTraffic(G, 14);
  spawnPedestrians(G, 26);
  G.money = Math.max(G.money, ECONOMY.startMoney);
  // story begins: the next main mission starts automatically
  const next = nextMainMission(G);
  if (next && !hadSave) startMission(G, next.id);
  else if (next) startMission(G, next.id);
  window.addEventListener('resize', () => {
    G.camera.aspect = window.innerWidth / window.innerHeight;
    G.camera.updateProjectionMatrix();
    G.renderer.setSize(window.innerWidth, window.innerHeight);
  });
  // start overlay: click to play (also unlocks audio)
  const overlay = document.getElementById('start-overlay');
  if (shotParam) {
    if (overlay) overlay.style.display = 'none';
    G.shotMode = true;
    // let one normal frame settle, then stage and freeze
    requestAnimationFrame(() => {
      G.renderer.render(G.scene, G.camera);
      requestAnimationFrame(() => {
        stageShot(G, parseInt(shotParam, 10) || 1);
      });
    });
  } else {
    const btn = document.getElementById('start-btn');
    const start = () => {
      if (overlay) overlay.style.display = 'none';
      if (G.audio) G.audio.ensure();
      G.started = true;
    };
    if (btn) btn.addEventListener('click', start);
    if (overlay) overlay.addEventListener('click', start);
    G.started = false;
  }
  G.clock = { last: performance.now() };
  requestAnimationFrame(loop);
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, Math.max(0.001, (now - G.clock.last) / 1000));
  G.clock.last = now;
  if (G.shotMode) {
    // frozen staged frame: keep rendering, never advance the simulation
    G.renderer.render(G.scene, G.camera);
    return;
  }
  if (!G.started || G.paused) {
    G.renderer.render(G.scene, G.camera);
    endFrameInput(G);
    return;
  }
  // game clock: 1 real second = 1 game minute
  setTimeOfDay(G, G.time + dt / 60);
  updatePlayer(G, dt);
  updateVehicles(G, dt);
  updateTraffic(G, dt);
  updatePolice(G, dt);
  updateCombat(G, dt);
  updateMissions(G, dt);
  if (G.audio) G.audio.update(G);
  if (G.hud) G.hud.update(dt);
  endFrameInput(G);
  G.renderer.render(G.scene, G.camera);
}

boot();
