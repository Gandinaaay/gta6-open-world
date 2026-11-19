// HUD: health/money/rep/stars/speed/compass, message feed, live minimap, mission menu.
import { CFG } from './config.js';
import { STORY, SIDE } from './missions.js';

export class HUD {
  constructor() {
    this.el = (id) => document.getElementById(id);
    this.map = this.el('minimap');
    this.mapCtx = this.map ? this.map.getContext('2d') : null;
    this._msgT = 0;
    this._starFlash = 0;
    this._lastStars = 0;
  }

  setHealth(h) {
    const f = this.el('health-fill');
    if (f) { f.style.width = Math.max(0, h) + '%'; f.style.background = h > 50 ? '#2ecc71' : h > 25 ? '#f5c518' : '#e74c3c'; }
  }

  setMoney(m) { const e = this.el('money'); if (e) e.textContent = '$' + Math.floor(m).toLocaleString(); }
  setRep(r) { const e = this.el('rep'); if (e) e.textContent = 'REP ' + Math.floor(r); }

  setStars(n) {
    const e = this.el('stars');
    if (!e) return;
    if (n > this._lastStars) this._starFlash = 1.2; // new star: flash + sting handled by main
    this._lastStars = n;
    let s = '';
    for (let i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    e.textContent = s;
    e.style.opacity = this._starFlash > 0 ? (0.5 + 0.5 * Math.sin(this._starFlash * 20)) : 1;
  }

  setSpeed(kmh, inCar) {
    const e = this.el('speed');
    if (e) e.textContent = inCar ? Math.round(Math.abs(kmh)) + ' km/h' : '';
  }

  setCompass(heading) {
    const e = this.el('compass');
    if (!e) return;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const deg = ((heading * 180 / Math.PI) % 360 + 360) % 360;
    e.textContent = dirs[Math.round(deg / 45) % 8] + ' ' + Math.round(deg) + '°';
  }

  setObjective(text) { const e = this.el('objective'); if (e) e.textContent = text; }

  message(text) {
    const e = this.el('msg');
    if (!e) return;
    e.textContent = text;
    e.style.opacity = 1;
    this._msgT = 4;
  }

  update(dt) {
    if (this._starFlash > 0) this._starFlash -= dt;
    if (this._msgT > 0) {
      this._msgT -= dt;
      if (this._msgT <= 0) {
        const e = this.el('msg');
        if (e) e.style.opacity = 0;
      }
    }
  }

  // Live minimap: roads, player arrow, pulsing objective ring, cops, cars, enemies.
  drawMinimap(data, time) {
    const c = this.mapCtx;
    if (!c) return;
    const W = this.map.width, H = this.map.height;
    const scale = W / 500; // show a 500 m window around the player
    const px = data.player.x, pz = data.player.z;
    c.fillStyle = 'rgba(8,12,20,0.85)';
    c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(140,150,170,0.5)';
    c.lineWidth = 1;
    // Road grid (only the streets near the player).
    for (let s = -900; s <= 900; s += CFG.streetStep) {
      const sx = W / 2 + (s - px) * scale;
      const sz = H / 2 + (s - pz) * scale;
      if (sx >= -10 && sx <= W + 10) { c.beginPath(); c.moveTo(sx, 0); c.lineTo(sx, H); c.stroke(); }
      if (sz >= -10 && sz <= H + 10) { c.beginPath(); c.moveTo(0, sz); c.lineTo(W, sz); c.stroke(); }
    }
    const toMap = (x, z) => [W / 2 + (x - px) * scale, H / 2 + (z - pz) * scale];
    // Objective: pulsing ring + distance.
    if (data.objective) {
      const [ox, oy] = toMap(data.objective.x, data.objective.z);
      const pulse = 6 + Math.sin(time * 4) * 3;
      c.strokeStyle = '#ffd23e';
      c.lineWidth = 2;
      c.beginPath(); c.arc(ox, oy, pulse + 6, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#ffd23e';
      c.beginPath(); c.arc(ox, oy, 3, 0, Math.PI * 2); c.fill();
      if (data.objectiveDist != null) {
        c.fillStyle = '#fff';
        c.font = '11px Arial';
        c.fillText(Math.round(data.objectiveDist) + 'm', ox + 10, oy - 8);
      }
    }
    // Traffic cars: white dots. Cops: red dots. Enemies: orange dots.
    c.fillStyle = '#ffffff';
    for (const car of data.cars || []) {
      const [x, y] = toMap(car.x, car.z);
      c.fillRect(x - 1, y - 1, 2, 2);
    }
    c.fillStyle = '#ff3344';
    for (const cop of data.cops || []) {
      const [x, y] = toMap(cop.x, cop.z);
      c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#ff8c1a';
    for (const en of data.enemies || []) {
      const [x, y] = toMap(en.x, en.z);
      c.beginPath(); c.arc(x, y, 2.5, 0, Math.PI * 2); c.fill();
    }
    // Player arrow.
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(-data.heading);
    c.fillStyle = '#37e0ff';
    c.beginPath();
    c.moveTo(0, -8); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill();
    c.restore();
    // North tick.
    c.fillStyle = '#fff';
    c.font = 'bold 11px Arial';
    c.fillText('N', W - 14, 14);
  }

  // Missions menu: 10 story + 8 side rows. Returns nothing; main reads clicks.
  renderMissions(missions, onPick) {
    const list = this.el('mission-list');
    if (!list) return;
    list.innerHTML = '';
    const mk = (label, sub, cb, done) => {
      const row = document.createElement('div');
      row.className = 'mission-row' + (done ? ' done' : '');
      row.textContent = label + ' — ' + sub;
      row.addEventListener('click', cb);
      list.appendChild(row);
    };
    STORY.forEach((m, i) => {
      const state = missions.finishedStory ? 'DONE' : i < missions.storyIndex ? 'DONE' : i === missions.storyIndex ? 'CURRENT' : 'LOCKED';
      mk(`M${m.id} ${m.name}`, state, () => { if (i === missions.storyIndex) { missions.startStory(i); onPick(); } }, i < missions.storyIndex);
    });
    SIDE.forEach((m) => {
      const done = missions.sideDone.has(m.id);
      mk(`★ ${m.name}`, done ? 'DONE' : 'SIDE', () => { if (!done) { missions.startSide(m.id); onPick(); } }, done);
    });
  }

  showOverlay(id, show) {
    const e = this.el(id);
    if (e) e.style.display = show ? 'flex' : 'none';
  }
}
