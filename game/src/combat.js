// Combat: fists and four guns, ammo, health and damage, enemy gangsters with
// simple chase-and-shoot AI, muzzle flashes, tracers and hit sparks — all
// raycast, no physics library needed. Ray hits resolve through
// userData.owner, which every damageable figure and vehicle sets on its
// group. Hits knock the enemy back a step, so a shot feels like it landed
// instead of just ticking a number down. Round 2: the hit resolution is one
// small function, and the shot is assembled from an aim (origin + direction)
// so foot and vehicle fire share the same path.
import { WEAPONS } from './config.js';

const raycaster = new THREE.Raycaster();
const forwardVec = new THREE.Vector3();

// Where the player is aiming from, and in which direction, on foot or in a car.
function aimFrom(G) {
  const focus = G.currentVehicle || G.player;
  const yaw = focus.yaw;
  return {
    origin: new THREE.Vector3(focus.x, 1.6, focus.z),
    dir: new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)),
  };
}

function ownerOf(hit) {
  let obj = hit.object;
  while (obj && !obj.userData.owner) obj = obj.parent;
  return obj ? obj.userData.owner : null;
}

export function createCombat(G) {
  const tracers = [];
  const flashes = [];
  const combat = {
    cooldown: 0,
    weapon: 'pistol',
    ammo: { pistol: 120, smg: 0, shotgun: 0, rifle: 0 },

    // Fire the current weapon toward the aim direction.
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
      const { origin, dir } = aimFrom(G);
      if (combat.weapon === 'fists') {
        combat.melee(origin, dir);
        return true;
      }
      // One ray per shot (the shotgun fires three spread rays for its punch,
      // the SMG adds a little random spread so it feels less like a laser).
      const spreads = combat.weapon === 'shotgun'
        ? [-0.06, 0, 0.06]
        : [combat.weapon === 'smg' ? (Math.random() - 0.5) * 0.05 : 0];
      for (const spread of spreads) {
        const d = dir.clone();
        d.x += Math.cos(G.player.yaw) * spread;
        d.z -= Math.sin(G.player.yaw) * spread;
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
        if (Math.hypot(e.x - origin.x, e.z - origin.z) < WEAPONS.fists.range) {
          combat.damageEnemy(e, WEAPONS.fists.damage);
          hitAnything = true;
        }
      }
      for (const ped of G.peds) {
        if (Math.hypot(ped.x - origin.x, ped.z - origin.z) < 2.4) {
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
        combat.resolveHit(ownerOf(hit), w);
        combat.spark(end);
      }
      combat.tracer(origin, end);
    },

    // What a ray hit does, by what it hit.
    resolveHit(owner, w) {
      if (!owner) return;
      if (owner.kind === 'enemy') {
        combat.damageEnemy(owner, w.damage);
      } else if (owner.kind === 'ped') {
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
    },

    damageEnemy(e, amount) {
      e.health -= amount;
      // Knockback: the hit shoves the gangster a step away from the player.
      const focus = G.currentVehicle || G.player;
      const dx = e.x - focus.x;
      const dz = e.z - focus.z;
      const len = Math.hypot(dx, dz) || 1;
      e.x += (dx / len) * 0.6;
      e.z += (dz / len) * 0.6;
      combat.spark(new THREE.Vector3(e.x, 1.5, e.z));
      if (e.health <= 0 && e.alive) {
        e.alive = false;
        e.group.visible = false;
        const bounty = e.bounty || 100;
        G.money += bounty;
        G.rep += 5;
        // A downed gangster sometimes drops a little pistol ammo.
        if (Math.random() < 0.4) {
          combat.ammo.pistol += 12;
          G.toast('Gangster down! +$' + bounty + ' · +12 pistol ammo');
        } else {
          G.toast('Gangster down! +$' + bounty);
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

// Enemy gangsters: spawned at a place, they chase the player and shoot when
// close. A green-shirted "civilian" is the same figure with no bounty —
// used by the rescue side mission.
export function spawnEnemy(G, x, z, opts = {}) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: opts.color || 0x8b0000 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98d64 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.55), shirt);
  torso.position.y = 1.55;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skin);
  head.position.y = 2.5;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.4), dark);
  legL.position.set(-0.3, 0.5, 0);
  const legR = legL.clone();
  legR.position.x = 0.3;
  group.add(torso, head, legL, legR);
  group.traverse((m) => { m.castShadow = true; });
  group.position.set(x, 0, z);
  G.scene.add(group);
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
  const focus = G.currentVehicle || G.player;
  const px = focus.x;
  const pz = focus.z;
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
          G.combat.tracer(new THREE.Vector3(e.x, 1.5, e.z), new THREE.Vector3(px, 1.4, pz));
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
