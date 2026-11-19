// Vice Bay: Blood & Destiny — tuning constants, district and vehicle tables.
export const CFG = {
  world: 2000,
  half: 1000,
  streetStep: 100,
  streetWidth: 14,
  sidewalk: 4,
  gravity: 22,
  walkSpeed: 6,
  runSpeed: 10,
  jumpSpeed: 8,
  startMoney: 500,
  startHealth: 100,

  districts: [
    { name: 'Downtown', cx: 0, cz: 0, r: 320, style: 'tower', color: 0x8fa3b8 },
    { name: 'Ocean Beach', cx: -700, cz: 600, r: 260, style: 'low', color: 0xe8d8a0 },
    { name: 'Little Havana', cx: 450, cz: -450, r: 260, style: 'mid', color: 0xe8a06a },
    { name: 'Industrial Port', cx: 800, cz: 550, r: 240, style: 'industrial', color: 0x9a8f7a },
    { name: 'Rich Hills', cx: -650, cz: -650, r: 240, style: 'villa', color: 0xb8d8a0 },
    { name: 'Airport', cx: 700, cz: -750, r: 260, style: 'flat', color: 0xa0b8c8 },
    { name: 'Criminal District', cx: -250, cz: 800, r: 220, style: 'mid', color: 0xc86868 },
    { name: 'Highway Ring', cx: 0, cz: 0, r: 980, style: 'ring', color: 0x888888 },
  ],

  cars: {
    sport: { label: 'Comet GT', top: 66, accel: 30, brake: 52, steer: 2.5, len: 4.4, wid: 2.0, color: 0xd21f3c, price: 45000 },
    sedan: { label: 'Bravado', top: 48, accel: 22, brake: 46, steer: 2.2, len: 4.6, wid: 2.0, color: 0x2f6fb2, price: 12000 },
    suv: { label: 'Patriot XL', top: 44, accel: 18, brake: 40, steer: 1.9, len: 5.0, wid: 2.2, color: 0x3a3a3a, price: 22000 },
    bike: { label: 'Night Hawk', top: 58, accel: 34, brake: 56, steer: 3.1, len: 2.2, wid: 0.8, color: 0x141414, price: 9000 },
    taxi: { label: 'Downtown Cab', top: 46, accel: 20, brake: 46, steer: 2.2, len: 4.6, wid: 2.0, color: 0xf5c518, price: 0 },
    truck: { label: 'Hauler', top: 38, accel: 14, brake: 34, steer: 1.6, len: 6.5, wid: 2.5, color: 0x777777, price: 30000 },
    police: { label: 'Interceptor', top: 60, accel: 30, brake: 56, steer: 2.7, len: 4.6, wid: 2.0, color: 0x111827, price: 0 },
  },

  weapons: {
    fists: { label: 'Fists', damage: 12, rate: 0.45, range: 2.4, auto: false, mag: Infinity, reserve: Infinity, spread: 0, pellets: 1 },
    pistol: { label: 'Pistol', damage: 26, rate: 0.28, range: 60, auto: false, mag: 12, reserve: 96, spread: 0.01, pellets: 1 },
    smg: { label: 'SMG', damage: 16, rate: 0.09, range: 45, auto: true, mag: 30, reserve: 180, spread: 0.06, pellets: 1 },
    shotgun: { label: 'Shotgun', damage: 14, rate: 0.8, range: 30, auto: false, mag: 6, reserve: 36, spread: 0.12, pellets: 6 },
    rifle: { label: 'Rifle', damage: 45, rate: 0.5, range: 120, auto: false, mag: 10, reserve: 60, spread: 0.004, pellets: 1 },
  },
  weaponOrder: ['fists', 'pistol', 'smg', 'shotgun', 'rifle'],

  heat: { steal: 1, shoot: 1, kill: 2, copKill: 2 },
  lightCycle: 9,
  rainGrip: 0.75,
};
