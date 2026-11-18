// Keyboard and mouse input for Vice Bay. Held keys are read every frame; one-shot
// presses (interact, enter vehicle, punch, weapon switch, pause, horn) are queued and
// taken once by the loop, so a press between two frames is never lost or double-counted.
// Mouse drag orbits the third-person camera; wheel zooms; left click shoots/punches.
import { KEYS } from './config.js';

export const ACTION_INTERACT = 1;
export const ACTION_ENTER = 2;
export const ACTION_PUNCH = 4;
export const ACTION_PAUSE = 8;
export const ACTION_CONFIRM = 16;
export const ACTION_HORN = 32;

export function createInput(G) {
  const keys = G.keys;
  let actions = 0;
  let lastX = 0;
  let lastY = 0;
  let dragging = false;

  window.addEventListener('keydown', (event) => {
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON')) return;
    keys[event.code] = true;
    if (event.repeat) return;
    if (event.code === KEYS.interact) actions |= ACTION_INTERACT;
    else if (event.code === KEYS.enterVehicle) actions |= ACTION_ENTER;
    else if (event.code === KEYS.punch) actions |= ACTION_PUNCH;
    else if (event.code === KEYS.pause) actions |= ACTION_PAUSE;
    else if (event.code === KEYS.horn) actions |= ACTION_HORN;
    else if (event.code === 'Enter' || event.code === KEYS.jump) actions |= ACTION_CONFIRM;
    else if (event.code === KEYS.weapon1) G.combat.weapon = 'fists';
    else if (event.code === KEYS.weapon2 && G.ownedWeapons.includes('pistol')) G.combat.weapon = 'pistol';
    else if (event.code === KEYS.weapon3 && G.ownedWeapons.includes('smg')) G.combat.weapon = 'smg';
    else if (event.code === KEYS.weapon4 && G.ownedWeapons.includes('shotgun')) G.combat.weapon = 'shotgun';
    else if (event.code === KEYS.weapon5 && G.ownedWeapons.includes('rifle')) G.combat.weapon = 'rifle';
    else if (event.code === KEYS.mission) G.toggleMissionMenu && G.toggleMissionMenu();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
  });

  const canvas = G.renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    G.audio.unlock();
    if (event.button === 0) G.mouseFire = true;
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
    G.mouseFire = false;
  });
  window.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    // Drag left/right orbits the camera; up/down tilts the player view a little.
    G.camOrbit += dx * 0.005;
    if (Math.abs(dx) > 2) G.player.yaw += dx * 0.002;
  });
  canvas.addEventListener('wheel', (event) => {
    G.camOrbit += event.deltaY * 0.0005;
    event.preventDefault();
  }, { passive: false });

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
