// Vehicles: drivable cars, stealing, garage and arcade driving physics.
// A car is a group of boxes and cylinders; driving is speed + steering
// with building collision and a simple bounce.

import { VEHICLE_DEFS, POLICE_DEFS } from './config.js';
import { collideBuildings, clampToWorld } from './world.js';
import { pressed } from './input.js';
import { PLACES } from './city.js';

export function createCarMesh(def, color, police) {
  const grp = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x111418 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.62;
  grp.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), darkMat);
  cabin.position.set(0, 1.18, -0.2);
  grp.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    grp.add(w);
    wheels.push(w);
  }
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff8c4, emissive: 0xffe082, emissiveIntensity: 0.7 });
  for (const wx of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), lightMat);
    h.position.set(wx, 0.7, 2.21);
    grp.add(h);
  }
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xd50000, emissive: 0xaa0000, emissiveIntensity: 0.5 });
  for (const wx of [-0.6, 0.6]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.1), tailMat);
    t.position.set(wx, 0.7, -2.21);
    grp.add(t);
  }
  let lightBar = null;
  if (police) {
    lightBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.22, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x111111, emissive: 0x2244ff, emissiveIntensity: 1 }),
    );
    lightBar.position.set(0, 1.55, -0.2);
    grp.add(lightBar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 4.42), new THREE.MeshLambertMaterial({ color: 0x0d47a1 }));
    stripe.position.y = 0.62;
    grp.add(stripe);
  }
  return { group: grp, wheels, lightBar };
}

export function spawnVehicle(G, defId, x, z, yaw, opts) {
  const def = VEHICLE_DEFS.find((d) => d.id === defId) || VEHICLE_DEFS[0];
  const police = !!(opts && opts.police);
  const color = (opts && opts.color) || def.color;
  const { group, wheels, lightBar } = createCarMesh(def, color, police);
  group.position.set(x, 0, z);
  group.rotation.y = yaw || 0;
  G.scene.add(group);
  const v = {
    def, group, wheels, lightBar, police,
    x, z, yaw: yaw || 0, speed: 0, steer: 0,
    health: 100, owned: !!(opts && opts.owned), traffic: !!(opts && opts.traffic),
  };
  G.vehicles.push(v);
  return v;
}

export function nearestVehicle(G, x, z, maxD) {
  let best = null;
  let bestD = maxD;
  for (const v of G.vehicles) {
    if (v.police) continue;
    const d = Math.hypot(v.x - x, v.z - z);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

export function enterVehicle(G, v) {
  const p = G.player;
  p.inVehicle = v;
  p.group.visible = false;
  v.driver = p;
  if (!v.owned) {
    G.carsStolen += 1;
    G.heat += 25;
  }
  if (G.hud) G.hud.flash(`You took the ${v.def.name}`);
}

export function exitVehicle(G) {
  const p = G.player;
  const v = p.inVehicle;
  if (!v) return;
  p.inVehicle = null;
  v.driver = null;
  p.x = v.x + Math.sin(v.yaw + Math.PI / 2) * 2.4;
  p.z = v.z + Math.cos(v.yaw + Math.PI / 2) * 2.4;
  p.y = 0;
  p.vx = 0;
  p.vz = 0;
  p.group.visible = true;
  p.group.position.set(p.x, 0, p.z);
}

export function updateVehicles(G, dt) {
  const p = G.player;
  const inp = G.input;
  // E toggles enter / exit
  if (pressed(G, 'KeyE')) {
    if (p.inVehicle) exitVehicle(G);
    else {
      const v = nearestVehicle(G, p.x, p.z, 4.5);
      if (v) enterVehicle(G, v);
    }
  }
  const v = p.inVehicle;
  if (!v) return;
  const def = v.def;
  let throttle = 0;
  if (inp.keys.has('KeyW') || inp.keys.has('ArrowUp')) throttle = 1;
  if (inp.keys.has('KeyS') || inp.keys.has('ArrowDown')) throttle = -0.7;
  let steerIn = 0;
  if (inp.keys.has('KeyA') || inp.keys.has('ArrowLeft')) steerIn = 1;
  if (inp.keys.has('KeyD') || inp.keys.has('ArrowRight')) steerIn = -1;
  v.speed += throttle * def.accel * dt;
  v.speed -= v.speed * 0.55 * dt;
  if (Math.abs(v.speed) < 0.05 && throttle === 0) v.speed = 0;
  v.speed = Math.max(-def.topSpeed * 0.45, Math.min(def.topSpeed, v.speed));
  v.steer += (steerIn * 0.55 - v.steer) * Math.min(1, 8 * dt);
  const spd = v.speed;
  v.yaw += v.steer * (spd / def.topSpeed) * def.grip * dt * (spd >= 0 ? 1 : -1);
  const nx = v.x + Math.sin(v.yaw) * spd * dt;
  const nz = v.z + Math.cos(v.yaw) * spd * dt;
  if (collideBuildings(G, nx, v.z, 2.2) || collideBuildings(G, v.x, nz, 2.2)) {
    v.speed *= -0.25;
    v.health = Math.max(0, v.health - Math.abs(spd) * 0.4);
  } else {
    v.x = nx;
    v.z = nz;
  }
  [v.x, v.z] = clampToWorld(v.x, v.z);
  v.group.position.set(v.x, 0, v.z);
  v.group.rotation.y = v.yaw;
  const spin = spd * dt * 2.4;
  for (const w of v.wheels) w.rotation.x += spin;
  v.wheels[0].rotation.y = v.steer * 0.4;
  v.wheels[1].rotation.y = v.steer * 0.4;
  p.x = v.x;
  p.z = v.z;
  G.stats.topSpeed = Math.max(G.stats.topSpeed, Math.abs(spd) * 3.6);
  if (pressed(G, 'KeyH') && G.audio) G.audio.horn();
  // chase camera
  const cd = 10;
  const ch = 4.2;
  const cx = v.x - Math.sin(v.yaw) * cd;
  const cz = v.z - Math.cos(v.yaw) * cd;
  G.camera.position.set(cx, ch, cz);
  G.camera.lookAt(v.x + Math.sin(v.yaw) * 8, 1.5, v.z + Math.cos(v.yaw) * 8);
  p.camYaw = v.yaw + Math.PI;
}

// Garage: buy, store and retrieve owned cars at Rico's Garage.
export function garageMenu(G) {
  return G.ownedCars.map((id) => VEHICLE_DEFS.find((d) => d.id === id)).filter(Boolean);
}

export function buyCar(G, defId) {
  const def = VEHICLE_DEFS.find((d) => d.id === defId);
  if (!def || G.ownedCars.includes(defId)) return false;
  if (G.money < def.price) return false;
  G.money -= def.price;
  G.ownedCars.push(defId);
  return true;
}

export function retrieveOwnedCar(G, defId) {
  const spot = PLACES.garage;
  return spawnVehicle(G, defId, spot.x + 8, spot.z + 6, Math.PI / 2, { owned: true });
}
