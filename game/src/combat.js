// Combat: fists and a pistol. Punch the nearest pedestrian, or shoot with
// a hitscan ray from the camera. Every violent act raises the heat.

import { WANTED } from './config.js';
import { hitPedestrian } from './traffic.js';
import { addHeat } from './police.js';
import { pressed } from './input.js';

let cooldown = 0;
let flash = null;

export function updateCombat(G, dt) {
  cooldown = Math.max(0, cooldown - dt);
  const p = G.player;
  // punch
  if (pressed(G, 'KeyF') && !p.inVehicle) {
    let best = null;
    let bestD = 2.6;
    for (const ped of G.pedestrians) {
      if (ped.down) continue;
      const d = Math.hypot(ped.x - p.x, ped.z - p.z);
      if (d < bestD) {
        bestD = d;
        best = ped;
      }
    }
    if (best) {
      hitPedestrian(G, best);
      addHeat(G, WANTED.assault);
      if (G.audio) G.audio.punch();
      if (G.hud) G.hud.flash('You laid them out cold.');
    }
  }
  // shoot: hitscan from the camera through the click point
  if (G.input.clicked && cooldown <= 0 && !p.inVehicle) {
    cooldown = 0.28;
    G.stats.shotsFired += 1;
    shoot(G);
  }
}

function shoot(G) {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(
    (G.input.clickX / window.innerWidth) * 2 - 1,
    -(G.input.clickY / window.innerHeight) * 2 + 1,
  );
  ray.setFromCamera(ndc, G.camera);
  ray.far = 220;
  const targets = [];
  for (const ped of G.pedestrians) if (!ped.down) targets.push(ped.group);
  for (const v of G.vehicles) targets.push(v.group);
  const hits = ray.intersectObjects(targets, true);
  if (hits.length > 0) {
    let obj = hits[0].object;
    while (obj.parent && obj.parent !== G.scene) obj = obj.parent;
    const ped = G.pedestrians.find((x) => x.group === obj);
    if (ped) {
      hitPedestrian(G, ped);
      addHeat(G, WANTED.shoot);
    } else {
      const veh = G.vehicles.find((x) => x.group === obj);
      if (veh) {
        veh.health = Math.max(0, veh.health - 12);
        addHeat(G, WANTED.shoot);
        if (veh.health <= 0 && veh.driver !== G.player) {
          veh.speed = 0;
        }
      }
    }
  } else {
    addHeat(G, 4);
  }
  if (G.audio) G.audio.shot();
  // muzzle flash: a brief point light at the camera
  if (!flash) {
    flash = new THREE.PointLight(0xffd27d, 0, 18);
    G.scene.add(flash);
  }
  flash.position.copy(G.camera.position).add(new THREE.Vector3(0, -0.4, 0));
  flash.intensity = 26;
  setTimeout(() => { if (flash) flash.intensity = 0; }, 60);
}
