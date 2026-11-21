// Vice Bay: Blood & Destiny — missions: 10 main story jobs and 8 side jobs.
// Table-driven: each mission is data (a target, a kind, a reward); one small state
// machine runs whichever is active. The story follows Rico Vega, a driver who owes
// the Bay's crews and works the debt off job by job.

import { ECONOMY } from './config.js';

export const MAIN_MISSIONS = [
  { id: 'm1', name: 'First Wheels', brief: 'Steal the sedan parked by the marina and bring it to the garage.', kind: 'goto', x: -720, z: 700, r: 12, reward: 400 },
  { id: 'm2', name: 'Package Run', brief: 'Pick up the package in Little Havana and deliver it to Downtown.', kind: 'collect', x: -700, z: -700, r: 12, count: 3, reward: 600 },
  { id: 'm3', name: 'The Informant', brief: 'Meet the informant at the Criminal District. Do not let the cops see you.', kind: 'goto', x: -820, z: 40, r: 12, reward: 800 },
  { id: 'm4', name: 'Hot Pursuit', brief: 'Lose a 2-star wanted level: survive the chase for 45 seconds.', kind: 'chase', seconds: 45, reward: 1000 },
  { id: 'm5', name: 'Port Heist', brief: 'Collect 4 crates from the Industrial Port before the crew leaves.', kind: 'collect', x: 720, z: -720, r: 14, count: 4, reward: 1200 },
  { id: 'm6', name: 'Airport Pickup', brief: 'Pick up the courier at the airport terminal, then get clear.', kind: 'goto', x: 0, z: -820, r: 12, reward: 1500 },
  { id: 'm7', name: 'Street War', brief: 'Clear the rival crew from the Criminal District: take down 6 of them.', kind: 'eliminate', x: -820, z: 0, r: 30, count: 6, reward: 1800 },
  { id: 'm8', name: 'Night Shift', brief: 'Drive the taxi through 5 fares across the city before dawn.', kind: 'collect', x: 0, z: 0, r: 16, count: 5, reward: 2200 },
  { id: 'm9', name: 'The Vault', brief: 'Break into the Downtown bank: reach the vault and hold it for 30 seconds.', kind: 'chase', seconds: 30, x: 60, z: 60, r: 14, reward: 2600 },
  { id: 'm10', name: 'Blood & Destiny', brief: 'Final job: reach the marina, survive 5 stars, and end the war.', kind: 'chase', seconds: 60, x: -720, z: 700, r: 16, reward: 3200 },
];

export const SIDE_MISSIONS = [
  { id: 's1', name: 'Beach Tow', brief: 'Tow the stranded coupe on Ocean Beach to the garage.', kind: 'goto', x: -760, z: 760, r: 12, reward: 250 },
  { id: 's2', name: 'Late Delivery', brief: 'Deliver 2 crates to Rich Hills before the party starts.', kind: 'collect', x: 740, z: 740, r: 12, count: 2, reward: 250 },
  { id: 's3', name: 'Lookout', brief: 'Watch the port gate for 30 seconds without being spotted.', kind: 'chase', seconds: 30, x: 700, z: -700, r: 14, reward: 250 },
  { id: 's4', name: 'Spare Parts', brief: 'Collect 3 parts scattered around the Airport.', kind: 'collect', x: 0, z: -820, r: 16, count: 3, reward: 250 },
  { id: 's5', name: 'Street Race', brief: 'Reach the Highway Ring checkpoint in under 60 seconds.', kind: 'goto', x: 0, z: 900, r: 14, reward: 250 },
  { id: 's6', name: 'Debt Collector', brief: 'Collect from 2 shops in Little Havana.', kind: 'collect', x: -700, z: -700, r: 14, count: 2, reward: 250 },
  { id: 's7', name: 'Getaway', brief: 'Survive a 3-star chase for 40 seconds in Downtown.', kind: 'chase', seconds: 40, x: 0, z: 0, r: 20, reward: 250 },
  { id: 's8', name: 'Last Fare', brief: 'Drive the taxi to the marina for the final fare of the night.', kind: 'goto', x: -720, z: 700, r: 12, reward: 250 },
];

export function createMissions(onEvent) {
  let active = null; // {def, kind, index, progress, timer}
  let done = [];

  function start(kind, index) {
    const list = kind === 'main' ? MAIN_MISSIONS : SIDE_MISSIONS;
    const def = list[index];
    if (!def || done.includes(def.id)) return false;
    active = { def, kind, index, progress: 0, timer: 0 };
    onEvent({ type: 'mission-start', def });
    return true;
  }

  function currentTarget() {
    if (!active) return null;
    const d = active.def;
    return { x: d.x ?? 0, z: d.z ?? 0, r: d.r ?? 12, name: d.name, brief: d.brief };
  }

  function update(dt, ctx) {
    if (!active) return;
    const d = active.def;
    active.timer += dt;
    if (d.kind === 'goto') {
      const dist = Math.hypot(ctx.playerPos.x - d.x, ctx.playerPos.z - d.z);
      if (dist < d.r) complete(ctx);
    } else if (d.kind === 'collect') {
      // Pickups are consumed by main.js calling collect(); progress counts them.
      if (active.progress >= d.count) complete(ctx);
    } else if (d.kind === 'chase') {
      if (ctx.wanted >= 2 && active.timer >= d.seconds) complete(ctx);
      else if (active.timer > d.seconds + 60) fail(ctx, 'The heat died down — the job fell through.');
    } else if (d.kind === 'eliminate') {
      if (active.progress >= d.count) complete(ctx);
    }
  }

  function collect() {
    if (active && active.def.kind === 'collect') {
      active.progress += 1;
      onEvent({ type: 'objective', def: active.def, progress: active.progress, need: active.def.count });
    }
  }

  function eliminate() {
    if (active && active.def.kind === 'eliminate') {
      active.progress += 1;
      onEvent({ type: 'objective', def: active.def, progress: active.progress, need: active.def.count });
    }
  }

  function complete(ctx) {
    const d = active.def;
    done.push(d.id);
    const reward = d.reward ?? ECONOMY.sideReward;
    ctx.addMoney(reward);
    onEvent({ type: 'mission-done', def: d, reward });
    active = null;
  }

  function fail(ctx, why) {
    const d = active.def;
    onEvent({ type: 'mission-fail', def: d, why });
    active = null;
  }

  function abort() {
    if (active) onEvent({ type: 'mission-abort', def: active.def });
    active = null;
  }

  return {
    start, update, collect, eliminate, abort, currentTarget,
    get active() { return active; },
    get done() { return done; },
    setDone(ids) { done = ids.slice(); },
    get nextMain() {
      const i = MAIN_MISSIONS.findIndex((m) => !done.includes(m.id));
      return i < 0 ? null : i;
    },
  };
}
