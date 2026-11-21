// The 4 staged screenshot scenes. Staging is deliberately different from every
// earlier round: seed 7, late-morning beach on foot, afternoon SUV in Little
// Havana, dusk 4-star chase in the Industrial Port, deep-night bike in the rain.
export function stageShot(ctx, name) {
  const { world, player, vehicles, police, hud, traffic } = ctx;
  ctx.state = 'shot';

  if (name === 'start') {
    // Late morning on the Ocean Beach boardwalk, Rico on foot, taxi waiting.
    world.setTimeOfDay(0.18);
    world.setWeather('clear');
    player.reset(-850, 500);
    player.update(0.001, { is: () => false, wasPressed: () => false }, ctx.city.colliders, 0);
    const taxi = vehicles.spawn('taxi', -830, 520, Math.PI / 2);
    taxi.driver = 'traffic';
    vehicles.spawn('sedan', -800, 470, Math.PI);
    ctx.shotCamera = { mode: 'fixed', pos: [-872, 9, 468], look: [-830, 2, 510] };
    hud.showTitle(true);
    return 'start';
  }

  if (name === 'play') {
    // Afternoon drive: Rico in an SUV down the x=-400 road in Little Havana.
    world.setTimeOfDay(0.45);
    world.setWeather('clear');
    const car = vehicles.spawn('suv', -400, -560, Math.PI);
    car.driver = 'player';
    player.enterCar(car);
    car.speed = 24;
    vehicles.spawn('taxi', -400, -680, Math.PI).driver = 'traffic';
    vehicles.spawn('sedan', -400, -740, Math.PI).driver = 'traffic';
    ctx.shotCamera = { mode: 'follow', car, off: [10, 4.5, 10] };
    ctx.shotDrive = { speed: 24, steer: 0 };
    return 'play';
  }

  if (name === 'chase') {
    // Dusk in the Industrial Port: 4-star wanted, interceptors closing in
    // head-on down the z=-600 road.
    world.setTimeOfDay(0.55);
    world.setWeather('clear');
    const car = vehicles.spawn('sedan', 600, -600, Math.PI / 2);
    car.driver = 'player';
    player.enterCar(car);
    car.speed = 30;
    police.addHeat(4);
    const cops = vehicles.list.filter((c) => c.driver === 'police');
    cops.forEach((c, i) => {
      // Close ahead: 45 shot frames are only 0.72 s of game time, so the
      // interceptors must start near the player to be in the frame.
      c.pos.set(680 + i * 50, 0, -600);
      c.heading = Math.PI;
      c.speed = 32;
    });
    ctx.shotCamera = { mode: 'follow', car, off: [-14, 7, -6] };
    ctx.shotDrive = { speed: 30, steer: 0 };
    return 'chase';
  }

  // night: deep-night bike ride in the rain down the x=600 road, Rich Hills.
  world.setTimeOfDay(0.85);
  world.setWeather('rain');
  const car = vehicles.spawn('bike', 600, 650, 0);
  car.driver = 'player';
  player.enterCar(car);
  car.speed = 28;
  vehicles.spawn('suv', 600, 800, 0).driver = 'traffic';
  vehicles.spawn('taxi', 600, 860, Math.PI).driver = 'traffic';
  ctx.shotCamera = { mode: 'follow', car, off: [8, 4, -12] };
  ctx.shotDrive = { speed: 28, steer: 0 };
  return 'night';
}
