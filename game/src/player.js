// The hero on foot, rewritten for the v4 recorded pass: a low-poly articulated
// figure (head, torso, arms, legs) whose limbs swing with the stride, plus walk
// / run / sprint / jump / crouch and the smooth third-person camera that follows
// him — and the car — everywhere. New in v4: a landing squash that sells the
// jump, and a strafe lean so sidesteps read on screen.
import { WORLD, KEYS } from './config.js';
import { collideCircle, clampToWorld } from './city.js';

function limb(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function createPlayer(scene, shirtColor = 0x8a2be2) {
  const group = new THREE.Group();
  group.name = 'player';
  const skin = 0xc98d64;
  const pants = 0x2b3a55;
  const torso = limb(1.1, 1.3, 0.55, shirtColor, 0, 1.55, 0);
  const head = limb(0.55, 0.55, 0.55, skin, 0, 2.5, 0);
  const hair = limb(0.58, 0.22, 0.58, 0x1a1a1a, 0, 2.82, 0);
  const armL = limb(0.32, 1.1, 0.32, shirtColor, -0.75, 1.6, 0);
  const armR = limb(0.32, 1.1, 0.32, shirtColor, 0.75, 1.6, 0);
  const legL = limb(0.4, 1.0, 0.4, pants, -0.3, 0.5, 0);
  const legR = limb(0.4, 1.0, 0.4, pants, 0.3, 0.5, 0);
  // Pivot each limb at its top so it swings like a real stride.
  for (const l of [armL, armR, legL, legR]) l.geometry.translate(0, -0.5, 0);
  armL.position.y = 2.15;
  armR.position.y = 2.15;
  legL.position.y = 1.0;
  legR.position.y = 1.0;
  group.add(torso, head, hair, armL, armR, legL, legR);
  scene.add(group);

  const player = {
    group, torso, head, armL, armR, legL, legR,
    x: 0, z: 120, y: 0, yaw: Math.PI, vy: 0, onGround: true,
    speed: 0, walkPhase: 0, crouching: false, health: 100,
    shirtColor, landSquash: 0,
  };
  group.position.set(player.x, 0, player.z);
  return player;
}

export function setShirtColor(player, color) {
  player.shirtColor = color;
  player.torso.material = new THREE.MeshLambertMaterial({ color });
  player.armL.material = new THREE.MeshLambertMaterial({ color });
  player.armR.material = new THREE.MeshLambertMaterial({ color });
}

// One step of on-foot movement. Returns the horizontal speed (for HUD/audio).
export function updatePlayer(G, dt) {
  const p = G.player;
  const keys = G.keys;
  const sprint = keys[KEYS.sprint];
  const crouch = keys[KEYS.crouch];
  p.crouching = !!crouch;
  const moving = keys[KEYS.forward] || keys[KEYS.back] || keys[KEYS.left] || keys[KEYS.right];
  const baseSpeed = crouch ? 2.2 : sprint ? 11.5 : moving ? 5.5 : 0;
  let fx = 0;
  let fz = 0;
  if (keys[KEYS.forward]) { fx -= Math.sin(p.yaw); fz -= Math.cos(p.yaw); }
  if (keys[KEYS.back]) { fx += Math.sin(p.yaw) * 0.6; fz += Math.cos(p.yaw) * 0.6; }
  if (keys[KEYS.left]) { fx -= Math.cos(p.yaw); fz += Math.sin(p.yaw); }
  if (keys[KEYS.right]) { fx += Math.cos(p.yaw); fz -= Math.sin(p.yaw); }
  const len = Math.hypot(fx, fz);
  if (len > 0) { fx /= len; fz /= len; }
  // Smooth acceleration: the hero eases up to speed instead of snapping to it.
  const target = len > 0 ? baseSpeed : 0;
  p.speed += (target - p.speed) * Math.min(1, dt * 10);
  let nx = p.x + fx * p.speed * dt;
  let nz = p.z + fz * p.speed * dt;
  const hit = collideCircle(G.city.colliders, nx, nz, 0.7);
  nx = hit.x;
  nz = hit.z;
  const clamped = clampToWorld(nx, nz);
  p.x = clamped.x;
  p.z = clamped.z;

  // Jump: simple gravity, land back on the ground with a squash.
  if (keys[KEYS.jump] && p.onGround && !crouch) {
    p.vy = 7.5;
    p.onGround = false;
  }
  if (!p.onGround) {
    p.vy -= 22 * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; p.landSquash = 1; }
  }
  p.landSquash = Math.max(0, (p.landSquash || 0) - dt * 5);

  // Walk-cycle: limbs swing opposite, arms counter the legs, and the body leans
  // a touch forward at a sprint and sideways into a strafe.
  if (p.speed > 0.3) p.walkPhase += dt * p.speed * 1.6;
  const swing = Math.min(1, p.speed / 6) * 0.7;
  const s = Math.sin(p.walkPhase);
  p.legL.rotation.x = s * swing;
  p.legR.rotation.x = -s * swing;
  p.armL.rotation.x = -s * swing * 0.8;
  p.armR.rotation.x = s * swing * 0.8;
  p.torso.rotation.x = p.speed > 9 ? 0.12 : 0;
  const strafe = (keys[KEYS.right] ? 1 : 0) - (keys[KEYS.left] ? 1 : 0);
  p.torso.rotation.z = -strafe * 0.08 * Math.min(1, p.speed / 5);
  p.group.scale.y = (crouch ? 0.72 : 1) * (1 - 0.18 * (p.landSquash || 0));
  p.group.position.set(p.x, p.y, p.z);
  p.group.rotation.y = p.yaw;
  return p.speed;
}

// Third-person camera: behind and above the player (or the car), eased toward
// its target so it never snaps. Mouse drag orbits; wheel zooms; the field of
// view widens a little at speed, which sells the sense of going fast.
export function updateCamera(G, dt) {
  const cam = G.camera;
  const driving = !!G.currentVehicle;
  const target = driving
    ? { x: G.currentVehicle.x, y: 1.5, z: G.currentVehicle.z, yaw: G.currentVehicle.yaw }
    : { x: G.player.x, y: 1.6, z: G.player.z, yaw: G.player.yaw };
  const speed01 = driving ? Math.min(1, Math.abs(G.currentVehicle.speed) / 60) : Math.min(1, G.player.speed / 11);
  const dist = driving ? 13 : 8.5;
  const height = driving ? 5 : 3.6;
  const yaw = target.yaw + (G.camOrbit || 0);
  const cx = target.x + Math.sin(yaw) * dist;
  const cz = target.z + Math.cos(yaw) * dist;
  const k = 1 - Math.exp(-dt * 7);
  cam.position.x += (cx - cam.position.x) * k;
  cam.position.y += (height + (G.camPitch || 0) * 3 - cam.position.y) * k;
  cam.position.z += (cz - cam.position.z) * k;
  cam.lookAt(target.x, target.y + (G.camPitch || 0) * 2, target.z);
  const wantFov = 62 + speed01 * 10;
  if (Math.abs(cam.fov - wantFov) > 0.1) {
    cam.fov += (wantFov - cam.fov) * Math.min(1, dt * 4);
    cam.updateProjectionMatrix();
  }
}
