// Vice Bay: Blood & Destiny — weapons and combat.
// Hitscan shooting with a visible tracer: a shot is a ray from the player toward the
// aim point, and anything it crosses within range takes damage. Melee is a short arc.

import { WEAPONS } from './config.js';

const THREE = globalThis.THREE;

export function createCombat(scene) {
  const group = new THREE.Group();
  group.name = 'combat';
  scene.add(group);
  const tracers = [];
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const tracerGeo = new THREE.BoxGeometry(0.06, 0.06, 1);

  let weapon = 'pistol';
  let cooldown = 0;
  let ammo = { pistol: 48, smg: 120, shotgun: 16 };

  function fire(from, aimDir, targets, onHit) {
    if (cooldown > 0) return false;
    const spec = WEAPONS[weapon];
    cooldown = 1 / spec.rate;
    if (weapon === 'fist') {
      for (const t of targets) {
        const d = Math.hypot(t.position.x - from.x, t.position.z - from.z);
        if (d < spec.range) onHit(t, spec.damage);
      }
      return true;
    }
    if ((ammo[weapon] ?? 0) <= 0) return false;
    ammo[weapon] -= 1;
    const pellets = weapon === 'shotgun' ? 5 : 1;
    for (let p = 0; p < pellets; p++) {
      const spread = weapon === 'shotgun' ? 0.09 : 0.015;
      const dir = aimDir.clone();
      dir.x += (Math.random() - 0.5) * spread;
      dir.z += (Math.random() - 0.5) * spread;
      dir.normalize();
      const end = from.clone().add(dir.clone().multiplyScalar(spec.range));
      let best = null;
      let bestD = spec.range;
      for (const t of targets) {
        // Treat a target as a vertical capsule: test the ray against its axis segment.
        const to = new THREE.Vector3(t.position.x - from.x, 0, t.position.z - from.z);
        const along = to.dot(dir);
        if (along < 0 || along > bestD) continue;
        const closest = from.clone().add(dir.clone().multiplyScalar(along));
        const dd = Math.hypot(closest.x - t.position.x, closest.z - t.position.z);
        if (dd < 1.1) {
          best = t;
          bestD = along;
        }
      }
      const len = best ? bestD : spec.range;
      const tracer = new THREE.Mesh(tracerGeo, tracerMat);
      const mid = from.clone().add(dir.clone().multiplyScalar(len / 2));
      tracer.position.set(mid.x, 1.3, mid.z);
      tracer.scale.z = len;
      tracer.lookAt(from.x + dir.x * len, 1.3, from.z + dir.z * len);
      tracer.rotation.x = 0;
      group.add(tracer);
      tracers.push({ mesh: tracer, life: 0.09 });
      if (best) onHit(best, spec.damage);
      end.copy(from);
    }
    return true;
  }

  function update(dt) {
    cooldown = Math.max(0, cooldown - dt);
    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        group.remove(t.mesh);
        tracers.splice(i, 1);
      }
    }
  }

  function setWeapon(name) {
    if (WEAPONS[name]) weapon = name;
  }

  function giveAmmo(name, n) {
    ammo[name] = (ammo[name] ?? 0) + n;
  }

  return {
    fire, update, setWeapon, giveAmmo,
    get weapon() { return weapon; },
    get spec() { return WEAPONS[weapon]; },
    get ammo() { return ammo[weapon] ?? Infinity; },
  };
}
