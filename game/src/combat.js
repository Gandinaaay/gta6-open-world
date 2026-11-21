// Combat: fists + 4 guns, hitscan tracers, enemy AI, pickups.
import { WEAPONS } from './config.js';

const THREE = window.THREE;

export function createCombat(scene, audio, onKill) {
  let weapon = 'pistol';
  const ammo = { pistol: 48, smg: 120, shotgun: 24, rifle: 90 };
  const mag = { pistol: 12, smg: 30, shotgun: 6, rifle: 24 };
  let cooldown = 0;
  const enemies = [];
  const pickups = [];
  const tracers = [];
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe14a });
  const enemyMat = new THREE.MeshLambertMaterial({ color: 0x8a2020 });
  const ammoMat = new THREE.MeshBasicMaterial({ color: 0x30d0ff });
  const healthMat = new THREE.MeshBasicMaterial({ color: 0x30ff60 });

  function setWeapon(name) {
    if (WEAPONS[name]) { weapon = name; return true; }
    return false;
  }

  function fire(from, dir) {
    if (cooldown > 0) return false;
    const w = WEAPONS[weapon];
    if (weapon !== 'fists' && mag[weapon] <= 0) return false;
    cooldown = w.rate;
    if (weapon !== 'fists') mag[weapon]--;
    audio.shot();
    const pellets = w.pellets || 1;
    for (let p = 0; p < pellets; p++) {
      const spread = (Math.random() - 0.5) * 0.06;
      const d = dir.clone();
      d.x += spread; d.z += spread;
      d.normalize();
      const tracer = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.5), tracerMat);
      tracer.position.copy(from).addScaledVector(d, 3);
      tracer.lookAt(from.clone().addScaledVector(d, 10));
      scene.add(tracer);
      tracers.push({ mesh: tracer, life: 0.08 });
      // Hit the nearest enemy along the ray.
      let best = null;
      let bestT = w.range;
      for (const e of enemies) {
        const to = e.mesh.position.clone().sub(from);
        const t = to.dot(d);
        if (t < 0 || t > w.range) continue;
        const perp = to.clone().addScaledVector(d, -t).length();
        if (perp < 1.6 && t < bestT) { bestT = t; best = e; }
      }
      if (best) {
        best.health -= w.damage;
        best.mesh.position.addScaledVector(d, 0.4);
        if (best.health <= 0) {
          scene.remove(best.mesh);
          enemies.splice(enemies.indexOf(best), 1);
          onKill();
        }
      }
    }
    return true;
  }

  function reload() {
    if (weapon === 'fists') return;
    const w = WEAPONS[weapon];
    const need = w.mag - mag[weapon];
    const take = Math.min(need, ammo[weapon]);
    mag[weapon] += take;
    ammo[weapon] -= take;
  }

  function spawnEnemy(x, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.5), enemyMat);
    mesh.position.set(x, 0.95, z);
    scene.add(mesh);
    const e = { mesh, health: 60, shootT: 2, pos: mesh.position };
    enemies.push(e);
    return e;
  }

  function spawnPickup(kind, x, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      kind === 'ammo' ? ammoMat : healthMat
    );
    mesh.position.set(x, 0.6, z);
    scene.add(mesh);
    const p = { mesh, kind, pos: mesh.position };
    pickups.push(p);
    return p;
  }

  function update(dt, playerPos, playerInCar) {
    cooldown = Math.max(0, cooldown - dt);
    for (const t of tracers) {
      t.life -= dt;
      if (t.life <= 0) { scene.remove(t.mesh); tracers.splice(tracers.indexOf(t), 1); }
    }
    for (const e of enemies) {
      const dx = playerPos.x - e.pos.x;
      const dz = playerPos.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 26) continue;
      if (d > 4) {
        e.pos.x += dx / d * 3.2 * dt;
        e.pos.z += dz / d * 3.2 * dt;
      }
      e.shootT -= dt;
      if (e.shootT <= 0 && d < 30) {
        e.shootT = 1.6 + Math.random();
        audio.shot();
        // Enemy fire is inaccurate: only sometimes lands.
        if (Math.random() < 0.35) return { hit: true, damage: 8 };
      }
    }
    for (const p of pickups) {
      p.mesh.rotation.y += dt * 2;
      const d = Math.hypot(p.pos.x - playerPos.x, p.pos.z - playerPos.z);
      if (d < 2.2) {
        scene.remove(p.mesh);
        pickups.splice(pickups.indexOf(p), 1);
        audio.pickup();
        return { pickup: p.kind };
      }
    }
    return null;
  }

  return {
    get weapon() { return weapon; },
    get ammo() { return ammo; },
    get mag() { return mag; },
    get enemyCount() { return enemies.length; },
    setWeapon, fire, reload, spawnEnemy, spawnPickup, update,
  };
}
