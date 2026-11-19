// The HUD: health bar, money, reputation, wanted stars, speed, compass,
// mission objective with a live distance to the marker, toasts, briefing
// panel, shop and pause panels — all DOM over the 3D canvas — plus the live
// minimap drawn on a 2D canvas every frame. The DOM is only rewritten when
// a value actually changes, so the HUD costs almost nothing per frame. The
// wanted stars flash while the heat is fresh (G.crimeFlash), so a new star
// is impossible to miss. Round 3: the DOM sync is one small setter per
// field, and the minimap layers are drawn in order: districts, roads, sea,
// markers, then the player arrow.
import { DISTRICTS } from './config.js';

const MINIMAP_SIZE = 190;
const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function setText(id, value) {
  const el = document.getElementById(id);
  if (el.textContent !== value) el.textContent = value;
}

export function createHud(G) {
  const root = document.getElementById('hud');
  const minimap = document.getElementById('minimap');
  const mctx = minimap.getContext('2d');
  const scale = MINIMAP_SIZE / 1000;
  const toMap = (v) => (v + 500) * scale;

  function paintDistricts() {
    for (const d of DISTRICTS) {
      if (d.id === 'highway') continue;
      const fill = d.id === 'beach' ? '#c9ae72' : d.id === 'port' ? '#6b5d4f' : d.id === 'airport' ? '#3a3f44' : '#2c3a2e';
      mctx.fillStyle = fill;
      mctx.fillRect(toMap(d.x0), toMap(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
    }
  }

  function paintRoads() {
    mctx.strokeStyle = '#5a6068';
    mctx.lineWidth = 2;
    for (let c = -400; c <= 400; c += 100) {
      mctx.beginPath(); mctx.moveTo(toMap(c), 0); mctx.lineTo(toMap(c), MINIMAP_SIZE); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(0, toMap(c)); mctx.lineTo(MINIMAP_SIZE, toMap(c)); mctx.stroke();
    }
    // Sea on the east edge.
    mctx.fillStyle = '#1e6f8e';
    mctx.fillRect(MINIMAP_SIZE - 10, 0, 20, MINIMAP_SIZE);
  }

  function dot(x, z, color, r = 4) {
    mctx.fillStyle = color;
    mctx.beginPath();
    mctx.arc(toMap(x), toMap(z), r, 0, Math.PI * 2);
    mctx.fill();
  }

  function paintMarkers() {
    // Mission marker pulses: a yellow ring around the gold dot.
    if (G.missionTarget) {
      const pulse = 5 + Math.sin(G.time * 6) * 2.5;
      mctx.strokeStyle = '#ffd23f';
      mctx.lineWidth = 2;
      mctx.beginPath();
      mctx.arc(toMap(G.missionTarget.x), toMap(G.missionTarget.z), pulse, 0, Math.PI * 2);
      mctx.stroke();
      dot(G.missionTarget.x, G.missionTarget.z, '#ffd23f', 5);
    }
    if (G.sideTarget) dot(G.sideTarget.x, G.sideTarget.z, '#2ec4b6', 5);
    for (const cop of G.police) dot(cop.x, cop.z, '#3a86ff', 3);
    for (const e of G.enemies) if (e.alive) dot(e.x, e.z, '#ff3b30', 3);
  }

  function paintPlayerArrow() {
    const focus = G.currentVehicle || G.player;
    mctx.save();
    mctx.translate(toMap(focus.x), toMap(focus.z));
    mctx.rotate(-focus.yaw + Math.PI);
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.moveTo(0, -7);
    mctx.lineTo(5, 6);
    mctx.lineTo(-5, 6);
    mctx.closePath();
    mctx.fill();
    mctx.restore();
    mctx.fillStyle = '#ffffff';
    mctx.font = 'bold 11px system-ui, sans-serif';
    mctx.fillText('N', 4, 13);
  }

  function drawMinimap() {
    mctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    mctx.fillStyle = 'rgba(10, 16, 24, 0.85)';
    mctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    paintDistricts();
    paintRoads();
    paintMarkers();
    paintPlayerArrow();
  }

  function compassOf() {
    const yaw = -G.playerYaw();
    const idx = Math.round((((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
    return COMPASS_POINTS[idx];
  }

  function objectiveText() {
    let text = G.missionText;
    const target = G.missionTarget || G.sideTarget;
    if (target) {
      // Live distance to the objective, in metres (1 unit ~ 2 m).
      const focus = G.currentVehicle || G.player;
      const metres = Math.round(Math.hypot(target.x - focus.x, target.z - focus.z) * 2);
      text += ' · ' + metres + 'm';
    }
    return text;
  }

  let lastState = '';
  function update() {
    const speed = G.currentVehicle ? Math.abs(G.currentVehicle.speed) * 3.6 : G.player.speed * 3.6;
    const stars = '★'.repeat(G.wanted) + '☆'.repeat(5 - G.wanted);
    const compass = compassOf();
    const districtName = G.currentDistrict ? G.currentDistrict.name : 'Vice Bay';
    const objective = objectiveText();
    const flashing = G.crimeFlash > 0 && G.wanted > 0;
    const weapon = G.combat ? G.combat.weapon : '';
    const ammo = G.combat ? (G.combat.ammo[G.combat.weapon] ?? '∞') : '';
    const state = [
      G.player.health, Math.floor(G.money), G.rep, stars, Math.round(speed),
      compass, districtName, objective, G.currentVehicle ? G.currentVehicle.type.name : 'On foot',
      weapon, ammo, G.interactPrompt || '', flashing ? 'flash' : '',
    ].join('|');
    if (state !== lastState) {
      lastState = state;
      const health = Math.max(0, G.player.health);
      const fill = document.getElementById('health-fill');
      fill.style.width = health + '%';
      fill.style.background = health < 30 ? '#e74c3c' : 'linear-gradient(90deg, #27ae60, #2ecc71)';
      setText('health-num', String(Math.ceil(health)));
      setText('money', '$' + Math.floor(G.money).toLocaleString('en-US'));
      setText('rep', 'REP ' + G.rep);
      const starsEl = document.getElementById('stars');
      starsEl.textContent = stars;
      starsEl.style.color = G.wanted > 0 ? '#ffd23f' : '#888';
      starsEl.classList.toggle('flash', flashing);
      setText('speed', Math.round(speed) + ' km/h');
      setText('compass', compass + ' · ' + districtName);
      setText('objective', objective);
      setText('vehicle-name', G.currentVehicle
        ? G.currentVehicle.type.name + (G.currentVehicle.health < 100 ? ' — ' + Math.max(0, Math.ceil(G.currentVehicle.health)) + '%' : '')
        : 'On foot');
      setText('weapon', G.combat ? (weapon.toUpperCase() + ' · ' + ammo) : '');
      setText('interact', G.interactPrompt || '');
      setText('time', G.clockText());
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
