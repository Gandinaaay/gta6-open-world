// Keyboard + mouse input for Vice Bay. WASD move/drive, mouse orbits the
// camera, E interacts, F punches, click shoots, G garage, H horn, P pause.

export function createInput(G) {
  const input = {
    keys: new Set(),
    prevKeys: new Set(),
    mouseDX: 0,
    mouseDY: 0,
    clicked: false,
    clickX: 0,
    clickY: 0,
    locked: false,
  };
  const GAME_KEYS = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight',
    'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyM', 'KeyP', 'KeyR', 'ArrowUp',
    'ArrowDown', 'ArrowLeft', 'ArrowRight',
  ]);
  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.code === 'KeyP' && !e.repeat) G.paused = !G.paused;
    input.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => input.keys.clear());
  const canvasHost = document.getElementById('app');
  canvasHost.addEventListener('mousedown', (e) => {
    input.clicked = true;
    input.clickX = e.clientX;
    input.clickY = e.clientY;
  });
  window.addEventListener('mouseup', () => { input.clicked = false; });
  window.addEventListener('mousemove', (e) => {
    if (e.buttons & 1) {
      input.mouseDX += e.movementX || 0;
      input.mouseDY += e.movementY || 0;
    }
  });
  // touch: left half = move stick (simple), right half drag = camera
  let touchStart = null;
  canvasHost.addEventListener('touchstart', (e) => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  canvasHost.addEventListener('touchmove', (e) => {
    if (!touchStart) return;
    const t = e.touches[0];
    input.mouseDX += (t.clientX - touchStart.x) * 0.6;
    input.mouseDY += (t.clientY - touchStart.y) * 0.6;
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  G.input = input;
  return input;
}

// Edge-triggered key: true only on the frame the key goes down.
// Call endFrameInput(G) once per frame after all systems update.
export function pressed(G, code) {
  return G.input.keys.has(code) && !G.input.prevKeys.has(code);
}

export function endFrameInput(G) {
  G.input.prevKeys = new Set(G.input.keys);
}
