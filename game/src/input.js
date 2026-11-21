// Keyboard + mouse input. `pressed` holds keys hit since the last frame
// (edge-triggered); main.js clears it every frame. Every key is stored
// lowercased, so 'Escape' and 'Shift' match the lowercase checks in the game.

export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { dx: 0, dy: 0, down: false, x: 0, y: 0 };
  let enabled = true;

  const down = (e) => {
    if (!enabled) return;
    const k = e.key.toLowerCase();
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  };
  const up = (e) => { keys.delete(e.key.toLowerCase()); };
  const move = (e) => { mouse.dx += e.movementX || 0; mouse.dy += e.movementY || 0; mouse.x = e.clientX; mouse.y = e.clientY; };
  const mdown = (e) => { mouse.down = true; mouse.x = e.clientX; mouse.y = e.clientY; };
  const mup = () => { mouse.down = false; };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('mousemove', move);
  window.addEventListener('mousedown', mdown);
  window.addEventListener('mouseup', mup);

  return {
    keys, pressed, mouse,
    is(k) { return keys.has(k); },
    wasPressed(k) { return pressed.has(k); },
    endFrame() { pressed.clear(); mouse.dx = 0; mouse.dy = 0; },
    setEnabled(v) { enabled = v; },
    // Test helpers: simulate a key press without a real keyboard.
    press(k) { if (!keys.has(k)) pressed.add(k); keys.add(k); },
    release(k) { keys.delete(k); },
  };
}
