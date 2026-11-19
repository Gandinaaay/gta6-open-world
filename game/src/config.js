// Vice Bay: Blood & Destiny — the single tuning sheet for the whole game.
// Every number the world, the cars, the guns and the wanted system use lives
// here, so balancing is editing one file. One world unit is about two metres:
// the map is 1000 x 1000 units, a compact ~2 km square city. Districts are
// plain objects built by small helpers; the first district whose box holds a
// point wins, so the Highway Ring (last, covering everything) is the fallback
// for any point no other district claims.
export const WORLD = {
  size: 1000,
  half: 500,
  roadSpacing: 100,
  roadWidth: 16,
  sidewalkWidth: 4,
};

function district(id, name, x0, z0, x1, z1, style, density) {
  return { id, name, x0, z0, x1, z1, style, density };
}

export const DISTRICTS = [
  district('downtown', 'Downtown', -200, -200, 200, 200, 'tower', 1.0),
  district('beach', 'Ocean Beach', 350, -500, 500, 500, 'beach', 0.55),
  district('havana', 'Little Havana', -500, 100, -200, 500, 'house', 0.8),
  district('port', 'Industrial Port', -500, -500, -200, -100, 'warehouse', 0.6),
  district('hills', 'Rich Hills', 100, -500, 500, -200, 'villa', 0.5),
  district('airport', 'Vice Bay Airport', 100, 200, 350, 500, 'airport', 0.3),
  district('criminal', 'Criminal District', -200, 200, 100, 500, 'tenement', 0.9),
  district('highway', 'Highway Ring', -500, -500, 500, 500, 'highway', 0.4),
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return DISTRICTS[DISTRICTS.length - 1];
}

function vehicle(key, name, kind, price, topSpeed, accel, brake, turn, color, seats) {
  return { key, name, kind, price, topSpeed, accel, brake, turn, color, seats };
}

// Top speed is world units per second; the HUD shows it as km/h (x3.6), so
// the Comet GT's 66 reads as ~238 km/h on the speedometer.
const VEHICLE_LIST = [
  vehicle('sport', 'Comet GT', 'sport', 12000, 66, 36, 58, 2.7, 0xd21f3c, 2),
  vehicle('sedan', 'Bayview Sedan', 'sedan', 4500, 43, 23, 46, 2.2, 0x2e6fb0, 4),
  vehicle('suv', 'Trailblazer SUV', 'suv', 8000, 47, 25, 48, 2.0, 0x3a3f44, 5),
  vehicle('bike', 'Nightrider Bike', 'bike', 6000, 60, 42, 62, 3.5, 0x111111, 2),
  vehicle('taxi', 'Bay Taxi', 'taxi', 0, 41, 21, 46, 2.2, 0xf2b705, 4),
  vehicle('police', 'VBPD Interceptor', 'police', 0, 58, 34, 56, 2.6, 0x0d1b2a, 4),
  vehicle('truck', 'Port Hauler', 'truck', 9000, 35, 17, 38, 1.7, 0x7a4a21, 2),
];

export const VEHICLE_TYPES = {};
for (const v of VEHICLE_LIST) VEHICLE_TYPES[v.key] = v;

function weapon(key, name, price, damage, range, ammo, rate) {
  return { key, name, price, damage, range, ammo, rate };
}

const WEAPON_LIST = [
  weapon('fists', 'Fists', 0, 12, 2.2, Infinity, 0.45),
  weapon('pistol', 'P9 Pistol', 800, 25, 60, 120, 0.28),
  weapon('smg', 'K-9 SMG', 2500, 16, 50, 240, 0.09),
  weapon('shotgun', 'Street Sweeper', 3200, 60, 22, 40, 0.8),
  weapon('rifle', 'AR-77 Rifle', 6000, 40, 90, 180, 0.14),
];

export const WEAPONS = {};
for (const w of WEAPON_LIST) WEAPONS[w.key] = w;

export const CLOTHES = [
  { name: 'Street Tee', price: 0, color: 0x8a2be2 },
  { name: 'Beach Shirt', price: 250, color: 0x2ec4b6 },
  { name: 'Night Suit', price: 1200, color: 0x1a1a2e },
  { name: 'Gold Chain Look', price: 2500, color: 0xd4af37 },
];

export const UPGRADES = [
  { id: 'engine1', name: 'Engine Tune I (+15% top speed)', price: 3000, apply: 'speed' },
  { id: 'engine2', name: 'Engine Tune II (+30% top speed)', price: 7000, apply: 'speed2' },
  { id: 'armor1', name: 'Armour Plating (+50% durability)', price: 4000, apply: 'armor' },
  { id: 'tires1', name: 'Grip Tyres (+handling)', price: 2000, apply: 'grip' },
];

// Controls. Mouse: drag orbits the camera, wheel zooms, left click shoots or
// punches. Space is jump on foot and the handbrake while driving.
export const KEYS = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  sprint: 'ShiftLeft',
  crouch: 'KeyC',
  interact: 'KeyE',
  enterVehicle: 'KeyF',
  punch: 'KeyQ',
  weapon1: 'Digit1',
  weapon2: 'Digit2',
  weapon3: 'Digit3',
  weapon4: 'Digit4',
  weapon5: 'Digit5',
  pause: 'Escape',
  horn: 'KeyH',
  radio: 'KeyR',
  mission: 'KeyM',
};

export const SAVE_KEY = 'vicebay-save-v1';
export const STEP = 1 / 60;
export const DAY_LENGTH = 480; // seconds for one full day/night cycle
export const WANTED_COOLOFF_BASE = 14; // seconds unseen before one star drops

// Round-3 tuning carried over: how hard the handbrake slides, how long the
// wanted stars flash when the heat rises, and the dawn window in which the
// sunset sun disc shows.
export const HANDBRAKE_GRIP = 1.7; // steering multiplier while the handbrake is out
export const WANTED_FLASH_TIME = 2.0; // seconds the HUD stars flash after a new star
export const SUNSET_WINDOW = { from: 0.02, to: 0.1 }; // dayTime range for the dawn disc
