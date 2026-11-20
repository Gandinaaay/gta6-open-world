// Vice Bay — combat: fists + 4 guns, ammo and reloads, enemy AI that
// shoots back, tracers, hit knockback, and ammo/health pickups.

import { WEAPONS, WEAPON_ORDER } from './config.js';

export class Combat {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.weaponIndex = 0;
    this.ammo = { pistol: 48, smg: 90, shotgun: 18, rifle: 60 };
    this.mag = { pistol: 12, smg: 30, shotgun: 6, rifle: 24 };
    this.cooldown = 0;
    this.reloading = 0;
    this.tracers = [];
    this.enemies = [];
    this.pickups = [];
    this._tracerMat = new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9 });
  }

  get weaponId() {
    return WEAPON_ORDER[this.weaponIndex];
  }
  get weapon() {
    return WEAPONS[this.weaponId];
  }

  cycleWeapon(dir = 1) {
    this.weaponIndex = (this.weaponIndex + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length;
    this.reloading = 0;
  }

  spawnEnemy(x, z, hp = 60) {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: 0x8e2f2f });
    const skin = new THREE.MeshLambertMaterial({ color: 0xb98a5e });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.32), shirt);
    torso.position.y = 1.02;
    g.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.38), skin);
    head.position.y = 1.62;
    g.add(head);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.6), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    gun.position.set(0.3, 1.1, 0.3);
    g.add(gun);
    g.position.set(x, 0, z);
    this.scene.add(g);
    const enemy = { group: g, pos: g.position, hp, shootTimer: 1 + Math.random() * 2, heading: 0 };
    this.enemies.push(enemy);
    return enemy;
  }

  spawnPickup(x, z, kind) {
    const color = kind === 'health' ? 0x2ecc71 : 0xf1c40f;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35 })
    );
    mesh.position.set(x, 0.6, z);
    mesh.rotation.y = Math.PI / 4;
    this.scene.add(mesh);
    this.pickups.push({ mesh, pos: mesh.position, kind, bob: Math.random() * Math.PI * 2 });
  }

  _addTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const line = new THREE.Line(geo, this._tracerMat);
    this.scene.add(line);
    this.tracers.push({ line, life: 0.12 });
  }

  fire(origin, dir, player) {
    if (this.cooldown > 0 || this.reloading > 0) return false;
    const w = this.weapon;
    if (this.weaponId === 'fists') {
      this.cooldown = w.interval;
      this.audio.punch();
      // Melee: hit the nearest enemy in front within range.
      for (const e of this.enemies) {
        const d = e.pos.distanceTo(origin);
        if (d < w.range + 1) {
          e.hp -= w.damage;
          e.pos.addScaledVector(dir, 0.8); // knockback
        }
      }
      return true;
    }
    if (this.mag[this.weaponId] <= 0) {
      this.reload();
      return false;
    }
    this.cooldown = w.interval;
    this.mag[this.weaponId]--;
    this.audio.shot(this.weaponId);
    const pellets = w.pellets || 1;
    let hitSomething = false;
    for (let p = 0; p < pellets; p++) {
      const spread = (Math.random() - 0.5) * 2 * w.spread;
      const d = dir.clone();
      const right = new THREE.Vector3(Math.cos(Math.atan2(dir.x, dir.z)), 0, -Math.sin(Math.atan2(dir.x, dir.z)));
      d.addScaledVector(right, spread).normalize();
      const end = origin.clone().addScaledVector(d, w.range);
      // Hit the first enemy along the ray (simple distance-to-ray test).
      let best = null;
      let bestT = w.range;
      for (const e of this.enemies) {
        const toE = e.pos.clone().sub(origin);
        const t = toE.dot(d);
        if (t < 0 || t > w.range) continue;
        const perp = toE.clone().addScaledVector(d, -t).length();
        if (perp < 1.1 && t < bestT) { best = e; bestT = t; }
      }
      if (best) {
        best.hp -= w.damage;
        best.pos.addScaledVector(d, 0.5); // knockback
        end.copy(origin).addScaledVector(d, bestT);
        hitSomething = true;
      }
      this._addTracer(origin, end);
    }
    return hitSomething;
  }

  reload() {
    const id = this.weaponId;
    if (id === 'fists' || this.reloading > 0) return;
    const w = WEAPONS[id];
    const need = w.mag - this.mag[id];
    if (need <= 0 || this.ammo[id] <= 0) return;
    this.reloading = w.reload;
  }

  update(dt, player, playerPos, playerHeading) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const id = this.weaponId;
        const w = WEAPONS[id];
        const need = w.mag - this.mag[id];
        const take = Math.min(need, this.ammo[id]);
        this.mag[id] += take;
        this.ammo[id] -= take;
      }
    }
    // Tracers fade fast.
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }
    // Enemies: face the player, strafe a little, shoot back.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hp <= 0) {
        this.scene.remove(e.group);
        this.enemies.splice(i, 1);
        // Drop ammo on death.
        this.spawnPickup(e.pos.x, e.pos.z, 'ammo');
        continue;
      }
      const toPlayer = playerPos.clone().sub(e.pos);
      const dist = toPlayer.length();
      e.heading = Math.atan2(toPlayer.x, toPlayer.z);
      e.group.rotation.y = e.heading;
      if (dist > 14) {
        e.pos.addScaledVector(toPlayer.normalize(), 3.2 * dt);
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 55) {
        e.shootTimer = 1.4 + Math.random() * 1.2;
        this._addTracer(e.pos.clone().setY(1.2), playerPos.clone().setY(1.1));
        this.audio.shot('pistol');
        if (Math.random() < 0.45) player.takeDamage(7);
      }
    }
    // Pickups: bob, spin, collect on touch.
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.bob += dt * 3;
      p.mesh.position.y = 0.6 + Math.sin(p.bob) * 0.15;
      p.mesh.rotation.y += dt * 2;
      const d = Math.hypot(p.pos.x - playerPos.x, p.pos.z - playerPos.z);
      if (d < 1.8) {
        if (p.kind === 'health') player.heal(35);
        else {
          for (const id of ['pistol', 'smg', 'shotgun', 'rifle']) this.ammo[id] += 12;
        }
        this.audio.pickup();
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
      }
    }
  }
}
