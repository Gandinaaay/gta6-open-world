// Vice Bay: Blood & Destiny — wanted level and police pursuit.
// Heat rises with crimes and cools with time; each wanted star keeps one police car
// hunting the player, and the chase gets faster and closer as the heat climbs.

import { WANTED } from './config.js';
import { createVehicle } from './vehicles.js';
import { VEHICLES } from './config.js';

const THREE = globalThis.THREE;

export function createPolice(scene, colliders, rand) {
  const cruisers = [];
  let heat = 0;
  let stars = 0;
  const policeType = { name: 'Police Cruiser', color: 0x1c2733, top: 32, accel: 20, turn: 2.4, price: 0 };

  function addCrime(amount) {
    heat = Math.min(WANTED.max, heat + (amount ?? WANTED.heatPerCrime));
  }

  function wantedStars() {
    return Math.max(0, Math.min(WANTED.max, Math.floor(heat)));
  }

  function spawnCruiser(x, z) {
    const v = createVehicle(scene, policeType, x, z, rand.angle());
    // A light bar on the roof so a cruiser reads at a glance.
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.18, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }),
    );
    bar.position.set(0, 1.45, -0.2);
    v.group.add(bar);
    cruisers.push(v);
    return v;
  }

  function update(dt, playerPos, playerSpeed) {
    heat = Math.max(0, heat - WANTED.decayPerSecond * dt);
    const want = wantedStars();
    stars = want;
    const need = want * WANTED.policePerStar;
    while (cruisers.length < need) {
      const a = rand.angle();
      spawnCruiser(playerPos.x + Math.cos(a) * 90, playerPos.z + Math.sin(a) * 90);
    }
    while (cruisers.length > need) {
      const v = cruisers.pop();
      scene.remove(v.group);
    }
    for (const c of cruisers) {
      // Simple pursuit: steer toward the player, faster when close.
      const dx = playerPos.x - c.position.x;
      const dz = playerPos.z - c.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, dh * 1.5));
      const input = {
        forward: dist > 6,
        back: false,
        left: steer > 0.15,
        right: steer < -0.15,
      };
      c.update(dt, input, colliders);
      // A cruiser that rams the player at speed is a bust.
      if (dist < 3.2 && Math.abs(c.speed) > 6) {
        c.stop();
      }
    }
  }

  function reset() {
    heat = 0;
    stars = 0;
    for (const c of cruisers) scene.remove(c.group);
    cruisers.length = 0;
  }

  return {
    update, addCrime, reset,
    get heat() { return heat; },
    get stars() { return stars; },
    get cruisers() { return cruisers; },
  };
}
