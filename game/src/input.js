// Keyboard and mouse input for Vice Bay. Held keys are read every frame by
// the game loop; one-shot presses (interact, enter vehicle, punch, pause,
// horn, confirm) are queued as bit flags and taken exactly once by the main
// loop, so a press that lands between two frames is never lost and never
// counted twice. Arrow keys mirror WASD, and dragging the mouse orbits the
// third-person camera while also turning the hero with it.
import { KEYS } from './config.js';

export const ACTION_INTERACT = 1;
export const ACTION_ENTER = 2;
export const ACTION_PUNCH = 4;
export const ACTION_PAUSE = 8;
export const ACTION_CONFIRM = 16;
export const ACTION_HORN = 32;

// Arrow key -> the WASD code it mirrors, so both layouts drive one state.
const ARROW_MIRROR = {
  ArrowUp: KEYS.forward,
  ArrowDown: KEYS.back,
  ArrowLeft: KEYS.left,
  ArrowRight: KEYS.right,
};

// One-shot code -> the flag it sets. Weapon keys and the mission key are
// handled separately because they act on the game state directly.
const PRESS_FLAGS = {
  [KEYS.interact]: ACTION_INTERACT,
  [KEYS.enterVehicle]: ACTION_ENTER,
  [KEYS.punch]: ACTION_PUNCH,
  [KEYS.pause]: ACTION_PAUSE,
  [KEYS.horn]: ACTION_HORN,
};

const WEAPON_KEYS = {
  [KEYS.weapon1]: 'fists',
  [KEYS.weapon2]: 'pistol',
  [KEYS.weapon3]: 'smg',
  [KEYS.weapon4]: 'shotgun',
  [KEYS.weapon5]: 'rifle',
};

const SCROLL_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export function createInput(G) {
  const keys = G.keys;
  let queued = 0;
  let lastX = 0;
  let lastY = 0;
  let dragging = false;

  function onKeyDown(event) {
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'BUTTON')) return;
    const code = ARROW_MIRROR[event.code] || event.code;
    keys[code] = true;
    if (event.code !== code) keys[event.code] = true;
    if (event.repeat) return;
    if (PRESS_FLAGS[code] !== undefined) {
      queued |= PRESS_FLAGS[code];
    } else if (event.code === 'Enter' || code === KEYS.jump) {
      queued |= ACTION_CONFIRM;
    } else if (WEAPON_KEYS[code]) {
      const want = WEAPON_KEYS[code];
      if (want === 'fists' || G.ownedWeapons.includes(want)) G.combat.weapon = want;
    } else if (code === KEYS.mission && G.toggleMissionMenu) {
      G.toggleMissionMenu();
    }
    if (SCROLL_KEYS.includes(event.code)) event.preventDefault();
  }

  function onKeyUp(event) {
    const code = ARROW_MIRROR[event.code] || event.code;
    keys[code] = false;
    keys[event.code] = false;
  }

  function onBlur() {
    for (const k of Object.keys(keys)) keys[k] = false;
    dragging = false;
    G.mouseFire = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

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
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    takeActions() {
      const taken = queued;
      queued = 0;
      return taken;
    },
  };
}
