// Vice Bay: Blood & Destiny — the player on foot: movement, jumping, camera.
// The character is a simple built-up figure; collisions are AABB push-outs against the
// city's building boxes, so the player can never walk through a wall.

import { PLAYER, WORLD } from './config.js';

const THREE = globalThis.THREE;

function collideCircle(pos, radius, colliders) {
  for (const b of colliders) {
    const dx = pos.x - Math.max(b.x - b.hw, Math.min(pos.x, b.x + b.hw));
    const dz = pos.z - Math.max(b.z - b.hd, Math.min(pos.z, b.z + b.hd));
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      const d = Math.sqrt(d2) || 0.001;
      const push = (radius - d) / d;
      pos.x += dx * push;
      pos.z += dz * push;
    }
  }
}

export function createPlayer(scene, colliders) {
  const group = new THREE.Group();
  group.name = 'player';
  const jacket = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.0, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x8b1e1e }),
  );
  jacket.position.y = 1.05;
  jacket.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xd9a066 }),
  );
  head.position.y = 1.85;
  head.castShadow = true;
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.6, 0.45),
    new THREE.MeshLambertMaterial({ color: 0x1c2733 }),
  );
  legs.position.y = 0.3;
  group.add(jacket, head, legs);
  scene.add(group);

  const pos = new THREE.Vector3(0, 0, 120);
  let heading = 0;
  let vy = 0;
  let grounded = true;
  let moving = false;

  function update(dt, input, camYaw) {
    const run = input.run ? PLAYER.run : PLAYER.walk;
    let fx = 0;
    let fz = 0;
    if (input.forward) fz -= 1;
    if (input.back) fz += 1;
    if (input.left) fx -= 1;
    if (input.right) fx += 1;
    moving = fx !== 0 || fz !== 0;
    const len = Math.hypot(fx, fz) || 1;
    fx /= len;
    fz /= len;
    // Movement is relative to the camera yaw: the camera sits at
    // target + (sin(yaw), cos(yaw)) * dist, so W walks away from the camera.
    const sin = Math.sin(camYaw);
    const cos = Math.cos(camYaw);
    const mx = (fx * cos + fz * sin) * run;
    const mz = (-fx * sin + fz * cos) * run;
    pos.x += mx * dt;
    pos.z += mz * dt;
    if (moving) heading = Math.atan2(mx, mz);
    // Gravity and jumping.
    vy -= WORLD.gravity * dt;
    pos.y += vy * dt;
    if (pos.y <= 0) {
      pos.y = 0;
      vy = 0;
      grounded = true;
    }
    if (input.jump && grounded) {
      vy = PLAYER.jump;
      grounded = false;
      input.jump = false; // consume the press so landing does not re-jump
    }
    // Keep inside the city and out of buildings.
    pos.x = Math.max(-WORLD.half + 4, Math.min(WORLD.half - 4, pos.x));
    pos.z = Math.max(-WORLD.half + 4, Math.min(WORLD.half - 4, pos.z));
    collideCircle(pos, PLAYER.radius, colliders);
    group.position.copy(pos);
    group.rotation.y = heading;
    // A small walk bob so the figure reads as moving.
    const bob = moving && grounded ? Math.sin(performance.now() * 0.02) * 0.05 : 0;
    jacket.position.y = 1.05 + bob;
  }

  return {
    group,
    get position() { return pos; },
    get heading() { return heading; },
    get moving() { return moving; },
    get grounded() { return grounded; },
    update,
    teleport(x, z) {
      pos.set(x, 0, z);
      group.position.copy(pos);
    },
  };
}
