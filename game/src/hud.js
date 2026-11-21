// Vice Bay: Blood & Destiny — the HUD: health, money, wanted stars, clock, mission
// text and a live minimap. All DOM lives in index.html; this module only writes to it,
// so the game keeps working even if a HUD element is missing.

import { DISTRICTS, WORLD } from './config.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  const healthFill = el('health-fill');
  const healthText = el('health-text');
  const moneyText = el('money-text');
  const starsEl = el('stars');
  const clockEl = el('clock');
  const missionEl = el('mission-text');
  const toastEl = el('toast');
  const minimap = el('minimap');
  const mapCtx = minimap ? minimap.getContext('2d') : null;
  let toastTimer = 0;

  function setHealth(hp) {
    const pct = Math.max(0, Math.min(100, hp));
    if (healthFill) healthFill.style.width = `${pct}%`;
    if (healthFill) healthFill.style.background = pct > 50 ? '#3fae5a' : pct > 25 ? '#e8a33c' : '#d23c2e';
    if (healthText) healthText.textContent = `${Math.ceil(pct)}`;
  }

  function setMoney(n) {
    if (moneyText) moneyText.textContent = `$${Math.floor(n).toLocaleString('en-US')}`;
  }

  function setWanted(stars) {
    if (!starsEl) return;
    starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(Math.max(0, 5 - stars));
    starsEl.style.color = stars >= 3 ? '#ff5a4a' : '#ffd94a';
  }

  function setClock(text, night) {
    if (clockEl) {
      clockEl.textContent = text;
      clockEl.style.color = night ? '#9db8e8' : '#ffffff';
    }
  }

  function setMission(text) {
    if (missionEl) missionEl.textContent = text;
  }

  function toast(text, ms) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.style.opacity = '1';
    toastTimer = ms ?? 2600;
  }

  function update(dt) {
    if (toastTimer > 0) {
      toastTimer -= dt * 1000;
      if (toastTimer <= 0 && toastEl) toastEl.style.opacity = '0';
    }
  }

  function drawMinimap(playerPos, target, policePos, carPos) {
    if (!mapCtx || !minimap) return;
    const s = minimap.width;
    const scale = s / WORLD.size;
    const toMap = (x, z) => [(x + WORLD.half) * scale, (z + WORLD.half) * scale];
    mapCtx.fillStyle = 'rgba(10, 16, 26, 0.82)';
    mapCtx.fillRect(0, 0, s, s);
    // District tints.
    for (const d of DISTRICTS) {
      if (d.ring) continue;
      const [x, y] = toMap(d.x - d.w / 2, d.z - d.h / 2);
      mapCtx.fillStyle = `#${d.color.toString(16).padStart(6, '0')}55`;
      mapCtx.fillRect(x, y, d.w * scale, d.h * scale);
    }
    // Roads.
    mapCtx.strokeStyle = '#5a6068';
    mapCtx.lineWidth = 1;
    for (let c = -WORLD.half; c <= WORLD.half; c += WORLD.roadGap) {
      const [x1] = toMap(c, 0);
      const [, y1] = toMap(0, c);
      mapCtx.beginPath(); mapCtx.moveTo(x1, 0); mapCtx.lineTo(x1, s); mapCtx.stroke();
      mapCtx.beginPath(); mapCtx.moveTo(0, y1); mapCtx.lineTo(s, y1); mapCtx.stroke();
    }
    // Mission target.
    if (target) {
      const [x, y] = toMap(target.x, target.z);
      mapCtx.fillStyle = '#ffd94a';
      mapCtx.beginPath(); mapCtx.arc(x, y, 5, 0, Math.PI * 2); mapCtx.fill();
      mapCtx.strokeStyle = '#ffd94a';
      mapCtx.beginPath(); mapCtx.arc(x, y, 9, 0, Math.PI * 2); mapCtx.stroke();
    }
    // Police.
    mapCtx.fillStyle = '#4a7dff';
    for (const p of policePos || []) {
      const [x, y] = toMap(p.x, p.z);
      mapCtx.fillRect(x - 2, y - 2, 4, 4);
    }
    // The player's car.
    if (carPos) {
      const [x, y] = toMap(carPos.x, carPos.z);
      mapCtx.fillStyle = '#7dff8a';
      mapCtx.fillRect(x - 2, y - 2, 4, 4);
    }
    // The player: a white dot with a direction tick.
    const [px, py] = toMap(playerPos.x, playerPos.z);
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath(); mapCtx.arc(px, py, 3.5, 0, Math.PI * 2); mapCtx.fill();
  }

  return { setHealth, setMoney, setWanted, setClock, setMission, toast, update, drawMinimap };
}
