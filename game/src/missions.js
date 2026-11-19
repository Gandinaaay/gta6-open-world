// Story missions (10, linked, ending choice) + side missions (8). Generic step engine.
export const STORY = [
  { id: 1, name: 'Welcome to Vice Bay', brief: 'Meet Marcus at the Downtown plaza.', reward: 300, steps: [{ kind: 'goto', text: 'Meet Marcus at the plaza', target: [200, 100], radius: 8 }] },
  { id: 2, name: 'A Dangerous Favor', brief: 'Grab the two packages, then drop them at the pier.', reward: 500, steps: [
    { kind: 'collect', text: 'Collect the packages', targets: [[-100, 300], [150, -200]], radius: 4 },
    { kind: 'goto', text: 'Deliver to the pier', target: [-850, 600], radius: 10 }] },
  { id: 3, name: 'Street Reputation', brief: 'Clear the crew out of the Criminal District.', reward: 700, steps: [{ kind: 'kill', text: 'Take out the crew', count: 3, at: [-250, 800], radius: 60 }] },
  { id: 4, name: 'The Getaway', brief: 'Drive the Comet GT to the port, then lose the heat.', reward: 800, steps: [
    { kind: 'drive', text: 'Drive to the Industrial Port', target: [800, 500], radius: 12 },
    { kind: 'escape', text: 'Lose the cops', radius: 0 }] },
  { id: 5, name: 'The Missing Deal', brief: 'Recover three stashes in Little Havana.', reward: 900, steps: [{ kind: 'collect', text: 'Recover the stashes', targets: [[450, -450], [350, -550], [550, -350]], radius: 4 }] },
  { id: 6, name: 'Betrayal', brief: 'Vega set you up. Settle it at the port.', reward: 1200, steps: [{ kind: 'kill', text: 'Settle the score at the port', count: 5, at: [800, 500], radius: 70 }] },
  { id: 7, name: 'Night Run', brief: 'Race the checkpoints before the clock runs out.', reward: 1000, steps: [{ kind: 'race', text: 'Hit every checkpoint', checkpoints: [[0, 0], [400, 400], [-400, -400], [0, -800]], timeLimit: 180 }] },
  { id: 8, name: 'The Hidden Truth', brief: 'Search the airport hangar, then report back.', reward: 1100, steps: [
    { kind: 'goto', text: 'Search the airport', target: [700, -750], radius: 12 },
    { kind: 'collect', text: 'Grab the ledger', targets: [[720, -720]], radius: 4 },
    { kind: 'goto', text: 'Report to Marcus', target: [200, 100], radius: 8 }] },
  { id: 9, name: 'Final Assault', brief: 'Take the Criminal District back, once and for all.', reward: 2000, steps: [{ kind: 'kill', text: 'Clear the district', count: 8, at: [-250, 800], radius: 80 }] },
  { id: 10, name: 'Blood & Destiny', brief: 'Choose a side. Marcus or Vega — the city remembers.', reward: 3000, steps: [
    { kind: 'choice', text: 'Choose: [1] Side with Marcus  [2] Side with Vega', options: ['Marcus', 'Vega'] },
    { kind: 'kill', text: 'Finish it', count: 4, at: [-250, 800], radius: 70 }] },
];

