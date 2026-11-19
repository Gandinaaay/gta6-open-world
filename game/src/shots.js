// Staged screenshot scenes for ?shot=start|play|chase|night&seed=1.
// Stages the scene deterministically, then sets window.__shotReady.
export function stageShot(g, name) {
  const ready = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  };
  // A few extra cars parked/driving on the road grid, headings along the street axes.
  const shotCars = () => {
    const spots = [
      { type: 'sedan', x: 100, z: 3.5, heading: Math.PI / 2 },
      { type: 'taxi', x: -100, z: -3.5, heading: -Math.PI / 2 },
      { type: 'suv', x: 3.5, z: 200, heading: 0 },
      { type: 'sport', x: -3.5, z: -200, heading: Math.PI },
    ];
    for (const s of spots) g.vehicles.spawn(s.type, s.x, s.z, s.heading, { ai: false });
  };

  if (name === 'start') {
    g.world.setTime(6.2);
    g.world.setWeather('clear');
    g.state = 'title';
    g.hud.showOverlay('title', true);
    ready();
    return;
  }

  g.startNewGame();
  if (name === 'play') {
    g.world.setTime(14);
    g.world.setWeather('clear');
    g.giveCar('sport', 0, 0, Math.PI / 2);
    g.missions.startStory(0);
    shotCars();
    ready();
    return;
  }
  if (name === 'chase') {
    g.world.setTime(21.5);
    g.world.setWeather('clear');
    g.giveCar('sport', 0, 0, Math.PI / 2);
    g.missions.startStory(3);
    g.police.setWanted(3, g.audio);
    shotCars();
    ready();
    return;
  }
  if (name === 'night') {
    g.world.setTime(22);
    g.world.setWeather('rain');
    g.giveCar('sport', -700, 600, Math.PI / 2);
    g.missions.startSide('race');
    shotCars();
    ready();
    return;
  }
  // Unknown shot: just start the game.
  g.world.setTime(10);
  ready();
}
