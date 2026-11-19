// Vice Bay: Blood & Destiny — boot, game loop, state machine, wiring.
import { CFG } from './config.js';
import { makeRng, clamp, lerp } from './random.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { makeTextures } from './textures.js';
import { buildCity } from './city.js';
import { World } from './world.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = parseInt(params.get('seed') || '1', 10) || 1;

class Game {
  constructor() {
    this.state = 'title'; // title | playing | paused | missions
    this.money = CFG.startMoney;
    this.rep = 0;
    this.owned = ['sedan'];
    this.upgrades = {};
    this.rng = makeRng(seed * 7919 + 13);
    this.camYaw = 0;
    this.camPitch = 0.5;
    this.camDist = 10.5;
    this.time = 0;
    this._saveT = 0;
    this._shotStaged = false;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    document.getElementById('app').appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9db8d8);
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 3000);
    this.camera.position.set(0, 80, 320);

    this.input = new Input();
    this.audio = new AudioSys();
    this.hud = new HUD();
    this.textures = makeTextures();
    this.world = new World(this.scene);
    this.city = buildCity(this.scene, this.textures);
    this.player = new Player(this.scene);
    this.vehicles = new VehicleManager(this.scene);
    this.traffic = new Traffic(this.scene, this.vehicles, this.city.colliders);
    this.police = new Police(this.scene, this.vehicles);
    this.combat = new Combat(this.scene);
    this.missions = new Missions();

    for (const s of this.city.carSpawns) this.vehicles.spawn(s.type, s.x, s.z, s.heading);

    // Mission beacon: a tall translucent beam at the objective.
    this.beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    this.beacon.position.y = 30;
    this.beacon.visible = false;
    this.scene.add(this.beacon);

    this.missions.onReward = (money, rep) => {
      this.money += money;
      this.rep += rep;
      this.hud.setMoney(this.money);
      this.hud.setRep(this.rep);
      this.audio.sting();
      this._autosave();
    };
    this.missions.onMessage = (t) => this.hud.message(t);
    this.police.onBusted = () => {
      this.money = Math.max(0, this.money - 200);
      this.player.health = CFG.startHealth;
      if (this.player.inCar) this.player.exitCar();
      this.player.pos.set(100, 0, -300);
      this.hud.setMoney(this.money);
      this.hud.message('BUSTED! -$200. You wake up at the hospital.');
      this.audio.fail();
    };
    this.police.onWantedChange = () => this.audio.wanted();
    this.combat.onKill = () => { this.police.addHeat(CFG.heat.kill, this.audio); };

    // MENU KEYS FIRST: Escape and M are handled before any playing-state check,
    // so the player can never get stuck in the missions menu.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.state === 'missions') this.closeMissions();
        else if (this.state === 'playing') { this.state = 'paused'; this.hud.showOverlay('pause', true); }
        else if (this.state === 'paused') { this.state = 'playing'; this.hud.showOverlay('pause', false); }
        return;
      }
      if (e.code === 'KeyM') {
        if (this.state === 'playing') this.openMissions();
        else if (this.state === 'missions') this.closeMissions();
        return;
      }
      if (e.code === 'Enter' && this.state === 'title') this.startNewGame();
    });

    const newBtn = document.getElementById('btn-new');
    if (newBtn) newBtn.addEventListener('click', () => { this.audio.init(); this.audio.resume(); this.startNewGame(); });
    const contBtn = document.getElementById('btn-continue');
    if (contBtn) {
      contBtn.style.display = hasSave() ? 'inline-block' : 'none';
      contBtn.addEventListener('click', () => { this.audio.init(); this.audio.resume(); this.continueGame(); });
    }
    const resumeBtn = document.getElementById('btn-resume');
    if (resumeBtn) resumeBtn.addEventListener('click', () => { this.state = 'playing'; this.hud.showOverlay('pause', false); });
    const closeBtn = document.getElementById('btn-close-missions');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeMissions());

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    window.addEventListener('pointerdown', () => { this.audio.init(); this.audio.resume(); }, { once: true });

    this.hud.setMoney(this.money);
    this.hud.setRep(this.rep);
    this.hud.setHealth(this.player.health);
    this.hud.setStars(0);
    this.hud.setObjective('Press NEW GAME to start');

    // Screenshot mode: stage the scene right after boot.
    if (shotName) {
      stageShot(this, shotName);
      this._shotStaged = true;
    }
    this.clock = { last: performance.now() };
    this.renderer.setAnimationLoop(() => this.loop());
  }

  startNewGame() {
    this.money = CFG.startMoney;
    this.rep = 0;
    this.player.health = CFG.startHealth;
    this.player.pos.set(this.city.spawnPlayer.x, 0, this.city.spawnPlayer.z);
    this.player.yaw = 0;
    if (this.player.inCar) this.player.exitCar();
    this.police.wanted = 0;
    this.police.heat = 0;
    this.police.clearCops();
    this.combat.enemies = [];
    this.missions.storyIndex = 0;
    this.missions.finishedStory = false;
    this.missions.active = null;
    this.world.setTime(10);
    this.world.setWeather('clear');
    this.state = 'playing';
    this.hud.showOverlay('title', false);
    this.hud.showOverlay('pause', false);
    this.missions.startStory(0);
    this.hud.setMoney(this.money);
    this.hud.setRep(this.rep);
    this.hud.setHealth(this.player.health);
  }

  continueGame() {
    const s = loadGame();
    this.startNewGame();
    if (!s) return;
    this.money = s.money ?? this.money;
    this.rep = s.rep ?? this.rep;
    if (s.playerPos) this.player.pos.set(s.playerPos.x, 0, s.playerPos.z);
    if (s.timeOfDay != null) this.world.setTime(s.timeOfDay);
    if (s.weather) this.world.setWeather(s.weather);
    if (s.storyIndex != null && s.storyIndex > 0 && s.storyIndex < 10) {
      this.missions.storyIndex = s.storyIndex;
      this.missions.startStory(s.storyIndex);
    }
    this.hud.setMoney(this.money);
    this.hud.setRep(this.rep);
  }

  giveCar(type, x, z, heading) {
    const car = this.vehicles.spawn(type, x, z, heading, { player: true });
    this.player.enterCar(car);
    car.isPlayer = true;
    return car;
  }

  openMissions() {
    this.state = 'missions';
    this.hud.renderMissions(this.missions, () => this.closeMissions());
    this.hud.showOverlay('missions', true);
  }

  closeMissions() {
    this.hud.showOverlay('missions', false);
    if (this.state === 'missions') this.state = 'playing';
  }

  _autosave() {
    saveGame({
      money: this.money, rep: this.rep, storyIndex: this.missions.storyIndex,
      owned: this.owned, upgrades: this.upgrades,
      timeOfDay: this.world.timeOfDay, weather: this.world.weather,
      playerPos: { x: this.player.pos.x, z: this.player.pos.z },
    });
  }

  _damagePlayer(d) {
    if (d < 0) {
      this.player.health = clamp(this.player.health - d, 0, CFG.startHealth);
    } else {
      this.player.health -= d;
      if (this.player.health <= 0) {
        this.player.health = CFG.startHealth;
        this.money = Math.max(0, this.money - 100);
        if (this.player.inCar) this.player.exitCar();
        this.player.pos.set(100, 0, -300);
        this.hud.message('Wasted! -$100. You wake up at the hospital.');
        this.audio.fail();
      }
    }
    this.hud.setHealth(this.player.health);
  }

  loop() {
    const now = performance.now();
    const dt = clamp((now - this.clock.last) / 1000, 0, 0.05);
    this.clock.last = now;
    this.time += dt;

    if (this.state === 'title') {
      // Slowly drifting title camera over the city.
      this.world.update(dt, null);
      this.traffic.update(dt, this.world, null, false);
      const a = this.time * 0.02;
      this.camera.position.set(Math.cos(a) * 320, 120, Math.sin(a) * 320);
      this.camera.lookAt(0, 30, 0);
      this.camera.fov = 62;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.state === 'paused' || this.state === 'missions') {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // ---- playing ----
    const input = this.input;
    const p = this.player;
    this.audio.update(dt);
    this.hud.update(dt);

    // Camera drag: mouse drag adjusts yaw/pitch.
    this.camYaw += input.mouseDX * 0.004;
    this.camPitch = clamp(this.camPitch + input.mouseDY * 0.002, -0.1, 1.1);

    // Weapon switching (1-5) and reload (R).
    for (let i = 0; i < CFG.weaponOrder.length; i++) {
      if (input.hit('Digit' + (i + 1))) this.combat.select(CFG.weaponOrder[i]);
    }
    if (input.hit('KeyR')) this.combat.reload(this.audio);

    // Enter / exit car with E.
    if (input.hit('KeyE')) {
      if (p.inCar) {
        p.exitCar();
      } else {
        const car = this.vehicles.nearest(p.pos, 4.5, null);
        if (car) {
          const wasPolice = car.type === 'police';
          p.enterCar(car);
          car.isPlayer = true;
          if (!this.owned.includes(car.type) && car.type !== 'taxi') {
            this.police.addHeat(wasPolice ? CFG.heat.copKill : CFG.heat.steal, this.audio);
            this.hud.message(`Stole a ${CFG.cars[car.type].label}!`);
          }
        }
      }
      input.consume('KeyE');
    }

    // Shooting: mouse hold (auto weapons keep firing).
    const w = this.combat.weapon();
    if (input.fire && (w.auto || input.mouseDown)) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      const origin = p.inCar ? p.inCar.pos.clone().setY(1.4) : p.pos.clone().setY(1.5);
      if (this.combat.shoot(origin, dir, this.audio)) {
        this.police.addHeat(CFG.heat.shoot, this.audio);
      }
    }

    // Movement: on foot or driving.
    const grip = this.world.weather === 'rain' ? CFG.rainGrip : 1;
    if (p.inCar) {
      this.vehicles.drive(p.inCar, input, dt, this.city.colliders, grip);
      this.audio.setEngine(clamp(Math.abs(p.inCar.speed) / 66, 0, 1), true);
    } else {
      p.update(dt, input, this.camYaw, this.city.colliders, this.audio);
      this.audio.setEngine(0, false);
    }

    // Mission choice keys (story mission 10): 1 = Marcus, 2 = Vega.
    let choice = null;
    if (input.hit('Digit1')) choice = 1;
    if (input.hit('Digit2')) choice = 2;

    // World + AI updates.
    const playerVel = p.inCar
      ? new THREE.Vector3(Math.sin(p.inCar.heading) * p.inCar.speed, 0, Math.cos(p.inCar.heading) * p.inCar.speed)
      : new THREE.Vector3(p.vel.x, 0, p.vel.z);
    this.world.update(dt, this.camera.position);
    this.traffic.update(dt, this.world, p.pos, this.combat.gunshotFlag);
    this.police.update(dt, p.pos, playerVel, !p.inCar, this.audio);
    this.combat.update(dt, p.pos, (d) => this._damagePlayer(d));

    this.missions.update(dt, {
      playerPos: p.pos,
      inCar: !!p.inCar,
      wanted: this.police.wanted,
      kills: this.combat.kills,
      choice,
      spawnEnemies: (x, z, n) => {
        for (let i = 0; i < n; i++) this.combat.spawnEnemy(x + (this.rng() - 0.5) * 30, z + (this.rng() - 0.5) * 30, 60);
      },
      addHeat: (n) => this.police.addHeat(n, this.audio),
      onPickup: () => this.audio.pickup(),
    });

    // Beacon + objective HUD.
    const marker = this.missions.marker();
    this.beacon.visible = !!marker;
    if (marker) {
      this.beacon.position.set(marker.x, 30, marker.z);
      const dist = Math.hypot(marker.x - p.pos.x, marker.z - p.pos.z);
      this.hud.setObjective(this.missions.objectiveText() + '  •  ' + Math.round(dist) + 'm');
    } else {
      this.hud.setObjective(this.missions.objectiveText());
    }
    this.hud.setHealth(p.health);
    this.hud.setStars(this.police.wanted);
    this.hud.setMoney(this.money);
    this.hud.setRep(this.rep);
    this.hud.setCompass(p.inCar ? p.inCar.heading : p.yaw);
    this.hud.setSpeed(p.inCar ? p.inCar.speed * 3.6 : 0, !!p.inCar);

    // Third-person camera behind the player/car.
    const focus = p.inCar ? p.inCar.pos : p.pos;
    const speed01 = p.inCar ? clamp(Math.abs(p.inCar.speed) / 66, 0, 1) : clamp(p.speed / 10, 0, 1);
    const dist = this.camDist + speed01 * 3;
    const cy = this.camYaw;
    const cx = focus.x + Math.sin(cy) * Math.cos(this.camPitch) * dist;
    const cz = focus.z + Math.cos(cy) * Math.cos(this.camPitch) * dist;
    const ch = 3.2 + Math.sin(this.camPitch) * dist;
    this.camera.position.set(cx, ch, cz);
    this.camera.lookAt(focus.x, focus.y + 1.5, focus.z);
    const targetFov = 70 + speed01 * 15;
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4);
    this.camera.updateProjectionMatrix();

    // Minimap.
    this.hud.drawMinimap({
      player: { x: p.pos.x, z: p.pos.z },
      heading: p.inCar ? p.inCar.heading : p.yaw,
      objective: marker,
      objectiveDist: marker ? Math.hypot(marker.x - p.pos.x, marker.z - p.pos.z) : null,
      cars: this.traffic.cars.map((c) => ({ x: c.pos.x, z: c.pos.z })),
      cops: this.police.cops.map((c) => ({ x: c.pos.x, z: c.pos.z })),
      enemies: this.combat.enemies.map((e) => ({ x: e.pos.x, z: e.pos.z })),
    }, this.time);

    // Autosave every 30 s.
    this._saveT += dt;
    if (this._saveT > 30) { this._saveT = 0; this._autosave(); }

    input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }
}

window.__game = new Game();
