// The story: 10 linked main missions in "Blood & Destiny", each a list of
// steps the engine plays (go to, drive to, deliver, kill, escape, race,
// collect, talk, choice), plus 8 working side missions you start at markers
// around the city. Step types:
// goto | drive | deliver | kill | collect | escape | race | talk | choice.
// Every step carries its own marker, radius and reward; the engine advances
// them, and the HUD shows the current step text plus a live distance to the
// marker. Finishing a story mission also tops up 20 pistol rounds, so the
// next fight never starts dry. Round 3: the mission tables are plain rows
// (a step is [type, place, text, extra]) that one builder turns into the
// objects the engine runs, the step handlers are named functions in one
// table, and each side mission has its own setup function in one table.
import { PLACES } from './city.js';
import { spawnEnemy, clearEnemies } from './combat.js';
import { spawnVehicle } from './vehicles.js';

// Rows: [id, title, briefing, reward, rep, steps], a step is
// [type, place, text] or [type, place, text, count/wanted].
const MISSION_ROWS = [
  [1, 'Welcome to Vice Bay', 'You are back after years away. Rico waits at his apartment. Find a car and meet him.', 500, 10, [
    ['goto', 'start', 'Go to Rico\'s apartment'],
    ['drive', 'friendHouse', 'Get a car and drive to Marco\'s place'],
  ]],
  [2, 'A Dangerous Favor', 'Marco needs a package delivered to the market — no questions, no stops.', 800, 15, [
    ['goto', 'friendHouse', 'Pick up the package from Marco'],
    ['deliver', 'market', 'Deliver the package to Havana Market'],
  ]],
  [3, 'Street Reputation', 'The Vipers think they own the Criminal District. Show them who runs these streets.', 1200, 25, [
    ['goto', 'gangHQ', 'Go to the Vipers hideout'],
    ['kill', 'gangHQ', 'Take down 4 Vipers gangsters', 4],
  ]],
  [4, 'The Getaway', 'The deal went loud and the VBPD is on you. Lose the police, then lay low at the club.', 1500, 20, [
    ['escape', null, 'Escape the police pursuit (stay out of sight)', 3],
    ['goto', 'club', 'Lay low at the Neon Tide Club'],
  ]],
  [5, 'The Missing Deal', 'A shipment vanished at the port. Search Warehouse 7 and find out who took it.', 2000, 25, [
    ['goto', 'portDeal', 'Search Warehouse 7 at the port'],
    ['kill', 'portDeal', 'Deal with the thieves at the port', 3],
    ['collect', 'portDeal', 'Recover 3 stolen crates', 3],
  ]],
  [6, 'Betrayal', 'Marco sold you out. He is hiding at the airport with Kane\'s men. End it.', 2500, 30, [
    ['goto', 'airport', 'Confront Marco at the airport'],
    ['kill', 'airport', 'Fight Kane\'s men and Marco', 5],
  ]],
  [7, 'Night Run', 'Illegal street race along the beach. Beat the rival drivers to the finish.', 3000, 30, [
    ['race', 'raceStart', 'Win the beach street race'],
  ]],
  [8, 'The Hidden Truth', 'City Hall is in Kane\'s pocket. Steal the ledger that proves it.', 3500, 35, [
    ['goto', 'cityHall', 'Sneak into City Hall'],
    ['collect', 'cityHall', 'Grab the ledger pages (2)', 2],
    ['escape', null, 'Escape with the evidence', 2],
  ]],
  [9, 'Final Assault', 'Kane\'s mansion in Rich Hills. His whole crew is there. Bring the war to him.', 5000, 50, [
    ['goto', 'mansion', 'Storm Kane\'s mansion'],
    ['kill', 'mansion', 'Defeat Kane\'s crew (8)', 8],
  ]],
  [10, 'Blood & Destiny', 'Kane himself, at the bank. Your choice decides the fate of Vice Bay.', 10000, 100, [
    ['goto', 'bank', 'Face Kane at Bay National Bank'],
    ['kill', 'bank', 'Defeat Kane\'s last guards (6)', 6],
    ['choice', null, 'Choose Vice Bay\'s fate: spare Kane or take the city'],
  ]],
];

function makeStep(row) {
  const [type, place, text, extra] = row;
  const step = { type, place, text };
  if (type === 'kill' || type === 'collect') step.count = extra;
  if (type === 'escape') step.wanted = extra;
  return step;
}

export const MISSIONS = MISSION_ROWS.map(([id, title, briefing, reward, rep, steps]) => ({
  id, title, briefing, reward, rep,
  steps: steps.map(makeStep),
}));

