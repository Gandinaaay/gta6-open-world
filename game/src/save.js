// localStorage save: money, rep, progress, owned cars, upgrades, time + weather.
const KEY = 'vicebay-save-v1';

export function saveGame(state) {
  try {
    const data = {
      money: state.money,
      rep: state.rep,
      storyIndex: state.storyIndex,
      owned: state.owned || [],
      upgrades: state.upgrades || {},
      timeOfDay: state.timeOfDay,
      weather: state.weather,
      playerPos: state.playerPos ? { x: state.playerPos.x, z: state.playerPos.z } : null,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
