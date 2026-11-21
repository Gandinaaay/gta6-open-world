// localStorage save / load.
import { CONFIG } from './config.js';

export function saveGame(state) {
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}
export function loadGame() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
export function clearSave() {
  try { localStorage.removeItem(CONFIG.saveKey); } catch (e) { /* ignore */ }
}
