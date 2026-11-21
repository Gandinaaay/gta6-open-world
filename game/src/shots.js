// The 4 staged screenshot scenes (?shot=start|play|chase|night&seed=1).
// Each arranges the world deterministically, then main.js renders frames
// and sets window.__shotReady when the scene is settled.

export function stageShot(ctx, name) {
  const { world, player, vehicles, police, hud } = ctx;
  // Clear any leftover police.
  police.clear();
  hud.showTitle(false);
  hud.showPause(false);
  hud.showMenu(false);

  if (name === 'start') {
    world.setTimeOfDay(0.06); // dawn
    world.setWeather('clear');
    player.reset(0, 40);
    const car = vehicles.spawn('comet', 6, 30, Math.PI);
    car.driver = null;
    ctx.shotCamera = { x: -30, y: 26, z: -60, look: [0, 10, 60] };
    hud.showTitle(true);
    return 'start';
  }

  if (name === 'play') {
    world.setTimeOfDay(0.3); // morning
    world.setWeather('clear');
    const car = vehicles.spawn('comet', 0, 0, 0);
    car.driver = 'player';
    player.enterCar(car);
    car.speed = 22;
    // A little traffic around downtown.
    vehicles.spawn('sedan', -12, 120, 0).driver = 'traffic';
    vehicles.spawn('taxi', 12, -80, Math.PI).driver = 'traffic';
    ctx.shotDrive = { speed: 22, steer: 0 };
    return 'play';
  }

  if (name === 'chase') {
    world.setTimeOfDay(0.62); // dusk
    world.setWeather('clear');
    const car = vehicles.spawn('comet', 0, 0, 0);
    car.driver = 'player';
    player.enterCar(car);
    car.speed = 30;
    police.addHeat(3);
    // Bring the pursuit cars into the frame AHEAD of the player: the chase
    // camera looks forward, so cops behind the player are never visible.
    const cops = vehicles.list.filter((c) => c.driver === 'police');
    cops.forEach((c, i) => {
      c.pos.set(-10 - i * 4, 0, 60 + i * 50);
      c.heading = 0;
      c.speed = 30;
    });
    ctx.shotDrive = { speed: 30, steer: 0 };
    return 'chase';
  }

  // night: beach race in the rain — on the road, not the grass.
  world.setTimeOfDay(0.8);
  world.setWeather('rain');
  const car = vehicles.spawn('comet', -800, 600, 0);
  car.driver = 'player';
  player.enterCar(car);
  car.speed = 26;
  vehicles.spawn('sedan', -800, 720, 0).driver = 'traffic';
  ctx.shotDrive = { speed: 26, steer: 0 };
  return 'night';
}
