// Missions: Rico's rise through Vice Bay. 10 main story missions that
// unlock in order, plus 8 side jobs. Steps are data: goto, pickup, deliver,
// wait, race and eliminate. A beacon marks the current objective.

import { PLACES } from './city.js';
import { addHeat } from './police.js';
import { spawnVehicle } from './vehicles.js';

export const MAIN_MISSIONS = [
  { id: 'm1', title: 'Fresh Off the Boat', giver: 'Mama Rosa', reward: 150,
    desc: 'Rico just docked in Vice Bay with $250 and a borrowed jacket. Mama Rosa is waiting at her diner.',
    steps: [{ type: 'goto', x: PLACES.rosaDiner.x, z: PLACES.rosaDiner.z, r: 12, label: 'Go to Mama Rosa’s Diner' }] },
  { id: 'm2', title: 'The First Pickup', giver: 'Mama Rosa', reward: 300,
    desc: 'A package is waiting at the Port Delgado gate. Bring it to Don Sal’s mansion — no questions.',
    steps: [
      { type: 'pickup', x: PLACES.portGate.x, z: PLACES.portGate.z, r: 10, label: 'Pick up the package at Port Delgado' },
      { type: 'deliver', x: PLACES.donMansion.x, z: PLACES.donMansion.z, r: 12, label: 'Deliver it to Don Sal’s mansion' },
    ] },
  { id: 'm3', title: 'Wheels', giver: 'Don Sal', reward: 250,
    desc: 'A Comet Coupe is parked by the Marina. Steal it and bring it to Rico’s garage. Cops don’t like it.',
    steps: [
      { type: 'goto', x: PLACES.marinaYachts.x, z: PLACES.marinaYachts.z, r: 14, label: 'Find the Comet Coupe at the Marina' },
      { type: 'deliver', x: PLACES.garage.x, z: PLACES.garage.z, r: 12, label: 'Bring the car to Rico’s Garage', needsCar: true },
    ] },
  { id: 'm4', title: 'Heat in Old Town', giver: 'Don Sal', reward: 350,
    desc: 'The Old Town crew tipped off the police. Lose the heat before you come back.',
    steps: [{ type: 'escape', label: 'Lose the police (get to 0 stars)', heat: 45 }] },
  { id: 'm5', title: 'The Photographer', giver: 'Lena', reward: 200,
    desc: 'Lena wants the sunset over the pier for her gallery. Stand on the Beachfront Pier and take it in.',
    steps: [{ type: 'wait', x: PLACES.beachPier.x, z: PLACES.beachPier.z, r: 10, seconds: 8, label: 'Watch the sunset at the Pier (8s)' }] },
  { id: 'm6', title: 'Campus Run', giver: 'Professor Ivo', reward: 400,
    desc: 'Exam papers for University Hill. The dean pays in cash and asks no questions.',
    steps: [{ type: 'deliver', x: PLACES.uniQuad.x, z: PLACES.uniQuad.z, r: 12, label: 'Deliver the papers to University Quad' }] },
  { id: 'm7', title: 'Ironworks Deal', giver: 'Don Sal', reward: 600,
    desc: 'Meet the contact at the Ironworks yard, then shake the three-star tail they bring with them.',
    steps: [
      { type: 'goto', x: PLACES.ironworks.x, z: PLACES.ironworks.z, r: 12, label: 'Meet the contact at Ironworks Yard' },
      { type: 'escape', label: 'Lose the 3-star tail', heat: 75 },
    ] },
  { id: 'm8', title: 'Marina Heist', giver: 'Lena', reward: 800,
    desc: 'A yacht at the Marina carries Don Sal’s rival’s cargo. Take it to the garage.',
    steps: [
      { type: 'pickup', x: PLACES.marinaYachts.x, z: PLACES.marinaYachts.z, r: 10, label: 'Grab the cargo at the Marina' },
      { type: 'deliver', x: PLACES.garage.x, z: PLACES.garage.z, r: 12, label: 'Bring the cargo to Rico’s Garage' },
    ] },
  { id: 'm9', title: 'Tower Job', giver: 'Don Sal', reward: 1000,
    desc: 'The rival crew’s lookout watches the Tower Plaza. Remove him, quietly or not.',
    steps: [{ type: 'eliminate', x: 60, z: -100, r: 16, label: 'Eliminate the lookout at Tower Plaza' }] },
  { id: 'm10', title: 'Blood & Destiny', giver: 'Don Sal', reward: 2500,
    desc: 'The finale. The Don’s briefcase at the Port, the Tower Plaza at the end, and every cop in Vice Bay in between.',
    steps: [
      { type: 'pickup', x: PLACES.portGate.x, z: PLACES.portGate.z, r: 10, label: 'Pick up the briefcase at the Port' },
      { type: 'deliver', x: PLACES.towerPlaza.x, z: PLACES.towerPlaza.z, r: 12, label: 'Deliver it to Vice Tower Plaza — wanted or not', heat: 110 },
    ] },
];

