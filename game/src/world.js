// The world, rewritten for the v4 recorded pass: builds the renderer, the sky
// and the day/night cycle, rain, the city, the player, traffic, police, combat
// and missions, and steps them all in one place. Nothing here knows about menus
// — main.js owns the screens and calls update(). The game state object G is the
// one thing every module shares. New in v4: a sunset sun disc that hangs low at
// dawn and dusk, and a wanted sting the moment a new star lands.
import { WORLD, STEP, DAY_LENGTH, KEYS, districtAt, SUNSET_WINDOW, WANTED_FLASH_TIME } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { buildCity, PLACES, SHOPS } from './city.js';
import { createPlayer, updatePlayer, updateCamera, setShirtColor } from './player.js';
import { spawnVehicle, driveVehicle, nearestVehicle, enterVehicle, exitVehicle } from './vehicles.js';
import { spawnTrafficCar, updateTraffic, spawnPedestrian, updatePedestrians } from './traffic.js';
import { addWanted, updatePolice, spawnPatrol } from './police.js';
import { createCombat, updateEnemies } from './combat.js';
import { createMissionEngine, SIDE_MISSIONS } from './missions.js';
import { createHud, showToast } from './hud.js';
import { saveGame, loadGame, openShop, openGarage } from './save.js';
import { sunsetTexture } from './textures.js';

