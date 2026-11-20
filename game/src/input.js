// Vice Bay — keyboard + mouse input with edge detection.
// `pressed(code)` is true only on the frame the key went down, so menu keys
// and weapon switches fire once instead of every frame.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.dragging = false;
    this.canvas = canvas;
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.justPressed.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      if (!this.dragging) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    };
    this._onMouseDown = (e) => {
      if (e.button === 0) { this.dragging = true; this.mouseDown = true; }
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) { this.dragging = false; this.mouseDown = false; }
    };
    this._onBlur = () => { this.keys.clear(); this.dragging = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('blur', this._onBlur);
  }

  down(code) {
    return this.keys.has(code);
  }
  pressed(code) {
    return this.justPressed.has(code);
  }
  axis(neg, pos) {
    return (this.keys.has(pos) ? 1 : 0) - (this.keys.has(neg) ? 1 : 0);
  }
  /** Call once per frame after the game has read the edges. */
  endFrame() {
    this.justPressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('blur', this._onBlur);
  }
}