export const SIDE_MISSIONS = [
  { id: 's1', title: 'Taxi Nights', giver: 'Dispatch', reward: 180,
    desc: 'Three fares, one night. Pick them up and drop them off.',
    steps: [
      { type: 'pickup', x: -600, z: -600, r: 10, label: 'Pick up fare 1 in Old Town' },
      { type: 'deliver', x: 600, z: 600, r: 10, label: 'Drop fare 1 at the Port' },
      { type: 'pickup', x: 600, z: -600, r: 10, label: 'Pick up fare 2 in the Suburbs' },
      { type: 'deliver', x: -600, z: 600, r: 10, label: 'Drop fare 2 at Ironworks' },
    ] },
  { id: 's2', title: 'Pizza Rush', giver: 'Slice House', reward: 150,
    desc: 'Hot pizzas for the Suburbs. Three houses, no cold slices.',
    steps: [
      { type: 'deliver', x: 500, z: -800, r: 10, label: 'Pizza 1: Palm Suburbs' },
      { type: 'deliver', x: 800, z: -500, r: 10, label: 'Pizza 2: Palm Suburbs' },
      { type: 'deliver', x: 400, z: -400, r: 10, label: 'Pizza 3: Palm Suburbs' },
    ] },
  { id: 's3', title: 'Stunt Jump', giver: 'Lena', reward: 200,
    desc: 'Hit the east bridge at full speed and fly. Land it.',
    steps: [{ type: 'goto', x: 980, z: 0, r: 16, label: 'Jump the Bay Bridge at speed', needsCar: true }] },
  { id: 's4', title: 'Vigilante', giver: 'Vice PD (off the books)', reward: 300,
    desc: 'Two rival cars are terrorising Downtown. Wreck them.',
    steps: [
      { type: 'eliminate', x: 120, z: 120, r: 18, label: 'Wreck rival car 1 in Downtown', target: 'car' },
      { type: 'eliminate', x: -120, z: -120, r: 18, label: 'Wreck rival car 2 in Downtown', target: 'car' },
    ] },
  { id: 's5', title: 'Courier', giver: 'Bay Express', reward: 160,
    desc: 'Two parcels, two ends of town, one very impatient client.',
    steps: [
      { type: 'deliver', x: -800, z: -800, r: 10, label: 'Parcel 1: Old Town' },
      { type: 'deliver', x: 800, z: 800, r: 10, label: 'Parcel 2: Port Delgado' },
    ] },
  { id: 's6', title: 'Street Race', giver: 'Midnight Club', reward: 350,
    desc: 'From the Tower Plaza to the Beach Pier. Beat the clock: 150 seconds.',
    steps: [{ type: 'race', x: PLACES.beachPier.x, z: PLACES.beachPier.z, r: 14, seconds: 150, label: 'Race to the Beach Pier (150s)' }] },
  { id: 's7', title: 'Photo Spots', giver: 'Lena', reward: 120,
    desc: 'Three viewpoints for the gallery: the Tower, the Marina, the Pier.',
    steps: [
      { type: 'goto', x: 0, z: -40, r: 12, label: 'Photo 1: Vice Tower Plaza' },
      { type: 'goto', x: 880, z: 0, r: 12, label: 'Photo 2: Marina Yachts' },
      { type: 'goto', x: 120, z: 940, r: 12, label: 'Photo 3: Beachfront Pier' },
    ] },
  { id: 's8', title: 'Ambulance', giver: 'Vice General', reward: 220,
    desc: 'A surgeon is needed at Vice General. Fast. 120 seconds.',
    steps: [{ type: 'race', x: PLACES.hospital.x, z: PLACES.hospital.z, r: 12, seconds: 120, label: 'Reach Vice General (120s)' }] },
];

export const ALL_MISSIONS = [...MAIN_MISSIONS, ...SIDE_MISSIONS];

export function findMission(id) {
  return ALL_MISSIONS.find((m) => m.id === id);
}

export function nextMainMission(G) {
  for (const m of MAIN_MISSIONS) {
    if (!G.missionsDone.includes(m.id)) return m;
  }
  return null;
}

let beacon = null;

function ensureBeacon(G) {
  if (beacon) return beacon;
  const geo = new THREE.CylinderGeometry(7, 7, 60, 20, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd54f, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
  });
  beacon = new THREE.Mesh(geo, mat);
  beacon.position.y = 30;
  G.scene.add(beacon);
  return beacon;
}

