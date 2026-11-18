// Keyboard and mouse input for Vice Bay. Keys held down are read every frame;
// one-shot presses (interact, enter vehicle, punch, pause, horn, confirm) are
// queued as bit flags and taken exactly once by the main loop, so a press that
// lands between two frames is never lost and never counted twice.
// Arrow keys mirror WASD, and dragging the mouse orbits the third-person camera.
import { KEYS } from './config.js';

export const ACTION_INTERACT = 1;
export const ACTION_ENTER = 2;
export const ACTION_PUNCH = 4;
export const ACTION_PAUSE = 8;
export const ACTION_CONFIRM = 16;
export const ACTION_HORN = 32;

// Arrow key -> the WASD code it mirrors, so both layouts drive the same state.
const ARROW_MIRROR = {
  ArrowUp: KEYS.forward,
  ArrowDown: KEYS.back,
  ArrowLeft: KEYS.left,
  ArrowRight: KEYS.right,
};

export function createInput(G) {
  const keys = G.keys;
  let actions = 0;
  let lastX = 0;
  let lastY = 0;
  let dragging = false;

  window.addEventListener('keydown', (event) => {
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON')) return;
    const code = ARROW_MIRROR[event.code] || event.code;
    keys[code] = true;
    if (event.code !== code) keys[event.code] = true;
    if (event.repeat) return;
    if (code === KEYS.interact) actions |= ACTION_INTERACT;
    else if (code === KEYS.enterVehicle) actions |= ACTION_ENTER;
    else if (code === KEYS.punch) actions |= ACTION_PUNCH;
    else if (code === KEYS.pause) actions |= ACTION_PAUSE;
    else if (code === KEYS.horn) actions |= ACTION_HORN;
    else if (event.code === 'Enter' || code === KEYS.jump) actions |= ACTION_CONFIRM;
    else if (code === KEYS.weapon1) G.combat.weapon = 'fists';
    else if (code === KEYS.weapon2 && G.ownedWeapons.includes('pistol')) G.combat.weapon = 'pistol';
    else if (code === KEYS.weapon3 && G.ownedWeapons.includes('smg')) G.combat.weapon = 'smg';
    else if (code === KEYS.weapon4 && G.ownedWeapons.includes('shotgun')) G.combat.weapon = 'shotgun';
    else if (code === KEYS.weapon5 && G.ownedWeapons.includes('rifle')) G.combat.weapon = 'rifle';
    else if (code === KEYS.mission) G.toggleMissionMenu && G.toggleMissionMenu();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    const code = ARROW_MIRROR[event.code] || event.code;
    keys[code] = false;
    keys[event.code] = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    dragging = false;
    G.mouseFire = false;
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
    // Dragging left/right orbits the camera and turns the hero with it.
    G.camOrbit += dx * 0.005;
    if (Math.abs(dx) > 2) G.player.yaw += dx * 0.002;
    G.camPitch = Math.max(-0.6, Math.min(0.6, (G.camPitch || 0) - dy * 0.002));
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
