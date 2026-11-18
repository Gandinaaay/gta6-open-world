// The HUD: health bar, money, reputation, wanted stars, speed, compass, mission
// objective with a live distance to the marker, toasts, briefing panel, shop and
// pause panels — all DOM over the 3D canvas — plus the live minimap drawn on a
// 2D canvas every frame. DOM text is only rewritten when its value actually
// changes, so the HUD costs almost nothing per frame.
import { DISTRICTS } from './config.js';

export function createHud(G) {
  const root = document.getElementById('hud');
  const minimap = document.getElementById('minimap');
  const mctx = minimap.getContext('2d');

  function drawMinimap() {
    const S = 190;
    const scale = S / 1000;
    mctx.clearRect(0, 0, S, S);
    mctx.fillStyle = 'rgba(10, 16, 24, 0.85)';
    mctx.fillRect(0, 0, S, S);
    // District blocks.
    for (const d of DISTRICTS) {
      if (d.id === 'highway') continue;
      mctx.fillStyle = d.id === 'beach' ? '#c9ae72' : d.id === 'port' ? '#6b5d4f' : d.id === 'airport' ? '#3a3f44' : '#2c3a2e';
      mctx.fillRect((d.x0 + 500) * scale, (d.z0 + 500) * scale, (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
    }
    // Roads.
    mctx.strokeStyle = '#5a6068';
    mctx.lineWidth = 2;
    for (let c = -400; c <= 400; c += 100) {
      mctx.beginPath(); mctx.moveTo((c + 500) * scale, 0); mctx.lineTo((c + 500) * scale, S); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(0, (c + 500) * scale); mctx.lineTo(S, (c + 500) * scale); mctx.stroke();
    }
    // Sea on the east edge.
    mctx.fillStyle = '#1e6f8e';
    mctx.fillRect((500 + 500) * scale - 10, 0, 20, S);
    const dot = (x, z, color, r = 4) => {
      mctx.fillStyle = color;
      mctx.beginPath();
      mctx.arc((x + 500) * scale, (z + 500) * scale, r, 0, Math.PI * 2);
      mctx.fill();
    };
    // Mission marker pulses: a yellow ring around the gold dot.
    if (G.missionTarget) {
      const pulse = 5 + Math.sin(G.time * 6) * 2.5;
      mctx.strokeStyle = '#ffd23f';
      mctx.lineWidth = 2;
      mctx.beginPath();
      mctx.arc((G.missionTarget.x + 500) * scale, (G.missionTarget.z + 500) * scale, pulse, 0, Math.PI * 2);
      mctx.stroke();
      dot(G.missionTarget.x, G.missionTarget.z, '#ffd23f', 5);
    }
    if (G.sideTarget) dot(G.sideTarget.x, G.sideTarget.z, '#2ec4b6', 5);
    for (const cop of G.police) dot(cop.x, cop.z, '#3a86ff', 3);
    for (const e of G.enemies) if (e.alive) dot(e.x, e.z, '#ff3b30', 3);
    const px = G.currentVehicle ? G.currentVehicle.x : G.player.x;
    const pz = G.currentVehicle ? G.currentVehicle.z : G.player.z;
    const yaw = G.currentVehicle ? G.currentVehicle.yaw : G.player.yaw;
    // Player arrow, pointing where he faces.
    mctx.save();
    mctx.translate((px + 500) * scale, (pz + 500) * scale);
    mctx.rotate(-yaw + Math.PI);
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.moveTo(0, -7);
    mctx.lineTo(5, 6);
    mctx.lineTo(-5, 6);
    mctx.closePath();
    mctx.fill();
    mctx.restore();
    // North marker.
    mctx.fillStyle = '#ffffff';
    mctx.font = 'bold 11px system-ui, sans-serif';
    mctx.fillText('N', 4, 13);
  }

  let lastHtml = '';
  function update() {
    const speed = G.currentVehicle ? Math.abs(G.currentVehicle.speed) * 3.6 : G.player.speed * 3.6;
    const stars = '★'.repeat(G.wanted) + '☆'.repeat(5 - G.wanted);
    const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((-G.playerYaw()) % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 4)) % 8];
    const district = G.currentDistrict ? G.currentDistrict.name : 'Vice Bay';
    // Live distance to the objective, in metres (1 unit ~ 2 m).
    let objective = G.missionText;
    const target = G.missionTarget || G.sideTarget;
    if (target) {
      const px = G.currentVehicle ? G.currentVehicle.x : G.player.x;
      const pz = G.currentVehicle ? G.currentVehicle.z : G.player.z;
      objective += ' · ' + Math.round(Math.hypot(target.x - px, target.z - pz) * 2) + 'm';
    }
    const html = [
      G.player.health, Math.floor(G.money), G.rep, stars, Math.round(speed),
      compass, district, objective, G.currentVehicle ? G.currentVehicle.type.name : 'On foot',
      G.combat ? G.combat.weapon : '', G.combat ? (G.combat.ammo[G.combat.weapon] ?? '∞') : '',
      G.interactPrompt || '',
    ].join('|');
    if (html !== lastHtml) {
      lastHtml = html;
      document.getElementById('health-fill').style.width = Math.max(0, G.player.health) + '%';
      document.getElementById('health-fill').style.background = G.player.health < 30 ? '#e74c3c' : 'linear-gradient(90deg, #27ae60, #2ecc71)';
      document.getElementById('health-num').textContent = Math.ceil(Math.max(0, G.player.health));
      document.getElementById('money').textContent = '$' + Math.floor(G.money).toLocaleString('en-US');
      document.getElementById('rep').textContent = 'REP ' + G.rep;
      const starsEl = document.getElementById('stars');
      starsEl.textContent = stars;
      starsEl.style.color = G.wanted > 0 ? '#ffd23f' : '#888';
      document.getElementById('speed').textContent = Math.round(speed) + ' km/h';
      document.getElementById('compass').textContent = compass + ' · ' + district;
      document.getElementById('objective').textContent = objective;
      document.getElementById('vehicle-name').textContent = G.currentVehicle ? G.currentVehicle.type.name + (G.currentVehicle.health < 100 ? ' — ' + Math.max(0, Math.ceil(G.currentVehicle.health)) + '%' : '') : 'On foot';
      document.getElementById('weapon').textContent = G.combat ? (G.combat.weapon.toUpperCase() + ' · ' + (G.combat.ammo[G.combat.weapon] ?? '∞')) : '';
      document.getElementById('interact').textContent = G.interactPrompt || '';
      document.getElementById('time').textContent = G.clockText();
    }
    drawMinimap();
  }

  return { update, root };
}

export function showToast(G, message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 3200);
}
