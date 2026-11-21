// Vice Bay: Blood & Destiny — screenshot staging for ?shot=start|play|chase|night.
// Each shot places the camera, the player and (where it fits) a car and police, then
// paints the scene twice and sets window.__shotReady so the screenshot tool knows
// the frame is final. Deterministic: the same seed stages the same picture.

export const SHOT_NAMES = ['start', 'play', 'chase', 'night'];

export function stageShot(kind, api) {
  const { player, camera, worldState, police, hud, spawnCar } = api;
  if (kind === 'start') {
    // On foot in Downtown at dawn: the player, the streets and the towers.
    player.teleport(0, 20);
    camera.set(6, 6, 32, 0, 2, 20);
    worldState.setTime(0.32);
  } else if (kind === 'play') {
    // Behind the wheel of the Vice Sedan on a Downtown avenue, morning.
    player.teleport(0, 100);
    const car = spawnCar('Vice Sedan', 0, 100, 0);
    api.enterVehicle(car);
    camera.set(12, 12, 78, 0, 3, 100);
    worldState.setTime(0.38);
  } else if (kind === 'chase') {
    // The Interceptor, three stars, cruisers closing in — afternoon.
    player.teleport(0, 60);
    const car = spawnCar('Interceptor', 0, 60, 0);
    api.enterVehicle(car);
    police.addCrime(3.0);
    police.update(0.5, player.position, 20);
    camera.set(16, 12, 36, 0, 3, 58);
    worldState.setTime(0.62);
  } else if (kind === 'night') {
    // Vice Bay after dark: lit windows, streetlights, the player on foot.
    player.teleport(40, 40);
    camera.set(66, 26, 14, 40, 4, 40);
    worldState.setTime(0.02);
  } else {
    player.teleport(0, 20);
    camera.set(6, 6, 32, 0, 2, 20);
    worldState.setTime(0.32);
  }
  // The HUD is only refreshed by the game loop, which does not run for shots:
  // sync it once here so the clock, the wanted stars and the minimap match the
  // staged scene before the screenshot is taken.
  hud.setClock(worldState.clockText(), worldState.isNight());
  hud.setWanted(police.stars);
  hud.drawMinimap(
    player.position,
    null,
    police.cruisers.map((c) => c.position),
    null,
  );
  // Paint twice so shadows and the first frame settle, then signal readiness.
  api.render();
  api.render();
  window.__shotReady = true;
}
