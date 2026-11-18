// Vice Bay: Blood & Destiny — world constants, districts, vehicles, controls.
// Every number the rest of the game shares lives here so tuning is one place.
export const WORLD = {
  size: 1000, // playable ground is -500..500 on x and z; 1 unit ~ 2 m, so ~2 km x 2 km
  half: 500,
  roadSpacing: 100,
  roadWidth: 16,
  sidewalkWidth: 4,
};

export const DISTRICTS = [
  { id: 'downtown', name: 'Downtown', x0: -200, z0: -200, x1: 200, z1: 200, style: 'tower', density: 1.0 },
  { id: 'beach', name: 'Ocean Beach', x0: 350, z0: -500, x1: 500, z1: 500, style: 'beach', density: 0.55 },
  { id: 'havana', name: 'Little Havana', x0: -500, z0: 100, x1: -200, z1: 500, style: 'house', density: 0.8 },
  { id: 'port', name: 'Industrial Port', x0: -500, z0: -500, x1: -200, z1: -100, style: 'warehouse', density: 0.6 },
  { id: 'hills', name: 'Rich Hills', x0: 100, z0: -500, x1: 500, z1: -200, style: 'villa', density: 0.5 },
  { id: 'airport', name: 'Vice Bay Airport', x0: 100, z0: 200, x1: 350, z1: 500, style: 'airport', density: 0.3 },
  { id: 'criminal', name: 'Criminal District', x0: -200, z0: 200, x1: 100, z1: 500, style: 'tenement', density: 0.9 },
  { id: 'highway', name: 'Highway Ring', x0: -500, z0: -500, x1: 500, z1: 500, style: 'highway', density: 0.4 },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return DISTRICTS[0];
}

export const VEHICLE_TYPES = {
  sport:   { name: 'Comet GT', kind: 'sport', price: 12000, topSpeed: 62, accel: 34, brake: 55, turn: 2.6, color: 0xd21f3c, seats: 2 },
  sedan:   { name: 'Bayview Sedan', kind: 'sedan', price: 4500, topSpeed: 42, accel: 22, brake: 45, turn: 2.2, color: 0x2e6fb0, seats: 4 },
  suv:     { name: 'Trailblazer SUV', kind: 'suv', price: 8000, topSpeed: 46, accel: 24, brake: 48, turn: 2.0, color: 0x3a3f44, seats: 5 },
  bike:    { name: 'Nightrider Bike', kind: 'bike', price: 6000, topSpeed: 58, accel: 40, brake: 60, turn: 3.4, color: 0x111111, seats: 2 },
  taxi:    { name: 'Bay Taxi', kind: 'taxi', price: 0, topSpeed: 40, accel: 20, brake: 45, turn: 2.2, color: 0xf2b705, seats: 4 },
  police:  { name: 'VBPD Interceptor', kind: 'police', price: 0, topSpeed: 56, accel: 32, brake: 55, turn: 2.5, color: 0x0d1b2a, seats: 4 },
  truck:   { name: 'Port Hauler', kind: 'truck', price: 9000, topSpeed: 34, accel: 16, brake: 38, turn: 1.7, color: 0x7a4a21, seats: 2 },
};

export const WEAPONS = {
  fists:  { name: 'Fists', price: 0, damage: 12, range: 2.2, ammo: Infinity, rate: 0.45 },
  pistol: { name: 'P9 Pistol', price: 800, damage: 25, range: 60, ammo: 120, rate: 0.28 },
  smg:    { name: 'K-9 SMG', price: 2500, damage: 16, range: 50, ammo: 240, rate: 0.09 },
  shotgun:{ name: 'Street Sweeper', price: 3200, damage: 60, range: 22, ammo: 40, rate: 0.8 },
  rifle:  { name: 'AR-77 Rifle', price: 6000, damage: 40, range: 90, ammo: 180, rate: 0.14 },
};

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

// Key bindings. Mouse: left click shoots / punches, wheel or drag orbits the camera.
export const KEYS = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  jump: 'Space', sprint: 'ShiftLeft', crouch: 'KeyC', interact: 'KeyE',
  enterVehicle: 'KeyF', punch: 'KeyQ', weapon1: 'Digit1', weapon2: 'Digit2',
  weapon3: 'Digit3', weapon4: 'Digit4', weapon5: 'Digit5',
  pause: 'Escape', horn: 'KeyH', radio: 'KeyR', mission: 'KeyM',
};

export const SAVE_KEY = 'vicebay-save-v1';
export const STEP = 1 / 60;
export const DAY_LENGTH = 480; // seconds for a full day/night cycle
