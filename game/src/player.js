// The hero on foot: a low-poly articulated figure (head, torso, arms, legs)
// whose limbs swing with the stride, plus walk / run / sprint / jump / crouch
// and the smooth third-person camera that follows him — and the car —
// everywhere. A landing squash sells the jump, and a strafe lean makes
// sidesteps read on screen. Round 2: the walk cycle and the camera are
// driven from one shared "pace" value instead of scattered constants.
import { WORLD, KEYS } from './config.js';
import { collideCircle, clampToWorld } from './city.js';

const SKIN = 0xc98d64;
const PANTS = 0x2b3a55;
const HAIR = 0x1a1a1a;

function part(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function createPlayer(scene, shirtColor = 0x8a2be2) {
  const group = new THREE.Group();
  group.name = 'player';
  const torso = part(1.1, 1.3, 0.55, shirtColor, 0, 1.55, 0);
  const head = part(0.55, 0.55, 0.55, SKIN, 0, 2.5, 0);
  const hair = part(0.58, 0.22, 0.58, HAIR, 0, 2.82, 0);
  const armL = part(0.32, 1.1, 0.32, shirtColor, -0.75, 2.15, 0);
  const armR = part(0.32, 1.1, 0.32, shirtColor, 0.75, 2.15, 0);
  const legL = part(0.4, 1.0, 0.4, PANTS, -0.3, 1.0, 0);
  const legR = part(0.4, 1.0, 0.4, PANTS, 0.3, 1.0, 0);
  // Pivot each limb at its top so it swings like a real stride.
  for (const l of [armL, armR, legL, legR]) l.geometry.translate(0, -0.5, 0);
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
  const mat = new THREE.MeshLambertMaterial({ color });
  player.torso.material = mat;
  player.armL.material = mat;
  player.armR.material = mat;
}

// Movement intent from the held keys, in world space relative to the hero's
// facing. Forward is -yaw, so the basis vectors come straight from the yaw.
function moveIntent(keys, yaw) {
  const fwd = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
  let x = 0;
  let z = 0;
  if (keys[KEYS.forward]) { x += fwd.x; z += fwd.z; }
  if (keys[KEYS.back]) { x -= fwd.x * 0.6; z -= fwd.z * 0.6; }
  if (keys[KEYS.left]) { x -= right.x; z -= right.z; }
  if (keys[KEYS.right]) { x += right.x; z += right.z; }
  const len = Math.hypot(x, z);
  if (len > 0) { x /= len; z /= len; }
  return { x, z, moving: len > 0 };
}

// One step of on-foot movement. Returns the horizontal speed (for HUD/audio).
export function updatePlayer(G, dt) {
  const p = G.player;
  const keys = G.keys;
  const sprint = keys[KEYS.sprint];
  const crouch = keys[KEYS.crouch];
  p.crouching = !!crouch;
  const intent = moveIntent(keys, p.yaw);
  const topSpeed = crouch ? 2.2 : sprint ? 11.5 : intent.moving ? 5.5 : 0;
  // Smooth acceleration: the hero eases up to speed instead of snapping to it.
  p.speed += (topSpeed - p.speed) * Math.min(1, dt * 10);
  let nx = p.x + intent.x * p.speed * dt;
  let nz = p.z + intent.z * p.speed * dt;
  const hit = collideCircle(G.city.colliders, nx, nz, 0.7);
  const clamped = clampToWorld(hit.x, hit.z);
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

  // Walk-cycle: limbs swing opposite, arms counter the legs, and the body
  // leans a touch forward at a sprint and sideways into a strafe.
  if (p.speed > 0.3) p.walkPhase += dt * p.speed * 1.6;
  const pace = Math.min(1, p.speed / 6);
  const swing = pace * 0.7;
  const s = Math.sin(p.walkPhase);
  p.legL.rotation.x = s * swing;
  p.legR.rotation.x = -s * swing;
  p.armL.rotation.x = -s * swing * 0.8;
  p.armR.rotation.x = s * swing * 0.8;
  p.torso.rotation.x = p.speed > 9 ? 0.12 : 0;
  const strafe = (keys[KEYS.right] ? 1 : 0) - (keys[KEYS.left] ? 1 : 0);
  p.torso.rotation.z = -strafe * 0.08 * pace;
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
  const focus = driving ? G.currentVehicle : G.player;
  const pace = driving ? Math.min(1, Math.abs(G.currentVehicle.speed) / 60) : Math.min(1, G.player.speed / 11);
  const dist = driving ? 13 : 8.5;
  const height = driving ? 5 : 3.6;
  const yaw = focus.yaw + (G.camOrbit || 0);
  const want = {
    x: focus.x + Math.sin(yaw) * dist,
    y: height + (G.camPitch || 0) * 3,
    z: focus.z + Math.cos(yaw) * dist,
  };
  const k = 1 - Math.exp(-dt * 7);
  cam.position.x += (want.x - cam.position.x) * k;
  cam.position.y += (want.y - cam.position.y) * k;
  cam.position.z += (want.z - cam.position.z) * k;
  cam.lookAt(focus.x, (driving ? 1.5 : 1.6) + (G.camPitch || 0) * 2, focus.z);
  const wantFov = 62 + pace * 10;
  if (Math.abs(cam.fov - wantFov) > 0.1) {
    cam.fov += (wantFov - cam.fov) * Math.min(1, dt * 4);
    cam.updateProjectionMatrix();
  }
}
