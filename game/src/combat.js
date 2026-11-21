// Combat: fists + 4 guns, hitscan shooting, tracers, enemy AI, pickups.

import { WEAPONS } from './config.js';

export function createCombat(scene, audio, onKill) {
  const raycaster = new THREE.Raycaster();
  const enemies = [];
  const tracers = [];
  const pickups = [];
  let current = 'pistol';
  const ammo = { pistol: 36, smg: 64, shotgun: 12, rifle: 20 };
  const mag = { pistol: 12, smg: 32, shotgun: 6, rifle: 20 };
  let cooldown = 0;
  let reloading = 0;
  let healthPickup = false;

  function spawnEnemy(x, z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.4), new THREE.MeshLambertMaterial({ color: 0x7f1d1d }));
    body.position.y = 1.1;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshLambertMaterial({ color: 0xc9a06a }));
    head.position.y = 1.85;
    g.add(body, head);
    g.position.set(x, 0, z);
    scene.add(g);
    const e = { mesh: g, pos: g.position, health: 60, shootTimer: 1 + Math.random() * 2, alive: true };
    enemies.push(e);
    return e;
  }

  function spawnPickup(kind, x, z) {
    const color = kind === 'health' ? 0x22c55e : 0xf59e0b;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, 0.8, z);
    scene.add(m);
    pickups.push({ mesh: m, pos: m.position, kind });
  }

  function addTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9 }));
    scene.add(line);
    tracers.push({ line, life: 0.08 });
  }

  function fire(from, dir, spread) {
    const w = WEAPONS[current];
    if (cooldown > 0 || reloading > 0) return false;
    if (current !== 'fists' && mag[current] <= 0) {
      reloading = 1.2;
      return false;
    }
    cooldown = 1 / w.rate;
    if (current !== 'fists') mag[current]--;
    audio.shot();
    const pellets = w.pellets || 1;
    for (let p = 0; p < pellets; p++) {
      const d = dir.clone();
      if (spread) {
        d.x += (Math.random() - 0.5) * spread * 2;
        d.y += (Math.random() - 0.5) * spread * 2;
        d.normalize();
      }
      raycaster.set(from, d);
      raycaster.far = w.range;
      const targets = enemies.filter((e) => e.alive).map((e) => e.mesh.children[0]);
      const hits = raycaster.intersectObjects(targets, false);
      const end = hits.length > 0 ? hits[0].point : from.clone().addScaledVector(d, w.range);
      addTracer(from, end);
      if (hits.length > 0) {
        const e = enemies.find((en) => en.mesh.children[0] === hits[0].object);
        if (e) {
          e.health -= w.damage;
          // Hit knockback.
          e.pos.addScaledVector(d, 0.4);
          if (e.health <= 0) {
            e.alive = false;
            scene.remove(e.mesh);
            if (Math.random() < 0.5) spawnPickup('ammo', e.pos.x, e.pos.z);
            onKill(e);
          }
        }
      }
    }
    return true;
  }

  return {
    get current() { return current; },
    get ammo() { return { ...ammo, mag: { ...mag } }; },
    setWeapon(name) { if (WEAPONS[name]) { current = name; cooldown = 0; } },
    spawnEnemy, spawnPickup, fire,
    update(dt, playerPos) {
      cooldown = Math.max(0, cooldown - dt);
      if (reloading > 0) {
        reloading -= dt;
        if (reloading <= 0 && current !== 'fists') {
          const need = WEAPONS[current].mag - mag[current];
          const take = Math.min(need, ammo[current]);
          mag[current] += take;
          ammo[current] -= take;
        }
      }
      for (let i = tracers.length - 1; i >= 0; i--) {
        const t = tracers[i];
        t.life -= dt;
        t.line.material.opacity = Math.max(0, t.life / 0.08);
        if (t.life <= 0) { scene.remove(t.line); tracers.splice(i, 1); }
      }
      // Enemy AI: face the player and shoot with inaccuracy.
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = playerPos.x - e.pos.x, dz = playerPos.z - e.pos.z;
        const d = Math.hypot(dx, dz);
        e.mesh.rotation.y = Math.atan2(dx, dz);
        if (d < 40 && d > 0.01) {
          e.shootTimer -= dt;
          if (e.shootTimer <= 0) {
            e.shootTimer = 1.5 + Math.random() * 1.5;
            const from = e.pos.clone(); from.y = 1.4;
            const dir = new THREE.Vector3(dx / d, 0, dz / d);
            dir.x += (Math.random() - 0.5) * 0.2;
            dir.z += (Math.random() - 0.5) * 0.2;
            dir.normalize();
            addTracer(from, from.clone().addScaledVector(dir, 30));
            audio.shot();
          }
        }
        if (d > 12) {
          e.pos.x += (dx / d) * 3 * dt;
          e.pos.z += (dz / d) * 3 * dt;
        }
      }
      // Pickups bob and get collected.
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        p.mesh.rotation.y += dt * 3;
        p.mesh.position.y = 0.8 + Math.sin(performance.now() * 0.004 + i) * 0.15;
        if (Math.hypot(p.pos.x - playerPos.x, p.pos.z - playerPos.z) < 2) {
          scene.remove(p.mesh);
          pickups.splice(i, 1);
          audio.pickup();
          if (p.kind === 'ammo') ammo[current] += 12;
          if (p.kind === 'health') healthPickup = true;
        }
      }
    },
    takeHealthPickup() {
      const v = healthPickup;
      healthPickup = false;
      return v;
    },
    reload() {
      if (current !== 'fists' && reloading <= 0 && mag[current] < WEAPONS[current].mag && ammo[current] > 0) reloading = 1.2;
    },
    enemyCount() { return enemies.filter((e) => e.alive).length; },
  };
}
