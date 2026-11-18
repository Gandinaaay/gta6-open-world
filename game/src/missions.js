// The story: 10 linked main missions in "Blood & Destiny", each a list of steps the
// engine plays (go to, drive to, deliver, kill, escape, race, collect, survive, talk),
// plus 8 working side missions you start at markers around the city.
// Step types: goto | drive | kill | collect | escape | race | survive | talk.
// Every step carries its own marker, radius and reward; the engine advances them.
import { PLACES } from './city.js';
import { spawnEnemy, clearEnemies } from './combat.js';
import { spawnVehicle } from './vehicles.js';

export const MISSIONS = [
  {
    id: 1, title: 'Welcome to Vice Bay',
    briefing: 'You are back after years away. Rico waits at his apartment. Find a car and meet him.',
    reward: 500, rep: 10,
    steps: [
      { type: 'goto', place: 'start', text: 'Go to Rico\'s apartment' },
      { type: 'drive', place: 'friendHouse', text: 'Get a car and drive to Marco\'s place' },
    ],
  },
  {
    id: 2, title: 'A Dangerous Favor',
    briefing: 'Marco needs a package delivered to the market — no questions, no stops.',
    reward: 800, rep: 15,
    steps: [
      { type: 'goto', place: 'friendHouse', text: 'Pick up the package from Marco' },
      { type: 'deliver', place: 'market', text: 'Deliver the package to Havana Market' },
    ],
  },
  {
    id: 3, title: 'Street Reputation',
    briefing: 'The Vipers think they own the Criminal District. Show them who runs these streets.',
    reward: 1200, rep: 25,
    steps: [
      { type: 'goto', place: 'gangHQ', text: 'Go to the Vipers hideout' },
      { type: 'kill', place: 'gangHQ', count: 4, text: 'Take down 4 Vipers gangsters' },
    ],
  },
  {
    id: 4, title: 'The Getaway',
    briefing: 'The deal went loud and the VBPD is on you. Lose the police, then lay low at the club.',
    reward: 1500, rep: 20,
    steps: [
      { type: 'escape', wanted: 3, seconds: 20, text: 'Escape the police pursuit (stay out of sight)' },
      { type: 'goto', place: 'club', text: 'Lay low at the Neon Tide Club' },
    ],
  },
  {
    id: 5, title: 'The Missing Deal',
    briefing: 'A shipment vanished at the port. Search Warehouse 7 and find out who took it.',
    reward: 2000, rep: 25,
    steps: [
      { type: 'goto', place: 'portDeal', text: 'Search Warehouse 7 at the port' },
      { type: 'kill', place: 'portDeal', count: 3, text: 'Deal with the thieves at the port' },
      { type: 'collect', place: 'portDeal', count: 3, text: 'Recover 3 stolen crates' },
    ],
  },
  {
    id: 6, title: 'Betrayal',
    briefing: 'Marco sold you out. He is hiding at the airport with Kane\'s men. End it.',
    reward: 2500, rep: 30,
    steps: [
      { type: 'goto', place: 'airport', text: 'Confront Marco at the airport' },
      { type: 'kill', place: 'airport', count: 5, text: 'Fight Kane\'s men and Marco' },
    ],
  },
  {
    id: 7, title: 'Night Run',
    briefing: 'Illegal street race along the beach. Beat the rival drivers to the finish.',
    reward: 3000, rep: 30,
    steps: [
      { type: 'race', place: 'raceStart', text: 'Win the beach street race' },
    ],
  },
  {
    id: 8, title: 'The Hidden Truth',
    briefing: 'City Hall is in Kane\'s pocket. Steal the ledger that proves it.',
    reward: 3500, rep: 35,
    steps: [
      { type: 'goto', place: 'cityHall', text: 'Sneak into City Hall' },
      { type: 'collect', place: 'cityHall', count: 2, text: 'Grab the ledger pages (2)' },
      { type: 'escape', wanted: 2, seconds: 15, text: 'Escape with the evidence' },
    ],
  },
  {
    id: 9, title: 'Final Assault',
    briefing: 'Kane\'s mansion in Rich Hills. His whole crew is there. Bring the war to him.',
    reward: 5000, rep: 50,
    steps: [
      { type: 'goto', place: 'mansion', text: 'Storm Kane\'s mansion' },
      { type: 'kill', place: 'mansion', count: 8, text: 'Defeat Kane\'s crew (8)' },
    ],
  },
  {
    id: 10, title: 'Blood & Destiny',
    briefing: 'Kane himself, at the bank. Your choice decides the fate of Vice Bay.',
    reward: 10000, rep: 100,
    steps: [
      { type: 'goto', place: 'bank', text: 'Face Kane at Bay National Bank' },
      { type: 'kill', place: 'bank', count: 6, text: 'Defeat Kane\'s last guards (6)' },
      { type: 'choice', text: 'Choose Vice Bay\'s fate: spare Kane or take the city' },
    ],
  },
];

