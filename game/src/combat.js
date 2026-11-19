// Weapons, enemy AI, tracers, knockback, ammo/health drops.
import { CFG } from './config.js';
import { clamp, range } from './random.js';

export class Combat {
  constructor(scene) {
    this.scene = scene;
    this.ammo = {};
    for (const k of CFG.weaponOrder) {
      const w = CFG.weapons[k];
      this.ammo[k] = { mag: w.mag === Infinity ? Infinity : w.mag, reserve: w.reserve };
    }
    // Give the player a pistol at the start.
    this.ammo.pistol = { mag: 12, reserve: 84 };
    this.current = 'pistol';
    this.cooldown = 0;
    this.enemies = [];
    this.drops = [];
    this.kills = 0;
    this.tracers = [];
    this.gunshotFlag = false;
    this.onKill = null;
  }

  weapon() { return CFG.weapons[this.current]; }

  select(name) {
    if (CFG.weapons[name]) this.current = name;
  }

  cycle(dir) {
    const i = CFG.weaponOrder.indexOf(this.current);
    const n = (i + dir + CFG.weaponOrder.length) % CFG.weaponOrder.length;
    this.current = CFG.weaponOrder[n];
  }

  reload(audio) {
    const w = CFG.weapons[this.current];
    const a = this.ammo[this.current];
    if (w.mag === Infinity || a.mag === w.mag || a.reserve <= 0) return;
    const need = w.mag - a.mag;
    const take = Math.min(need, a.reserve);
    a.mag += take;
    a.reserve -= take;
    if (audio) audio.reload();
  }

  spawnEnemy(x, z, hp) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.95, 0.4), new THREE.MeshLambertMaterial({ color: 0x8a1a1a }));
    body.position.y = 1.05;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshLambertMaterial({ color: 0xc89878 }));
    head.position.y = 1.78;
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    gun.position.set(0.3, 1.2, 0.4);
    g.add(body, head, gun);
    g.position.set(x, 0, z);
    this.scene.add(g);
    const e = { mesh: g, pos: g.position, hp: hp || 60, maxHp: hp || 60, shootT: range(Math.random, 0.5, 1.5), dead: false, hitT: 0 };
    this.enemies.push(e);
    return e;
  }

  drop(kind, x, z) {
    const color = kind === 'ammo' ? 0xf5c518 : 0x2ecc71;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, 0.5, z);
    this.scene.add(m);
    this.drops.push({ mesh: m, kind, pos: m.position, t: 0 });
  }

  _tracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
    this.scene.add(line);
    this.tracers.push({ line, t: 0.12 });
  }

  shoot(origin, dir, audio, onHitPlayer) {
    if (this.cooldown > 0) return false;
    const w = this.weapon();
    this.cooldown = w.rate;
    const a = this.ammo[this.current];
    if (w.mag !== Infinity) {
      if (a.mag <= 0) { this.reload(audio); return false; }
      a.mag -= 1;
    }
    if (audio) audio.shot(this.current);
    this.gunshotFlag = true;
    let anyHit = false;
    for (let p = 0; p < w.pellets; p++) {
      const spread = w.spread;
      const d = dir.clone();
      d.x += (Math.random() - 0.5) * spread * 2;
      d.y += (Math.random() - 0.5) * spread * 2;
      d.z += (Math.random() - 0.5) * spread * 2;
      d.normalize();
      const end = origin.clone().add(d.clone().multiplyScalar(w.range));
      let best = null, bestDist = w.range;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const toE = new THREE.Vector3(e.pos.x - origin.x, 1.2 - origin.y, e.pos.z - origin.z);
        const along = toE.dot(d);
        if (along < 0 || along > w.range) continue;
        const perp = toE.clone().addScaledVector(d, -along).length();
        if (perp < 1.2 && along < bestDist) { best = e; bestDist = along; }
      }
      if (best) {
        anyHit = true;
        best.hp -= w.damage;
        best.hitT = 0.25;
        // Hit knockback: shove the enemy back along the shot.
        best.pos.x += d.x * 0.6;
        best.pos.z += d.z * 0.6;
        end.copy(origin).addScaledVector(d, bestDist);
        if (best.hp <= 0 && !best.dead) {
          best.dead = true;
          this.kills += 1;
          this.scene.remove(best.mesh);
          if (Math.random() < 0.6) this.drop(Math.random() < 0.6 ? 'ammo' : 'health', best.pos.x, best.pos.z);
          if (this.onKill) this.onKill(best);
        }
      }
      this._tracer(origin.clone(), end);
    }
    return anyHit;
  }

  update(dt, playerPos, damagePlayer) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.gunshotFlag = false;
    for (const t of this.tracers) {
      t.t -= dt;
      t.line.material.opacity = Math.max(0, t.t / 0.12) * 0.9;
      if (t.t <= 0) { this.scene.remove(t.line); }
    }
    this.tracers = this.tracers.filter((t) => t.t > 0);
    for (const d of this.drops) {
      d.t += dt;
      d.mesh.rotation.y += dt * 2;
      d.mesh.position.y = 0.5 + Math.sin(d.t * 3) * 0.15;
      if (playerPos && Math.hypot(d.pos.x - playerPos.x, d.pos.z - playerPos.z) < 2) {
        if (d.kind === 'ammo') {
          for (const k of CFG.weaponOrder) {
            const w = CFG.weapons[k];
            if (w.mag !== Infinity) this.ammo[k].reserve += 24;
          }
        } else if (damagePlayer) {
          damagePlayer(-30); // negative damage heals
        }
        this.scene.remove(d.mesh);
        d.taken = true;
      }
    }
    this.drops = this.drops.filter((d) => !d.taken);
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.hitT = Math.max(0, e.hitT - dt);
      const dx = playerPos.x - e.pos.x, dz = playerPos.z - e.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 2) {
        const sp = 3.2;
        e.pos.x += (dx / dist) * sp * dt;
        e.pos.z += (dz / dist) * sp * dt;
      }
      e.mesh.position.copy(e.pos);
      e.mesh.rotation.y = Math.atan2(dx, dz);
      e.mesh.scale.setScalar(e.hitT > 0 ? 1.15 : 1);
      e.shootT -= dt;
      if (e.shootT <= 0 && dist < 45) {
        e.shootT = range(Math.random, 0.9, 1.6);
        const from = e.pos.clone(); from.y = 1.3;
        const dir = new THREE.Vector3(playerPos.x - from.x, 1.1 - from.y, playerPos.z - from.z).normalize();
        dir.x += (Math.random() - 0.5) * 0.12;
        dir.z += (Math.random() - 0.5) * 0.12;
        dir.normalize();
        this._tracer(from, playerPos.clone().setY(1.2));
        if (dist < 40 && Math.random() < 0.45 && damagePlayer) damagePlayer(8);
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }
}
