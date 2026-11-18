// Combat, rewritten for the v4 recorded pass: fists and four guns, ammo, health
// and damage, enemy gangsters with simple chase-and-shoot AI, muzzle flashes,
// tracers and hit sparks — all raycast, no physics library needed. Ray hits
// resolve through userData.owner, which every damageable figure and vehicle sets
// on its group. New in v4: hits knock the enemy back a step, so a shot feels
// like it landed instead of just ticking a number down.
import { WEAPONS } from './config.js';

const raycaster = new THREE.Raycaster();
const forwardVec = new THREE.Vector3();

export function createCombat(G) {
  const tracers = [];
  const flashes = [];
  const combat = {
    cooldown: 0,
    weapon: 'pistol',
    ammo: { pistol: 120, smg: 0, shotgun: 0, rifle: 0 },
    // Fire the current weapon from the player (on foot) toward the aim direction.
    fire() {
      if (combat.cooldown > 0 || G.screen !== 'play') return false;
      const w = WEAPONS[combat.weapon];
      if (!w) return false;
      if (combat.weapon !== 'fists' && combat.ammo[combat.weapon] <= 0) {
        G.toast('Out of ammo for the ' + w.name + ' — buy more at Bay Arms.');
        combat.cooldown = 0.4;
        return false;
      }
      combat.cooldown = w.rate;
      if (combat.weapon !== 'fists') combat.ammo[combat.weapon] -= 1;
      const p = G.player;
      const origin = new THREE.Vector3(p.x, 1.6, p.z);
      const dir = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
      if (G.currentVehicle) {
        origin.set(G.currentVehicle.x, 1.6, G.currentVehicle.z);
        dir.set(-Math.sin(G.currentVehicle.yaw), 0, -Math.cos(G.currentVehicle.yaw));
      }
      if (combat.weapon === 'fists') {
        combat.melee(origin, dir);
        return true;
      }
      // One ray per shot (the shotgun fires three spread rays for its punch,
      // the SMG adds a little random spread so it feels less like a laser).
      const rays = combat.weapon === 'shotgun' ? [-0.06, 0, 0.06] : [combat.weapon === 'smg' ? (Math.random() - 0.5) * 0.05 : 0];
      for (const spread of rays) {
        const d = dir.clone();
        d.x += Math.cos(p.yaw) * spread;
        d.z -= Math.sin(p.yaw) * spread;
        d.normalize();
        combat.shootRay(origin, d, w);
      }
      G.addWanted(combat.weapon === 'pistol' ? 0 : 1);
      if (G.audio) G.audio.gunshot();
      combat.muzzle(origin, dir);
      return true;
    },
    melee(origin, dir) {
      if (G.audio) G.audio.punch();
      let hitAnything = false;
      for (const e of G.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - origin.x, e.z - origin.z);
        if (d < WEAPONS.fists.range) {
          combat.damageEnemy(e, WEAPONS.fists.damage);
          hitAnything = true;
        }
      }
      for (const ped of G.peds) {
        const d = Math.hypot(ped.x - origin.x, ped.z - origin.z);
        if (d < 2.4) {
          ped.group.visible = false;
          ped.dead = true;
          G.addWanted(1);
          hitAnything = true;
        }
      }
      if (hitAnything && G.onMeleeHit) G.onMeleeHit();
    },
    shootRay(origin, dir, w) {
      raycaster.set(origin, dir);
      raycaster.far = w.range;
      const targets = [];
      for (const e of G.enemies) if (e.alive) targets.push(e.group);
      for (const cop of G.police) targets.push(cop.group);
      for (const ped of G.peds) targets.push(ped.group);
      for (const v of G.vehicles) if (!v.isPlayer) targets.push(v.group);
      const hits = raycaster.intersectObjects(targets, true);
      let end = origin.clone().add(dir.clone().multiplyScalar(w.range));
      if (hits.length > 0) {
        const hit = hits[0];
        end = hit.point.clone();
        let obj = hit.object;
        while (obj && !obj.userData.owner) obj = obj.parent;
        const owner = obj ? obj.userData.owner : null;
        if (owner) {
          if (owner.kind === 'enemy') combat.damageEnemy(owner, w.damage);
          else if (owner.kind === 'ped') {
            owner.dead = true;
            owner.group.visible = false;
            G.addWanted(1);
            G.toast('You shot a civilian! Wanted level up.');
          } else if (owner.kind === 'police') {
            owner.health -= w.damage;
            G.addWanted(1);
          } else if (owner.kind === 'vehicle') {
            owner.health -= w.damage;
            if (owner.health <= 0) {
              owner.ai = null;
              if (G.audio) G.audio.crash();
            }
          }
        }
        combat.spark(end);
      }
      combat.tracer(origin, end);
    },
    damageEnemy(e, amount) {
      e.health -= amount;
      // Knockback: the hit shoves the gangster a step away from the player.
      const px = G.currentVehicle ? G.currentVehicle.x : G.player.x;
      const pz = G.currentVehicle ? G.currentVehicle.z : G.player.z;
      const dx = e.x - px;
      const dz = e.z - pz;
      const len = Math.hypot(dx, dz) || 1;
      e.x += (dx / len) * 0.6;
      e.z += (dz / len) * 0.6;
      combat.spark(new THREE.Vector3(e.x, 1.5, e.z));
      if (e.health <= 0 && e.alive) {
        e.alive = false;
        e.group.visible = false;
        G.money += e.bounty || 100;
        G.rep += 5;
        // A downed gangster sometimes drops a little pistol ammo.
        if (Math.random() < 0.4) {
          combat.ammo.pistol += 12;
          G.toast('Gangster down! +$' + (e.bounty || 100) + ' · +12 pistol ammo');
        } else {
          G.toast('Gangster down! +$' + (e.bounty || 100));
        }
        if (G.audio) G.audio.cash();
        if (G.onEnemyKilled) G.onEnemyKilled(e);
      }
    },
    muzzle(origin, dir) {
      const flash = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffdd55, transparent: true, opacity: 1 }),
      );
      flash.position.copy(origin).add(dir.clone().multiplyScalar(1.2));
      G.scene.add(flash);
      flashes.push({ mesh: flash, life: 0.06 });
    },
    spark(point) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0xffaa00 }),
      );
      s.position.copy(point);
      G.scene.add(s);
      flashes.push({ mesh: s, life: 0.25 });
    },
    tracer(from, to) {
      const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
      G.scene.add(line);
      tracers.push({ line, life: 0.08 });
    },
    update(dt) {
      combat.cooldown = Math.max(0, combat.cooldown - dt);
      for (let i = tracers.length - 1; i >= 0; i -= 1) {
        tracers[i].life -= dt;
        if (tracers[i].life <= 0) {
          G.scene.remove(tracers[i].line);
          tracers.splice(i, 1);
        }
      }
      for (let i = flashes.length - 1; i >= 0; i -= 1) {
        flashes[i].life -= dt;
        flashes[i].mesh.material.opacity = Math.max(0, flashes[i].life * 6);
        if (flashes[i].life <= 0) {
          G.scene.remove(flashes[i].mesh);
          flashes.splice(i, 1);
        }
      }
    },
  };
  return combat;
}

