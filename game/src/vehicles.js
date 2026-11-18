// Vehicles, rewritten for the v4 recorded pass: box-built cars, SUVs, bikes,
// taxis, trucks and police interceptors, with arcade driving (acceleration,
// braking, steering that tightens with speed, a Space handbrake for sliding
// turns, damage) and entering, exiting and stealing them off the street.
// New in v4: headlights that glow at night and brake lights that flare when
// you brake, so night driving reads at a glance.
import { VEHICLE_TYPES, KEYS, HANDBRAKE_GRIP } from './config.js';
import { collideCircle, clampToWorld } from './city.js';

let vehicleId = 0;

function carPart(w, h, d, color, x, y, z, mat = null) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    mat || new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function makeVehicleMesh(typeKey) {
  const type = VEHICLE_TYPES[typeKey];
  const group = new THREE.Group();
  group.name = 'vehicle-' + typeKey;
  const color = type.color;
  const glass = new THREE.MeshLambertMaterial({ color: 0x101418 });
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

  if (typeKey === 'bike') {
    group.add(carPart(0.5, 0.5, 2.2, color, 0, 0.7, 0));
    group.add(carPart(0.4, 0.5, 0.7, 0x222222, 0, 1.05, -0.3));
    const wheels = [];
    for (const z of [-0.85, 0.85]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 12), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(0, 0.42, z);
      group.add(w);
      wheels.push(w);
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
    head.position.set(0, 0.75, -1.12);
    group.add(head);
    group.userData.headlight = head;
    return { group, wheels, type };
  }

  const long = typeKey === 'truck' ? 5.2 : typeKey === 'suv' ? 4.6 : 4.2;
  const wide = typeKey === 'suv' || typeKey === 'truck' ? 2.1 : 1.9;
  const bodyH = typeKey === 'suv' || typeKey === 'truck' ? 1.1 : 0.75;
  group.add(carPart(wide, bodyH, long, color, 0, 0.75, 0));
  group.add(carPart(wide * 0.85, 0.65, long * 0.5, 0x000000, 0, 1.35, typeKey === 'truck' ? 1.2 : -0.2, glass));
  // A thin spoiler on the sport car and a roof rack on the SUV, so the silhouettes differ.
  if (typeKey === 'sport') group.add(carPart(wide * 0.9, 0.08, 0.4, 0x111111, 0, 1.25, long / 2 - 0.3));
  if (typeKey === 'suv') group.add(carPart(wide * 0.7, 0.1, long * 0.6, 0x111111, 0, 1.75, 0));
  if (typeKey === 'police') {
    group.add(carPart(wide * 0.9, 0.25, 0.5, 0xffffff, 0, 1.15, 0.4));
    group.add(carPart(0.5, 0.25, 0.5, 0xff0000, -0.5, 1.75, -0.2));
    group.add(carPart(0.5, 0.25, 0.5, 0x0000ff, 0.5, 1.75, -0.2));
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.2), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    bar.position.set(-0.5, 1.9, -0.2);
    group.add(bar);
    group.userData.lightBar = bar;
  }
  if (typeKey === 'taxi') {
    group.add(carPart(1.0, 0.3, 0.8, 0xf2b705, 0, 1.75, -0.2));
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.5), new THREE.MeshBasicMaterial({ color: 0xffe600 }));
    sign.position.set(0, 1.8, -0.2);
    group.add(sign);
  }
  // Headlights up front, brake lights at the back — both are plain bright
  // boxes, so they read in daylight and glow at night.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), headMat);
  headL.position.set(-wide / 2 + 0.3, 0.8, -long / 2 - 0.02);
  const headR = headL.clone();
  headR.position.x = wide / 2 - 0.3;
  group.add(headL, headR);
  group.userData.headlight = headL;
  const brakeMat = new THREE.MeshBasicMaterial({ color: 0x881111 });
  const brake = new THREE.Mesh(new THREE.BoxGeometry(wide * 0.8, 0.18, 0.1), brakeMat);
  brake.position.set(0, 0.85, long / 2 + 0.02);
  group.add(brake);
  group.userData.brakeLight = brake;
  const wheels = [];
  for (const [x, z] of [[-wide / 2, long / 2 - 0.8], [wide / 2, long / 2 - 0.8], [-wide / 2, -long / 2 + 0.8], [wide / 2, -long / 2 + 0.8]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    group.add(w);
    wheels.push(w);
  }
  return { group, wheels, type };
}

export function spawnVehicle(scene, typeKey, x, z, yaw = 0, opts = {}) {
  const { group, wheels, type } = makeVehicleMesh(typeKey);
  scene.add(group);
  const v = {
    id: ++vehicleId,
    typeKey, type, group, wheels,
    x, z, yaw, speed: 0, health: 100, damage: 0,
    isPlayer: false, isPolice: typeKey === 'police',
    driver: opts.driver || null, // 'traffic' | 'police' | null (parked)
    ai: opts.ai || null,
    stolen: false, owned: !!opts.owned,
    topSpeed: type.topSpeed,
    lightPhase: Math.random() * 10,
  };
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  return v;
}

