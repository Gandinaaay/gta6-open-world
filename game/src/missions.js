// Story (10) + side (8) missions: beacons, steps, rewards, timers.
import { STORY_MISSIONS, SIDE_MISSIONS } from './config.js';

export function createMissions(ctx) {
  const { scene, hud, audio } = ctx;
  let storyIndex = 0;
  let stepIndex = 0;
  let sideActive = null;
  let sideTimer = 0;
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 90, 16, 1, true), beaconMat);
  beacon.position.set(0, 45, 0);
  scene.add(beacon);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  const marker = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 10), markerMat);
  marker.position.set(0, 2, 0);
  scene.add(marker);
  function current() { return STORY_MISSIONS[storyIndex]; }
  function currentStep() { const m = current(); return m ? m.steps[stepIndex] : null; }
  function placeBeacon() {
    const s = currentStep();
    if (!s) { beacon.visible = false; marker.visible = false; return; }
    beacon.visible = true;
    marker.visible = true;
    beacon.position.set(s.x, 45, s.z);
    marker.position.set(s.x, 2, s.z);
  }
  placeBeacon();
  function advance() {
    const m = current();
    if (!m) return;
    stepIndex++;
    audio.sting();
    if (stepIndex >= m.steps.length) {
      ctx.money += m.reward;
      ctx.rep += 10;
      hud.flash(`${m.name} complete! +$${m.reward}`);
      storyIndex = Math.min(STORY_MISSIONS.length - 1, storyIndex + 1);
      stepIndex = 0;
      if (storyIndex >= STORY_MISSIONS.length - 1 && stepIndex === 0) {
        hud.flash('All story missions complete — Vice Bay is yours, Rico!');
      }
    } else {
      hud.flash(currentStep().text);
    }
    placeBeacon();
  }
  function startSide(i) {
    if (sideActive) return;
    sideActive = { ...SIDE_MISSIONS[i], index: i, done: false };
    if (sideActive.name === 'Time Trial') sideTimer = 90;
    hud.flash(`Side mission: ${sideActive.name}`);
    audio.sting();
  }
  function finishSide() {
    if (!sideActive) return;
    ctx.money += sideActive.reward;
    hud.flash(`${sideActive.name} done! +$${sideActive.reward}`);
    audio.sting();
    sideActive = null;
  }
  function update(dt, px, pz, wanted) {
    beacon.rotation.y += dt * 0.6;
    marker.position.y = 2 + Math.sin(performance.now() * 0.004) * 0.5;
    const s = currentStep();
    if (s && Math.hypot(px - s.x, pz - s.z) < 6) advance();
    if (sideActive) {
      if (sideActive.name === 'Time Trial') {
        sideTimer -= dt;
        if (sideTimer <= 0) { hud.flash('Time Trial failed'); sideActive = null; }
        else if (s && Math.hypot(px - s.x, pz - s.z) < 6) finishSide();
      }
      if (sideActive.name === 'Police Escape' && wanted === 0) finishSide();
    }
  }
  return {
    update, startSide, finishSide,
    objectiveText: () => {
      const m = current();
      if (!m) return 'Free roam — Vice Bay is yours';
      const s = currentStep();
      return `${m.name}: ${s ? s.text : 'Done'}`;
    },
    objectivePos: () => {
      const s = currentStep();
      return s ? { x: s.x, z: s.z } : null;
    },
    get storyIndex() { return storyIndex; },
    get sideActive() { return sideActive; },
    get sideTimer() { return sideTimer; },
    loadState: (idx) => {
      storyIndex = Math.max(0, Math.min(STORY_MISSIONS.length - 1, idx || 0));
      stepIndex = 0;
      placeBeacon();
    },
  };
}
