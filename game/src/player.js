// Rico — the player character: on-foot movement, camera, jumping.
// Positions are plain {x, y, z}; the mesh is synced every frame.

import { PLAYER, WORLD } from './config.js';
import { collideBuildings, clampToWorld } from './world.js';
import { PLACES } from './city.js';

export function createPlayer(G) {
  const grp = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xc68863 });
  const jacket = new THREE.MeshLambertMaterial({ color: 0x7b1fa2 });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x283593 });
  const shoes = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), jacket);
  torso.position.y = 1.08;
  grp.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.32), skin);
  head.position.y = 1.62;
  grp.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.36), new THREE.MeshLambertMaterial({ color: 0xffd54f }));
  cap.position.y = 1.84;
  grp.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), jeans);
  legL.position.set(-0.16, 0.36, 0);
  grp.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  grp.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.2), jacket);
  armL.position.set(-0.42, 1.1, 0);
  grp.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.42;
  grp.add(armR);
  grp.position.set(PLACES.garage.x, 0, PLACES.garage.z);
  G.scene.add(grp);
  const player = {
    group: grp, parts: { legL, legR, armL, armR },
    x: PLACES.garage.x, y: 0, z: PLACES.garage.z,
    vx: 0, vz: 0, vy: 0, yaw: 0, camYaw: Math.PI, camPitch: 0.32,
    onGround: true, inVehicle: null, walkPhase: 0, moving: false,
  };
  G.player = player;
  return player;
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const inp = G.input;
  if (p.inVehicle) return;
  const run = inp.keys.has('ShiftLeft') || inp.keys.has('ShiftRight');
  const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  let fx = 0;
  let fz = 0;
  if (inp.keys.has('KeyW')) fz -= 1;
  if (inp.keys.has('KeyS')) fz += 1;
  if (inp.keys.has('KeyA')) fx -= 1;
  if (inp.keys.has('KeyD')) fx += 1;
  const len = Math.hypot(fx, fz) || 1;
  fx /= len;
  fz /= len;
  // movement relative to camera yaw
  const sin = Math.sin(p.camYaw);
  const cos = Math.cos(p.camYaw);
  const wx = (fx * cos - fz * sin) * speed;
  const wz = (fx * sin + fz * cos) * speed;
  p.vx += (wx - p.vx) * Math.min(1, PLAYER.accel * dt / speed);
  p.vz += (wz - p.vz) * Math.min(1, PLAYER.accel * dt / speed);
  p.moving = Math.hypot(p.vx, p.vz) > 0.6;
  // move with building collision, axis by axis so Rico slides along walls
  let nx = p.x + p.vx * dt;
  if (!collideBuildings(G, nx, p.z, PLAYER.radius)) p.x = nx;
  let nz = p.z + p.vz * dt;
  if (!collideBuildings(G, p.x, nz, PLAYER.radius)) p.z = nz;
  [p.x, p.z] = clampToWorld(p.x, p.z);
  // gravity + jump
  p.vy -= WORLD.gravity * dt;
  p.y += p.vy * dt;
  if (p.y <= 0) {
    p.y = 0;
    p.vy = 0;
    p.onGround = true;
  }
  if (inp.keys.has('Space') && p.onGround) {
    p.vy = PLAYER.jumpSpeed;
    p.onGround = false;
  }
  if (p.moving) {
    p.yaw = Math.atan2(p.vx, p.vz);
    p.walkPhase += dt * Math.hypot(p.vx, p.vz) * 1.4;
  }
  // mesh sync + walk swing
  p.group.position.set(p.x, p.y, p.z);
  p.group.rotation.y = p.yaw;
  const swing = p.moving ? Math.sin(p.walkPhase) * 0.5 : 0;
  p.parts.legL.rotation.x = swing;
  p.parts.legR.rotation.x = -swing;
  p.parts.armL.rotation.x = -swing * 0.8;
  p.parts.armR.rotation.x = swing * 0.8;
  G.stats.distance += Math.hypot(p.vx, p.vz) * dt;
  // third-person camera
  p.camYaw += (inp.mouseDX || 0) * 0.0032;
  p.camPitch = Math.max(-0.15, Math.min(0.9, p.camPitch + (inp.mouseDY || 0) * 0.0028));
  inp.mouseDX = 0;
  inp.mouseDY = 0;
  const cd = 7.5;
  const cx = p.x + Math.sin(p.camYaw) * Math.cos(p.camPitch) * cd;
  const cz = p.z + Math.cos(p.camYaw) * Math.cos(p.camPitch) * cd;
  const cy = p.y + 2 + Math.sin(p.camPitch) * cd;
  G.camera.position.set(cx, cy, cz);
  G.camera.lookAt(p.x, p.y + 1.6, p.z);
}
