// Keyboard + mouse input. Edge-triggered "pressed" keys are consumed each frame.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.dragging = false;
    this.mouseDown = false;
    this._lx = 0;
    this._ly = 0;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.dragging = false; });
    window.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      this.dragging = true;
      this._lx = e.clientX; this._ly = e.clientY;
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; this.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      this.mouseDX += e.clientX - this._lx;
      this.mouseDY += e.clientY - this._ly;
      this._lx = e.clientX; this._ly = e.clientY;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(code) { return this.keys.has(code); }
  hit(code) { return this.pressed.has(code); }
  consume(code) { this.pressed.delete(code); return this.keys.has(code); }

  // Movement axes from WASD / arrows. x: strafe right, z: forward.
  axes() {
    let x = 0, z = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) z += 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z -= 1;
    return { x, z };
  }

  get forward() { return this.down('KeyW') || this.down('ArrowUp'); }
  get back() { return this.down('KeyS') || this.down('ArrowDown'); }
  get handbrake() { return this.down('Space'); }
  get run() { return this.down('ShiftLeft') || this.down('ShiftRight'); }
  get fire() { return this.mouseDown; }

  endFrame() {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
}
