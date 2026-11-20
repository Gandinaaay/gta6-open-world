// HUD: DOM overlay (health, money, rep, wanted stars, speed, compass,
// objective) + a live minimap canvas. Also the title screen and menus.

export function createHud() {
  const root = document.getElementById('hud');
  const el = {};
  for (const id of ['health', 'money', 'rep', 'stars', 'speed', 'objective', 'compass', 'flash', 'title', 'menu', 'menu-list', 'pause']) {
    el[id] = document.getElementById(id);
  }
  const minimap = document.getElementById('minimap');
  const mm = minimap.getContext('2d');

  let flashTimer = 0;

  function stars(n) {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  return {
    setHealth(h) {
      el.health.style.width = `${Math.max(0, Math.min(100, h))}%`;
      el.health.style.background = h > 50 ? '#22c55e' : h > 25 ? '#f59e0b' : '#ef4444';
    },
    setMoney(m) { el.money.textContent = `$${Math.floor(m).toLocaleString('en-US')}`; },
    setRep(r) { el.rep.textContent = `REP ${r}`; },
    setWanted(n, flashOn) {
      el.stars.textContent = stars(n);
      el.stars.style.color = n > 0 ? (flashOn ? '#ffffff' : '#facc15') : '#9ca3af';
    },
    setSpeed(kmh) { el.speed.textContent = `${Math.round(Math.abs(kmh))} km/h`; },
    setObjective(text, dist) {
      el.objective.textContent = dist !== null && dist !== undefined ? `${text} — ${Math.round(dist)}m` : text;
    },
    setCompass(yaw) {
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const deg = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
      el.compass.textContent = dirs[Math.round(deg / 45) % 8];
    },
    flash(text) {
      el.flash.textContent = text;
      el.flash.style.opacity = 1;
      flashTimer = 3;
    },
    update(dt) {
      if (flashTimer > 0) {
        flashTimer -= dt;
        if (flashTimer <= 0) el.flash.style.opacity = 0;
      }
    },
    showTitle(show) { el.title.style.display = show ? 'flex' : 'none'; },
    showPause(show) { el.pause.style.display = show ? 'flex' : 'none'; },
    showMenu(show, rows) {
      el.menu.style.display = show ? 'flex' : 'none';
      if (show && rows) {
        el['menu-list'].innerHTML = rows.map((r) =>
          `<div class="menu-row${r.current ? ' current' : ''}${r.done ? ' done' : ''}">${r.done ? '✓ ' : ''}${r.name} — ${r.desc || ''}</div>`).join('');
      }
    },
    drawMinimap(px, pz, yaw, objective, cars, peds, cops, range = 300) {
      const w = minimap.width, h = minimap.height;
      mm.clearRect(0, 0, w, h);
      mm.fillStyle = 'rgba(10, 15, 25, 0.85)';
      mm.fillRect(0, 0, w, h);
      const scale = w / (range * 2);
      const toMap = (x, z) => [w / 2 + (x - px) * scale, h / 2 + (z - pz) * scale];
      // Roads.
      mm.strokeStyle = '#4b5563';
      mm.lineWidth = 3;
      for (let i = -4; i <= 4; i++) {
        const p = i * 200;
        const [x1, y1] = toMap(p, pz - range);
        const [x2, y2] = toMap(p, pz + range);
        mm.beginPath(); mm.moveTo(x1, y1); mm.lineTo(x2, y2); mm.stroke();
        const [x3, y3] = toMap(px - range, p);
        const [x4, y4] = toMap(px + range, p);
        mm.beginPath(); mm.moveTo(x3, y3); mm.lineTo(x4, y4); mm.stroke();
      }
      // Objective ring (pulsing).
      if (objective) {
        const [ox, oy] = toMap(objective.x, objective.z);
        const pulse = 6 + Math.sin(performance.now() * 0.006) * 3;
        mm.strokeStyle = '#facc15';
        mm.lineWidth = 2;
        mm.beginPath(); mm.arc(ox, oy, pulse, 0, Math.PI * 2); mm.stroke();
        mm.fillStyle = '#facc15';
        mm.beginPath(); mm.arc(ox, oy, 3, 0, Math.PI * 2); mm.fill();
      }
      // Traffic (white), peds (grey), cops (blue/red flashing).
      mm.fillStyle = '#e5e7eb';
      for (const c of cars) { const [x, y] = toMap(c.pos.x, c.pos.z); mm.fillRect(x - 1, y - 1, 2, 2); }
      mm.fillStyle = '#9ca3af';
      for (const p of peds) { const [x, y] = toMap(p.pos.x, p.pos.z); mm.fillRect(x - 1, y - 1, 2, 2); }
      for (const c of cops) {
        const [x, y] = toMap(c.pos.x, c.pos.z);
        mm.fillStyle = Math.floor(performance.now() / 300) % 2 ? '#3b82f6' : '#ef4444';
        mm.beginPath(); mm.arc(x, y, 3, 0, Math.PI * 2); mm.fill();
      }
      // Player arrow.
      mm.save();
      mm.translate(w / 2, h / 2);
      mm.rotate(-yaw);
      mm.fillStyle = '#22c55e';
      mm.beginPath(); mm.moveTo(0, -7); mm.lineTo(5, 6); mm.lineTo(-5, 6); mm.closePath(); mm.fill();
      mm.restore();
    },
  };
}
