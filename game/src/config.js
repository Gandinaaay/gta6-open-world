// Vice Bay: Blood & Destiny — tuning, districts, vehicles, weapons, missions.
// All names, places and story are original. No Rockstar content.
export const CONFIG = {
  worldSize: 2000,
  roadGap: 200,
  blockSize: 160,
  dayLength: 240,
  gravity: 22,
  walkSpeed: 6,
  runSpeed: 10.5,
  jumpSpeed: 9.5,
  saveKey: 'vicebay-save-v2',
  seed: 11,
};

export const DISTRICTS = [
  { name: 'Downtown', center: [0, 0], size: 420, color: 0x2a3550, glow: '#7fb2ff' },
  { name: 'Ocean Beach', center: [-800, 600], size: 380, color: 0x2e4a3a, glow: '#ffd27f' },
  { name: 'Little Havana', center: [600, 600], size: 360, color: 0x4a2e2e, glow: '#ff9d5c' },
  { name: 'Industrial Port', center: [800, -600], size: 380, color: 0x3a3a3a, glow: '#ffb347' },
  { name: 'Rich Hills', center: [-600, -600], size: 360, color: 0x3a2e4a, glow: '#c9a0ff' },
  { name: 'Airport', center: [0, -800], size: 400, color: 0x2e3a4a, glow: '#9fd8ff' },
  { name: 'Criminal District', center: [-200, 800], size: 300, color: 0x4a2a2a, glow: '#ff5c5c' },
  { name: 'Highway Ring', center: [0, 0], size: 2000, color: 0x222222, glow: '#ffffff' },
];

export const VEHICLE_TYPES = {
  comet: { name: 'Comet GT', top: 46, accel: 26, brake: 34, grip: 2.6, color: 0xd21f2b, price: 0, desc: 'Sports coupe' },
  sedan: { name: 'Marlin Sedan', top: 36, accel: 18, brake: 28, grip: 2.2, color: 0x2b6cb0, price: 800, desc: 'Family sedan' },
  suv: { name: 'Bison SUV', top: 38, accel: 20, brake: 26, grip: 2.0, color: 0x4a5568, price: 1500, desc: 'Heavy SUV' },
  taxi: { name: 'Bay Cab', top: 34, accel: 17, brake: 28, grip: 2.2, color: 0xf6c90e, price: 0, desc: 'City taxi' },
  truck: { name: 'Hauler Truck', top: 30, accel: 14, brake: 22, grip: 1.8, color: 0x8a5a2b, price: 2500, desc: 'Cargo truck' },
  bike: { name: 'Viper Bike', top: 52, accel: 32, brake: 30, grip: 3.0, color: 0x1a1a1a, price: 1200, desc: 'Street bike' },
  police: { name: 'VBPD Interceptor', top: 44, accel: 28, brake: 36, grip: 2.8, color: 0x111827, price: 0, desc: 'Police interceptor' },
};

export const WEAPONS = {
  fists: { name: 'Fists', damage: 12, rate: 0.45, range: 2.2, mag: Infinity, auto: false },
  pistol: { name: 'P9 Pistol', damage: 22, rate: 0.32, range: 55, mag: 12, auto: false },
  smg: { name: 'K7 SMG', damage: 13, rate: 0.09, range: 42, mag: 32, auto: true },
  shotgun: { name: 'M870 Shotgun', damage: 15, rate: 0.85, range: 24, mag: 6, auto: false, pellets: 6 },
  rifle: { name: 'AR-15 Rifle', damage: 30, rate: 0.13, range: 90, mag: 30, auto: true },
};

export const STORY_MISSIONS = [
  { name: 'New in Town', desc: 'Rico arrives in Vice Bay. Reach the pier and meet Mama Rosa.', reward: 500, steps: [{ text: 'Reach the pier', x: -700, z: 700 }, { text: 'Meet Mama Rosa', x: -640, z: 660 }] },
  { name: 'A Dangerous Favor', desc: 'Mama Rosa needs a package picked up in Little Havana.', reward: 900, steps: [{ text: 'Pick up the package', x: 600, z: 600 }, { text: 'Deliver it to the docks', x: 800, z: -600 }] },
  { name: 'Street Reputation', desc: 'Win respect: beat three street racers on the Highway Ring.', reward: 1200, steps: [{ text: 'Reach the start line', x: 0, z: -900 }, { text: 'Beat the racers', x: 0, z: 900 }, { text: 'Return to Mama Rosa', x: -640, z: 660 }] },
  { name: 'The Getaway', desc: 'The VBPD is on your tail. Lose the heat, then reach the safehouse.', reward: 1500, steps: [{ text: 'Lose the cops', x: 0, z: 0 }, { text: 'Reach the safehouse', x: -200, z: 800 }] },
  { name: 'The Missing Deal', desc: 'A buyer vanished at the airport. Find the cargo.', reward: 1800, steps: [{ text: 'Search the cargo bay', x: 0, z: -800 }, { text: 'Take the cargo to the port', x: 800, z: -600 }] },
  { name: 'Betrayal', desc: 'Someone sold you out. Confront the traitor in Rich Hills.', reward: 2200, steps: [{ text: 'Confront the traitor', x: -600, z: -600 }, { text: 'Escape to Downtown', x: 0, z: 0 }] },
  { name: 'Night Run', desc: 'Smuggle goods through the Industrial Port under cover of night.', reward: 2600, steps: [{ text: 'Load the goods', x: 800, z: -600 }, { text: 'Deliver to Criminal District', x: -200, z: 800 }] },
  { name: 'The Hidden Truth', desc: 'Dig up the ledger hidden in the old casino.', reward: 3000, steps: [{ text: 'Find the ledger', x: 600, z: 600 }, { text: 'Bring it to Mama Rosa', x: -640, z: 660 }] },
  { name: 'Final Assault', desc: 'Storm the port warehouse and take back the city.', reward: 5000, steps: [{ text: 'Breach the warehouse', x: 800, z: -600 }, { text: 'Clear the rooftop', x: 760, z: -560 }] },
  { name: 'Blood & Destiny', desc: 'The last choice: spare the kingpin or take his throne.', reward: 10000, steps: [{ text: 'Face the kingpin', x: 0, z: 0 }, { text: 'Choose your destiny', x: 0, z: 100 }] },
];

export const SIDE_MISSIONS = [
  { name: 'Taxi Fares', desc: 'Drive passengers across town.', reward: 300 },
  { name: 'Street Racing', desc: 'Beat the clock on the ring road.', reward: 450 },
  { name: 'Vehicle Delivery', desc: 'Deliver a hot car without a scratch.', reward: 600 },
  { name: 'Police Escape', desc: 'Lose a 3-star wanted level.', reward: 700 },
  { name: 'Hidden Packages', desc: 'Find the glowing packages.', reward: 250 },
  { name: 'Territory Takeover', desc: 'Clear the rival crew from the block.', reward: 800 },
  { name: 'Time Trial', desc: 'Cross the city in 90 seconds.', reward: 500 },
  { name: 'Rescue Civilians', desc: 'Pull civilians out of a burning block.', reward: 650 },
];
