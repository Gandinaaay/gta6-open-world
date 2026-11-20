// Vice Bay — screenshot staging: the 4 deterministic scenes the dossier
// shows (?shot=start|play|chase|night&seed=1). Each scene sets the time,
// weather, player position and wanted level, then raises
// window.__shotReady so the capture driver knows the frame is ready.
// Cars are spawned road-aligned so the shots look composed, not random.

export function stageShot(mode, ctx) {
  switch (mode) {
    case 'start': {
      // Dawn title over the city: morning light, clear sky, player on the
      // Downtown road with the towers rising behind them to the north.
      // (Camera sits south of the player, so heading 0 faces it.)
      ctx.setTime(0.27);
      ctx.setWeather('clear');
      ctx.placePlayer(0, 40, 0);
      ctx.setWanted(0);
      break;
    }
    case 'play': {
      // Midday driving Downtown: red Comet GT on the road, objective ahead.
      ctx.setTime(0.45);
      ctx.setWeather('clear');
      ctx.placePlayer(0, 40, 0);
      ctx.putCar('sport', 0, 44, 0);
      ctx.enterCar();
      ctx.setWanted(0);
      break;
    }
    case 'chase': {
      // Night pursuit: 3 wanted stars, two police interceptors closing in.
      ctx.setTime(0.82);
      ctx.setWeather('clear');
      ctx.placePlayer(160, 160, Math.PI / 2);
      ctx.putCar('sedan', 160, 164, Math.PI / 2);
      ctx.enterCar();
      ctx.setWanted(3);
      ctx.spawnPolice(2);
      break;
    }
    case 'night': {
      // Beach race in the rain at night: wet road, headlights, rain streaks.
      ctx.setTime(0.96);
      ctx.setWeather('rain');
      ctx.placePlayer(-480, 480, Math.PI / 2);
      ctx.putCar('sport', -480, 484, Math.PI / 2);
      ctx.enterCar();
      ctx.putCar('sport', -480, 470, Math.PI / 2);
      ctx.setWanted(0);
      break;
    }
    default:
      return false;
  }
  ctx.setShotReady();
  return true;
}

export const SHOT_MODES = ['start', 'play', 'chase', 'night'];
