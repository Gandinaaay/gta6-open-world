// Screenshot staging: four cinematic frames for the entry dossier.
// Each shot sets the time of day, Rico's pose and the camera, then renders
// one frozen frame and raises window.__shotReady for the capture script.

import { setTimeOfDay } from './world.js';
import { spawnVehicle, enterVehicle } from './vehicles.js';
import { wantedLevel } from './police.js';

const SHOTS = [
  { id: 1, name: 'start', time: 7.2, label: 'Dawn in Downtown' },
  { id: 2, name: 'play', time: 9.1, label: 'Driving the Vice Sedan' },
  { id: 3, name: 'chase', time: 15.9, label: 'Three-star chase' },
  { id: 4, name: 'night', time: 0.45, label: 'Vice Bay at night' },
];

export function stageShot(G, n) {
  const shot = SHOTS.find((s) => s.id === n) || SHOTS[0];
  const p = G.player;
  G.shotMode = true;
  setTimeOfDay(G, shot.time);
  // clear any chase from normal play
  G.heat = 0;
  G.wanted = 0;
  if (p.inVehicle) {
    p.inVehicle = null;
    p.group.visible = true;
  }
  if (shot.id === 1) {
    p.x = 55;
    p.z = 85;
    p.y = 0;
    p.yaw = Math.PI * 0.85;
    p.group.position.set(p.x, 0, p.z);
    p.group.rotation.y = p.yaw;
    G.camera.position.set(62, 4.5, 108);
    G.camera.lookAt(0, 25, -40);
  } else if (shot.id === 2) {
    const car = spawnVehicle(G, 'sedan', -100, 100, Math.PI / 2, { owned: true });
    car.speed = 24;
    p.x = car.x;
    p.z = car.z;
    enterVehicle(G, car);
    G.camera.position.set(car.x - 12, 4.5, car.z + 13);
    G.camera.lookAt(car.x + 10, 1.5, car.z - 6);
  } else if (shot.id === 3) {
    // chase down the x = 100 road, police on Rico's tail
    const car = spawnVehicle(G, 'muscle', 100, -100, 0, { owned: true, color: '#4a148c' });
    car.speed = 30;
    p.x = car.x;
    p.z = car.z;
    enterVehicle(G, car);
    G.heat = 78;
    G.wanted = wantedLevel(G);
    const spots = [[96, -118], [104, -118], [100, -132]];
    for (const [sx, sz] of spots) {
      const pc = spawnVehicle(G, 'sedan', sx, sz, 0, { police: true, color: '#eceff1' });
      pc.speed = 26;
      G.police.push(pc);
    }
    G.camera.position.set(90, 8, -138);
    G.camera.lookAt(100, 2, -88);
  } else {
    p.x = 120;
    p.z = 880;
    p.y = 0;
    p.yaw = Math.PI;
    p.group.position.set(p.x, 0, p.z);
    p.group.rotation.y = p.yaw;
    G.camera.position.set(96, 10, 940);
    G.camera.lookAt(-60, 30, 200);
  }
  if (G.hud) G.hud.update(0);
  G.renderer.render(G.scene, G.camera);
  window.__shotReady = true;
  window.__shotName = shot.name;
  return shot;
}

export { SHOTS };
