// Vice Bay: Blood & Destiny — keyboard and mouse input.
// WASD/arrows move, Shift runs, Space jumps, E interacts, 1-4 switch weapons,
// P pauses, M mutes. Mouse click (or holding it) fires the current weapon.

export const ACTION_CONFIRM = 'confirm';

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    forward: false,
    back: false,
    left: false,
    right: false,
    run: false,
    jump: false,
    interact: false,
    firing: false,
    pausePressed: false,
    mutePressed: false,
    weaponSlot: 0,
  };
  let jumpQueued = false;
  let interactQueued = false;

  const MOVE_KEYS = {
    KeyW: 'forward', ArrowUp: 'forward',
    KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };

  function refresh() {
    state.forward = keys.has('KeyW') || keys.has('ArrowUp');
    state.back = keys.has('KeyS') || keys.has('ArrowDown');
    state.left = keys.has('KeyA') || keys.has('ArrowLeft');
    state.right = keys.has('KeyD') || keys.has('ArrowRight');
    state.run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    // Queued presses survive until the game step reads them: OR them in, never
    // overwrite, so a keydown between steps is not lost by the next refresh.
    state.jump = jumpQueued || state.jump;
    state.interact = interactQueued || state.interact;
    jumpQueued = false;
    interactQueued = false;
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space') {
      jumpQueued = true;
      e.preventDefault();
    }
    if (e.code === 'KeyE') interactQueued = true;
    if (e.code === 'KeyP' || e.code === 'Escape') state.pausePressed = true;
    if (e.code === 'KeyM') state.mutePressed = true;
    if (e.code === 'Digit1') state.weaponSlot = 0;
    if (e.code === 'Digit2') state.weaponSlot = 1;
    if (e.code === 'Digit3') state.weaponSlot = 2;
    if (e.code === 'Digit4') state.weaponSlot = 3;
    if (MOVE_KEYS[e.code] || e.code === 'Space') e.preventDefault();
    refresh();
  }

  function onKeyUp(e) {
    keys.delete(e.code);
    refresh();
  }

  function onMouseDown(e) {
    if (e.button === 0) state.firing = true;
  }

  function onMouseUp(e) {
    if (e.button === 0) state.firing = false;
  }

  function onBlur() {
    keys.clear();
    state.firing = false;
    refresh();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  if (canvas) {
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
  }

  function consumePause() {
    const v = state.pausePressed;
    state.pausePressed = false;
    return v;
  }

  function consumeMute() {
    const v = state.mutePressed;
    state.mutePressed = false;
    return v;
  }

  return { state, refresh, consumePause, consumeMute };
}
