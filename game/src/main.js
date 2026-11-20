// Vice Bay: Blood & Destiny — game loop and wiring.
// State machine: title -> playing <-> paused, plus the missions menu.
// MENU KEYS ARE HANDLED FIRST, before any playing-state check — Escape and
// M must always close the menu, or the player gets stuck in it.

import { CFG, SHOPS, UPGRADES, WEAPONS } from './config.js';
import { RNG } from './random.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { buildCity } from './city.js';
import { World } from './world.js';
import { Player } from './player.js';
import { CarManager } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { Missions, STORY, SIDE } from './missions.js';
import { HUD } from './hud.js';
import { saveGame, loadGame } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const SHOT_MODE = params.get('shot');
const SEED = parseInt(params.get('seed') || '1', 10) || 1;

export class Game {
  constructor() {
    this.money = 500;
    this.rep = 0;
    this.upgrades = {};
    this.garage = [];
    this.state = 'title'; // title | playing | paused
    this.camYaw = Math.PI;
    this.camPitch = 0.32;
    this.camDist = 10.5;
    this.saveTimer = 0;
    this.time = 0;
    this.shotStaged = false;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = null;
    this.input = null;
    this.audio = new AudioSys();
    this.hud = null;
    this.missions = null;
    this.police = null;
    this.combat = null;
    this.player = null;
    this.carManager = null;
    this.traffic = null;
    this.world = null;
    this.city = null;
  }