// Rows: [id, display name, description, marker place, reward].
const SIDE_ROWS = [
  ['taxi', 'Taxi Driver', 'Pick up fares and drive them across town.', 'start', 400],
  ['race', 'Street Racing', 'Checkpoint race through Downtown.', 'raceStart', 900],
  ['delivery', 'Vehicle Delivery', 'Deliver a car to three stops.', 'portDeal', 700],
  ['escape', 'Police Escape', 'Get 3 stars and lose the police.', 'criminal', 800],
  ['packages', 'Hidden Packages', 'Collect 8 packages hidden around the city.', 'beach', 1500],
  ['territory', 'Gang Territory', 'Clear the Vipers from their turf.', 'gangHQ', 1000],
  ['timetrial', 'Time Trial', 'Hit 5 checkpoints before the clock runs out.', 'airport', 600],
  ['rescue', 'Rescue Civilians', 'Pick up a hurt civilian and drive them to the hospital.', 'hospital', 750],
];

export const SIDE_MISSIONS = SIDE_ROWS.map(([id, name, desc, place, reward]) => ({
  id, name, desc, place, reward,
}));

// The Night Run route: a loop from the beach, through the hills, around
// Downtown and back to the club. Side races reuse the first five points.
const RACE_POINTS = [
  { x: 420, z: -60 }, { x: 400, z: -300 }, { x: 200, z: -400 },
  { x: -100, z: -400 }, { x: -300, z: -200 }, { x: -400, z: 0 },
  { x: -200, z: 200 }, { x: 0, z: 300 }, { x: 300, z: 300 }, { x: 420, z: 120 },
];

function focusOf(G) {
  return G.currentVehicle || G.player;
}

function near(focus, target, radius) {
  return target && Math.hypot(focus.x - target.x, focus.z - target.z) < radius;
}

// One handler per step type; update() is a dispatch table over them.
const STEP_HANDLERS = {
  goto(G, engine, step, st, focus) {
    if (near(focus, engine.stepTarget(), 10)) engine.advanceStep();
  },
  drive(G, engine, step, st, focus) {
    const target = engine.stepTarget();
    if (!near(focus, target, 12)) return;
    if (G.currentVehicle) engine.advanceStep();
    else G.missionText = step.text + ' (you need a car!)';
  },
  kill(G, engine, step, st) {
    const alive = G.enemies.filter((e) => e.alive).length;
    st.kills = step.count - alive;
    G.missionText = step.text + ' (' + Math.max(0, st.kills) + '/' + step.count + ')';
    if (alive === 0) engine.advanceStep();
  },
  collect(G, engine, step, st, focus) {
    for (const c of st.collectibles) {
      if (!c.taken && near(focus, c, 4)) {
        c.taken = true;
        st.collected += 1;
        if (G.audio) G.audio.pickup();
        G.toast('Collected ' + st.collected + '/' + step.count);
        engine.updateMarker();
      }
    }
    G.missionText = step.text + ' (' + st.collected + '/' + step.count + ')';
    if (st.collected >= step.count) engine.advanceStep();
  },
  escape(G, engine, step, st, focus, dt) {
    st.timer += dt;
    if (G.wanted === 0 && st.timer > 3) engine.advanceStep();
    else G.missionText = step.text + ' — wanted ' + G.wanted + '★ (' + Math.floor(st.timer) + 's)';
    if (st.timer > 120) engine.failMission('The police never lost you.');
  },
  race(G, engine, step, st, focus, dt) {
    st.timer -= dt;
    const cp = RACE_POINTS[st.raceIndex];
    if (near(focus, cp, 14)) {
      st.raceIndex += 1;
      if (G.audio) G.audio.pickup();
      engine.updateMarker();
      if (st.raceIndex >= RACE_POINTS.length) { engine.advanceStep(); return; }
    }
    G.missionText = step.text + ' — checkpoint ' + (st.raceIndex + 1) + '/' + RACE_POINTS.length + ' (' + Math.max(0, Math.ceil(st.timer)) + 's)';
    if (st.timer <= 0) engine.failMission('Out of time in the race.');
  },
  choice(G, engine) {
    engine.choiceOpen = true;
    G.openChoice();
  },
};

