// Staged screenshot scenes (seed 11, fresh staging for round 12).
// Each returns the shot name; main.js renders 45 frames then sets window.__shotReady.
export function stageShot(ctx, name) {
  const { world, player, vehicles, police, hud, traffic } = ctx;
  hud.showHud();
  if (name === 'start') {
    // Downtown sunrise: Rico on foot at the plaza, Comet GT parked behind.
    world.setTimeOfDay(0.02);
    world.setWeather('clear');
    player.reset(0, 40);
    const car = vehicles.spawn('comet', 6, 48, Math.PI);
    car.driver = 'player';
    traffic.update(0.01, player.pos, 'clear');
    ctx.shotCamera = { pos: [14, 5.5, 62], look: [0, 2, 0] };
    hud.showTitle();
    return 'start';
  }
  if (name === 'play') {
    // Ocean Beach sunset drive: sedan on the beach road, HUD + minimap live.
    world.setTimeOfDay(0.48);
    world.setWeather('clear');
    const car = vehicles.spawn('sedan', -800, 560, 0);
    car.driver = 'player';
    player.enterCar(car);
    car.speed = 22;
    vehicles.spawn('taxi', -800, 640, 0).driver = 'traffic';
    vehicles.spawn('suv', -800, 480, 0).driver = 'traffic';
    ctx.shotDrive = { speed: 22, steer: 0 };
    return 'play';
  }
  if (name === 'chase') {
    // Downtown night, 4 stars: Comet GT with police interceptors + helicopter.
    world.setTimeOfDay(0.78);
    world.setWeather('clear');
    const car = vehicles.spawn('comet', 0, -200, 0);
    car.driver = 'player';
    player.enterCar(car);
    car.speed = 30;
    police.addHeat(4);
    // addHeat only sets the level — pursuit cars spawn inside police.update,
    // so run it a few times first, then reposition the spawned cars.
    for (let k = 0; k < 4; k++) police.update(0.5, car.pos, true, 30);
    // Interceptors in the lanes beside/ahead of the player, same direction and
    // slightly slower, so the player closes on them and they stay in frame.
    const cops = vehicles.list.filter((c) => c.driver === 'police');
    cops.forEach((c, i) => {
      c.pos.set(i % 2 === 0 ? -10 : 10, 0, -180 + i * 15);
      c.heading = 0;
      c.speed = 24;
    });
    ctx.shotDrive = { speed: 30, steer: 0 };
    return 'chase';
  }
  // night: airport rain — truck on the runway road, runway lights ahead.
  // The truck drives +X, so the chase camera must look along +X, not +Z.
  world.setTimeOfDay(0.92);
  world.setWeather('rain');
  const car = vehicles.spawn('truck', -200, -800, Math.PI / 2);
  car.driver = 'player';
  player.enterCar(car);
  car.speed = 24;
  vehicles.spawn('sedan', -120, -800, Math.PI / 2).driver = 'traffic';
  // Truck moves ~18 m in the 45 shot frames: frame it from behind-left.
  ctx.shotCamera = { pos: [-200, 5.5, -814], look: [-140, 2, -800] };
  ctx.shotDrive = { speed: 24, steer: 0 };
  return 'night';
}
