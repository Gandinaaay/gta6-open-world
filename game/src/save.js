// Vice Bay: Blood & Destiny — saving and loading with localStorage.
// Only the player's progress is stored: money, owned cars, finished missions and
// the best chase survived. Nothing else leaves the machine.

import { WORLD } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(WORLD.saveKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return {
      money: typeof data.money === 'number' ? data.money : 500,
      garage: Array.isArray(data.garage) ? data.garage.filter((x) => typeof x === 'string') : ['Vice Sedan'],
      missionsDone: Array.isArray(data.missionsDone) ? data.missionsDone : [],
      bestChase: typeof data.bestChase === 'number' ? data.bestChase : 0,
      muted: data.muted === true,
    };
  } catch {
    return null;
  }
}

export function saveSave(state) {
  try {
    window.localStorage.setItem(WORLD.saveKey, JSON.stringify({
      money: state.money,
      garage: state.garage,
      missionsDone: state.missionsDone,
      bestChase: state.bestChase,
      muted: state.muted,
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(WORLD.saveKey);
  } catch { /* storage unavailable; nothing to clear */ }
}
