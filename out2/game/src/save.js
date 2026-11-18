// Save and the economy: localStorage progress, and the four shops — Bay Arms
// (weapons and ammo), Vice Motors (buy cars into your garage), Style House
// (clothes) and the Tuner Garage (vehicle upgrades). The same panel serves the
// shops and the garage; only its title and rows change.
import { SAVE_KEY, WEAPONS, VEHICLE_TYPES, CLOTHES, UPGRADES } from './config.js';
import { setShirtColor } from './player.js';
import { spawnVehicle } from './vehicles.js';

export function saveGame(G) {
  try {
    const data = {
      money: G.money, rep: G.rep, health: G.player.health,
      missionIndex: G.missions.missionIndex,
      ownedCars: G.ownedCars, ownedWeapons: G.ownedWeapons,
      upgrades: G.upgrades, shirt: G.player.shirtColor,
      ammo: G.combat.ammo, weapon: G.combat.weapon,
      x: G.player.x, z: G.player.z,
      settings: G.settings,
    };
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
    G.money = d.money ?? 500;
    G.rep = d.rep ?? 0;
    G.player.health = d.health ?? 100;
    G.missions.missionIndex = d.missionIndex ?? 0;
    G.ownedCars = d.ownedCars ?? ['sedan'];
    G.ownedWeapons = d.ownedWeapons ?? ['fists', 'pistol'];
    G.upgrades = d.upgrades ?? {};
    G.combat.ammo = d.ammo ?? { pistol: 120, smg: 0, shotgun: 0, rifle: 0 };
    G.combat.weapon = d.weapon ?? 'pistol';
    if (d.shirt) setShirtColor(G.player, d.shirt);
    if (d.x !== undefined) { G.player.x = d.x; G.player.z = d.z; }
    if (d.settings) Object.assign(G.settings, d.settings);
    return true;
  } catch {
    return false;
  }
}

// Open the shop panel for the shop the player is standing at.
export function openShop(G, shop) {
  const panel = document.getElementById('shop');
  const list = document.getElementById('shop-items');
  const title = document.getElementById('shop-title');
  title.textContent = shop.name + ' — $' + Math.floor(G.money).toLocaleString('en-US');
  list.innerHTML = '';
  const addRow = (name, price, owned, onBuy) => {
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
  };
  if (shop.kind === 'arms') {
    for (const [key, w] of Object.entries(WEAPONS)) {
      if (key === 'fists') continue;
      addRow(w.name + ' (damage ' + w.damage + ')', w.price, G.ownedWeapons.includes(key), () => {
        G.ownedWeapons.push(key);
        G.combat.ammo[key] = (G.combat.ammo[key] || 0) + w.ammo;
        G.combat.weapon = key;
      });
      addRow(w.name + ' ammo ×' + w.ammo, Math.floor(w.price / 3), false, () => {
        G.combat.ammo[key] = (G.combat.ammo[key] || 0) + w.ammo;
      });
    }
  } else if (shop.kind === 'motors') {
    for (const [key, t] of Object.entries(VEHICLE_TYPES)) {
      if (!t.price) continue;
      addRow(t.name + ' — top ' + Math.round(t.topSpeed * 3.6) + ' km/h', t.price, G.ownedCars.includes(key), () => {
        G.ownedCars.push(key);
        const v = spawnVehicle(G.scene, key, shop.x + 20, shop.z + 10, 0, { owned: true });
        G.vehicles.push(v);
        G.toast(t.name + ' delivered to your garage spot!');
      });
    }
  } else if (shop.kind === 'clothes') {
    for (const c of CLOTHES) {
      addRow(c.name, c.price, G.player.shirtColor === c.color, () => setShirtColor(G.player, c.color));
    }
  } else if (shop.kind === 'tuner') {
    for (const u of UPGRADES) {
      addRow(u.name, u.price, !!G.upgrades[u.apply], () => { G.upgrades[u.apply] = true; });
    }
  }
  const close = document.getElementById('shop-close');
  close.onclick = () => { panel.classList.remove('show'); G.screen = 'play'; };
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
