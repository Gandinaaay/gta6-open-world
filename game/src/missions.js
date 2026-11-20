// Missions: 10 story missions (linked) + 8 side missions, with steps,
// objective markers, rewards and a final choice.

import { STORY_MISSIONS, SIDE_MISSIONS } from './config.js';

export function createMissions(ctx) {
  let storyIndex = 0;
  let stepIndex = 0;
  let activeSide = null;
  let sideTimer = 0;
  let completed = [];

  function currentStory() { return STORY_MISSIONS[storyIndex] || null; }
  function currentStep() {
    const m = currentStory();
    return m ? m.steps[stepIndex] : null;
  }

  function beacon(x, z) {
    // A tall glowing pillar marking the objective.
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    m.position.set(x, 30, z);
    ctx.scene.add(m);
    return m;
  }
  let beaconMesh = null;
  function refreshBeacon() {
    if (beaconMesh) { ctx.scene.remove(beaconMesh); beaconMesh = null; }
    const s = currentStep();
    if (s) beaconMesh = beacon(s.x, s.z);
  }
  refreshBeacon();

  return {
    get storyIndex() { return storyIndex; },
    get stepIndex() { return stepIndex; },
    get completed() { return completed; },
    get activeSide() { return activeSide; },
    storyList() { return STORY_MISSIONS.map((m, i) => ({ ...m, done: i < storyIndex, current: i === storyIndex })); },
    sideList() { return SIDE_MISSIONS.map((m) => ({ ...m, active: activeSide === m.id })); },
    objectiveText() {
      const m = currentStory();
      const s = currentStep();
      if (!m) return 'All story missions complete — Vice Bay is yours.';
      return `${m.name}: ${s ? s.text : 'Done'}`;
    },
    objectivePos() {
      const s = currentStep();
      return s ? { x: s.x, z: s.z } : null;
    },
    advance() {
      const m = currentStory();
      if (!m) return;
      stepIndex++;
      if (stepIndex >= m.steps.length) {
        completed.push(m.id);
        ctx.money += m.reward;
        ctx.rep += 10;
        ctx.hud.flash(`Mission complete: ${m.name} +$${m.reward}`);
        ctx.audio.sting();
        storyIndex++;
        stepIndex = 0;
        if (currentStory()) ctx.hud.flash(`New mission: ${currentStory().name}`);
      }
      refreshBeacon();
    },
    startSide(id) {
      const m = SIDE_MISSIONS.find((s) => s.id === id);
      if (!m || activeSide) return false;
      activeSide = id;
      sideTimer = id === 'timetrial' ? 90 : 0;
      ctx.hud.flash(`Side mission started: ${m.name}`);
      return true;
    },
    finishSide(success) {
      if (!activeSide) return;
      const m = SIDE_MISSIONS.find((s) => s.id === activeSide);
      activeSide = null;
      if (success && m) {
        ctx.money += m.reward;
        ctx.rep += 5;
        ctx.hud.flash(`Side mission complete: ${m.name} +$${m.reward}`);
        ctx.audio.pickup();
      } else if (m) {
        ctx.hud.flash(`Side mission failed: ${m.name}`);
      }
    },
    update(dt, playerPos) {
      const s = currentStep();
      if (s && Math.hypot(playerPos.x - s.x, playerPos.z - s.z) < 6) {
        this.advance();
      }
      if (activeSide === 'timetrial') {
        sideTimer -= dt;
        if (sideTimer <= 0) this.finishSide(false);
      }
      if (activeSide === 'escape' && ctx.police.wanted === 0) this.finishSide(true);
    },
    loadState(state) {
      if (!state) return;
      storyIndex = Math.min(state.storyIndex || 0, STORY_MISSIONS.length);
      stepIndex = 0;
      completed = STORY_MISSIONS.slice(0, storyIndex).map((m) => m.id);
      refreshBeacon();
    },
  };
}
