// HUD: health, money, rep, wanted stars, speed, compass, objective, radio, minimap.
import { STORY_MISSIONS, SIDE_MISSIONS } from './config.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    hud: $('hud'), health: $('health'), money: $('money'), rep: $('rep'),
    stars: $('stars'), speed: $('speed'), objective: $('objective'),
    compass: $('compass'), flash: $('flash'), minimap: $('minimap'),
    title: $('title'), menu: $('menu'), menuList: $('menu-list'),
    pause: $('pause'), radio: $('radio'),
  };
  const ctx2d = els.minimap.getContext('2d');
  let flashTimer = null;
  function flash(text) {
    els.flash.textContent = text;
    els.flash.style.opacity = 1;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { els.flash.style.opacity = 0; }, 2600);
  }
  function showHud() { els.hud.classList.add('on'); }
  function update(state) {
    els.health.style.width = `${Math.max(0, state.health)}%`;
    els.money.textContent = `$${state.money.toLocaleString()}`;
    els.rep.textContent = `REP ${state.rep}`;
    els.stars.textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
    els.stars.classList.toggle('hot', state.wanted > 0);
    els.speed.textContent = `${Math.round(state.speedKmh)} km/h`;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(((state.yaw % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 4)) % 8;
    els.compass.textContent = dirs[idx];
    els.objective.textContent = state.objective + (state.objDist != null ? ` — ${Math.round(state.objDist)}m` : '');
    els.radio.textContent = state.radio === 0 ? 'RADIO: OFF' : state.radio === 1 ? 'RADIO: Vice FM' : 'RADIO: Bay Jazz';
    if (state.weapon) {
      const w = state.weapon;
      els.speed.textContent = `${Math.round(state.speedKmh)} km/h · ${w.name} ${w.mag === Infinity ? '∞' : w.mag + '/' + w.ammo}`;
    }
  }
  function drawMinimap(px, pz, yaw, objective, cars, peds, cops, heli) {
    const c = ctx2d;
    const S = 180;
    const half = 1000;
    c.clearRect(0, 0, S, S);
    c.fillStyle = 'rgba(8,12,20,0.85)';
    c.fillRect(0, 0, S, S);
    const toMap = (x, z) => [(x + half) / (half * 2) * S, (z + half) / (half * 2) * S];
    // Roads.
    c.strokeStyle = '#3a4152';
    c.lineWidth = 2;
    for (let i = -4; i <= 4; i++) {
      const p = (i * 200 + half) / (half * 2) * S;
      c.beginPath(); c.moveTo(p, 0); c.lineTo(p, S); c.stroke();
      c.beginPath(); c.moveTo(0, p); c.lineTo(S, p); c.stroke();
    }
    // Beach (west edge).
    c.fillStyle = '#8a7a4a';
    c.fillRect(0, 0, 8, S);
    // Objective ring (pulsing).
    if (objective) {
      const [ox, oy] = toMap(objective.x, objective.z);
      const pulse = 5 + Math.sin(performance.now() * 0.006) * 2.5;
      c.strokeStyle = '#ffe066';
      c.lineWidth = 2.5;
      c.beginPath(); c.arc(ox, oy, pulse + 4, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#ffe066';
      c.beginPath(); c.arc(ox, oy, 3, 0, Math.PI * 2); c.fill();
    }
    // Traffic dots.
    c.fillStyle = '#9fb2cc';
    for (const car of cars) {
      const [x, y] = toMap(car.pos.x, car.pos.z);
      c.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    // Ped dots.
    c.fillStyle = '#7fd95f';
    for (const p of peds) {
      const [x, y] = toMap(p.x, p.z);
      c.fillRect(x - 1, y - 1, 2, 2);
    }
    // Cop dots.
    c.fillStyle = '#ff4444';
    for (const car of cops) {
      const [x, y] = toMap(car.pos.x, car.pos.z);
      c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill();
    }
    if (heli) {
      const [x, y] = toMap(heli.position.x, heli.position.z);
      c.fillStyle = '#ff8844';
      c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
    }
    // Player arrow.
    const [mx, my] = toMap(px, pz);
    c.save();
    c.translate(mx, my);
    c.rotate(Math.atan2(Math.sin(yaw), Math.cos(yaw)) + Math.PI);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath();
    c.fill();
    c.restore();
  }
  function buildMenu() {
    els.menuList.innerHTML = '';
    const addHead = (t) => {
      const row = document.createElement('div');
      row.className = 'menu-head';
      row.innerHTML = `<b>${t}</b>`;
      els.menuList.appendChild(row);
    };
    const addRow = (t, d) => {
      const row = document.createElement('div');
      row.className = 'menu-row';
      row.innerHTML = `<b>${t}</b><span>${d}</span>`;
      els.menuList.appendChild(row);
    };
    addHead('— STORY —');
    for (const m of STORY_MISSIONS) addRow(m.name, m.desc);
    addHead('— SIDE —');
    for (const m of SIDE_MISSIONS) addRow(m.name, m.desc);
  }
  buildMenu();
  return {
    flash, update, drawMinimap, showHud, buildMenu,
    showTitle: () => { els.title.style.display = 'flex'; },
    hideTitle: () => { els.title.style.display = 'none'; },
    showMenu: () => { els.menu.style.display = 'flex'; },
    hideMenu: () => { els.menu.style.display = 'none'; },
    showPause: () => { els.pause.style.display = 'flex'; },
    hidePause: () => { els.pause.style.display = 'none'; },
    titleVisible: () => els.title.style.display !== 'none',
    menuVisible: () => els.menu.style.display === 'flex',
  };
}