// One setup per side mission id.
const SIDE_SETUP = {
  taxi(G, engine, st, place) {
    st.phase = 0;
    st.target = { x: place.x + 40, z: place.z - 60 };
    G.toast('Taxi: pick up the fare at the marker.');
  },
  race(G, engine, st) {
    st.checkpoints = RACE_POINTS.slice(0, 5);
    st.timer = 150;
    G.toast('Race: hit all 5 checkpoints!');
  },
  timetrial(G, engine, st) {
    st.checkpoints = RACE_POINTS.slice(0, 5);
    st.timer = 90;
    G.toast('Race: hit all 5 checkpoints!');
  },
  delivery(G, engine, st) {
    st.checkpoints = [{ x: 160, z: -40 }, { x: -320, z: 220 }, { x: 420, z: 120 }];
    st.timer = 180;
  },
  escape(G) {
    G.addWanted(3);
  },
  packages(G, engine, st) {
    for (let i = 0; i < 8; i += 1) st.packages.push({ x: (Math.random() - 0.5) * 900, z: (Math.random() - 0.5) * 900, taken: false });
  },
  territory(G) {
    for (let i = 0; i < 5; i += 1) spawnEnemy(G, PLACES.gangHQ.x + (Math.random() - 0.5) * 30, PLACES.gangHQ.z + (Math.random() - 0.5) * 30, { bounty: 200 });
  },
  rescue(G, engine, st, place) {
    // The hurt civilian waits at the hospital entrance, 35 units east of the
    // building; pick them up on foot, then drive them to the front door.
    st.target = { x: place.x + 35, z: place.z + 15 };
    st.phase = 0;
    spawnEnemy(G, st.target.x, st.target.z, { color: 0x2ecc71, health: 50, bounty: 0, passive: true });
    G.toast('Rescue: reach the hurt civilian, then drive them to the hospital.');
  },
};

