// Vice Bay: Blood & Destiny — tuning, districts, vehicles, weapons, missions.
export const CONFIG = {
  worldSize: 2000,
  roadGap: 200,
  blockSize: 160,
  dayLength: 240,
  gravity: 22,
  walkSpeed: 6,
  runSpeed: 10,
  jumpSpeed: 9,
  saveKey: 'vicebay-save-v2',
};

export const DISTRICTS = [
  { name: 'Downtown', center: [100, 100], size: 420, color: 0x2e4a6b },
  { name: 'Ocean Beach', center: [-850, 500], size: 380, color: 0xc9a06a },
  { name: 'Little Havana', center: [-450, -550], size: 360, color: 0xb05a3c },
  { name: 'Industrial Port', center: [750, -700], size: 400, color: 0x5a5f66 },
  { name: 'Rich Hills', center: [650, 650], size: 360, color: 0x3f7a4a },
  { name: 'Airport', center: [900, 0], size: 300, color: 0x6b6f75 },
  { name: 'Criminal District', center: [-700, 750], size: 340, color: 0x6b2e4a },
  { name: 'Highway Ring', center: [0, -850], size: 420, color: 0x4a4a52 },
];

export const VEHICLE_TYPES = {
  comet: { name: 'Comet GT', color: 0xc02020, topSpeed: 46, accel: 26, grip: 2.6, seats: 2 },
  sedan: { name: 'Oceanic Sedan', color: 0x2a5a8a, topSpeed: 34, accel: 18, grip: 2.2, seats: 4 },
  suv: { name: 'Rancher SUV', color: 0x3a6a3a, topSpeed: 36, accel: 20, grip: 2.4, seats: 5 },
  taxi: { name: 'Vice Cab', color: 0xd8a020, topSpeed: 32, accel: 17, grip: 2.1, seats: 4 },
  truck: { name: 'Hauler Truck', color: 0x707070, topSpeed: 28, accel: 13, grip: 1.8, seats: 2 },
  bike: { name: 'Nightrider Bike', color: 0x3a5a8a, topSpeed: 44, accel: 30, grip: 3.0, seats: 1 },
  police: { name: 'VBPD Interceptor', color: 0x101418, topSpeed: 42, accel: 24, grip: 2.8, seats: 2 },
};

export const WEAPONS = {
  fists: { name: 'Fists', damage: 12, rate: 0.45, mag: Infinity, range: 3, auto: false },
  pistol: { name: 'Pistol', damage: 24, rate: 0.3, mag: 12, range: 55, auto: false },
  smg: { name: 'SMG', damage: 14, rate: 0.09, mag: 30, range: 45, auto: true },
  shotgun: { name: 'Shotgun', damage: 16, rate: 0.8, mag: 6, range: 26, auto: false, pellets: 6 },
  rifle: { name: 'Rifle', damage: 42, rate: 0.16, mag: 24, range: 110, auto: true },
};

export const STORY_MISSIONS = [
  { name: 'New in Town', desc: 'Rico lands in Vice Bay. Meet the fixer at the pier.', reward: 500, steps: [{ text: 'Reach the pier', x: -880, z: 620 }] },
  { name: 'The First Job', desc: 'Steal the Comet GT parked in Downtown.', reward: 900, steps: [{ text: 'Steal the Comet GT', x: 220, z: 180 }, { text: 'Lose the heat', x: -200, z: -200 }] },
  { name: 'Wheels and Deals', desc: 'Deliver the car to the garage in Rich Hills.', reward: 1200, steps: [{ text: 'Drive to the garage', x: 650, z: 650 }] },
  { name: 'Smoke and Mirrors', desc: 'Pick up the package in Little Havana.', reward: 1500, steps: [{ text: 'Grab the package', x: -450, z: -550 }, { text: 'Drop it at the docks', x: 750, z: -700 }] },
  { name: 'The Long Con', desc: 'Tail the courier without being seen.', reward: 2000, steps: [{ text: 'Reach the airport', x: 900, z: 0 }, { text: 'Follow the courier', x: 400, z: -400 }] },
  { name: 'Double Cross', desc: 'Your crew sold you out. Survive the ambush.', reward: 2600, steps: [{ text: 'Survive the ambush', x: -700, z: 750 }] },
  { name: 'Midnight Run', desc: 'Outrun the VBPD across the Highway Ring.', reward: 3200, steps: [{ text: 'Reach the ring road', x: 0, z: -850 }, { text: 'Escape the pursuit', x: -850, z: 500 }] },
  { name: 'Buried Secrets', desc: 'Dig up the truth under the old pier.', reward: 4000, steps: [{ text: 'Search the old pier', x: -880, z: 700 }] },
  { name: 'Storm the Docks', desc: 'Take back the shipment at the Industrial Port.', reward: 5500, steps: [{ text: 'Storm the port', x: 750, z: -700 }, { text: 'Secure the shipment', x: 600, z: -850 }] },
  { name: 'Blood & Destiny', desc: 'End it. Confront the boss in Downtown.', reward: 10000, steps: [{ text: 'Enter the tower', x: 100, z: 100 }, { text: 'Face the boss', x: 0, z: 0 }] },
];

export const SIDE_MISSIONS = [
  { id: 'taxi', name: 'Taxi Fares', desc: 'Pick up fares and drop them off fast.', reward: 300 },
  { id: 'race', name: 'Street Racing', desc: 'Beat the rival to the finish line.', reward: 800 },
  { id: 'delivery', name: 'Vehicle Delivery', desc: 'Deliver the car without a scratch.', reward: 600 },
  { id: 'escape', name: 'Police Escape', desc: 'Lose a 3-star wanted level.', reward: 700 },
  { id: 'packages', name: 'Hidden Packages', desc: 'Find the glowing packages around town.', reward: 250 },
  { id: 'territory', name: 'Territory Takeover', desc: 'Clear the gang from the block.', reward: 900 },
  { id: 'timetrial', name: 'Time Trial', desc: 'Reach the checkpoint before the timer ends.', reward: 500 },
  { id: 'rescue', name: 'Rescue Civilians', desc: 'Get the civilians out of the danger zone.', reward: 650 },
];