export const SIDE_MISSIONS = [
  { id: 'taxi', name: 'Taxi Driver', desc: 'Pick up fares and drive them across town.', place: 'start', reward: 400 },
  { id: 'race', name: 'Street Racing', desc: 'Checkpoint race through Downtown.', place: 'raceStart', reward: 900 },
  { id: 'delivery', name: 'Vehicle Delivery', desc: 'Deliver a car to three stops.', place: 'portDeal', reward: 700 },
  { id: 'escape', name: 'Police Escape', desc: 'Get 3 stars and lose the police.', place: 'criminal', reward: 800 },
  { id: 'packages', name: 'Hidden Packages', desc: 'Collect 8 packages hidden around the city.', place: 'beach', reward: 1500 },
  { id: 'territory', name: 'Gang Territory', desc: 'Clear the Vipers from their turf.', place: 'gangHQ', reward: 1000 },
  { id: 'timetrial', name: 'Time Trial', desc: 'Hit 5 checkpoints before the clock runs out.', place: 'airport', reward: 600 },
  { id: 'rescue', name: 'Rescue Civilians', desc: 'Pick up a hurt civilian and drive them to the hospital.', place: 'hospital', reward: 750 },
];

const RACE_POINTS = [
  { x: 420, z: -60 }, { x: 400, z: -300 }, { x: 200, z: -400 },
  { x: -100, z: -400 }, { x: -300, z: -200 }, { x: -400, z: 0 },
  { x: -200, z: 200 }, { x: 0, z: 300 }, { x: 300, z: 300 }, { x: 420, z: 120 },
];

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
        engine.stepState.timer = 150;
      }
      engine.updateMarker();
    },
    stepTarget() {
      const step = engine.currentStep();
      if (!step) return null;
      if (step.type === 'race') return RACE_POINTS[engine.stepState.raceIndex] || null;
      if (step.type === 'collect' && engine.stepState.collectibles.length) {
        const next = engine.stepState.collectibles.find((c) => !c.taken);
        return next || null;
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
      G.toast('Mission complete: ' + m.title + ' +$' + m.reward + ' +' + m.rep + ' rep');
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
      const st = engine.stepState;
      const px = G.currentVehicle ? G.currentVehicle.x : G.player.x;
      const pz = G.currentVehicle ? G.currentVehicle.z : G.player.z;
      const target = engine.stepTarget();
      if (step.type === 'goto' || step.type === 'deliver' || step.type === 'talk') {
        if (target && Math.hypot(px - target.x, pz - target.z) < 10) engine.advanceStep();
      } else if (step.type === 'drive') {
        if (G.currentVehicle && target && Math.hypot(px - target.x, pz - target.z) < 12) engine.advanceStep();
        else if (!G.currentVehicle && target && Math.hypot(px - target.x, pz - target.z) < 12) {
          G.missionText = step.text + ' (you need a car!)';
        }
      } else if (step.type === 'kill') {
        st.kills = step.count - G.enemies.filter((e) => e.alive).length;
        G.missionText = step.text + ' (' + Math.max(0, st.kills) + '/' + step.count + ')';
        if (G.enemies.filter((e) => e.alive).length === 0) engine.advanceStep();
      } else if (step.type === 'collect') {
        for (const c of st.collectibles) {
          if (!c.taken && Math.hypot(px - c.x, pz - c.z) < 4) {
            c.taken = true;
            st.collected += 1;
            if (G.audio) G.audio.pickup();
            G.toast('Collected ' + st.collected + '/' + step.count);
            engine.updateMarker();
          }
        }
        G.missionText = step.text + ' (' + st.collected + '/' + step.count + ')';
        if (st.collected >= step.count) engine.advanceStep();
      } else if (step.type === 'escape') {
        st.timer += dt;
        if (G.wanted === 0 && st.timer > 3) engine.advanceStep();
        else G.missionText = step.text + ' — wanted ' + G.wanted + '★ (' + Math.floor(st.timer) + 's)';
        if (st.timer > 120) engine.failMission('The police never lost you.');
      } else if (step.type === 'race') {
        st.timer -= dt;
        const cp = RACE_POINTS[st.raceIndex];
        if (cp && Math.hypot(px - cp.x, pz - cp.z) < 14) {
          st.raceIndex += 1;
          if (G.audio) G.audio.pickup();
          engine.updateMarker();
          if (st.raceIndex >= RACE_POINTS.length) { engine.advanceStep(); return; }
        }
        G.missionText = step.text + ' — checkpoint ' + (st.raceIndex + 1) + '/' + RACE_POINTS.length + ' (' + Math.max(0, Math.ceil(st.timer)) + 's)';
        if (st.timer <= 0) engine.failMission('Out of time in the race.');
      } else if (step.type === 'choice') {
        engine.choiceOpen = true;
        G.openChoice();
      }
    },
    // Side missions: started at their marker, same step engine, smaller scope.
    startSide(id) {
      const def = SIDE_MISSIONS.find((s) => s.id === id);
      if (!def) return;
      engine.side = def;
      const place = PLACES[def.place];
      engine.sideState = { timer: 0, progress: 0, target: null, phase: 0, checkpoints: [], packages: [] };
      const st = engine.sideState;
      if (id === 'taxi') {
        st.phase = 0;
        st.target = { x: place.x + 40, z: place.z - 60 };
        G.toast('Taxi: pick up the fare at the marker.');
      } else if (id === 'race' || id === 'timetrial') {
        st.checkpoints = RACE_POINTS.slice(0, 5);
        st.timer = id === 'timetrial' ? 90 : 150;
        G.toast('Race: hit all 5 checkpoints!');
      } else if (id === 'delivery') {
        st.checkpoints = [{ x: 160, z: -40 }, { x: -320, z: 220 }, { x: 420, z: 120 }];
        st.timer = 180;
      } else if (id === 'escape') {
        G.addWanted(3);
      } else if (id === 'packages') {
        for (let i = 0; i < 8; i += 1) st.packages.push({ x: (Math.random() - 0.5) * 900, z: (Math.random() - 0.5) * 900, taken: false });
      } else if (id === 'territory') {
        for (let i = 0; i < 5; i += 1) spawnEnemy(G, PLACES.gangHQ.x + (Math.random() - 0.5) * 30, PLACES.gangHQ.z + (Math.random() - 0.5) * 30, { bounty: 200 });
      } else if (id === 'rescue') {
        st.target = PLACES.hospital;
        spawnEnemy(G, place.x, place.z, { color: 0x2ecc71, health: 50, bounty: 0 });
        G.toast('Rescue: reach the hurt civilian, then drive them to the hospital.');
      }
      G.missionText = 'Side mission: ' + def.name;
      G.sideTarget = st.target || st.checkpoints?.[0] || null;
    },
    updateSide(dt) {
      const def = engine.side;
      if (!def) return;
      const st = engine.sideState;
      const px = G.currentVehicle ? G.currentVehicle.x : G.player.x;
      const pz = G.currentVehicle ? G.currentVehicle.z : G.player.z;
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
        if (st.phase === 0 && st.target && Math.hypot(px - st.target.x, pz - st.target.z) < 8) {
          st.phase = 1;
          st.target = { x: 160, z: 200 };
          G.sideTarget = st.target;
          G.toast('Fare picked up! Drive them to Downtown.');
        } else if (st.phase === 1 && st.target && Math.hypot(px - st.target.x, pz - st.target.z) < 10) finish(0);
      } else if (def.id === 'race' || def.id === 'timetrial' || def.id === 'delivery') {
        st.timer -= dt;
        const cp = st.checkpoints[st.progress];
        G.sideTarget = cp || null;
        if (cp && Math.hypot(px - cp.x, pz - cp.z) < 14) {
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
          if (!p.taken && Math.hypot(px - p.x, pz - p.z) < 4) {
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
        if (st.phase === 0 && Math.hypot(px - PLACES.hospital.x, pz - PLACES.hospital.z) < 60 && G.currentVehicle) {
          st.phase = 1;
          G.toast('Civilian in the car! Drive to Bay General Hospital.');
        }
        if (st.phase === 1 && Math.hypot(px - PLACES.hospital.x, pz - PLACES.hospital.z) < 12) finish(0);
      }
    },
  };
  G.onEnemyKilled = () => {};
  return engine;
}
