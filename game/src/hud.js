// DOM HUD: health, money, rep, wanted stars, speed, compass, objective, minimap.
export function createHud() {
  const $ = (id) => document.getElementById(id);
  const el = {
    hud: $('hud'), health: $('health'), money: $('money'), rep: $('rep'),
    stars: $('stars'), speed: $('speed'), objective: $('objective'),
    compass: $('compass'), flash: $('flash'), minimap: $('minimap'),
    title: $('title'), menu: $('menu'), menuList: $('menu-list'),
    pause: $('pause'), storyList: $('story-list'), sideList: $('side-list'),
  };
  const mapCtx = el.minimap.getContext('2d');
  let flashTimer = null;

  function flash(text) {
    el.flash.textContent = text;
    el.flash.style.opacity = '1';
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.flash.style.opacity = '0'; }, 2600);
  }

  function update(ctx) {
    el.health.style.width = `${Math.max(0, ctx.health)}%`;
    el.health.style.background = ctx.health > 50 ? '#37c24a' : ctx.health > 25 ? '#e8a020' : '#d83838';
    el.money.textContent = `$${Math.floor(ctx.money).toLocaleString()}`;
    el.rep.textContent = `REP ${ctx.rep}`;
    el.stars.textContent = '★'.repeat(ctx.police.wanted) + '☆'.repeat(5 - ctx.police.wanted);
    el.stars.classList.toggle('hot', ctx.police.wanted > 0);
    const speed = ctx.player.inCar ? Math.abs(ctx.player.inCar.speed) * 3.6 : 0;
    el.speed.textContent = `${Math.round(speed)} km/h`;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const yaw = ctx.camYaw || 0;
    const idx = Math.round(((yaw % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 4)) % 8;
    el.compass.textContent = dirs[idx];
    const obj = ctx.missions.objectivePos();
    const px = ctx.player.pos.x;
    const pz = ctx.player.pos.z;
    const dist = obj ? Math.round(Math.hypot(obj.x - px, obj.z - pz)) : 0;
    el.objective.textContent = `${ctx.missions.objectiveText()} — ${dist}m`;
  }

  function drawMinimap(px, pz, yaw, objective, cars, peds, cops) {
    const W = 180;
    const H = 180;
    const scale = W / 2000;
    mapCtx.clearRect(0, 0, W, H);
    mapCtx.fillStyle = 'rgba(10,16,24,0.85)';
    mapCtx.fillRect(0, 0, W, H);
    // Roads.
    mapCtx.strokeStyle = 'rgba(200,200,200,0.5)';
    mapCtx.lineWidth = 2;
    for (let c = -900; c < 1000; c += 200) {
      const s = (c + 1000) * scale;
      mapCtx.beginPath(); mapCtx.moveTo(s, 0); mapCtx.lineTo(s, H); mapCtx.stroke();
      mapCtx.beginPath(); mapCtx.moveTo(0, s); mapCtx.lineTo(W, s); mapCtx.stroke();
    }
    // Beach.
    mapCtx.fillStyle = 'rgba(203,178,127,0.7)';
    mapCtx.fillRect(0, 0, 12, H);
    // Objective: pulsing ring.
    if (objective) {
      const ox = (objective.x + 1000) * scale;
      const oy = (objective.z + 1000) * scale;
      const r = 6 + Math.sin(Date.now() / 250) * 2.5;
      mapCtx.strokeStyle = '#ffd020';
      mapCtx.lineWidth = 2;
      mapCtx.beginPath(); mapCtx.arc(ox, oy, r, 0, Math.PI * 2); mapCtx.stroke();
      mapCtx.fillStyle = '#ffd020';
      mapCtx.beginPath(); mapCtx.arc(ox, oy, 3, 0, Math.PI * 2); mapCtx.fill();
    }
    const dot = (x, z, color, size) => {
      mapCtx.fillStyle = color;
      mapCtx.beginPath();
      mapCtx.arc((x + 1000) * scale, (z + 1000) * scale, size, 0, Math.PI * 2);
      mapCtx.fill();
    };
    for (const c of cars || []) dot(c.pos.x, c.pos.z, '#c8c8c8', 2);
    for (const p of peds || []) dot(p.x, p.z, '#7ad07a', 1.5);
    for (const c of cops || []) dot(c.pos.x, c.pos.z, '#ff4040', 2.5);
    // Player arrow.
    const pxx = (px + 1000) * scale;
    const pzz = (pz + 1000) * scale;
    mapCtx.save();
    mapCtx.translate(pxx, pzz);
    mapCtx.rotate(yaw);
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -6); mapCtx.lineTo(4, 5); mapCtx.lineTo(-4, 5); mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  function showHud() { el.hud.classList.add('on'); }
  function showTitle(canContinue) {
    el.title.style.display = 'flex';
    const cont = document.getElementById('btn-continue');
    if (cont) cont.style.display = canContinue ? 'block' : 'none';
  }
  function hideTitle() { el.title.style.display = 'none'; }
  function showMenu(missions) {
    el.menu.style.display = 'flex';
    el.menuList.innerHTML = '';
    const rows = [];
    missions.storyMissions.forEach((m, i) => {
      rows.push({ text: `${i + 1}. ${m.name} — ${i < missions.storyIndex ? 'DONE' : i === missions.storyIndex ? 'ACTIVE' : 'LOCKED'}`, done: i < missions.storyIndex });
    });
    missions.sideMissions.forEach((s) => rows.push({ text: `★ ${s.name} — $${s.reward}`, done: false }));
    for (const r of rows) {
      const div = document.createElement('div');
      div.className = 'menu-row' + (r.done ? ' done' : '');
      div.textContent = r.text;
      el.menuList.appendChild(div);
    }
  }
  function hideMenu() { el.menu.style.display = 'none'; }
  function showPause(v) { el.pause.style.display = v ? 'flex' : 'none'; }

  return { flash, update, drawMinimap, showHud, showTitle, hideTitle, showMenu, hideMenu, showPause, el };
}
