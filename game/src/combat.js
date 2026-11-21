// Combat: hitscan weapons, tracers, enemy AI, ammo/health pickups.
import { WEAPONS } from './config.js';

export function createCombat(scene, audio, onKill) {
  const raycaster = new THREE.Raycaster();
  const tracers = [];
  const enemies = [];
  const pickups = [];
  let weapon = 'pistol';
  let ammo = { pistol: 36, smg: 96, shotgun: 18, rifle: 90 };
  let mag = { pistol: 12, smg: 32, shotgun: 6, rifle: 30 };
  let cooldown = 0;
  let reloading = 0;
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9 });
  function tracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, tracerMat);
    scene.add(line);
    tracers.push({ line, life: 0.09 });
  }
  function fire(from, dir, spread) {
    if (cooldown > 0 || reloading > 0) return false;
    const w = WEAPONS[weapon];
    if (weapon !== 'fists') {
      if (mag[weapon] <= 0) { reload(); return false; }
      mag[weapon]--;
    }
    cooldown = w.rate;
    audio.shot();
    const pellets = w.pellets || 1;
    for (let p = 0; p < pellets; p++) {
      const d = dir.clone();
      d.x += (Math.random() - 0.5) * spread;
      d.y += (Math.random() - 0.5) * spread;
      d.z += (Math.random() - 0.5) * spread;
      d.normalize();
      raycaster.set(from, d);
      raycaster.far = w.range;
      const hits = raycaster.intersectObjects(enemies.map((e) => e.group), true);
      const end = from.clone().addScaledVector(d, w.range);
      if (hits.length > 0) {
        const hit = hits[0];
        end.copy(hit.point);
        const enemy = enemies.find((e) => e.group === hit.object || e.group.children.includes(hit.object));
        if (enemy) {
          enemy.health -= w.damage;
          enemy.group.position.addScaledVector(d, 0.35);
          if (enemy.health <= 0) {
            scene.remove(enemy.group);
            enemies.splice(enemies.indexOf(enemy), 1);
            onKill(enemy);
          }
        }
      }
      tracer(from, end);
    }
    return true;
  }
  function reload() {
    const w = WEAPONS[weapon];
    if (weapon === 'fists' || mag[weapon] >= w.mag || ammo[weapon] <= 0) return;
    reloading = 1.0;
  }
  function spawnEnemy(x, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a2a2a, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.5), mat);
    body.position.y = 1.15;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xc98d64 }));
    head.position.y = 1.95;
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    gun.position.set(0.4, 1.3, 0.5);
    g.add(body, head, gun);
    g.position.set(x, 0, z);
    scene.add(g);
    const enemy = { group: g, health: 60, shootTimer: 2 + Math.random() * 2 };
    enemies.push(enemy);
    return enemy;
  }
  function spawnPickup(x, z, kind) {
    const color = kind === 'health' ? 0x22ff66 : 0xffd22e;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 }));
    m.position.set(x, 0.9, z);
    scene.add(m);
    const p = { mesh: m, kind, x, z };
    pickups.push(p);
    return p;
  }
  function update(dt, playerPos, playerDir) {
    cooldown = Math.max(0, cooldown - dt);
    if (reloading > 0) {
      reloading -= dt;
      if (reloading <= 0) {
        const w = WEAPONS[weapon];
        const need = w.mag - mag[weapon];
        const take = Math.min(need, ammo[weapon]);
        mag[weapon] += take;
        ammo[weapon] -= take;
      }
    }
    for (const t of tracers) t.life -= dt;
    for (let i = tracers.length - 1; i >= 0; i--) {
      if (tracers[i].life <= 0) {
        scene.remove(tracers[i].line);
        tracers.splice(i, 1);
      }
    }
    for (const e of enemies) {
      const dx = playerPos.x - e.group.position.x;
      const dz = playerPos.z - e.group.position.z;
      const d = Math.hypot(dx, dz);
      e.group.rotation.y = Math.atan2(dx, dz);
      if (d > 3) {
        e.group.position.x += (dx / d) * 3.2 * dt;
        e.group.position.z += (dz / d) * 3.2 * dt;
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && d < 45) {
        e.shootTimer = 1.6 + Math.random();
        const from = e.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        const dir = new THREE.Vector3(dx / d, 0, dz / d);
        dir.x += (Math.random() - 0.5) * 0.25;
        dir.z += (Math.random() - 0.5) * 0.25;
        dir.normalize();
        tracer(from, from.clone().addScaledVector(dir, 40));
        audio.shot();
      }
    }
    for (const p of pickups) p.mesh.rotation.y += dt * 2;
  }
  return {
    fire, reload, spawnEnemy, spawnPickup, update,
    get weapon() { return weapon; },
    setWeapon: (w) => { if (WEAPONS[w]) weapon = w; },
    get ammo() { return ammo; },
    get mag() { return mag; },
    get reloading() { return reloading > 0; },
    addAmmo: (w, n) => { ammo[w] = (ammo[w] || 0) + n; },
    get enemyCount() { return enemies.length; },
    get pickups() { return pickups; },
    takePickup: (p) => {
      scene.remove(p.mesh);
      pickups.splice(pickups.indexOf(p), 1);
    },
  };
}
