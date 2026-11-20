// Vice Bay — missions: 10 linked story missions with an ending choice,
// plus 8 side missions. Each mission is a small state machine of steps;
// a step names its objective position and what completes it.

export const STORY = [
  { title: 'Welcome to Vice Bay', desc: 'Meet Rico at the Ocean Beach pier.', target: { x: -800, z: 420 }, reward: { money: 200, rep: 5 }, steps: ['Go to the pier', 'Talk to Rico'] },
  { title: 'A Dangerous Favor', desc: 'Steal the Comet GT from Downtown and bring it to the garage.', target: { x: 0, z: -80 }, reward: { money: 600, rep: 10 }, steps: ['Steal a Comet GT', 'Deliver it to the garage'] },
  { title: 'Street Reputation', desc: 'Win a street race around the Highway Ring.', target: { x: 0, z: 880 }, reward: { money: 900, rep: 15 }, steps: ['Reach the start line', 'Win the race'] },
  { title: 'The Getaway', desc: 'Escape the police after the bank job. Lose your wanted level.', target: { x: -560, z: -560 }, reward: { money: 1500, rep: 20 }, steps: ['Escape the police', 'Reach the safehouse'] },
  { title: 'The Missing Deal', desc: 'Recover the stolen shipment at the Industrial Port.', target: { x: -560, z: -640 }, reward: { money: 1200, rep: 15 }, steps: ['Reach the port', 'Recover the crates', 'Return to Rico'] },
  { title: 'Betrayal', desc: 'Someone in the crew talked. Confront the traitor in the Criminal District.', target: { x: 620, z: 60 }, reward: { money: 1000, rep: 25 }, steps: ['Find the traitor', 'Deal with him'] },
  { title: 'Night Run', desc: 'Drive the package through Little Havana at night. Do not get caught.', target: { x: 420, z: 420 }, reward: { money: 1800, rep: 20 }, steps: ['Pick up the package', 'Deliver it before dawn'] },
  { title: 'The Hidden Truth', desc: 'Search the airport hangar for the files that prove who set you up.', target: { x: -140, z: 700 }, reward: { money: 1400, rep: 20 }, steps: ['Enter the hangar', 'Find the files'] },
  { title: 'Final Assault', desc: 'Storm the tower in Downtown and take back the city.', target: { x: 0, z: -120 }, reward: { money: 3000, rep: 30 }, steps: ['Fight your way in', 'Take the tower'] },
  { title: 'Blood & Destiny', desc: 'The final choice: spare the boss or take the throne of Vice Bay.', target: { x: 0, z: 0 }, reward: { money: 5000, rep: 50 }, steps: ['Make your choice'] },
];

export const SIDE = [
  { title: 'Taxi Fares', desc: 'Pick up passengers and drop them off. 3 fares.', target: { x: -320, z: 320 }, reward: { money: 450, rep: 5 } },
  { title: 'Street Racing', desc: 'Beat the checkpoint timer around the ring.', target: { x: 0, z: -880 }, reward: { money: 800, rep: 8 } },
  { title: 'Vehicle Delivery', desc: 'Deliver a Bison SUV to Rich Hills undamaged.', target: { x: 560, z: -560 }, reward: { money: 700, rep: 6 } },
  { title: 'Police Escape', desc: 'Get a 3-star wanted level, then lose it.', target: { x: 620, z: 60 }, reward: { money: 900, rep: 12 } },
  { title: 'Hidden Packages', desc: 'Find 5 packages hidden around the beach.', target: { x: -560, z: 420 }, reward: { money: 1000, rep: 10 } },
  { title: 'Territory Takeover', desc: 'Clear the Criminal District of rival gang members.', target: { x: 620, z: 60 }, reward: { money: 1100, rep: 15 } },
  { title: 'Time Trial', desc: 'Cross the city from the port to the airport in under 3 minutes.', target: { x: -140, z: 760 }, reward: { money: 850, rep: 8 } },
  { title: 'Rescue Civilians', desc: 'Escort 3 civilians out of the danger zone.', target: { x: 420, z: 420 }, reward: { money: 750, rep: 10 } },
];

export class Missions {
  constructor(audio, combat) {
    this.audio = audio;
    this.combat = combat;
    this.storyIndex = 0;
    this.storyStep = 0;
    this.sideDone = new Set();
    this.activeSide = null;
    this.sideStep = 0;
    this.raceTimer = 0;
    this.faresDone = 0;
    this.packagesFound = 0;
    this.objective = null; // {x, z, label}
    this.message = '';
    this.messageTimer = 0;
    this.completedStory = false;
    this._refreshObjective();
  }

  get currentStory() {
    return STORY[this.storyIndex] || null;
  }