export function startMission(G, id) {
  const m = findMission(id);
  if (!m || G.activeMission) return false;
  if (m.id.startsWith('m')) {
    const next = nextMainMission(G);
    if (!next || next.id !== m.id) return false;
  }
  G.activeMission = m;
  G.missionStep = 0;
  G.missionTimer = 0;
  G.missionTarget = null;
  const step = m.steps[0];
  if (step.heat) addHeat(G, step.heat);
  if (step.type === 'eliminate') spawnMissionTarget(G, step);
  if (G.hud) G.hud.flash(`Mission: ${m.title} — ${m.giver}`);
  if (G.audio) G.audio.chime();
  return true;
}

function spawnMissionTarget(G, step) {
  const kind = step.target === 'car' ? 'car' : 'ped';
  if (kind === 'car') {
    const car = spawnVehicle(G, 'muscle', step.x + 6, step.z + 6, 0, { color: '#212121' });
    G.missionTarget = { kind: 'car', obj: car };
  } else {
    const grp = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xd32f2f });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.34), mat);
    torso.position.y = 1.05;
    grp.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.32), new THREE.MeshLambertMaterial({ color: 0xc68863 }));
    head.position.y = 1.6;
    grp.add(head);
    grp.position.set(step.x, 0, step.z);
    G.scene.add(grp);
    G.missionTarget = { kind: 'ped', obj: { group: grp, x: step.x, z: step.z, down: false, downT: 0 } };
    G.pedestrians.push(G.missionTarget.obj);
  }
}

function clearMissionTarget(G) {
  if (!G.missionTarget) return;
  const t = G.missionTarget;
  if (t.kind === 'car') {
    G.scene.remove(t.obj.group);
    const i = G.vehicles.indexOf(t.obj);
    if (i >= 0) G.vehicles.splice(i, 1);
  } else {
    G.scene.remove(t.obj.group);
    const i = G.pedestrians.indexOf(t.obj);
    if (i >= 0) G.pedestrians.splice(i, 1);
  }
  G.missionTarget = null;
}

export function currentStep(G) {
  if (!G.activeMission) return null;
  return G.activeMission.steps[G.missionStep] || null;
}

export function currentTarget(G) {
  const step = currentStep(G);
  if (!step) return null;
  if (step.x !== undefined) return { x: step.x, z: step.z, label: step.label };
  return null;
}

export function updateMissions(G, dt) {
  const m = G.activeMission;
  if (!m) return;
  const step = m.steps[G.missionStep];
  if (!step) return;
  const p = G.player;
  const px = p.x;
  const pz = p.z;
  G.missionTimer = (G.missionTimer || 0) + dt;
  let done = false;
  if (step.type === 'goto' || step.type === 'pickup' || step.type === 'deliver') {
    if (step.needsCar && !p.inVehicle) {
      if (G.hud) G.hud.hint('You need a car for this step.');
    } else if (Math.hypot(px - step.x, pz - step.z) < step.r) {
      done = true;
    }
  } else if (step.type === 'wait') {
    if (Math.hypot(px - step.x, pz - step.z) < step.r) {
      step._held = (step._held || 0) + dt;
      if (step._held >= step.seconds) done = true;
    } else step._held = 0;
  } else if (step.type === 'race') {
    if (Math.hypot(px - step.x, pz - step.z) < step.r) done = true;
    else if (G.missionTimer > step.seconds) {
      failMission(G, 'Too slow — the race is lost.');
      return;
    }
  } else if (step.type === 'escape') {
    if (G.wanted === 0 && G.heat < 5) done = true;
  } else if (step.type === 'eliminate') {
    const t = G.missionTarget;
    if (t && ((t.kind === 'ped' && t.obj.down) || (t.kind === 'car' && t.obj.health <= 0))) done = true;
  }
  // beacon follows the current target
  const tgt = currentTarget(G);
  const b = ensureBeacon(G);
  if (tgt) {
    b.visible = true;
    b.position.x = tgt.x;
    b.position.z = tgt.z;
    b.rotation.y += dt * 0.8;
    b.material.opacity = 0.22 + Math.sin(performance.now() / 300) * 0.08;
  } else b.visible = false;
  if (!done) return;
  if (step.type === 'eliminate') clearMissionTarget(G);
  G.missionStep += 1;
  G.missionTimer = 0;
  if (G.audio) G.audio.chime();
  if (G.missionStep >= m.steps.length) {
    completeMission(G, m);
    return;
  }
  const next = m.steps[G.missionStep];
  if (next.heat) addHeat(G, next.heat);
  if (next.type === 'eliminate') spawnMissionTarget(G, next);
}

function completeMission(G, m) {
  G.money += m.reward;
  G.missionsDone.push(m.id);
  G.activeMission = null;
  G.missionStep = 0;
  if (G.hud) G.hud.flash(`Mission complete: ${m.title} — +$${m.reward}`);
  if (G.audio) G.audio.fanfare();
  if (G.save) G.save.write();
}

function failMission(G, why) {
  clearMissionTarget(G);
  G.activeMission = null;
  G.missionStep = 0;
  if (G.hud) G.hud.flash(`Mission failed: ${why}`);
}
