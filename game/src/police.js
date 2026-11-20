// Vice Bay — wanted level 1-5, police pursuit cars that steer to an
// intercept point ahead of the player, arrest on foot contact, and losing
// the cops by distance + time.

import { CFG } from './config.js';

export class Police {
  constructor(scene, carManager, audio) {
    this.scene = scene;
    this.carManager = carManager;
    this.audio = audio;
    this.wanted = 0;
    this.heat = 0; // 0..100, wanted = ceil(heat / 20)
    this.loseTimer = 0;
    this.pursuitCars = [];
    this.spawnTimer = 0;
    this.arrested = false;
    this.bustedTimer = 0;
  }

  addHeat(n) {
    this.heat = Math.min(100, this.heat + n);
    const level = Math.ceil(this.heat / 20);
    if (level > this.wanted) {
      this.wanted = level;
      this.audio.sting();
    }
  }

  clearWanted() {
    this.wanted = 0;
    this.heat = 0;
    this.loseTimer = 0;
    this._despawnPursuit();
    this.audio.setSiren(false);
  }

  _despawnPursuit() {
    for (const car of this.pursuitCars) this.carManager.remove(car);
    this.pursuitCars = [];
  }

  _spawnPursuitCar(playerPos) {
    const a = Math.random() * Math.PI * 2;
    const d = 90 + Math.random() * 60;
    const x = Math.max(-900, Math.min(900, playerPos.x + Math.sin(a) * d));
    const z = Math.max(-900, Math.min(900, playerPos.z + Math.cos(a) * d));
    const car = this.carManager.spawn('police', x, z, Math.atan2(playerPos.x - x, playerPos.z - z));
    car.driver = 'ai';
    this.pursuitCars.push(car);
  }

  update(dt, player, colliders) {
    if (this.arrested) {
      this.bustedTimer -= dt;
      return;
    }
    // Wanted decays slowly when no new crime happens.
    if (this.wanted > 0) this.heat = Math.max(0, this.heat - CFG.wantedDecayPerSec * 100 * dt * 0.2);
    const level = Math.ceil(this.heat / 20);
    if (level !== this.wanted) this.wanted = level;
    const playerPos = player.vehicle ? player.vehicle.pos : player.pos;
    const playerSpeed = player.vehicle ? Math.abs(player.vehicle.speed) : player.speed;
    // Maintain pursuit fleet: wanted level = number of cars (capped).
    const wantCars = Math.min(this.wanted, CFG.maxPoliceCars);
    this.spawnTimer -= dt;
    if (this.pursuitCars.length < wantCars && this.spawnTimer <= 0) {
      this._spawnPursuitCar(playerPos);
      this.spawnTimer = 2.5;
    }
    this.audio.setSiren(this.pursuitCars.length > 0);
    // Lose-the-cops: far away + slow for long enough.
    let nearest = Infinity;
    for (const car of this.pursuitCars) {
      nearest = Math.min(nearest, Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z));
    }
    if (this.wanted > 0 && nearest > CFG.wantedLoseDistance && playerSpeed < 8) {
      this.loseTimer += dt;
      if (this.loseTimer > CFG.wantedLoseTime) this.clearWanted();
    } else {
      this.loseTimer = 0;
    }
    // Pursuit steering: aim at an intercept point ahead of the player.
    for (const car of this.pursuitCars) {
      const lead = 0.6;
      const tx = playerPos.x + Math.sin(player.vehicle ? player.vehicle.heading : player.heading) * playerSpeed * lead;
      const tz = playerPos.z + Math.cos(player.vehicle ? player.vehicle.heading : player.heading) * playerSpeed * lead;
      const desired = Math.atan2(tx - car.pos.x, tz - car.pos.z);
      let diff = desired - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 1.6));
      car.update(dt, { throttle: 1, steer, brake: false, handbrake: false }, colliders);
      // Ram the player: bump + damage on contact.
      const d = Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z);
      if (d < 3.4) {
        if (player.vehicle) {
          player.vehicle.damage(4);
          player.vehicle.speed *= 0.6;
        } else {
          // Arrest on foot contact with a slow cop car.
          if (Math.abs(car.speed) < 6) {
            this.arrested = true;
            this.bustedTimer = 3;
            this.audio.setSiren(false);
          } else {
            player.takeDamage(6);
          }
        }
      }
    }
  }
}