// Arcade driving: W accelerates, S brakes or reverses, A/D steer (tighter at low
// speed), Space is the handbrake — it cuts grip and lets the tail slide around
// a corner, with a skid sound. Hitting a building slows you down and dents the car.
export function driveVehicle(G, v, dt) {
  const keys = G.keys;
  const up = G.upgrades || {};
  const top = v.topSpeed * (up.engine2 ? 1.3 : up.engine1 ? 1.15 : 1);
  const grip = up.tires1 ? 1.25 : 1;
  const handbrake = !!keys[KEYS.jump];
  if (keys[KEYS.forward]) v.speed += v.type.accel * dt;
  if (keys[KEYS.back]) {
    if (v.speed > 1) v.speed -= v.type.brake * dt;
    else v.speed = Math.max(-12, v.speed - 10 * dt);
  }
  // Drag, rolling resistance, and the handbrake bleeding speed fast.
  v.speed -= v.speed * (handbrake ? 1.6 : 0.55) * dt;
  if (!keys[KEYS.forward] && !keys[KEYS.back]) v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 8 * dt);
  v.speed = Math.max(-14, Math.min(top, v.speed));
  const steer = (keys[KEYS.left] ? 1 : 0) - (keys[KEYS.right] ? 1 : 0);
  const dir = v.speed >= 0 ? 1 : -1;
  const steerPower = v.type.turn * grip * (handbrake ? HANDBRAKE_GRIP : 1) * Math.min(1, Math.abs(v.speed) / 14);
  v.yaw += steer * steerPower * dir * dt;
  if (handbrake && steer !== 0 && Math.abs(v.speed) > 12 && G.audio) G.audio.skid();
  const nx = v.x - Math.sin(v.yaw) * v.speed * dt;
  const nz = v.z - Math.cos(v.yaw) * v.speed * dt;
  const before = { x: v.x, z: v.z };
  const hit = collideCircle(G.city.colliders, nx, nz, 1.6);
  const clamped = clampToWorld(hit.x, hit.z, 10);
  const moved = Math.hypot(clamped.x - before.x, clamped.z - before.z);
  const wanted = Math.hypot(nx - before.x, nz - before.z);
  if (wanted - moved > 0.05 && Math.abs(v.speed) > 8) {
    const armour = up.armor1 ? 0.6 : 1;
    v.health = Math.max(0, v.health - Math.abs(v.speed) * 0.6 * armour);
    v.damage += Math.abs(v.speed) * 0.4;
    if (G.audio) G.audio.crash();
    if (G.onVehicleCrash) G.onVehicleCrash(Math.abs(v.speed));
  }
  v.x = clamped.x;
  v.z = clamped.z;
  v.group.position.set(v.x, 0, v.z);
  v.group.rotation.y = v.yaw;
  // Body roll into the turn, stronger with the handbrake out.
  v.group.rotation.z = -steer * Math.min(1, Math.abs(v.speed) / 30) * (handbrake ? 0.12 : 0.06);
  for (const w of v.wheels) w.rotation.x += v.speed * dt * 2.4;
  if (v.isPolice && v.group.userData.lightBar) {
    v.lightPhase += dt * 6;
    v.group.userData.lightBar.material.color.setHex(Math.sin(v.lightPhase) > 0 ? 0xff0000 : 0x0000ff);
  }
  // Brake lights flare while you brake; headlights stay on, brighter at night.
  if (v.group.userData.brakeLight) {
    const braking = !!keys[KEYS.back] || handbrake;
    v.group.userData.brakeLight.material.color.setHex(braking ? 0xff2222 : 0x881111);
  }
  return v.speed;
}

// Nearest drivable vehicle within reach of the player.
export function nearestVehicle(G, maxDist = 4.5) {
  let best = null;
  let bestD = maxDist;
  for (const v of G.vehicles) {
    if (v.isPolice && v.driver === 'police') continue;
    const d = Math.hypot(v.x - G.player.x, v.z - G.player.z);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}

export function enterVehicle(G, v) {
  if (!v) return false;
  if (v.driver === 'traffic') {
    // Stealing a car someone is driving: the driver flees, the law notices.
    v.driver = null;
    v.stolen = true;
    G.addWanted(1);
    G.toast('You stole the ' + v.type.name + '! The police were called.');
    if (G.audio) G.audio.horn();
  } else if (!v.owned && !v.stolen && v.typeKey !== 'police') {
    v.stolen = true;
    G.addWanted(1);
    G.toast('You stole a parked ' + v.type.name + '!');
  }
  G.currentVehicle = v;
  v.isPlayer = true;
  G.player.group.visible = false;
  return true;
}

export function exitVehicle(G) {
  const v = G.currentVehicle;
  if (!v) return;
  v.isPlayer = false;
  v.speed = 0;
  G.currentVehicle = null;
  G.player.x = v.x + Math.sin(v.yaw + Math.PI / 2) * 2.5;
  G.player.z = v.z + Math.cos(v.yaw + Math.PI / 2) * 2.5;
  G.player.yaw = v.yaw;
  G.player.group.visible = true;
  G.player.group.position.set(G.player.x, 0, G.player.z);
}
