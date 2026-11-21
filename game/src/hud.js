// HUD: money, health, wanted stars, clock, mission objective, minimap and
// the mission menu. All DOM, drawn over the Three.js canvas.

import { DISTRICTS } from './config.js';
import { MAIN_MISSIONS, SIDE_MISSIONS, nextMainMission, startMission } from './missions.js';
import { pressed } from './input.js';

function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.appendChild(e);
  return e;
}

export function createHud(G) {
  const root = el('div', 'hud', document.getElementById('app'));
  const topLeft = el('div', 'hud-tl', root);
  const moneyEl = el('div', 'hud-money', topLeft);
  const healthWrap = el('div', 'hud-health', topLeft);
  el('span', '', healthWrap).textContent = '♥ ';
  const healthBar = el('div', 'hud-healthbar', healthWrap);
  const healthFill = el('div', 'hud-healthfill', healthBar);
  const topRight = el('div', 'hud-tr', root);
  const starsEl = el('div', 'hud-stars', topRight);
  const clockEl = el('div', 'hud-clock', topRight);
  const districtEl = el('div', 'hud-district', topRight);
  const objective = el('div', 'hud-objective', root);
  const objTitle = el('div', 'hud-obj-title', objective);
  const objStep = el('div', 'hud-obj-step', objective);
  const flashEl = el('div', 'hud-flash', root);
  const hintEl = el('div', 'hud-hint', root);
  const cross = el('div', 'hud-cross', root);
  cross.textContent = '+';
  const mapWrap = el('div', 'hud-mapwrap', root);
  const mapCanvas = el('canvas', 'hud-map', mapWrap);
  mapCanvas.width = 200;
  mapCanvas.height = 200;
  const helpEl = el('div', 'hud-help', root);
  helpEl.innerHTML = 'WASD move &nbsp;·&nbsp; E car &nbsp;·&nbsp; F punch &nbsp;·&nbsp; Click shoot &nbsp;·&nbsp; M missions &nbsp;·&nbsp; P pause';
  const menuBtn = el('button', 'hud-menubtn', root);
  menuBtn.textContent = 'MISSIONS (M)';
  const menu = el('div', 'hud-menu', root);
  menu.style.display = 'none';
  const menuTitle = el('h2', '', menu);
  menuTitle.textContent = 'Vice Bay — Missions';
  const menuList = el('div', 'hud-menulist', menu);
  const menuClose = el('button', 'hud-menuclose', menu);
  menuClose.textContent = 'Close (M)';
  menuClose.onclick = () => { menu.style.display = 'none'; };
  menuBtn.onclick = () => toggleMenu();

  function toggleMenu() {
    const show = menu.style.display === 'none';
    menu.style.display = show ? 'block' : 'none';
    if (show) renderMenu();
  }

  function renderMenu() {
    menuList.innerHTML = '';
    const next = nextMainMission(G);
    const mk = (m, locked, note) => {
      const row = el('div', 'hud-mrow', menuList);
      const t = el('div', 'hud-mtitle', row);
      t.textContent = `${m.title} — ${m.giver} · $${m.reward}`;
      const d = el('div', 'hud-mdesc', row);
      d.textContent = m.desc;
      const b = el('button', 'hud-mbtn', row);
      if (locked) {
        b.textContent = note || 'Locked';
        b.disabled = true;
      } else if (G.missionsDone.includes(m.id)) {
        b.textContent = 'Done ✓';
        b.disabled = true;
      } else {
        b.textContent = G.activeMission && G.activeMission.id === m.id ? 'Active' : 'Start';
        b.disabled = !!G.activeMission;
        b.onclick = () => {
          if (startMission(G, m.id)) {
            menu.style.display = 'none';
          }
        };
      }
    };
    el('h3', '', menuList).textContent = 'Story';
    for (const m of MAIN_MISSIONS) mk(m, next ? m.id !== next.id : true, 'Finish the story in order');
    el('h3', '', menuList).textContent = 'Side jobs';
    for (const m of SIDE_MISSIONS) mk(m, false);
  }

  let flashTimer = null;
  let hintTimer = null;
  const hud = {
    flash(text) {
      flashEl.textContent = text;
      flashEl.style.opacity = '1';
      if (flashTimer) clearTimeout(flashTimer);
      flashTimer = setTimeout(() => { flashEl.style.opacity = '0'; }, 3600);
    },
    hint(text) {
      hintEl.textContent = text;
      hintEl.style.opacity = '1';
      if (hintTimer) clearTimeout(hintTimer);
      hintTimer = setTimeout(() => { hintEl.style.opacity = '0'; }, 2400);
    },
    toggleMenu,
    update(dt) {
      moneyEl.textContent = `$${Math.floor(G.money).toLocaleString('en-US')}`;
      healthFill.style.width = `${Math.max(0, G.health)}%`;
      const stars = '★'.repeat(G.wanted) + '☆'.repeat(5 - G.wanted);
      starsEl.textContent = stars;
      starsEl.style.color = G.wanted > 0 ? '#ff5252' : '#e0e0e0';
      const hh = Math.floor(G.time);
      const mm = Math.floor((G.time - hh) * 60);
      clockEl.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      const d = DISTRICTS.find((x) => {
        const b = x.bounds;
        return G.player.x >= b[0] && G.player.x <= b[1] && G.player.z >= b[2] && G.player.z <= b[3];
      });
      districtEl.textContent = d ? d.name : 'Vice Bay';
      if (G.activeMission) {
        const step = G.activeMission.steps[G.missionStep];
        objTitle.textContent = `${G.activeMission.title} — $${G.activeMission.reward}`;
        let dist = '';
        if (step && step.x !== undefined) {
          const dd = Math.round(Math.hypot(G.player.x - step.x, G.player.z - step.z));
          dist = ` · ${dd}m`;
        }
        objStep.textContent = (step ? step.label : '') + dist;
        objective.style.display = 'block';
      } else {
        const next = nextMainMission(G);
        objTitle.textContent = next ? `Next: ${next.title}` : 'Story complete — Vice Bay is yours';
        objStep.textContent = 'Press M for missions';
        objective.style.display = 'block';
      }
      if (pressed(G, 'KeyM')) toggleMenu();
      this.drawMap();
    },
    drawMap() {
      const ctx = mapCanvas.getContext('2d');
      const S = 200;
      const sc = S / 2000;
      const px = (v) => (v + 1000) * sc;
      ctx.clearRect(0, 0, S, S);
      ctx.fillStyle = '#0e1a24';
      ctx.fillRect(0, 0, S, S);
      for (const dist of DISTRICTS) {
        const b = dist.bounds;
        ctx.fillStyle = dist.ground;
        ctx.fillRect(px(b[0]), px(b[2]), (b[1] - b[0]) * sc, (b[3] - b[2]) * sc);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      for (let v = -900; v <= 900; v += 200) {
        ctx.beginPath(); ctx.moveTo(px(v), 0); ctx.lineTo(px(v), S); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, px(v)); ctx.lineTo(S, px(v)); ctx.stroke();
      }
      // mission target
      if (G.activeMission) {
        const step = G.activeMission.steps[G.missionStep];
        if (step && step.x !== undefined) {
          ctx.fillStyle = '#ffd54f';
          ctx.beginPath();
          ctx.arc(px(step.x), px(step.z), 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.beginPath();
          ctx.arc(px(step.x), px(step.z), 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      for (const t of G.traffic) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(px(t.x) - 1, px(t.z) - 1, 2, 2);
      }
      for (const c of G.police) {
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(px(c.x), px(c.z), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // player arrow
      const p = G.player;
      ctx.save();
      ctx.translate(px(p.x), px(p.z));
      ctx.rotate(Math.atan2(Math.sin(p.yaw), Math.cos(p.yaw)) + Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 6);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // north tick
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('N', 4, 12);
    },
  };
  G.hud = hud;
  return hud;
}
