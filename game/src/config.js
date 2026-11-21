// Vice Bay: Blood & Destiny — tuning, districts, vehicles, weapons, missions.
// All constants; nothing here touches the network.

export const CONFIG = {
  worldSize: 2000,
  roadGap: 200,
  blockSize: 160,
  dayLength: 240, // seconds per full day/night cycle
  gravity: 22,
  walkSpeed: 6,
  runSpeed: 10,
  jumpSpeed: 9,
  saveKey: 'vicebay-save-v1',
  playerName: 'Rico',
};

export const DISTRICTS = [
  { name: 'Downtown',          color: 0x3a6ea5, x: 0,    z: 0,    w: 420, h: 420 },
  { name: 'Ocean Beach',       color: 0x2e8b8b, x: -750, z: 750,  w: 420, h: 420 },
  { name: 'Little Havana',     color: 0xd97b29, x: -750, z: -750, w: 420, h: 420 },
  { name: 'Industrial Port',   color: 0x6b7280, x: 750,  z: -750, w: 420, h: 420 },
  { name: 'Rich Hills',        color: 0x7a5c2e, x: 750,  z: 750,  w: 420, h: 420 },
  { name: 'Airport',           color: 0x4b5563, x: 0,    z: -850, w: 500, h: 260 },
  { name: 'Criminal District', color: 0x8b1e1e, x: -850, z: 0,    w: 260, h: 500 },
  { name: 'Highway Ring',      color: 0x374151, x: 0,    z: 850,  w: 900, h: 260 },
];

export const VEHICLE_TYPES = {
  comet:  { name: 'Comet GT',       color: 0xd21f2b, maxSpeed: 52, accel: 16, grip: 0.92, seats: 2, price: 12000 },
  sedan:  { name: 'Sultan',         color: 0x2b3a67, maxSpeed: 38, accel: 11, grip: 0.9,  seats: 4, price: 4000 },
  suv:    { name: 'Patriot',        color: 0x374151, maxSpeed: 34, accel: 10, grip: 0.88, seats: 5, price: 6500 },
  taxi:   { name: 'Taxi',           color: 0xfacc15, maxSpeed: 36, accel: 11, grip: 0.9,  seats: 4, price: 3000 },
  truck:  { name: 'Benson',         color: 0x9ca3af, maxSpeed: 28, accel: 8,  grip: 0.85, seats: 2, price: 8000 },
  bike:   { name: 'PCJ 600',        color: 0x111827, maxSpeed: 48, accel: 18, grip: 0.8,  seats: 1, price: 9000 },
  police: { name: 'Police Cruiser', color: 0x111827, maxSpeed: 46, accel: 15, grip: 0.93, seats: 2, price: 0 },
};

export const WEAPONS = {
  fists:   { name: 'Fists',   damage: 12, rate: 2.5, mag: Infinity, range: 2.5, auto: false },
  pistol:  { name: 'Pistol',  damage: 22, rate: 3.5, mag: 12, range: 60,  auto: false },
  smg:     { name: 'SMG',     damage: 12, rate: 11,  mag: 32, range: 45,  auto: true, spread: 0.06 },
  shotgun: { name: 'Shotgun', damage: 16, rate: 1.2, mag: 6,  range: 22,  auto: false, pellets: 6, spread: 0.12 },
  rifle:   { name: 'Rifle',   damage: 45, rate: 1.6, mag: 20, range: 120, auto: false },
};

export const STORY_MISSIONS = [
  { id: 1, name: 'Welcome to Vice Bay', desc: 'Rico arrives. Meet your contact at the pier.', reward: 500, steps: [{ text: 'Reach the pier', x: -700, z: 700 }, { text: 'Meet the contact', x: -680, z: 680 }] },
  { id: 2, name: 'A Dangerous Favor', desc: 'Deliver the package to Little Havana.', reward: 900, steps: [{ text: 'Pick up the package', x: -400, z: -400 }, { text: 'Deliver it to the market', x: -750, z: -750 }] },
  { id: 3, name: 'Street Reputation', desc: 'Take down three rivals in the Criminal District.', reward: 1200, steps: [{ text: 'Find the rivals', x: -850, z: 0 }, { text: 'Finish the job', x: -850, z: 40 }] },
  { id: 4, name: 'The Getaway', desc: 'Steal a Comet GT and lose the cops.', reward: 1500, steps: [{ text: 'Steal the Comet GT downtown', x: 100, z: 100 }, { text: 'Lose the police', x: 500, z: 500 }] },
  { id: 5, name: 'The Missing Deal', desc: 'The deal went bad. Recover the cash at the port.', reward: 2000, steps: [{ text: 'Reach the Industrial Port', x: 750, z: -750 }, { text: 'Grab the cash', x: 780, z: -720 }] },
  { id: 6, name: 'Betrayal', desc: 'Your old friend sold you out. Confront him at Rich Hills.', reward: 2500, steps: [{ text: 'Reach the Rich Hills mansion', x: 750, z: 750 }, { text: 'Confront the traitor', x: 770, z: 770 }] },
  { id: 7, name: 'Night Run', desc: 'Smuggle cargo across the city at night.', reward: 3000, steps: [{ text: 'Pick up the cargo at the airport', x: 0, z: -850 }, { text: 'Drop it at Ocean Beach', x: -750, z: 750 }] },
  { id: 8, name: 'The Hidden Truth', desc: 'Find the ledger hidden in the Criminal District.', reward: 3500, steps: [{ text: 'Search the hideout', x: -850, z: -100 }, { text: 'Take the ledger to the beach', x: -750, z: 750 }] },
  { id: 9, name: 'Final Assault', desc: 'Storm the port compound and end the cartel.', reward: 5000, steps: [{ text: 'Breach the compound', x: 750, z: -750 }, { text: 'Take out the boss', x: 790, z: -790 }] },
  { id: 10, name: 'Blood & Destiny', desc: 'One last meeting at the pier. Rico decides who runs Vice Bay.', reward: 8000, steps: [{ text: 'Meet at the pier one last time', x: -700, z: 700 }, { text: 'Make your choice', x: -690, z: 690 }] },
];

export const SIDE_MISSIONS = [
  { id: 'taxi',      name: 'Taxi Fares',        desc: 'Pick up fares around the city.', reward: 300 },
  { id: 'race',      name: 'Street Racing',     desc: 'Beat the rival through the checkpoints.', reward: 800 },
  { id: 'delivery',  name: 'Vehicle Delivery',  desc: 'Deliver the car in one piece.', reward: 600 },
  { id: 'escape',    name: 'Police Escape',     desc: 'Lose a 3-star wanted level.', reward: 700 },
  { id: 'packages',  name: 'Hidden Packages',   desc: 'Find the glowing packages.', reward: 250 },
  { id: 'territory', name: 'Territory Takeover', desc: 'Clear the block of rivals.', reward: 900 },
  { id: 'timetrial', name: 'Time Trial',        desc: 'Reach the beach before the timer ends.', reward: 500 },
  { id: 'rescue',    name: 'Rescue Civilians',  desc: 'Escort civilians out of the danger zone.', reward: 650 },
];