  boot() {
    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b5e0);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 4000);
    this.clock = new THREE.Clock();
    this.input = new Input(canvas);
    this.city = buildCity(this.scene, SEED);
    this.world = new World(this.scene);
    this.player = new Player(this.scene);
    this.carManager = new CarManager(this.scene, this.city.colliders);
    for (const s of this.city.carSpawns) this.carManager.spawn(s.type, s.x, s.z, s.heading);
    this.traffic = new Traffic(this.scene, this.city, this.carManager, SEED + 7);
    this.combat = new Combat(this.scene, this.audio);
    this.police = new Police(this.scene, this.carManager, this.audio);
    this.missions = new Missions(this.audio, this.combat);
    this.hud = new HUD();
    // Restore a save if one exists.
    const saved = loadGame();
    if (saved) {
      this.money = saved.money;
      this.rep = saved.rep;
      this.missions.storyIndex = saved.storyIndex;
      this.missions.sideDone = new Set(saved.sideDone || []);
      this.missions._refreshObjective();
      this.world.setTimeOfDay(saved.timeOfDay ?? 0.32);
      this.world.setWeather(saved.weather || 'clear');
      this.upgrades = saved.upgrades || {};
      this.garage = saved.garage || [];
      document.getElementById('btn-continue').style.display = 'inline-block';
    }
    // Title buttons.
    document.getElementById('btn-new').addEventListener('click', () => this.startGame(true));
    document.getElementById('btn-continue').addEventListener('click', () => this.startGame(false));
    document.getElementById('btn-resume').addEventListener('click', () => this.setState('playing'));
    document.getElementById('btn-quit').addEventListener('click', () => this.setState('title'));
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    window.__game = this;
    // Shot mode: stage the scene immediately (title screen skipped).
    if (SHOT_MODE) {
      this.startGame(false, true);
      this._stageShot();
    }
    this.renderer.setAnimationLoop(() => this.frame());
  }

  startGame(fresh, silent = false) {
    if (fresh) {
      this.money = 500;
      this.rep = 0;
      this.missions.storyIndex = 0;
      this.missions.storyStep = 0;
      this.missions.sideDone = new Set();
      this.missions.completedStory = false;
      this.missions._refreshObjective();
      this.police.clearWanted();
      this.player.pos.set(this.city.playerSpawn.x, 0, this.city.playerSpawn.z);
      this.player.heading = this.city.playerSpawn.heading;
      this.player.health = this.player.maxHealth;
    }
    this.audio.ensure();
    this.setState('playing');
    if (!silent) this.missions.showMessage('Welcome to Vice Bay. Follow the gold marker.', 5);
  }

  setState(s) {
    this.state = s;
    document.getElementById('title-screen').classList.toggle('hidden', s !== 'title');
    document.getElementById('pause-screen').classList.toggle('hidden', s !== 'paused');
    document.getElementById('hud').classList.toggle('hidden', s === 'title');
    if (s === 'playing') this.audio.ensure();
  }

  // ---- shot-mode context (used by shots.js) ----
  _stageShot() {
    const ctx = {
      setTime: (t) => this.world.setTimeOfDay(t),
      setWeather: (w) => this.world.setWeather(w),
      placePlayer: (x, z, heading) => {
        if (this.player.vehicle) this.player.exitVehicle();
        this.player.pos.set(x, 0, z);
        this.player.heading = heading;
        this.camYaw = heading;
      },
      putCar: (type, x, z, heading) => this.carManager.spawn(type, x, z, heading),
      enterCar: () => {
        const car = this.player.nearestCar(this.carManager.cars, 6);
        if (car) this.player.enterVehicle(car);
      },
      setWanted: (n) => {
        this.police.clearWanted();
        this.police.heat = n * 20;
        this.police.wanted = n;
      },
      spawnPolice: (n) => {
        for (let i = 0; i < n; i++) this.police._spawnPursuitCar(this.player.pos);
      },
      setShotReady: () => {
        window.__shotReady = true;
        this.shotStaged = true;
      },
    };
    stageShot(SHOT_MODE, ctx);
  }

  // ---- per-frame ----
  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    const input = this.input;

    // === MENU KEYS FIRST — before any state check. ===
    if (input.pressed('Escape')) {
      if (this.hud.menuOpen) this.hud.setMenuOpen(false, this._menuData());
      else if (this.state === 'playing') this.setState('paused');
      else if (this.state === 'paused') this.setState('playing');
    }
    if (input.pressed('KeyM')) {
      if (this.state === 'playing') {
        this.hud.setMenuOpen(!this.hud.menuOpen, this._menuData());
      } else if (this.hud.menuOpen) {
        this.hud.setMenuOpen(false, this._menuData());
      }
    }
    if (input.pressed('Enter') && this.state === 'title') this.startGame(true);

    if (this.state === 'title') {
      // Slow drifting title camera over the city.
      const a = this.time * 0.05;
      this.camera.position.set(Math.sin(a) * 500, 180, Math.cos(a) * 500);
      this.camera.lookAt(0, 40, -100);
      this.world.update(dt, { x: 0, z: 0 });
      this.traffic.update(dt, null, this.world.weather === 'rain');
      this.renderer.render(this.scene, this.camera);
      input.endFrame();
      return;
    }
    if (this.state === 'paused') {
      this.renderer.render(this.scene, this.camera);
      input.endFrame();
      return;
    }

    // === PLAYING ===
    const player = this.player;
    // Camera orbit from mouse drag.
    this.camYaw -= input.mouseDX * 0.004;
    this.camPitch = Math.max(0.08, Math.min(1.1, this.camPitch + input.mouseDY * 0.003));

    // Enter / exit cars.
    if (input.pressed('KeyE')) {
      if (player.vehicle) player.exitVehicle();
      else {
        const car = player.nearestCar(this.carManager.cars, 4.5);
        if (car) {
          player.enterVehicle(car);
          if (car.driver === 'ai') this.police.addHeat(8); // stealing is a crime
          car.driver = 'player';
          this.audio.pickup();
        }
      }
    }
    // Weapon switching / reload / fire.
    if (input.pressed('KeyQ')) this.combat.cycleWeapon(1);
    if (input.pressed('KeyR')) this.combat.reload();
    if (input.pressed('KeyN')) this.audio.toggleMute();

    // Driving or walking.
    if (player.vehicle) {
      const car = player.vehicle;
      const throttle = input.axis('KeyS', 'KeyW');
      const steer = input.axis('KeyA', 'KeyD');
      const handbrake = input.down('Space');
      car.update(dt, { throttle, steer, brake: input.down('KeyS') && car.speed > 0.5, handbrake }, this.city.colliders, this.upgrades);
      player.pos.copy(car.pos);
      player.heading = car.heading;
      this.audio.setEngine(Math.abs(car.speed) / car.def.top, true);
      // Crash into pedestrians = heat.
      for (const p of this.traffic.peds) {
        const d = Math.hypot(p.pos.x - car.pos.x, p.pos.z - car.pos.z);
        if (d < 2.2 && Math.abs(car.speed) > 8) {
          this.police.addHeat(6);
          this.traffic.panicAt(car.pos.x, car.pos.z, 30);
        }
      }
    } else {
      player.update(dt, input, this.camYaw, this.city.colliders, this.carManager.cars);
      this.audio.setEngine(0, false);
      // Fists / guns on foot (hold mouse, or press F).
      if (input.mouseDown || input.pressed('KeyF')) {
        const origin = player.pos.clone().setY(1.4);
        const dir = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
        const hit = this.combat.fire(origin, dir, player);
        if (hit) this.police.addHeat(4);
        this.traffic.panicAt(player.pos.x, player.pos.z, 35);
      }
    }

    // Shops: stand near one and press E to open its trade (simplified: auto-buy).
    if (input.pressed('KeyB')) {
      for (const shop of SHOPS) {
        const d = Math.hypot(player.pos.x - shop.x, player.pos.z - shop.z);
        if (d < 12) {
          if (shop.kind === 'health' && this.money >= 150) {
            this.money -= 150;
            player.heal(50);
            this.audio.cash();
            this.missions.showMessage('Bought a meal. +50 health.', 3);
          } else if (shop.kind === 'weapons' && this.money >= 500) {
            this.money -= 500;
            for (const id of ['pistol', 'smg', 'shotgun', 'rifle']) this.combat.ammo[id] += 24;
            this.audio.cash();
            this.missions.showMessage('Bought ammo for all weapons.', 3);
          } else if (shop.kind === 'garage' && this.money >= 4000) {
            const next = UPGRADES.find((u) => !this.upgrades[u.id]);
            if (next) {
              this.money -= next.price;
              this.upgrades[next.id] = true;
              this.audio.cash();
              this.missions.showMessage(`Installed ${next.name}.`, 3);
            }
          }
        }
      }
    }

    // World systems.
    this.world.update(dt, player.pos);
    this.traffic.update(dt, player.pos, this.world.weather === 'rain');
    this.police.update(dt, player, this.city.colliders);
    const playerPos = player.vehicle ? player.vehicle.pos : player.pos;
    this.combat.update(dt, player, playerPos.clone(), player.heading);
    this.missions.update(dt, this);

    // Death / busted.
    if (player.health <= 0) {
      this.money = Math.max(0, this.money - 500);
      player.health = player.maxHealth;
      this.police.clearWanted();
      if (player.vehicle) player.exitVehicle();
      player.pos.set(this.city.playerSpawn.x, 0, this.city.playerSpawn.z);
      this.missions.showMessage('Wasted! You woke up at the hospital. -$500.', 5);
    }
    if (this.police.arrested) {
      if (this.police.bustedTimer <= 0) {
        this.money = Math.max(0, this.money - 300);
        this.police.arrested = false;
        this.police.clearWanted();
        if (player.vehicle) player.exitVehicle();
        player.pos.set(this.city.playerSpawn.x, 0, this.city.playerSpawn.z);
        player.health = player.maxHealth;
        this.missions.showMessage('Busted! You paid bail. -$300.', 5);
      }
    }

    // Autosave every 30 seconds.
    this.saveTimer += dt;
    if (this.saveTimer > 30) {
      this.saveTimer = 0;
      saveGame({
        money: this.money,
        rep: this.rep,
        storyIndex: this.missions.storyIndex,
        sideDone: this.missions.sideDone,
        timeOfDay: this.world.timeOfDay,
        weather: this.world.weather,
        upgrades: this.upgrades,
        garage: this.garage,
      });
    }

    // Camera: third-person follow, speed-sensitive FOV.
    const target = player.vehicle ? player.vehicle.pos : player.pos;
    const dist = this.camDist;
    const camX = target.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * dist;
    const camZ = target.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * dist;
    const camY = 2 + Math.sin(this.camPitch) * dist + (player.vehicle ? 1 : 0);
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(target.x, target.y + 2, target.z);
    const speed01 = player.vehicle ? Math.abs(player.vehicle.speed) / player.vehicle.def.top : player.speed / CFG.playerRun;
    const fov = 62 + Math.min(1, Math.max(0, speed01)) * 16;
    if (Math.abs(this.camera.fov - fov) > 0.2) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 4);
      this.camera.updateProjectionMatrix();
    }

    // HUD.
    const objective = this.missions.objective;
    const objDist = objective ? Math.hypot(playerPos.x - objective.x, playerPos.z - objective.z) : 0;
    const w = this.combat.weapon;
    this.hud.update({
      health: player.health,
      maxHealth: player.maxHealth,
      money: this.money,
      rep: this.rep,
      wanted: this.police.wanted,
      speedKmh: (player.vehicle ? Math.abs(player.vehicle.speed) : player.speed) * 3.6,
      weaponName: w.name,
      ammoText: this.combat.weaponId === 'fists' ? '∞' : `${this.combat.mag[this.combat.weaponId]} / ${this.combat.ammo[this.combat.weaponId]}${this.combat.reloading > 0 ? ' …' : ''}`,
      camYaw: this.camYaw,
      objective,
      objectiveDist: objDist,
      missionLine: this.missions.storyTitle,
      message: this.missions.message,
      messageTimer: this.missions.messageTimer,
      playerX: playerPos.x,
      playerZ: playerPos.z,
      playerHeading: player.heading,
      trafficDots: this.traffic.cars.map((c) => ({ x: c.pos.x, z: c.pos.z })),
      policeDots: this.police.pursuitCars.map((c) => ({ x: c.pos.x, z: c.pos.z })),
    });

    this.renderer.render(this.scene, this.camera);
    input.endFrame();
  }

  _menuData() {
    return {
      storyList: STORY,
      sideList: SIDE,
      storyIndex: this.missions.storyIndex,
      sideDone: this.missions.sideDone,
      activeSide: this.missions.activeSide,
    };
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.boot();
});
