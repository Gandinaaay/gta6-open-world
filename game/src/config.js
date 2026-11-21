// Vice Bay: Blood & Destiny — world constants, districts and shared state.
// The city of Vice Bay is a 2 km x 2 km coastal open world. Coordinates are
// metres; x east, z south, y up. The ground plane spans [-1000, 1000] on x/z.

export const WORLD = {
  size: 2000,
  half: 1000,
  roadSpacing: 200,
  roadHalfWidth: 7,
  sidewalkWidth: 3,
  blockSize: 186,
  waterLevel: -0.4,
  seaMargin: 260,
  gravity: 22,
};

export const TIME = {
  dawn: 6.6,
  morning: 9.1,
  noon: 13.0,
  afternoon: 15.9,
  dusk: 18.4,
  night: 0.45,
};

// Eight districts. bounds are [minX, maxX, minZ, maxZ] in metres.
export const DISTRICTS = [
  {
    id: 'downtown', name: 'Downtown', bounds: [-320, 320, -320, 320],
    style: 'tower', hMin: 55, hMax: 150, density: 0.9,
    palette: ['#2b3a55', '#3a4a6b', '#223044', '#46587c'],
    ground: '#3d4450', accent: '#ffd166',
  },
  {
    id: 'marina', name: 'Marina Bay', bounds: [640, 1000, -320, 320],
    style: 'marina', hMin: 12, hMax: 42, density: 0.55,
    palette: ['#e8e2d4', '#cfd8dc', '#f5f0e6', '#b8c4cc'],
    ground: '#7d8a7a', accent: '#4dd0e1',
  },
  {
    id: 'oldtown', name: 'Old Town', bounds: [-1000, -340, -1000, -340],
    style: 'brick', hMin: 10, hMax: 26, density: 0.75,
    palette: ['#8d5a3b', '#a06b45', '#7a4e33', '#b98a5e'],
    ground: '#6b5a48', accent: '#ffb74d',
  },
  {
    id: 'industrial', name: 'Ironworks', bounds: [-1000, -340, 340, 1000],
    style: 'warehouse', hMin: 9, hMax: 20, density: 0.5,
    palette: ['#5d6b73', '#4e5a61', '#6e7c85', '#45525a'],
    ground: '#54504a', accent: '#ff8a65',
  },
  {
    id: 'suburbs', name: 'Palm Suburbs', bounds: [340, 1000, -1000, -340],
    style: 'house', hMin: 6, hMax: 12, density: 0.6,
    palette: ['#f2e3c6', '#e8d5b0', '#dfe8d8', '#ecd9c0'],
    ground: '#5d7a52', accent: '#aed581',
  },
  {
    id: 'beach', name: 'Beachfront', bounds: [-340, 640, 640, 1000],
    style: 'beach', hMin: 8, hMax: 22, density: 0.45,
    palette: ['#f7ead0', '#efe0c0', '#e6d3ae', '#faf3e0'],
    ground: '#d9c48f', accent: '#ffcc80',
  },
  {
    id: 'university', name: 'University Hill', bounds: [-340, 340, -1000, -340],
    style: 'campus', hMin: 10, hMax: 30, density: 0.6,
    palette: ['#9c6b4f', '#b98a6a', '#7d5a44', '#c49a76'],
    ground: '#5a6e52', accent: '#fff176',
  },
  {
    id: 'port', name: 'Port Delgado', bounds: [640, 1000, 340, 1000],
    style: 'port', hMin: 10, hMax: 26, density: 0.5,
    palette: ['#546e7a', '#455a64', '#607d8b', '#37474f'],
    ground: '#4e5458', accent: '#ffd54f',
  },
];

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 11,
  accel: 40,
  jumpSpeed: 8,
  radius: 0.55,
  height: 1.8,
  health: 100,
};

export const VEHICLE_DEFS = [
  { id: 'sedan', name: 'Vice Sedan', price: 1200, topSpeed: 38, accel: 16, grip: 2.6, color: '#b71c1c', seats: 4 },
  { id: 'coupe', name: 'Comet Coupe', price: 6500, topSpeed: 52, accel: 24, grip: 3.1, color: '#f9a825', seats: 2 },
  { id: 'suv', name: 'Bay SUV', price: 4200, topSpeed: 42, accel: 18, grip: 2.8, color: '#1565c0', seats: 5 },
  { id: 'van', name: 'Cargo Van', price: 2800, topSpeed: 33, accel: 12, grip: 2.2, color: '#e0e0e0', seats: 3 },
  { id: 'muscle', name: 'Blood Muscle', price: 9800, topSpeed: 55, accel: 26, grip: 2.9, color: '#4a148c', seats: 2 },
  { id: 'taxi', name: 'Bay Taxi', price: 3000, topSpeed: 40, accel: 17, grip: 2.7, color: '#fdd835', seats: 4 },
];

export const POLICE_DEFS = {
  car: { topSpeed: 46, accel: 20, grip: 3.0, color: '#eceff1' },
  spawnDistance: 120,
  maxActive: 6,
  catchRadius: 4,
  bustedFine: 500,
};

export const ECONOMY = {
  startMoney: 250,
  taxiFare: 60,
  deliveryPay: 90,
  stuntPay: 150,
  repairCost: 120,
};

export const WANTED = {
  // heat points added by each crime; stars = thresholds below
  stealCar: 25,
  assault: 30,
  shoot: 45,
  kill: 60,
  speeding: 0,
  thresholds: [0, 20, 45, 75, 110, 150],
  decayPerSecond: 1.6,
  decayHiddenMultiplier: 2.5,
};

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    const b = d.bounds;
    if (x >= b[0] && x <= b[1] && z >= b[2] && z <= b[3]) return d;
  }
  return DISTRICTS[0];
}

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// The single mutable game state object. Systems receive it and mutate it.
export function createState() {
  return {
    time: 9.1,
    timeScale: 1,
    paused: false,
    money: ECONOMY.startMoney,
    health: PLAYER.health,
    wanted: 0,
    heat: 0,
    hidden: false,
    bustedCount: 0,
    kills: 0,
    carsStolen: 0,
    missionsDone: [],
    activeMission: null,
    missionStep: 0,
    ownedCars: ['sedan'],
    garage: [],
    player: null,
    vehicles: [],
    traffic: [],
    pedestrians: [],
    police: [],
    scene: null,
    camera: null,
    renderer: null,
    clock: null,
    hud: null,
    input: null,
    audio: null,
    save: null,
    shots: null,
    stats: { distance: 0, topSpeed: 0, shotsFired: 0 },
  };
}
