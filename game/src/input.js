// Keyboard + mouse state. All keys are normalised to lowercase so
// 'Escape' and 'Shift' match the lowercase checks in main.js / player.js.
export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  let enabled = true;
  const mouse = { dx: 0, dy: 0, down: false, x: 0, y: 0 };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const down = (e) => {
    if (!enabled) return;
    const k = e.key.toLowerCase();
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  };
  const up = (e) => { keys.delete(e.key.toLowerCase()); };
  const mouseDown = (e) => {
    mouse.down = true; dragging = true; lastX = e.clientX; lastY = e.clientY;
    mouse.x = e.clientX; mouse.y = e.clientY;
  };
  const mouseMove = (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (!dragging) return;
    mouse.dx += e.clientX - lastX;
    mouse.dy += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
  };
  const mouseUp = () => { mouse.down = false; dragging = false; };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('mousedown', mouseDown);
  window.addEventListener('mousemove', mouseMove);
  window.addEventListener('mouseup', mouseUp);
  window.addEventListener('blur', () => { keys.clear(); pressed.clear(); dragging = false; });

  return {
    mouse,
    is(k) { return keys.has(k.toLowerCase()); },
    wasPressed(k) { return pressed.has(k.toLowerCase()); },
    endFrame() { pressed.clear(); mouse.dx = 0; mouse.dy = 0; },
    setEnabled(v) { enabled = v; if (!v) { keys.clear(); pressed.clear(); } },
    press(k) { const key = k.toLowerCase(); if (!keys.has(key)) pressed.add(key); keys.add(key); },
    release(k) { keys.delete(k.toLowerCase()); },
  };
}
