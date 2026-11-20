// Vice Bay — localStorage save: money, reputation, story progress, time of
// day, weather, garage cars and bought upgrades.

import { CFG } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      version: 1,
      money: state.money,
      rep: state.rep,
      storyIndex: state.storyIndex,
      sideDone: [...state.sideDone],
      timeOfDay: state.timeOfDay,
      weather: state.weather,
      upgrades: state.upgrades,
      garage: state.garage,
      savedAt: Date.now(),
    };
    localStorage.setItem(CFG.saveKey, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(CFG.saveKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(CFG.saveKey);
  } catch {
    // ignore
  }
}
