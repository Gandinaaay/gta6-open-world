// Vice Bay — HUD: health bar, money, reputation, wanted stars, speed,
// compass, objective distance, and a live minimap canvas. The missions
// menu (M) lists all 10 story + 8 side missions.

export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this.root.innerHTML = `
      <div id="hud-topleft">
        <div id="hud-stars"></div>
        <div id="hud-health"><div id="hud-health-fill"></div><span id="hud-health-text">100</span></div>
        <div id="hud-money">$0</div>
        <div id="hud-rep">REP 0</div>
      </div>
      <div id="hud-topright">
        <canvas id="hud-minimap" width="180" height="180"></canvas>
        <div id="hud-compass">N</div>
        <div id="hud-objective"></div>
      </div>
      <div id="hud-bottomright">
        <div id="hud-speed">0</div>
        <div id="hud-speed-unit">km/h</div>
        <div id="hud-weapon">Fists</div>
        <div id="hud-ammo"></div>
      </div>
      <div id="hud-message"></div>
      <div id="hud-mission"></div>
      <div id="hud-menu" class="hidden">
        <h2>MISSIONS</h2>
        <div id="hud-menu-list"></div>
        <p class="hud-menu-hint">M / Esc — close</p>
      </div>`;
    this.starsEl = document.getElementById('hud-stars');
    this.healthFill = document.getElementById('hud-health-fill');
    this.healthText = document.getElementById('hud-health-text');
    this.moneyEl = document.getElementById('hud-money');
    this.repEl = document.getElementById('hud-rep');
    this.minimap = document.getElementById('hud-minimap');
    this.mm = this.minimap.getContext('2d');
    this.compassEl = document.getElementById('hud-compass');
    this.objectiveEl = document.getElementById('hud-objective');
    this.speedEl = document.getElementById('hud-speed');
    this.weaponEl = document.getElementById('hud-weapon');
    this.ammoEl = document.getElementById('hud-ammo');
    this.messageEl = document.getElementById('hud-message');
    this.missionEl = document.getElementById('hud-mission');
    this.menuEl = document.getElementById('hud-menu');
    this.menuList = document.getElementById('hud-menu-list');
    this.menuOpen = false;
    this._lastStarFlash = 0;
  }

  setMenuOpen(open, missions) {
    this.menuOpen = open;
    this.menuEl.classList.toggle('hidden', !open);
    if (!open) return;
    const rows = [];
    missions.storyList.forEach((m, i) => {
      const state = i < missions.storyIndex ? '✓' : i === missions.storyIndex ? '►' : '·';
      rows.push(`<div class="hud-menu-row ${i === missions.storyIndex ? 'active' : ''}">${state} ${m.title}</div>`);
    });
    missions.sideList.forEach((s, i) => {
      const done = missions.sideDone.has(i);
      const active = missions.activeSide === i;
      const state = done ? '✓' : active ? '►' : '·';
      rows.push(`<div class="hud-menu-row side ${active ? 'active' : ''}">${state} ${s.title} <span class="hud-menu-side">SIDE</span></div>`);
    });
    this.menuList.innerHTML = rows.join('');
  }

  update(state) {
    // Wanted stars, flashing when a new star was just earned.
    const starHtml = '★'.repeat(state.wanted) + '<span class="dim">' + '★'.repeat(Math.max(0, 5 - state.wanted)) + '</span>';
    if (this.starsEl.innerHTML !== starHtml) {
      this.starsEl.innerHTML = starHtml;
      this.starsEl.classList.remove('flash');
      void this.starsEl.offsetWidth;
      this.starsEl.classList.add('flash');
    }
    const hpPct = Math.max(0, state.health / state.maxHealth * 100);
    this.healthFill.style.width = `${hpPct}%`;
    this.healthFill.style.background = hpPct > 50 ? '#2ecc71' : hpPct > 25 ? '#f39c12' : '#e74c3c';
    this.healthText.textContent = Math.ceil(state.health);
    this.moneyEl.textContent = `$${state.money.toLocaleString('en-US')}`;
    this.repEl.textContent = `REP ${state.rep}`;
    this.speedEl.textContent = Math.round(state.speedKmh);
    this.weaponEl.textContent = state.weaponName;
    this.ammoEl.textContent = state.ammoText;
    // Compass: 8-point from camera yaw.
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(((state.camYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8;
    this.compassEl.textContent = dirs[idx];
    // Objective distance.
    if (state.objective) {
      this.objectiveEl.textContent = `${state.objective.label} — ${Math.round(state.objectiveDist)}m`;
      this.missionEl.textContent = state.missionLine;
    } else {
      this.objectiveEl.textContent = '';
      this.missionEl.textContent = state.missionLine;
    }
    // Toast message.
    if (state.message && state.messageTimer > 0) {
      this.messageEl.textContent = state.message;
      this.messageEl.style.opacity = '1';
    } else {
      this.messageEl.style.opacity = '0';
    }
    this._drawMinimap(state);
  }

  _drawMinimap(state) {
    const g = this.mm;
    const S = 180;
    const scale = S / 2000;
    g.clearRect(0, 0, S, S);
    g.fillStyle = 'rgba(10,16,28,0.85)';
    g.fillRect(0, 0, S, S);
    // Roads.
    g.strokeStyle = 'rgba(180,190,205,0.55)';
    g.lineWidth = 1.5;
    for (let c = -800; c <= 800; c += 160) {
      const p = (c + 1000) * scale;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke();
    }
    // Beach + port hints.
    g.fillStyle = 'rgba(227,201,152,0.5)';
    g.fillRect((-800 + 1000) * scale, (220 + 1000) * scale, 460 * scale, 400 * scale);
    // Objective: pulsing ring.
    if (state.objective) {
      const ox = (state.objective.x + 1000) * scale;
      const oy = (state.objective.z + 1000) * scale;
      const pulse = 6 + Math.sin(performance.now() / 280) * 3;
      g.strokeStyle = '#ffd23f';
      g.lineWidth = 2.5;
      g.beginPath(); g.arc(ox, oy, pulse, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.arc(ox, oy, 3, 0, Math.PI * 2); g.fill();
    }
    // Traffic dots.
    g.fillStyle = 'rgba(200,210,225,0.8)';
    for (const t of state.trafficDots || []) {
      g.fillRect((t.x + 1000) * scale - 1, (t.z + 1000) * scale - 1, 2, 2);
    }
    // Police dots (red).
    g.fillStyle = '#ff4444';
    for (const p of state.policeDots || []) {
      g.beginPath(); g.arc((p.x + 1000) * scale, (p.z + 1000) * scale, 3, 0, Math.PI * 2); g.fill();
    }
    // Player arrow (rotates with heading).
    const px = (state.playerX + 1000) * scale;
    const py = (state.playerZ + 1000) * scale;
    g.save();
    g.translate(px, py);
    g.rotate(state.playerHeading);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath();
    g.fill();
    g.restore();
    // Border.
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, S - 1, S - 1);
  }
}