// Enemy gangsters: spawned at a place, they chase the player and shoot when close.
// A green-shirted "civilian" is the same figure with no bounty — used by the rescue.
export function spawnEnemy(G, x, z, opts = {}) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: opts.color || 0x8b0000 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.55), shirt);
  torso.position.y = 1.55;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), new THREE.MeshLambertMaterial({ color: 0xc98d64 }));
  head.position.y = 2.5;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  legL.position.set(-0.3, 0.5, 0);
  const legR = legL.clone();
  legR.position.x = 0.3;
  group.add(torso, head, legL, legR);
  group.traverse((m) => { m.castShadow = true; });
  group.position.set(x, 0, z);
  G.scene.add(group);
  group.userData.owner = null;
  const enemy = {
    kind: 'enemy', group, x, z, yaw: 0,
    health: opts.health || 100, alive: true,
    bounty: opts.bounty || 150, shootTimer: 1 + Math.random(),
    speed: opts.speed || 4.5, legL, legR, phase: Math.random() * 10,
    passive: !!opts.passive,
  };
  group.userData.owner = enemy;
  G.enemies.push(enemy);
  return enemy;
}

export function updateEnemies(G, dt) {
  const px = G.currentVehicle ? G.currentVehicle.x : G.player.x;
  const pz = G.currentVehicle ? G.currentVehicle.z : G.player.z;
  for (const e of G.enemies) {
    if (!e.alive || e.passive) continue;
    const dx = px - e.x;
    const dz = pz - e.z;
    const dist = Math.hypot(dx, dz) || 1;
    if (dist > 70) continue;
    e.yaw = Math.atan2(dx, dz);
    if (dist > 8) {
      e.x += Math.sin(e.yaw) * e.speed * dt;
      e.z += Math.cos(e.yaw) * e.speed * dt;
      e.phase += dt * 8;
    } else {
      // Close enough: shoot at the player.
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = 1.2 + Math.random() * 0.8;
        if (Math.random() < 0.55) {
          if (G.currentVehicle) G.currentVehicle.health -= 6;
          else G.damagePlayer(8, 'shot');
          if (G.audio) G.audio.gunshot();
          const from = new THREE.Vector3(e.x, 1.5, e.z);
          const to = new THREE.Vector3(px, 1.4, pz);
          G.combat.tracer(from, to);
        }
      }
    }
    e.group.position.set(e.x, 0, e.z);
    e.group.rotation.y = e.yaw;
    const s = Math.sin(e.phase);
    e.legL.rotation.x = s * 0.6;
    e.legR.rotation.x = -s * 0.6;
  }
}

export function clearEnemies(G) {
  for (const e of G.enemies) G.scene.remove(e.group);
  G.enemies.length = 0;
}