export const SIDE = [
  { id: 'taxi', name: 'Taxi Fares', brief: 'Pick up the fare, drop them off.', reward: 250, steps: [{ kind: 'taxi', text: 'Pick up the fare', pickup: [300, 300], dropoff: [-600, -600] }] },
  { id: 'race', name: 'Street Racing', brief: 'Beat the street circuit.', reward: 600, steps: [{ kind: 'race', text: 'Race the circuit', checkpoints: [[200, 200], [600, -200], [-200, -600], [-600, 200], [0, 0]], timeLimit: 150 }] },
  { id: 'delivery', name: 'Vehicle Delivery', brief: 'Deliver the Comet GT to Rich Hills.', reward: 450, steps: [{ kind: 'drive', text: 'Deliver the car', target: [-650, -650], radius: 12 }] },
  { id: 'escape', name: 'Police Escape', brief: 'Get hot, then go cold.', reward: 500, steps: [{ kind: 'escape', text: 'Lose the cops', radius: 0 }] },
  { id: 'packages', name: 'Hidden Packages', brief: 'Find four hidden packages.', reward: 400, steps: [{ kind: 'collect', text: 'Find the packages', targets: [[-700, 600], [800, -750], [-650, -650], [100, 800]], radius: 4 }] },
  { id: 'territory', name: 'Territory Takeover', brief: 'Clear the rivals out of the block.', reward: 800, steps: [{ kind: 'kill', text: 'Clear the block', count: 6, at: [-250, 800], radius: 70 }] },
  { id: 'trial', name: 'Time Trial', brief: 'Three markers, two minutes.', reward: 500, steps: [{ kind: 'race', text: 'Beat the clock', checkpoints: [[-300, -300], [500, 100], [0, 700]], timeLimit: 120 }] },
  { id: 'rescue', name: 'Rescue Civilians', brief: 'Pick up three civilians, get them to the hospital.', reward: 700, steps: [
    { kind: 'collect', text: 'Reach the civilians', targets: [[-250, 800], [-200, 750], [-300, 850]], radius: 5 },
    { kind: 'goto', text: 'Get them to the hospital', target: [100, -300], radius: 12 }] },
];

export class Missions {
  constructor() {
    this.storyIndex = 0;
    this.active = null; // { def, kind: 'story'|'side', stepIndex }
    this.stepState = null;
    this.finishedStory = false;
    this.sideDone = new Set();
    this.onReward = null; // (money, rep) => void
    this.onMessage = null; // (text) => void
  }

  currentDef() {
    return this.active ? this.active.def : null;
  }

  startStory(i) {
    const def = STORY[i];
    if (!def) return false;
    this.active = { def, kind: 'story', stepIndex: 0 };
    this.stepState = this._freshStep(def.steps[0]);
    if (this.onMessage) this.onMessage(`${def.name}: ${def.brief}`);
    return true;
  }

  startSide(id) {
    const def = SIDE.find((s) => s.id === id);
    if (!def) return false;
    this.active = { def, kind: 'side', stepIndex: 0 };
    this.stepState = this._freshStep(def.steps[0]);
    if (this.onMessage) this.onMessage(`${def.name}: ${def.brief}`);
    return true;
  }

  _freshStep(step) {
    const s = { killsAtStart: 0, collected: new Set(), raceIdx: 0, timeLeft: step.timeLimit || 0, taxiPhase: 0, spawned: false, choice: null };
    return s;
  }

  objectiveText() {
    if (!this.active) return 'No active mission — press M for the mission list';
    const step = this.active.def.steps[this.active.stepIndex];
    let extra = '';
    if (step.kind === 'kill') extra = ` (${this.stepState.killsAtStart >= 0 ? this._killProgress() : 0}/${step.count})`;
    if (step.kind === 'collect') extra = ` (${this.stepState.collected.size}/${step.targets.length})`;
    if (step.kind === 'race') extra = ` (${this.stepState.raceIdx}/${step.checkpoints.length}) — ${Math.ceil(this.stepState.timeLeft)}s`;
    if (step.kind === 'taxi') extra = this.stepState.taxiPhase === 0 ? ' — go to the pickup' : ' — take them to the drop-off';
    return `${this.active.def.name}: ${step.text}${extra}`;
  }

  _killProgress() {
    return this._killsNow - this.stepState.killsAtStart;
  }

