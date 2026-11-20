// localStorage save: money, rep, health, story progress, time, weather,
// player position. Nothing leaves the browser.

import { CONFIG } from './config.js';

export function saveGame(state) {
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(state));
    return true;
  } catch { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearSave() {
  try { localStorage.removeItem(CONFIG.saveKey); } catch { /* ignore */ }
}
