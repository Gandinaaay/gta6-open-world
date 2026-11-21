// Story missions (10) + side missions (8): beacons, rewards, progress.
import { STORY_MISSIONS, SIDE_MISSIONS } from './config.js';

const THREE = window.THREE;

export function createMissions(ctx) {
  const { scene, audio, hud } = ctx;
  let storyIndex = 0;
  let stepIndex = 0;
  let side = null;
  let sideTimer = 0;

  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd020, transparent: true, opacity: 0.45 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 60, 12, 1, true), beaconMat);
  beacon.position.y = 30;
  scene.add(beacon);

  function currentStep() {
    const m = STORY_MISSIONS[storyIndex];
    if (!m) return null;
    return m.steps[Math.min(stepIndex, m.steps.length - 1)];
  }

  function objectivePos() {
    if (side) return side.target;
    const s = currentStep();
    return s ? { x: s.x, z: s.z } : null;
  }

  function objectiveText() {
    if (side) return `${side.name}: ${side.text}`;
    const m = STORY_MISSIONS[storyIndex];
    if (!m) return 'Vice Bay is yours, Rico.';
    const s = currentStep();
    return `${m.name}: ${s.text}`;
  }

  function advance(playerPos) {
    const target = objectivePos();
    if (!target) return;
    const d = Math.hypot(target.x - playerPos.x, target.z - playerPos.z);
    if (d > 6) return;
    if (side) {
      finishSide();
      return;
    }
    const m = STORY_MISSIONS[storyIndex];
    stepIndex++;
    if (stepIndex >= m.steps.length) {
      ctx.money += m.reward;
      ctx.rep += 10;
      hud.flash(`${m.name} complete! +$${m.reward}`);
      audio.sting();
      storyIndex++;
      stepIndex = 0;
      if (storyIndex >= STORY_MISSIONS.length) {
        hud.flash('BLOOD & DESTINY — Rico rules Vice Bay!');
      }
    } else {
      hud.flash('Objective reached');
      audio.pickup();
    }
  }

  function startSide(id) {
    const def = SIDE_MISSIONS.find((s) => s.id === id);
    if (!def || side) return false;
    const spots = {
      taxi: { x: 220, z: 180, text: 'Pick up the fare' },
      race: { x: 400, z: 400, text: 'Reach the finish line' },
      delivery: { x: -200, z: 600, text: 'Deliver the car' },
      escape: { x: 0, z: 0, text: 'Lose the cops' },
      packages: { x: -850, z: 500, text: 'Find the package' },
      territory: { x: -700, z: 750, text: 'Clear the block' },
      timetrial: { x: 900, z: 0, text: 'Reach the checkpoint' },
      rescue: { x: 750, z: -700, text: 'Rescue the civilians' },
    };
    const spot = spots[id];
    side = { ...def, target: { x: spot.x, z: spot.z }, text: spot.text };
    sideTimer = id === 'timetrial' ? 90 : 0;
    hud.flash(`${def.name} started`);
    return true;
  }

  function finishSide() {
    if (!side) return;
    ctx.money += side.reward;
    ctx.rep += 5;
    hud.flash(`${side.name} complete! +$${side.reward}`);
    audio.sting();
    side = null;
  }

  function update(dt, playerPos) {
    const target = objectivePos();
    if (target) {
      beacon.position.x = target.x;
      beacon.position.z = target.z;
      beacon.visible = true;
      beacon.material.opacity = 0.35 + Math.sin(Date.now() / 240) * 0.15;
    } else {
      beacon.visible = false;
    }
    if (side && side.id === 'timetrial') {
      sideTimer -= dt;
      if (sideTimer <= 0) {
        hud.flash('Time trial failed');
        side = null;
      }
    }
    if (side && side.id === 'escape' && ctx.police && ctx.police.wanted === 0) {
      finishSide();
    }
    advance(playerPos);
  }

  function loadState(s) {
    if (!s) return;
    storyIndex = s.storyIndex || 0;
    stepIndex = s.stepIndex || 0;
  }

  return {
    objectiveText, objectivePos, update, startSide, finishSide, loadState,
    get storyIndex() { return storyIndex; },
    get stepIndex() { return stepIndex; },
    get side() { return side; },
    get sideTimer() { return sideTimer; },
    storyMissions: STORY_MISSIONS,
    sideMissions: SIDE_MISSIONS,
  };
}