  marker() {
    if (!this.active) return null;
    const step = this.active.def.steps[this.active.stepIndex];
    const s = this.stepState;
    if (step.kind === 'goto' || step.kind === 'drive') return { x: step.target[0], z: step.target[1] };
    if (step.kind === 'kill') return { x: step.at[0], z: step.at[1] };
    if (step.kind === 'collect') {
      for (const t of step.targets) if (!s.collected.has(t.join(','))) return { x: t[0], z: t[1] };
      return null;
    }
    if (step.kind === 'race') {
      const cp = step.checkpoints[s.raceIdx];
      return cp ? { x: cp[0], z: cp[1] } : null;
    }
    if (step.kind === 'taxi') {
      const t = s.taxiPhase === 0 ? step.pickup : step.dropoff;
      return { x: t[0], z: t[1] };
    }
    return null;
  }

  update(dt, ctx) {
    if (!this.active) return;
    const step = this.active.def.steps[this.active.stepIndex];
    const s = this.stepState;
    this._killsNow = ctx.kills;
    const px = ctx.playerPos.x, pz = ctx.playerPos.z;
    const near = (tx, tz, r) => Math.hypot(px - tx, pz - tz) < r;
    let done = false;
    if (step.kind === 'goto') {
      done = near(step.target[0], step.target[1], step.radius);
    } else if (step.kind === 'drive') {
      done = ctx.inCar && near(step.target[0], step.target[1], step.radius);
    } else if (step.kind === 'kill') {
      if (!s.spawned) {
        s.spawned = true;
        s.killsAtStart = ctx.kills;
        if (ctx.spawnEnemies) ctx.spawnEnemies(step.at[0], step.at[1], step.count + 2);
      }
      done = this._killProgress() >= step.count;
    } else if (step.kind === 'collect') {
      for (const t of step.targets) {
        if (!s.collected.has(t.join(',')) && near(t[0], t[1], step.radius)) {
          s.collected.add(t.join(','));
          if (ctx.onPickup) ctx.onPickup();
        }
      }
      done = s.collected.size >= step.targets.length;
    } else if (step.kind === 'escape') {
      if (!s.spawned) { s.spawned = true; if (ctx.addHeat) ctx.addHeat(2); }
      done = ctx.wanted === 0;
    } else if (step.kind === 'race') {
      s.timeLeft -= dt;
      const cp = step.checkpoints[s.raceIdx];
      if (cp && near(cp[0], cp[1], 12)) s.raceIdx += 1;
      done = s.raceIdx >= step.checkpoints.length;
      if (!done && s.timeLeft <= 0) { this._fail('Out of time.'); return; }
    } else if (step.kind === 'taxi') {
      if (s.taxiPhase === 0 && near(step.pickup[0], step.pickup[1], 8)) {
        s.taxiPhase = 1;
        if (this.onMessage) this.onMessage('Fare picked up — take them to the drop-off.');
      } else if (s.taxiPhase === 1 && near(step.dropoff[0], step.dropoff[1], 8)) {
        done = true;
      }
    } else if (step.kind === 'choice') {
      if (ctx.choice === 1 || ctx.choice === 2) {
        s.choice = ctx.choice;
        done = true;
        if (this.onMessage) this.onMessage(ctx.choice === 1 ? 'You side with Marcus.' : 'You side with Vega.');
      }
    }
    if (!done) return;
    // Advance to the next step or complete the mission.
    this.active.stepIndex += 1;
    if (this.active.stepIndex >= this.active.def.steps.length) {
      const def = this.active.def;
      const kind = this.active.kind;
      this.active = null;
      this.stepState = null;
      if (this.onReward) this.onReward(def.reward, 15);
      if (this.onMessage) this.onMessage(`Mission complete: ${def.name} — +$${def.reward}`);
      if (kind === 'story') {
        this.storyIndex += 1;
        if (this.storyIndex >= STORY.length) this.finishedStory = true;
        else this.startStory(this.storyIndex);
      } else {
        this.sideDone.add(def.id);
      }
    } else {
      this.stepState = this._freshStep(this.active.def.steps[this.active.stepIndex]);
    }
  }

  _fail(reason) {
    if (this.onMessage) this.onMessage(`Mission failed: ${reason}`);
    this.active = null;
    this.stepState = null;
  }

  fail(reason) { this._fail(reason); }
}
