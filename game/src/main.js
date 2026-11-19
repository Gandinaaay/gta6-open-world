// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between screens — title, play, paused, shop, missions, choice, busted and
// wasted — all as DOM panels over the same live 3D city.
//
// ?seed=N fixes the city and traffic. ?shot=start|play|chase|night (with
// &seed=N) stages that scene instead of running the loop, paints it a few
// times and sets window.__shotReady for a screenshot. The title camera
// drifts slowly around the hero, so the menu sits over a living city instead
// of a frozen frame. Round 3: the screens are one table (panel per screen),
// and the frame loop is split into an action step and a simulation step.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createGame } from './world.js';
import { createInput, ACTION_INTERACT, ACTION_ENTER, ACTION_PUNCH, ACTION_PAUSE, ACTION_CONFIRM, ACTION_HORN } from './input.js';
import { nearestVehicle, enterVehicle, exitVehicle } from './vehicles.js';
import { stageShot } from './shots.js';
import { MISSIONS, SIDE_MISSIONS } from './missions.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1337;

const canvas = document.getElementById('game');
const status = document.getElementById('status');

// Errors surface in the DOM so a headless run can read them with --dump-dom.
window.addEventListener('error', (event) => {
  const el = document.getElementById('err');
  if (el) el.textContent = 'ERROR: ' + event.message + ' @ ' + (event.filename || '') + ':' + (event.lineno || '');
});

const G = createGame(canvas, seed);
window.__game = G; // debug hook: lets a test driver inspect the live game state
const input = createInput(G);
const hudRoot = document.getElementById('hud');

// Screen name -> the panel it shows ('' means no panel, just the HUD).
const SCREEN_PANELS = {
  title: 'menu',
  paused: 'pause',
  missions: 'missions',
  shop: 'shop',
  choice: 'choice',
};
const PANEL_IDS = ['menu', 'pause', 'missions', 'shop', 'choice'];

function showPanel(id, on) {
  document.getElementById(id).classList.toggle('show', on);
}

function showScreen(name) {
  G.screen = name;
  for (const id of PANEL_IDS) showPanel(id, SCREEN_PANELS[name] === id);
  hudRoot.style.display = name === 'title' ? 'none' : '';
  if (name === 'title') {
    document.getElementById('continue-btn').style.display = G.hadSave ? '' : 'none';
    document.getElementById('save-note').textContent = G.hadSave
      ? 'Saved progress found — Continue picks up where you left off.'
      : 'No save yet — New Game starts the story.';
  }
}

function startNewGame() {
  G.money = 500;
  G.rep = 0;
  G.player.health = 100;
  G.wanted = 0;
  G.player.x = 0;
  G.player.z = 120;
  G.player.yaw = Math.PI;
  G.missions.missionIndex = 0;
  G.missions.active = false;
  G.missions.stepIndex = 0;
  G.missions.side = null;
  G.missionText = 'Press M to start Mission 1: Welcome to Vice Bay';
  G.saveGame();
  G.audio.unlock();
  showScreen('play');
  G.showBriefing('Welcome to Vice Bay', 'You are back after years away. Press M for missions, F to steal a car, E to talk and shop.');
}

function continueGame() {
  G.audio.unlock();
  showScreen('play');
  G.showBriefing('Welcome back', 'Vice Bay missed you. Press M to continue the story.');
}