  get storyTitle() {
    const m = this.currentStory;
    return m ? `${m.title} — ${m.steps[this.storyStep] || m.steps[m.steps.length - 1]}` : 'Story complete';
  }

  _refreshObjective() {
    const m = this.currentStory;
    if (!m) { this.objective = null; return; }
    this.objective = { x: m.target.x, z: m.target.z, label: m.title };
  }

  showMessage(text, seconds = 4) {
    this.message = text;
    this.messageTimer = seconds;
  }

  _reward(r) {
    return r;
  }

  _completeStoryMission(game) {
    const m = this.currentStory;
    if (!m) return;
    game.money += m.reward.money;
    game.rep += m.reward.rep;
    this.audio.missionDone();
    this.audio.cash();
    this.showMessage(`Mission complete: ${m.title} — $${m.reward.money}`, 5);
    this.storyIndex++;
    this.storyStep = 0;
    if (this.storyIndex >= STORY.length) {
      this.completedStory = true;
      this.showMessage('You are the king of Vice Bay. Blood & Destiny complete.', 8);
    }
    this._refreshObjective();
  }

  startSide(index, game) {
    if (this.activeSide !== null || this.sideDone.has(index)) return false;
    this.activeSide = index;
    this.sideStep = 0;
    const s = SIDE[index];
    this.objective = { x: s.target.x, z: s.target.z, label: s.title };
    this.showMessage(`Side mission started: ${s.title}`, 4);
    if (index === 5) {
      // Territory: spawn rivals.
      for (let i = 0; i < 4; i++) this.combat.spawnEnemy(620 + (Math.random() - 0.5) * 60, 60 + (Math.random() - 0.5) * 60);
    }
    return true;
  }

  _completeSide(game) {
    const s = SIDE[this.activeSide];
    game.money += s.reward.money;
    game.rep += s.reward.rep;
    this.audio.missionDone();
    this.audio.cash();
    this.showMessage(`Side mission complete: ${s.title} — $${s.reward.money}`, 5);
    this.sideDone.add(this.activeSide);
    this.activeSide = null;
    this._refreshObjective();
  }

  /** Called every frame; game is the main Game object (money/rep/player/police). */
  update(dt, game) {
    if (this.messageTimer > 0) this.messageTimer -= dt;
    const playerPos = game.player.vehicle ? game.player.vehicle.pos : game.player.pos;
    // Story progress: reaching the objective advances the step.
    const m = this.currentStory;
    if (m && !this.completedStory) {
      const d = Math.hypot(playerPos.x - m.target.x, playerPos.z - m.target.z);
      if (d < 26) {
        // Mission 4 (The Getaway) also needs the wanted level cleared.
        if (this.storyIndex === 3 && this.storyStep === 0) {
          if (game.police.wanted === 0) {
            this.storyStep = 1;
            this.showMessage('You lost the cops. Reach the safehouse.', 4);
          } else {
            this.showMessage('Lose the cops first!', 2);
          }
        } else if (this.storyIndex === 3 && this.storyStep === 1) {
          this._completeStoryMission(game);
        } else {
          this.storyStep++;
          if (this.storyStep >= m.steps.length) this._completeStoryMission(game);
          else this.showMessage(`Next: ${m.steps[this.storyStep]}`, 3);
        }
      }
      // Mission 2: stealing any car counts once the player drives one.
      if (this.storyIndex === 1 && this.storyStep === 0 && game.player.vehicle) {
        this.storyStep = 1;
        this.showMessage('Got the Comet. Deliver it to the garage.', 3);
      }
    }
    // Side missions.
    if (this.activeSide !== null) {
      const s = SIDE[this.activeSide];
      const d = Math.hypot(playerPos.x - s.target.x, playerPos.z - s.target.z);
      if (this.activeSide === 4) {
        // Hidden packages: collect by proximity (5 scattered near the beach).
        if (d < 30) {
          this.packagesFound++;
          this.showMessage(`Package found (${this.packagesFound}/5)`, 2);
          this.audio.pickup();
          if (this.packagesFound >= 5) this._completeSide(game);
          else this.objective = { x: -560 + (Math.random() - 0.5) * 300, z: 420 + (Math.random() - 0.5) * 240, label: s.title };
        }
      } else if (this.activeSide === 5) {
        if (this.combat.enemies.length === 0) this._completeSide(game);
      } else if (this.activeSide === 3) {
        if (game.police.wanted >= 3) this.sideStep = 1;
        if (this.sideStep === 1 && game.police.wanted === 0) this._completeSide(game);
      } else if (d < 26) {
        this._completeSide(game);
      }
    }
  }
}
