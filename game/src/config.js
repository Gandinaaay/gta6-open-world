// Vice Bay: Blood & Destiny — tuning constants, district and vehicle tables.
// Every number the game balances on lives here so the other modules stay thin.

export const CFG = {
  worldSize: 2000, // city is 2 km x 2 km, centred on (0, 0)
  blockSize: 160, // distance between road centrelines
  roadWidth: 14,
  sidewalkWidth: 4,
  playerWalk: 6,
  playerRun: 10.5,
  playerJump: 9,
  gravity: 24,
  carAccel: 30,
  carBrake: 46,
  carReverseMax: 14,
  carTurn: 2.1,
  carGrip: 7,
  handbrakeGrip: 1.6,
  wantedDecayPerSec: 0.012,
  wantedLoseDistance: 260,
  wantedLoseTime: 12,
  maxTrafficCars: 16,
  maxPedestrians: 26,
  maxPoliceCars: 5,
  dayLengthSec: 480, // a full day/night cycle
  rainChance: 0.25,
  saveKey: 'vicebay-save-v1',
};

// Eight districts of Vice Bay. x/z are centres, w/h the footprint in metres.
export const DISTRICTS = [
  { name: 'Downtown', x: 0, z: -120, w: 560, h: 520, hMin: 45, hMax: 150, palette: ['#3a4a6b', '#2c3e63', '#46587c', '#54668a'], neon: true },
  { name: 'Ocean Beach', x: -560, z: 420, w: 480, h: 420, hMin: 10, hMax: 32, palette: ['#e8c99a', '#f2d7ae', '#d9b98a', '#c9e4e0'], neon: false, beach: true },
  { name: 'Little Havana', x: 420, z: 420, w: 480, h: 420, hMin: 12, hMax: 40, palette: ['#e07840', '#d96b4f', '#e8a34c', '#c95f5f'], neon: true },
  { name: 'Industrial Port', x: -560, z: -560, w: 480, h: 420, hMin: 14, hMax: 48, palette: ['#6b6f75', '#7a7d82', '#5d6167', '#8a6f4d'], neon: false, port: true },
  { name: 'Rich Hills', x: 560, z: -560, w: 480, h: 420, hMin: 10, hMax: 30, palette: ['#f0e6d2', '#e8dcc0', '#d8c9a8', '#cfe0c8'], neon: false },
  { name: 'Airport', x: -140, z: 760, w: 560, h: 300, hMin: 8, hMax: 22, palette: ['#9aa3ad', '#a8b0b8', '#8b949d', '#b0b8c0'], neon: false, runway: true },
  { name: 'Criminal District', x: 620, z: 60, w: 360, h: 420, hMin: 12, hMax: 44, palette: ['#4a3a4a', '#3e323e', '#54404e', '#5c4646'], neon: true },
  { name: 'Highway Ring', x: 0, z: 0, w: 1960, h: 1960, hMin: 0, hMax: 0, palette: ['#333333'], neon: false, ring: true },
];

// Vehicle types: top speed (m/s), acceleration, turn rate, body colour, mass feel.
export const CAR_TYPES = {
  sport: { name: 'Comet GT', top: 68, accel: 34, turn: 2.4, color: 0xc0392b, seats: 2, price: 42000 },
  sedan: { name: 'Vapid Sedan', top: 48, accel: 26, turn: 2.0, color: 0x2e5f8a, seats: 4, price: 9000 },
  suv: { name: 'Bison SUV', top: 44, accel: 24, turn: 1.7, color: 0x3d4a3d, seats: 5, price: 16000 },
  bike: { name: 'Daemon Bike', top: 58, accel: 30, turn: 2.8, color: 0x1a1a1a, seats: 2, price: 12000 },
  taxi: { name: 'Downtown Cab', top: 46, accel: 25, turn: 2.0, color: 0xf1c40f, seats: 4, price: 11000 },
  truck: { name: 'Mule Truck', top: 38, accel: 20, turn: 1.4, color: 0x7f8c8d, seats: 2, price: 22000 },
  police: { name: 'VCPD Interceptor', top: 62, accel: 32, turn: 2.3, color: 0x111418, seats: 4, price: 0 },
};

// Weapons: damage, range, fire interval, spread, magazine, reload time, price.
export const WEAPONS = {
  fists: { name: 'Fists', damage: 12, range: 2.2, interval: 0.45, spread: 0, mag: Infinity, reload: 0, auto: false, price: 0 },
  pistol: { name: 'Pistol', damage: 22, range: 60, interval: 0.32, spread: 0.02, mag: 12, reload: 1.1, auto: false, price: 500 },
  smg: { name: 'SMG', damage: 14, range: 48, interval: 0.09, spread: 0.07, mag: 30, reload: 1.4, auto: true, price: 1800 },
  shotgun: { name: 'Shotgun', damage: 16, range: 26, interval: 0.85, spread: 0.16, mag: 6, reload: 2.0, auto: false, price: 2400, pellets: 6 },
  rifle: { name: 'Rifle', damage: 38, range: 110, interval: 0.16, spread: 0.01, mag: 24, reload: 1.8, auto: true, price: 5200 },
};

export const WEAPON_ORDER = ['fists', 'pistol', 'smg', 'shotgun', 'rifle'];

// Shop and upgrade catalogues for the economy.
export const SHOPS = [
  { name: 'Ammu-Nation', x: 80, z: -240, kind: 'weapons' },
  { name: 'Los Santos Customs', x: -240, z: 160, kind: 'garage' },
  { name: 'Burger Shot', x: 320, z: 480, kind: 'health' },
  { name: 'Havana Market', x: 480, z: 360, kind: 'weapons' },
];

export const UPGRADES = [
  { id: 'engine', name: 'Turbo Engine', price: 8000, desc: '+25% top speed' },
  { id: 'armor', name: 'Armored Plating', price: 6000, desc: 'Half damage taken in cars' },
  { id: 'tires', name: 'Racing Tires', price: 4000, desc: '+30% grip, better drifting' },
  { id: 'health', name: 'Body Armor', price: 3500, desc: '+50 max health' },
];