export function createMissionEngine(G) {
  const engine = {
    missionIndex: 0, // 0-based into MISSIONS
    stepIndex: 0,
    active: false,
    stepState: null,
    side: null,
    sideState: null,
    choiceOpen: false,

    current() { return MISSIONS[engine.missionIndex] || null; },
    currentStep() {
      const m = engine.current();
      return m ? m.steps[engine.stepIndex] : null;
    },

    startMission(index) {
      engine.missionIndex = index;
      engine.stepIndex = 0;
      engine.active = true;
      clearEnemies(G);
      engine.setupStep();
      const m = engine.current();
      G.toast('Mission ' + m.id + ': ' + m.title);
      G.showBriefing(m.title, m.briefing);
      if (G.audio) G.audio.pickup();
    },

    setupStep() {
      const step = engine.currentStep();
      engine.stepState = { kills: 0, collected: 0, timer: 0, raceIndex: 0, spawned: false, collectibles: [] };
      if (!step) return;
      if (step.type === 'kill') {
        const place = PLACES[step.place];
        for (let i = 0; i < step.count; i += 1) {
          spawnEnemy(G, place.x + (Math.random() - 0.5) * 30, place.z + (Math.random() - 0.5) * 30, { bounty: 150 + engine.missionIndex * 25 });
        }
        engine.stepState.spawned = true;
      }
      if (step.type === 'collect') {
        const place = PLACES[step.place];
        for (let i = 0; i < step.count; i += 1) {
          engine.stepState.collectibles.push({ x: place.x + (Math.random() - 0.5) * 40, z: place.z + (Math.random() - 0.5) * 40, taken: false });
        }
      }
      if (step.type === 'escape') {
        G.addWanted(step.wanted || 2);
      }
      if (step.type === 'race') {
        engine.stepState.raceIndex = 0;
        engine.stepState.timer = 180;
      }
      engine.updateMarker();
    },

    stepTarget() {
      const step = engine.currentStep();
      if (!step) return null;
      if (step.type === 'race') return RACE_POINTS[engine.stepState.raceIndex] || null;
      if (step.type === 'collect' && engine.stepState.collectibles.length) {
        return engine.stepState.collectibles.find((c) => !c.taken) || null;
      }
      if (step.place) return PLACES[step.place];
      return null;
    },

    updateMarker() {
      const target = engine.stepTarget();
      G.missionTarget = target;
      const step = engine.currentStep();
      G.missionText = step ? step.text : (engine.active ? 'Mission complete' : 'Free roam — press M for missions');
    },

    advanceStep() {
      engine.stepIndex += 1;
      const m = engine.current();
      if (engine.stepIndex >= m.steps.length) {
        engine.completeMission();
        return;
      }
      clearEnemies(G);
      engine.setupStep();
      if (G.audio) G.audio.pickup();
    },

    completeMission() {
      const m = engine.current();
      G.money += m.reward;
      G.rep += m.rep;
      G.combat.ammo.pistol += 20;
      G.toast('Mission complete: ' + m.title + ' +$' + m.reward + ' +' + m.rep + ' rep · +20 pistol ammo');
      if (G.audio) G.audio.missionDone();
      engine.active = false;
      engine.missionIndex += 1;
      clearEnemies(G);
      G.missionTarget = null;
      if (engine.missionIndex >= MISSIONS.length) {
        G.missionText = 'Story complete — Vice Bay is yours. Free roam!';
        G.showBriefing('Blood & Destiny', 'You decided the fate of Vice Bay. The city is yours now — keep playing, take side missions, buy cars.');
      } else {
        G.missionText = 'Next mission available — press M to start: ' + MISSIONS[engine.missionIndex].title;
        G.showBriefing('Next mission', MISSIONS[engine.missionIndex].title + ' — press M to start it.');
      }
      G.saveGame();
    },

    failMission(reason) {
      const m = engine.current();
      G.toast('Mission failed: ' + reason);
      if (G.audio) G.audio.missionFail();
      engine.active = false;
      clearEnemies(G);
      G.missionTarget = null;
      G.missionText = 'Mission failed — press M to retry: ' + (m ? m.title : '');
    },

    update(dt) {
      if (!engine.active) return;
      const step = engine.currentStep();
      if (!step) return;
      const handler = STEP_HANDLERS[step.type] || STEP_HANDLERS.goto;
      handler(G, engine, step, engine.stepState, focusOf(G), dt);
    },

    // Side missions: started at their marker, same step engine, smaller scope.
    startSide(id) {
      const def = SIDE_MISSIONS.find((s) => s.id === id);
      if (!def) return;
      engine.side = def;
      const place = PLACES[def.place];
      engine.sideState = { timer: 0, progress: 0, target: null, phase: 0, checkpoints: [], packages: [] };
      const setup = SIDE_SETUP[id];
      if (setup) setup(G, engine, engine.sideState, place);
      G.missionText = 'Side mission: ' + def.name;
      G.sideTarget = engine.sideState.target || engine.sideState.checkpoints?.[0] || null;
    },

    updateSide(dt) {
      const def = engine.side;
      if (!def) return;
      const st = engine.sideState;
      const focus = focusOf(G);
      const finish = (bonus) => {
        G.money += def.reward + (bonus || 0);
        G.rep += 10;
        G.toast('Side mission complete: ' + def.name + ' +$' + (def.reward + (bonus || 0)));
        if (G.audio) G.audio.missionDone();
        engine.side = null;
        engine.sideState = null;
        G.sideTarget = null;
        clearEnemies(G);
        G.saveGame();
      };
      if (def.id === 'taxi') {
        if (st.phase === 0 && near(focus, st.target, 8)) {
          st.phase = 1;
          st.target = { x: 160, z: 200 };
          G.sideTarget = st.target;
          G.toast('Fare picked up! Drive them to Downtown.');
        } else if (st.phase === 1 && near(focus, st.target, 10)) finish(0);
      } else if (def.id === 'race' || def.id === 'timetrial' || def.id === 'delivery') {
        st.timer -= dt;
        const cp = st.checkpoints[st.progress];
        G.sideTarget = cp || null;
        if (near(focus, cp, 14)) {
          st.progress += 1;
          if (G.audio) G.audio.pickup();
          if (st.progress >= st.checkpoints.length) finish(Math.max(0, Math.floor(st.timer)) * 2);
        }
        G.missionText = 'Side mission: ' + def.name + ' — ' + st.progress + '/' + st.checkpoints.length + ' (' + Math.max(0, Math.ceil(st.timer)) + 's)';
        if (st.timer <= 0) { G.toast('Side mission failed: out of time.'); engine.side = null; G.sideTarget = null; }
      } else if (def.id === 'escape') {
        if (G.wanted === 0) finish(0);
      } else if (def.id === 'packages') {
        for (const p of st.packages) {
          if (!p.taken && near(focus, p, 4)) {
            p.taken = true;
            st.progress += 1;
            if (G.audio) G.audio.pickup();
          }
        }
        G.sideTarget = st.packages.find((p) => !p.taken) || null;
        G.missionText = 'Side mission: Hidden Packages — ' + st.progress + '/8';
        if (st.progress >= 8) finish(0);
      } else if (def.id === 'territory') {
        if (G.enemies.filter((e) => e.alive).length === 0) finish(0);
      } else if (def.id === 'rescue') {
        // Phase 0: walk to the civilian at the entrance. Phase 1: in a car,
        // drive them to the hospital front door.
        if (st.phase === 0 && near(focus, st.target, 6)) {
          st.phase = 1;
          G.sideTarget = PLACES.hospital;
          G.toast('Civilian picked up! Drive to Bay General Hospital.');
        } else if (st.phase === 1 && G.currentVehicle && near(focus, PLACES.hospital, 12)) {
          finish(0);
        }
      }
    },
  };
  G.onEnemyKilled = () => {};
  return engine;
}
