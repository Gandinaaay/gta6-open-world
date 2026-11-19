// Save and the economy: localStorage progress, and the four shops — Bay
// Arms (weapons and ammo), Vice Motors (buy cars into your garage), Style
// House (clothes) and the Tuner Garage (vehicle upgrades). The same panel
// serves the shops and the garage; only its title and rows change. The save
// also remembers the time of day and the weather, so Continue resumes the
// same sky you left. Round 3: the save is one field table (key + read +
// write), so adding a field is one row instead of two scattered lines.
import { SAVE_KEY, WEAPONS, VEHICLE_TYPES, CLOTHES, UPGRADES } from './config.js';
import { setShirtColor } from './player.js';
import { spawnVehicle } from './vehicles.js';

// Each row: [save key, read from G, write back into G].
function saveFields(G) {
  return [
    ['money', G.money, (v) => { G.money = v ?? 500; }],
    ['rep', G.rep, (v) => { G.rep = v ?? 0; }],
    ['health', G.player.health, (v) => { G.player.health = v ?? 100; }],
    ['missionIndex', G.missions.missionIndex, (v) => { G.missions.missionIndex = v ?? 0; }],
    ['ownedCars', G.ownedCars, (v) => { G.ownedCars = v ?? ['sedan']; }],
    ['ownedWeapons', G.ownedWeapons, (v) => { G.ownedWeapons = v ?? ['fists', 'pistol']; }],
    ['upgrades', G.upgrades, (v) => { G.upgrades = v ?? {}; }],
    ['shirt', G.player.shirtColor, (v) => { if (v) setShirtColor(G.player, v); }],
    ['ammo', G.combat.ammo, (v) => { G.combat.ammo = v ?? { pistol: 120, smg: 0, shotgun: 0, rifle: 0 }; }],
    ['weapon', G.combat.weapon, (v) => { G.combat.weapon = v ?? 'pistol'; }],
    ['x', G.player.x, (v) => { if (v !== undefined) G.player.x = v; }],
    ['z', G.player.z, (v) => { if (v !== undefined) G.player.z = v; }],
    ['dayTime', G.dayTime, (v) => { if (v !== undefined) G.dayTime = v; }],
    ['weather', G.weather, (v) => { if (v) { G.weather = v; G.rain.visible = v === 'rain'; } }],
    ['settings', G.settings, (v) => { if (v) Object.assign(G.settings, v); }],
  ];
}

export function saveGame(G) {
  try {
    const data = {};
    for (const [key, value] of saveFields(G)) data[key] = value;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Private mode: progress lasts this visit only.
  }
}

export function loadGame(G) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    for (const [key, , apply] of saveFields(G)) apply(d[key]);
    return true;
  } catch {
    return false;
  }
}

// One row in the shop panel: a label and a buy button that is disabled when
// the item is owned or unaffordable, and refreshes the panel after a purchase.
function shopRow(G, shop, list, name, price, owned, onBuy) {
  const row = document.createElement('div');
  row.className = 'shop-row';
  const label = document.createElement('span');
  label.textContent = name;
  const btn = document.createElement('button');
  btn.textContent = owned ? 'OWNED' : '$' + price.toLocaleString('en-US');
  btn.disabled = !!owned || G.money < price;
  btn.onclick = () => {
    if (G.money < price) return;
    G.money -= price;
    onBuy();
    if (G.audio) G.audio.cash();
    openShop(G, shop);
    G.saveGame();
  };
  row.appendChild(label);
  row.appendChild(btn);
  list.appendChild(row);
}

// Open the shop panel for the shop the player is standing at.
export function openShop(G, shop) {
  const panel = document.getElementById('shop');
  const list = document.getElementById('shop-items');
  const title = document.getElementById('shop-title');
  title.textContent = shop.name + ' — $' + Math.floor(G.money).toLocaleString('en-US');
  list.innerHTML = '';
  const add = (name, price, owned, onBuy) => shopRow(G, shop, list, name, price, owned, onBuy);
  if (shop.kind === 'arms') {
    for (const [key, w] of Object.entries(WEAPONS)) {
      if (key === 'fists') continue;
      add(w.name + ' (damage ' + w.damage + ')', w.price, G.ownedWeapons.includes(key), () => {
        G.ownedWeapons.push(key);
        G.combat.ammo[key] = (G.combat.ammo[key] || 0) + w.ammo;
        G.combat.weapon = key;
      });
      add(w.name + ' ammo ×' + w.ammo, Math.floor(w.price / 3), false, () => {
        G.combat.ammo[key] = (G.combat.ammo[key] || 0) + w.ammo;
      });
    }
  } else if (shop.kind === 'motors') {
    for (const [key, t] of Object.entries(VEHICLE_TYPES)) {
      if (!t.price) continue;
      add(t.name + ' — top ' + Math.round(t.topSpeed * 3.6) + ' km/h', t.price, G.ownedCars.includes(key), () => {
        G.ownedCars.push(key);
        const v = spawnVehicle(G.scene, key, shop.x + 20, shop.z + 10, 0, { owned: true });
        G.vehicles.push(v);
        G.toast(t.name + ' delivered to your garage spot!');
      });
    }
  } else if (shop.kind === 'clothes') {
    for (const c of CLOTHES) {
      add(c.name, c.price, G.player.shirtColor === c.color, () => setShirtColor(G.player, c.color));
    }
  } else if (shop.kind === 'tuner') {
    for (const u of UPGRADES) {
      add(u.name, u.price, !!G.upgrades[u.apply], () => { G.upgrades[u.apply] = true; });
    }
  }
  document.getElementById('shop-close').onclick = () => { panel.classList.remove('show'); G.screen = 'play'; };
  panel.classList.add('show');
  G.screen = 'shop';
}

// Garage: list owned cars, spawn the chosen one nearby.
export function openGarage(G) {
  const panel = document.getElementById('shop');
  const list = document.getElementById('shop-items');
  document.getElementById('shop-title').textContent = 'Your Garage — ' + G.ownedCars.length + ' cars';
  list.innerHTML = '';
  for (const key of G.ownedCars) {
    const t = VEHICLE_TYPES[key];
    const row = document.createElement('div');
    row.className = 'shop-row';
    const label = document.createElement('span');
    label.textContent = t.name + ' — top ' + Math.round(t.topSpeed * 3.6) + ' km/h';
    const btn = document.createElement('button');
    btn.textContent = 'SPAWN';
    btn.onclick = () => {
      const v = spawnVehicle(G.scene, key, G.player.x + 6, G.player.z + 6, 0, { owned: true });
      G.vehicles.push(v);
      panel.classList.remove('show');
      G.screen = 'play';
      G.toast(t.name + ' is waiting outside.');
    };
    row.appendChild(label);
    row.appendChild(btn);
    list.appendChild(row);
  }
  document.getElementById('shop-close').onclick = () => { panel.classList.remove('show'); G.screen = 'play'; };
  panel.classList.add('show');
  G.screen = 'shop';
}
