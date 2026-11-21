// Vice Bay: Blood & Destiny — tuning, districts, vehicles, weapons, missions.
// All numbers are gameplay constants; nothing here reads the network.

export const WORLD = {
  size: 2000,
  half: 1000,
  roadGap: 200,
  block: 160,
  roadWidth: 14,
  dayLength: 240, // seconds per full day/night cycle
  gravity: 22,
  walkSpeed: 6,
  runSpeed: 10,
  jumpSpeed: 9,
  saveKey: 'vicebay-save-v1',
};

// Eight districts of Vice Bay. x/z are the district centre, w/h its size in metres.
export const DISTRICTS = [
  { name: 'Downtown', color: 0x3a6ea5, x: 0, z: 0, w: 420, h: 420, tall: true, dense: 0.9 },
  { name: 'Ocean Beach', color: 0x2e8b8b, x: -750, z: 750, w: 420, h: 420, tall: false, dense: 0.4 },
  { name: 'Little Havana', color: 0xd97b29, x: -750, z: -750, w: 420, h: 420, tall: false, dense: 0.7 },
  { name: 'Industrial Port', color: 0x6b7280, x: 750, z: -750, w: 420, h: 420, tall: false, dense: 0.6 },
  { name: 'Rich Hills', color: 0x7a5c2e, x: 750, z: 750, w: 420, h: 420, tall: false, dense: 0.5 },
  { name: 'Airport', color: 0x4b5563, x: 0, z: -850, w: 500, h: 260, tall: false, dense: 0.25 },
  { name: 'Criminal District', color: 0x8b1e1e, x: -850, z: 0, w: 260, h: 500, tall: false, dense: 0.65 },
  { name: 'Highway Ring', color: 0x374151, x: 0, z: 0, w: 2000, h: 2000, tall: false, dense: 0.1, ring: true },
];

export const PLAYER = {
  radius: 0.55,
  height: 1.8,
  walk: 6,
  run: 10,
  jump: 9,
  health: 100,
  startMoney: 500,
};

export const VEHICLES = [
  { name: 'Vice Sedan', color: 0xc0c8d0, top: 26, accel: 14, turn: 1.9, price: 0 },
  { name: 'Bay Coupe', color: 0xd23c2e, top: 34, accel: 18, turn: 2.3, price: 1200 },
  { name: 'Port Truck', color: 0x3f6d4e, top: 22, accel: 11, turn: 1.5, price: 900 },
  { name: 'Street Taxi', color: 0xe8b400, top: 28, accel: 15, turn: 2.0, price: 700 },
  { name: 'Interceptor', color: 0x1c2733, top: 40, accel: 22, turn: 2.6, price: 5000 },
];

export const WEAPONS = {
  fist: { name: 'Fists', damage: 12, rate: 2.2, range: 2.2, auto: false, price: 0 },
  pistol: { name: 'Pistol', damage: 22, rate: 3.0, range: 55, auto: false, price: 300 },
  smg: { name: 'SMG', damage: 14, rate: 9.0, range: 45, auto: true, price: 900 },
  shotgun: { name: 'Shotgun', damage: 34, rate: 1.2, range: 22, auto: false, price: 1500 },
};

export const ECONOMY = {
  missionReward: [400, 600, 800, 1000, 1200, 1500, 1800, 2200, 2600, 3200],
  sideReward: 250,
  taxiFare: 60,
  repairCost: 150,
};

export const WANTED = {
  max: 5,
  decayPerSecond: 0.06,
  heatPerCrime: 0.55,
  policePerStar: 1,
};

// Mission tables live in missions.js; these are the shared counts.
export const MISSION_COUNT = 10;
export const SIDE_COUNT = 8;

export const PALETTE = {
  sky: 0x87b5d6,
  night: 0x0b1026,
  sun: 0xffe9a8,
  moon: 0xdfe8ff,
  road: 0x23262b,
  sidewalk: 0x8a8f96,
  grass: 0x4d7a3a,
  sand: 0xd9c27a,
  water: 0x1e5f8a,
};