function buildMissionList() {
  const list = document.getElementById('mission-list');
  list.innerHTML = '';
  MISSIONS.forEach((m, i) => {
    const done = i < G.missions.missionIndex;
    const next = i === G.missions.missionIndex;
    const row = document.createElement('div');
    row.className = 'shop-row';
    const label = document.createElement('span');
    label.textContent = (i + 1) + '. ' + m.title + ' — $' + m.reward + ' · ' + (done ? 'DONE' : next ? 'NEXT' : 'LOCKED');
    const btn = document.createElement('button');
    btn.textContent = next ? 'START' : done ? 'REPLAY' : '—';
    btn.disabled = !done && !next;
    btn.onclick = () => {
      G.missions.startMission(i);
      showScreen('play');
    };
    row.appendChild(label);
    row.appendChild(btn);
    list.appendChild(row);
  });
  const sideTitle = document.createElement('div');
  sideTitle.className = 'panel-sub';
  sideTitle.textContent = 'Side missions — walk to their marker in the city and press E:';
  list.appendChild(sideTitle);
  for (const s of SIDE_MISSIONS) {
    const row = document.createElement('div');
    row.className = 'shop-row';
    const label = document.createElement('span');
    label.textContent = s.name + ' — ' + s.desc + ' ($' + s.reward + ')';
    row.appendChild(label);
    list.appendChild(row);
  }
}

G.toggleMissionMenu = () => {
  if (G.screen === 'play') {
    buildMissionList();
    showScreen('missions');
  } else if (G.screen === 'missions') {
    showScreen('play');
  }
};

// ---- menu buttons ---------------------------------------------------------
document.getElementById('new-btn').onclick = () => { G.audio.unlock(); startNewGame(); };
document.getElementById('continue-btn').onclick = () => { G.audio.unlock(); continueGame(); };
document.getElementById('settings-btn').onclick = () => {
  document.getElementById('settings').classList.toggle('show');
};
document.getElementById('volume').oninput = (e) => {
  G.settings.volume = Number(e.target.value);
  G.applySettings();
};
document.getElementById('quality').onchange = (e) => {
  G.settings.quality = e.target.value;
  G.applySettings();
};
document.getElementById('mute').onchange = (e) => {
  G.settings.muted = e.target.checked;
  G.applySettings();
};
document.getElementById('resume-btn').onclick = () => showScreen('play');
document.getElementById('quit-btn').onclick = () => { G.saveGame(); showScreen('title'); };
document.getElementById('missions-close').onclick = () => showScreen('play');
// Busted / wasted return to play with Enter (see handleActions) — no buttons needed.

function runShot(name) {
  const screen = stageShot(name, G);
  showScreen(screen === 'title' ? 'title' : 'play');
  let painted = 0;
  function paint() {
    G.renderer.render(G.scene, G.camera);
    painted += 1;
    if (painted < 6) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  showScreen('title');
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_PAUSE) {
      if (G.screen === 'play') showScreen('paused');
      else if (G.screen === 'paused' || G.screen === 'missions') showScreen('play');
      return;
    }
    if (G.screen === 'title') {
      if (actions & ACTION_CONFIRM) startNewGame();
      return;
    }
    if (G.screen === 'busted' || G.screen === 'wasted') {
      if (actions & ACTION_CONFIRM) showScreen('play');
      return;
    }
    if (G.screen !== 'play') return;
    if (actions & ACTION_INTERACT) G.tryInteract();
    if (actions & ACTION_ENTER) {
      if (G.currentVehicle) exitVehicle(G);
      else {
        const v = nearestVehicle(G);
        if (v) enterVehicle(G, v);
      }
    }
    if (actions & ACTION_PUNCH) G.combat.fire();
    if (actions & ACTION_HORN && G.currentVehicle && G.audio) G.audio.horn();
  }

  function stepSimulation() {
    while (accumulator >= STEP) {
      if (G.mouseFire) G.combat.fire();
      G.update(STEP);
      accumulator -= STEP;
    }
    saveTimer += 1 / 60;
    if (saveTimer > 20) { saveTimer = 0; G.saveGame(); }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (G.screen === 'play') {
      stepSimulation();
    } else {
      accumulator = 0;
      // The title screen still shows the living city behind the menu, and the
      // camera drifts slowly so it never looks like a still image.
      if (G.screen === 'title') {
        G.camOrbit += 0.0006;
        G.update(STEP * 0.25);
      }
    }
    G.renderer.render(G.scene, G.camera);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === 'play') showScreen('paused');
  });

  status.textContent = 'Vice Bay: Blood & Destiny. Press Enter or click New Game to start.';
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
