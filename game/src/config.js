// Vice Bay: Blood & Destiny — every shared number in one place.
// Round 2: the tables are built from plain rows, so tuning a car or a
// district is one row of numbers instead of a nested literal. One world
// unit is about two metres, so the 1000 x 1000 map is roughly 2 km square.
// Every other module reads its tuning from here and nothing else.
export const WORLD = {
  size: 1000,
  half: 500,
  roadSpacing: 100,
  roadWidth: 16,
  sidewalkWidth: 4,
};

// Rows: [id, label, x0, z0, x1, z1, building style, build density].
// districtAt() checks them in order and the first box holding the point
// wins, so the Highway Ring (last, covering the whole map) is the fallback.
const DISTRICT_ROWS = [
  ['downtown', 'Downtown', -200, -200, 200, 200, 'tower', 1.0],
  ['beach', 'Ocean Beach', 350, -500, 500, 500, 'beach', 0.55],
  ['havana', 'Little Havana', -500, 100, -200, 500, 'house', 0.8],
  ['port', 'Industrial Port', -500, -500, -200, -100, 'warehouse', 0.6],
  ['hills', 'Rich Hills', 100, -500, 500, -200, 'villa', 0.5],
  ['airport', 'Vice Bay Airport', 100, 200, 350, 500, 'airport', 0.3],
  ['criminal', 'Criminal District', -200, 200, 100, 500, 'tenement', 0.9],
  ['highway', 'Highway Ring', -500, -500, 500, 500, 'highway', 0.4],
];

export const DISTRICTS = DISTRICT_ROWS.map(([id, name, x0, z0, x1, z1, style, density]) => ({
  id, name, x0, z0, x1, z1, style, density,
}));

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return DISTRICTS[DISTRICTS.length - 1];
}

// Rows: [key, display name, kind, price, top speed, accel, brake, turn, colour, seats].
// Top speed is world units per second; the HUD multiplies by 3.6 for km/h,
// so the Comet GT's 66 reads as about 238 km/h on the speedometer.
const VEHICLE_ROWS = [
  ['sport', 'Comet GT', 'sport', 12000, 66, 36, 58, 2.7, 0xd21f3c, 2],
  ['sedan', 'Bayview Sedan', 'sedan', 4500, 43, 23, 46, 2.2, 0x2e6fb0, 4],
  ['suv', 'Trailblazer SUV', 'suv', 8000, 47, 25, 48, 2.0, 0x3a3f44, 5],
  ['bike', 'Nightrider Bike', 'bike', 6000, 60, 42, 62, 3.5, 0x111111, 2],
  ['taxi', 'Bay Taxi', 'taxi', 0, 41, 21, 46, 2.2, 0xf2b705, 4],
  ['police', 'VBPD Interceptor', 'police', 0, 58, 34, 56, 2.6, 0x0d1b2a, 4],
  ['truck', 'Port Hauler', 'truck', 9000, 35, 17, 38, 1.7, 0x7a4a21, 2],
];

export const VEHICLE_TYPES = {};
for (const [key, name, kind, price, topSpeed, accel, brake, turn, color, seats] of VEHICLE_ROWS) {
  VEHICLE_TYPES[key] = { name, kind, price, topSpeed, accel, brake, turn, color, seats };
}

// Rows: [key, display name, price, damage, range, starting ammo, fire interval].
const WEAPON_ROWS = [
  ['fists', 'Fists', 0, 12, 2.2, Infinity, 0.45],
  ['pistol', 'P9 Pistol', 800, 25, 60, 120, 0.28],
  ['smg', 'K-9 SMG', 2500, 16, 50, 240, 0.09],
  ['shotgun', 'Street Sweeper', 3200, 60, 22, 40, 0.8],
  ['rifle', 'AR-77 Rifle', 6000, 40, 90, 180, 0.14],
];

export const WEAPONS = {};
for (const [key, name, price, damage, range, ammo, rate] of WEAPON_ROWS) {
  WEAPONS[key] = { name, price, damage, range, ammo, rate };
}

// Rows: [display name, price, shirt colour].
export const CLOTHES = [
  ['Street Tee', 0, 0x8a2be2],
  ['Beach Shirt', 250, 0x2ec4b6],
  ['Night Suit', 1200, 0x1a1a2e],
  ['Gold Chain Look', 2500, 0xd4af37],
].map(([name, price, color]) => ({ name, price, color }));

// Rows: [id, display name, price, effect key the driving code reads].
export const UPGRADES = [
  ['engine1', 'Engine Tune I (+15% top speed)', 3000, 'speed'],
  ['engine2', 'Engine Tune II (+30% top speed)', 7000, 'speed2'],
  ['armor1', 'Armour Plating (+50% durability)', 4000, 'armor'],
  ['tires1', 'Grip Tyres (+handling)', 2000, 'grip'],
].map(([id, name, price, apply]) => ({ id, name, price, apply }));

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

// Round-2 tuning: how hard the handbrake slides, how fast the wanted stars
// flash when the heat rises, and the dawn/dusk window the sunset sun disc
// shows in.
export const HANDBRAKE_GRIP = 1.7; // steering multiplier while the handbrake is out
export const WANTED_FLASH_TIME = 2.0; // seconds the HUD stars flash after a new star
export const SUNSET_WINDOW = { from: 0.02, to: 0.1 }; // dayTime range for the dawn disc
