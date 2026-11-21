// Keyboard + mouse input. All keys normalized to lowercase.
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
  const up = (e) => keys.delete(e.key.toLowerCase());
  const mousedown = (e) => { mouse.down = true; mouse.x = e.clientX; mouse.y = e.clientY; };
  const mouseup = () => { mouse.down = false; };
  const mousemove = (e) => { mouse.dx += e.movementX || 0; mouse.dy += e.movementY || 0; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('mousedown', mousedown);
  window.addEventListener('mouseup', mouseup);
  window.addEventListener('mousemove', mousemove);
  return {
    is: (k) => keys.has(k.toLowerCase()),
    wasPressed: (k) => pressed.has(k.toLowerCase()),
    endFrame: () => { pressed.clear(); mouse.dx = 0; mouse.dy = 0; },
    setEnabled: (v) => { enabled = v; if (!v) keys.clear(); },
    mouse,
    press: (k) => { keys.add(k); pressed.add(k); },
    release: (k) => { keys.delete(k); },
  };
}
