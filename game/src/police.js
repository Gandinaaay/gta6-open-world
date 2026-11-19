// Wanted level 1-5, police pursuit, arrest, losing the cops.
import { CFG } from './config.js';
import { clamp, range } from './random.js';

export class Police {
  constructor(scene, vehicleMgr) {
    this.scene = scene;
    this.vm = vehicleMgr;
    this.wanted = 0;
    this.heat = 0;
    this.cops = [];
    this.loseTimer = 0;
    this.decayTimer = 0;
    this._flashT = 0;
    this.onBusted = null; // set by main.js
    this.onWantedChange = null; // set by main.js (hud flash + sting)
  }

  addHeat(n, audio) {
    const before = this.wanted;
    this.heat += n;
    this.wanted = clamp(Math.floor(this.heat / 2) + (this.heat > 0 ? 1 : 0), 0, 5);
    if (this.wanted > before) {
      this.spawnPursuit();
      if (this.onWantedChange) this.onWantedChange(this.wanted);
      if (audio) audio.wanted();
    }
  }

  setWanted(n, audio) {
    const before = this.wanted;
    this.wanted = clamp(n, 0, 5);
    this.heat = n * 2;
    if (this.wanted > before) {
      this.spawnPursuit();
      if (this.onWantedChange) this.onWantedChange(this.wanted);
      if (audio) audio.wanted();
    }
  }

  spawnPursuit() {
    const want = this.wanted + 1;
    while (this.cops.length < want) {
      const a = Math.random() * Math.PI * 2;
      const x = clamp(Math.cos(a) * 120, -900, 900);
      const z = clamp(Math.sin(a) * 120, -900, 900);
      const car = this.vm.spawn('police', x, z, a, { ai: true });
      car.speed = 20;
      this.cops.push(car);
    }
  }

  clearCops() {
    for (const c of this.cops) this.vm.remove(c);
    this.cops = [];
  }

  update(dt, playerPos, playerVel, playerOnFoot, audio) {
    this._flashT += dt;
    // Flashing light bars on pursuit cars.
    const on = Math.floor(this._flashT * 4) % 2 === 0;
    for (const c of this.cops) {
      if (c.barL) c.barL.material.color.setHex(on ? 0xff0000 : 0x330000);
      if (c.barR) c.barR.material.color.setHex(on ? 0x330000 : 0x2244ff);
    }
    if (this.wanted === 0) {
      if (this.cops.length) this.clearCops();
      if (audio) audio.setSiren(false);
      return;
    }
    if (audio) audio.setSiren(true);
    // Pursuit: steer each cop toward the intercept point (0.5 s ahead of the player).
    const ix = playerPos.x + playerVel.x * 0.5;
    const iz = playerPos.z + playerVel.z * 0.5;
    let nearest = Infinity;
    for (const c of this.cops) {
      const dx = ix - c.pos.x, dz = iz - c.pos.z;
      const dist = Math.hypot(dx, dz);
      nearest = Math.min(nearest, dist);
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += clamp(dh, -2.4 * dt, 2.4 * dt);
      const top = 46 + this.wanted * 3;
      c.speed = clamp(c.speed + (top - c.speed) * dt * 0.5, 0, top);
      c.pos.x += Math.sin(c.heading) * c.speed * dt;
      c.pos.z += Math.cos(c.heading) * c.speed * dt;
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.y = c.heading - Math.PI / 2;
      for (const w of c.wheels) w.rotation.z -= c.speed * dt * 2.2;
      // Ram the player's car.
      if (!playerOnFoot && dist < 5) {
        c.speed *= 0.6;
      }
    }
    // Arrest: a cop car stopped next to the player on foot.
    if (playerOnFoot && nearest < 4) {
      this.busted();
      return;
    }
    // Lose the cops: no cop within 120 m for 12 s.
    if (nearest > 120) {
      this.loseTimer += dt;
      if (this.loseTimer > 12) {
        this.loseTimer = 0;
        this.wanted = Math.max(0, this.wanted - 1);
        this.heat = this.wanted * 2;
        if (this.wanted === 0) this.clearCops();
      }
    } else {
      this.loseTimer = 0;
    }
    // Slow heat decay while hidden.
    if (nearest > 150) {
      this.decayTimer += dt;
      if (this.decayTimer > 5 && this.wanted > 0) {
        this.decayTimer = 0;
        this.wanted = Math.max(0, this.wanted - 1);
        this.heat = this.wanted * 2;
        if (this.wanted === 0) this.clearCops();
      }
    }
  }

  busted() {
    this.wanted = 0;
    this.heat = 0;
    this.clearCops();
    if (this.onBusted) this.onBusted();
  }
}