export function createGame(canvas, seed) {
  const random = createRandom(seed);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5d6);
  scene.fog = new THREE.Fog(0x9db8c8, 220, 900);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 6, 140);

  const sun = new THREE.DirectionalLight(0xfff2d8, 1.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 800;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x8899aa, 0.55));
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a4a3a, 0.5);
  scene.add(hemi);

  // Sunset sun disc: a glowing billboard that follows the sun's direction and
  // only shows while the sun is low, so dawn and dusk get a real horizon glow.
  const sunDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshBasicMaterial({ map: sunsetTexture(), transparent: true, depthWrite: false, fog: false }),
  );
  sunDisc.visible = false;
  scene.add(sunDisc);

  const city = buildCity(scene, random);
  const audio = createAudio();
  const player = createPlayer(scene);

  const G = {
    renderer, scene, camera, sun, hemi, random, audio,
    city, player, keys: {}, pressed: new Set(),
    camOrbit: 0, camPitch: 0, mouseDown: false, mouseFire: false,
    screen: 'title',
    money: 500, rep: 0, wanted: 0, wantedTimer: 0, crimeFlash: 0,
    vehicles: [], peds: [], police: [], patrol: [], enemies: [],
    currentVehicle: null, upgrades: {}, ownedCars: ['sedan'],
    ownedWeapons: ['fists', 'pistol'],
    dayTime: 0.32, weather: 'clear', weatherTimer: 80,
    missionTarget: null, sideTarget: null, missionText: 'Press M to start Mission 1: Welcome to Vice Bay',
    interactPrompt: '', toast: null, bustedTimer: 0,
    settings: { volume: 0.6, quality: 'high', muted: false },
    time: 0, elapsed: 0,
  };
  G.addWanted = (n) => {
    const before = G.wanted;
    addWanted(G, n);
    if (G.wanted > before && G.audio) G.audio.wantedSting();
  };
  G.toast = (m) => showToast(G, m);
  G.saveGame = () => saveGame(G);
  G.damagePlayer = (amount, cause) => {
    if (G.screen !== 'play') return;
    G.player.health -= amount;
    if (G.player.health <= 0) G.wasted(cause);
  };
  G.playerYaw = () => (G.currentVehicle ? G.currentVehicle.yaw : G.player.yaw);
  G.speedKmh = () => (G.currentVehicle ? Math.abs(G.currentVehicle.speed) * 3.6 : G.player.speed * 3.6);
  G.currentDistrict = districtAt(player.x, player.z);
  G.clockText = () => {
    const total = Math.floor(G.dayTime * 24 * 60);
    const h = String(Math.floor(total / 60)).padStart(2, '0');
    const m = String(total % 60).padStart(2, '0');
    return h + ':' + m + (G.weather === 'rain' ? ' 🌧' : ' ☀');
  };
  G.hudFlash = (m) => showToast(G, m);

  // Mission marker beacon: a pillar of light over the current objective.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.visible = false;
  scene.add(beacon);
  G.beacon = beacon;

  // Collectible package meshes (gold crates) for collect steps and side missions.
  const packageGroup = new THREE.Group();
  scene.add(packageGroup);
  G.packageGroup = packageGroup;

  // Rain: a cloud of falling streaks, visible only when it rains.
  const rainGeo = new THREE.BufferGeometry();
  const rainCount = 900;
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i += 1) {
    rainPos[i * 3] = (Math.random() - 0.5) * 300;
    rainPos[i * 3 + 1] = Math.random() * 60;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 300;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaaccdd, size: 0.35, transparent: true, opacity: 0.6 }));
  rain.visible = false;
  rain.frustumCulled = false;
  scene.add(rain);
  G.rain = rain;

  G.combat = createCombat(G);
  G.missions = createMissionEngine(G);
  G.hud = createHud(G);

  // Parked cars around the city, free for the taking (and the wanted stars).
  const parkedTypes = ['sedan', 'sport', 'suv', 'bike', 'taxi', 'truck', 'sedan', 'sport', 'suv', 'sedan', 'bike', 'truck', 'sedan', 'sport'];
  for (let i = 0; i < parkedTypes.length; i += 1) {
    const line = (Math.floor(random() * 9) - 4) * 100;
    const along = random.range(-450, 450);
    const onX = random() < 0.5;
    const x = onX ? line + 11 : along;
    const z = onX ? along : line + 11;
    const v = spawnVehicle(scene, parkedTypes[i], x, z, onX ? Math.PI / 2 : 0);
    G.vehicles.push(v);
  }
  // A taxi and a sport car waiting near the start so mission 1 is quick.
  G.vehicles.push(spawnVehicle(scene, 'taxi', 12, 108, Math.PI / 2));
  G.vehicles.push(spawnVehicle(scene, 'sport', -14, 96, 0));

  const trafficCount = 16;
  for (let i = 0; i < trafficCount; i += 1) spawnTrafficCar(G, random);
  for (let i = 0; i < 24; i += 1) spawnPedestrian(G, random);
  spawnPatrol(G, random);
  spawnPatrol(G, random);

  // ---- interactions -------------------------------------------------------
  G.nearestShop = () => {
    let best = null;
    let bestD = 7;
    for (const s of SHOPS) {
      const d = Math.hypot(s.x - G.player.x, s.z - G.player.z);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  };
  G.nearestSideMarker = () => {
    let best = null;
    let bestD = 9;
    for (const s of SIDE_MISSIONS) {
      const p = PLACES[s.place];
      if (!p) continue;
      const d = Math.hypot(p.x - G.player.x, p.z - G.player.z);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  };
  G.tryInteract = () => {
    if (G.currentVehicle) return;
    const shop = G.nearestShop();
    if (shop) { openShop(G, shop); return; }
    const side = G.nearestSideMarker();
    if (side && !G.missions.side) {
      G.missions.startSide(side.id);
      return;
    }
    // Garage: press E near the Tuner Garage to open your owned cars.
    const tuner = SHOPS.find((s) => s.id === 'tuner');
    if (tuner && Math.hypot(tuner.x - G.player.x, tuner.z - G.player.z) < 12) openGarage(G);
  };
  G.showBriefing = (title, text) => {
    const el = document.getElementById('briefing');
    document.getElementById('briefing-title').textContent = title;
    document.getElementById('briefing-text').textContent = text;
    el.classList.add('show');
    clearTimeout(G.showBriefing._t);
    G.showBriefing._t = setTimeout(() => el.classList.remove('show'), 6000);
  };
  G.openChoice = () => {
    const el = document.getElementById('choice');
    el.classList.add('show');
    G.screen = 'choice';
    document.getElementById('choice-spare').onclick = () => {
      el.classList.remove('show');
      G.screen = 'play';
      G.showBriefing('The Merciful Ending', 'You spared Kane and turned the ledger over. Vice Bay gets a second chance — and so do you.');
      G.missions.missionIndex = 10;
      G.missions.active = false;
      G.missions.choiceOpen = false;
      G.missions.completeMission();
    };
    document.getElementById('choice-take').onclick = () => {
      el.classList.remove('show');
      G.screen = 'play';
      G.money += 20000;
      G.showBriefing('The King of Vice Bay', 'You took the city. Kane is gone, the streets are yours, and Vice Bay bows to its new king.');
      G.missions.missionIndex = 10;
      G.missions.active = false;
      G.missions.choiceOpen = false;
      G.missions.completeMission();
    };
  };

  G.busted = () => {
    if (G.screen !== 'play') return;
    const fine = Math.min(G.money, 300);
    G.money -= fine;
    G.wanted = 0;
    G.police.length = 0;
    if (G.currentVehicle) exitVehicle(G);
    G.player.x = 140;
    G.player.z = 60;
    G.player.health = 100;
    G.screen = 'busted';
    G.showBriefing('BUSTED', 'The VBPD caught you. You paid $' + fine + ' in fines and woke up outside Bay General Hospital.');
  };
  G.wasted = (cause) => {
    if (G.screen !== 'play') return;
    const lost = Math.min(G.money, 500);
    G.money -= lost;
    G.wanted = 0;
    if (G.currentVehicle) exitVehicle(G);
    G.player.x = 140;
    G.player.z = 60;
    G.player.health = 100;
    G.screen = 'wasted';
    G.showBriefing('WASTED', 'You were ' + (cause || 'taken down') + '. You lost $' + lost + ' and woke up at Bay General Hospital.');
  };
  G.onVehicleCrash = () => {
    if (G.currentVehicle && G.currentVehicle.health <= 0) {
      G.toast('Your car is wrecked! Get out and find another.');
      exitVehicle(G);
    }
  };

  // ---- per-frame update ----------------------------------------------------
  function updateSun() {
    const t = G.dayTime;
    const angle = t * Math.PI * 2;
    const elev = Math.sin(angle);
    const day = Math.max(0, elev);
    sun.position.set(Math.cos(angle) * 300, Math.max(20, elev * 300), 180);
    sun.intensity = 0.25 + day * 0.9;
    sun.color.setHex(elev > 0.25 ? 0xfff2d8 : 0xff9a5c);
    scene.background.setHex(elev > 0.15 ? 0x87b5d6 : elev > -0.1 ? 0xe88a4a : 0x0b1026);
    scene.fog.color.copy(scene.background);
    hemi.intensity = 0.25 + day * 0.35;
    const lampOn = elev < 0.05;
    for (const l of city.lamps) l.material.color.setHex(lampOn ? 0xffe9a8 : 0x555555);
    // Sunset disc: show it while the sun hugs the horizon at dawn or dusk,
    // placed far out along the sun's direction and always facing the camera.
    const inWindow = (t >= SUNSET_WINDOW.from && t <= SUNSET_WINDOW.to) || (t >= 0.48 && t <= 0.56);
    sunDisc.visible = inWindow;
    if (inWindow) {
      const fx = G.player.x + Math.cos(angle) * 420;
      const fz = G.player.z + 180;
      sunDisc.position.set(fx, 55 + elev * 40, fz);
      sunDisc.lookAt(camera.position);
      // Brighter at dawn, softer at dusk — the disc never outshines the city.
      sunDisc.material.opacity = t < 0.25 ? 0.95 : 0.8;
    }
  }

  function updateWeather(dt) {
    G.weatherTimer -= dt;
    if (G.weatherTimer <= 0) {
      G.weatherTimer = 90 + Math.random() * 60;
      G.weather = G.weather === 'clear' ? 'rain' : 'clear';
      G.rain.visible = G.weather === 'rain';
      if (G.weather === 'rain') G.toast('Rain is falling over Vice Bay.');
    }
    if (G.weather === 'rain') {
      const pos = G.rain.geometry.attributes.position;
      const cx = G.currentVehicle ? G.currentVehicle.x : G.player.x;
      const cz = G.currentVehicle ? G.currentVehicle.z : G.player.z;
      for (let i = 0; i < rainCount; i += 1) {
        let y = pos.getY(i) - dt * 55;
        if (y < 0) y = 60;
        pos.setY(i, y);
        pos.setX(i, cx + ((i * 37) % 300) - 150);
        pos.setZ(i, cz + ((i * 53) % 300) - 150);
      }
      pos.needsUpdate = true;
    }
  }

  function updatePackages() {
    // Draw gold crates for the active collect step / side packages.
    while (G.packageGroup.children.length > 0) G.packageGroup.remove(G.packageGroup.children[0]);
    const draw = (x, z) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
      c.position.set(x, 0.7 + Math.sin(G.time * 3 + x) * 0.25, z);
      G.packageGroup.add(c);
    };
    if (G.missions.active) {
      const st = G.missions.stepState;
      if (st && st.collectibles) for (const c of st.collectibles) if (!c.taken) draw(c.x, c.z);
    }
    if (G.missions.sideState && G.missions.sideState.packages) {
      for (const p of G.missions.sideState.packages) if (!p.taken) draw(p.x, p.z);
    }
  }

  G.update = (dt) => {
    G.time += dt;
    G.elapsed += dt;
    G.dayTime = (G.dayTime + dt / DAY_LENGTH) % 1;
    G.crimeFlash = Math.max(0, G.crimeFlash - dt);
    updateSun();
    updateWeather(dt);

    // Traffic lights cycle every 8 seconds.
    const cycle = Math.floor(G.time / 8) % 2;
    for (const light of city.trafficLights) {
      light.red = cycle === 0;
      light.lampMat.color.setHex(light.red ? 0xff0000 : 0x00ff00);
    }

    if (G.currentVehicle) {
      driveVehicle(G, G.currentVehicle, dt);
      if (G.audio) G.audio.engine(Math.abs(G.currentVehicle.speed) / 60, true);
    } else {
      updatePlayer(G, dt);
      if (G.audio) G.audio.engine(0, false);
    }
    updateCamera(G, dt);
    updateTraffic(G, dt, random);
    updatePedestrians(G, dt, random);
    updatePolice(G, dt, random);
    updateEnemies(G, dt);
    G.combat.update(dt);
    G.missions.update(dt);
    G.missions.updateSide(dt);
    updatePackages();

    // Mission beacon over the current objective.
    const target = G.missionTarget || G.sideTarget;
    if (target) {
      beacon.visible = true;
      beacon.position.set(target.x, 30, target.z);
      beacon.material.opacity = 0.25 + Math.sin(G.time * 4) * 0.1;
    } else {
      beacon.visible = false;
    }

    // Interaction prompt.
    if (!G.currentVehicle) {
      const shop = G.nearestShop();
      const side = G.nearestSideMarker();
      if (shop) G.interactPrompt = '[E] Enter ' + shop.name;
      else if (side && !G.missions.side) G.interactPrompt = '[E] Start side mission: ' + side.name;
      else if (nearestVehicle(G)) G.interactPrompt = '[F] Steal / enter ' + nearestVehicle(G).type.name;
      else G.interactPrompt = '';
    } else {
      G.interactPrompt = '[F] Exit vehicle · [Space] Handbrake · [H] Horn';
    }

    G.currentDistrict = districtAt(G.currentVehicle ? G.currentVehicle.x : G.player.x, G.currentVehicle ? G.currentVehicle.z : G.player.z);
    G.hud.update();
    // Keep the sun's shadow box centred on the player so shadows stay crisp.
    sun.target.position.set(G.player.x, 0, G.player.z);
    scene.add(sun.target);
  };

  G.applySettings = () => {
    const q = G.settings.quality;
    renderer.shadowMap.enabled = q !== 'low';
    renderer.setPixelRatio(q === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    audio.setVolume(G.settings.volume);
    audio.setMuted(G.settings.muted);
  };
  G.applySettings();

  // Load a saved game if there is one (Continue), otherwise fresh start.
  const hadSave = loadGame(G);
  G.hadSave = hadSave;
  if (hadSave) G.missionText = 'Welcome back — press M to continue: ' + (G.missions.current() ? G.missions.current().title : 'Free roam');

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  return G;
}

export { setShirtColor };
