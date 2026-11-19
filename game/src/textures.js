// Procedural canvas textures: every surface in Vice Bay is painted from code
// at boot, so the game ships zero image files and makes zero network requests.
// Each texture is a small canvas, a 2D painter and a repeat; windows, road
// paint, sand and water are all drawn before the first frame. The sunset
// texture feeds the dawn/dusk sun disc in world.js. A painter receives the
// context and the canvas size and draws with plain 2D calls.
function makeTexture(w, h, paint, rx = 1, ry = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  paint(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = 4;
  return tex;
}

function paintWindows(ctx, w, h, cols, rows, litChance, random) {
  const cw = (w - 12) / cols;
  const ch = (h - 12) / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = random() < litChance;
      ctx.fillStyle = lit ? (random() < 0.7 ? '#ffd98a' : '#9fd8ff') : '#1c2733';
      ctx.fillRect(6 + c * cw, 6 + r * ch, cw - 5, ch - 6);
    }
  }
}

function speckle(ctx, w, h, count, colors, size) {
  for (let i = 0; i < count; i += 1) {
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}

export function buildingTexture(base, random, floors = 12) {
  return makeTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    // Dark caps top and bottom, and a band halfway up that breaks the
    // facade into two blocks.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, w, 8);
    ctx.fillRect(0, h - 10, w, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, Math.floor(h / 2), w, 6);
    paintWindows(ctx, w, h, 6, floors, 0.45, random);
  });
}

export function houseTexture(base, random) {
  return makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5a3a28';
    ctx.fillRect(0, 0, w, 26);
    ctx.fillStyle = '#2b1d16';
    ctx.fillRect(w / 2 - 10, h - 34, 20, 34);
    paintWindows(ctx, w, h, 3, 2, 0.6, random);
  });
}

export function roadTexture() {
  return makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2b2e33';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 40, ['#34383f'], 2);
    // Centre dashes and edge lines, worn a little at random.
    ctx.fillStyle = '#d8c84a';
    ctx.fillRect(w / 2 - 2, 8, 4, 40);
    ctx.fillRect(w / 2 - 2, h - 48, 4, 40);
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(4, 0, 3, h);
    ctx.fillRect(w - 7, 0, 3, h);
  }, 1, 80);
}

export function sidewalkTexture() {
  return makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#8d8d85';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#6f6f68';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i += 1) {
      ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(w, i * 32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, h); ctx.stroke();
    }
  }, 1, 40);
}

export function grassTexture() {
  return makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4a7c3a';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 500, ['#557f42', '#3f6b31'], 3);
  }, 24, 24);
}

export function sandTexture() {
  return makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d9c08a';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 400, ['#c9ae72', '#e8d5a4'], 2);
  }, 6, 40);
}

export function waterTexture() {
  return makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#1e6f8e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i += 1) {
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(30, y - 6, 70, y + 6, w, y);
      ctx.stroke();
    }
  }, 10, 10);
}

export function runwayTexture() {
  return makeTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#23262b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f5f5f5';
    for (let y = 8; y < h; y += 32) ctx.fillRect(w / 2 - 3, y, 6, 18);
    ctx.fillStyle = '#e8b93c';
    ctx.fillRect(6, 0, 4, h);
    ctx.fillRect(w - 10, 0, 4, h);
  }, 1, 4);
}

export function containerTexture(color) {
  return makeTexture(128, 64, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('VB-PORT', 10, 24);
  });
}

// A big sign texture: text wrapped to a few centred lines on a flat colour.
export function billboardTexture(text, bg, fg) {
  return makeTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const next = (current + ' ' + word).trim();
      if (next.length > 14) { lines.push(current.trim()); current = word; }
      else current = next;
    }
    lines.push(current.trim());
    lines.forEach((line, i) => ctx.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 38));
  });
}

// Neon-style sign: glowing letters on a dark plate, for clubs and shops at night.
export function neonTexture(text, glow) {
  return makeTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = glow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = glow;
    ctx.fillText(text, w / 2, h / 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, w / 2, h / 2);
  });
}

// Sunset disc: a soft radial glow, deep orange at the centre fading to
// transparent, painted once and reused by the sun disc in world.js.
export function sunsetTexture() {
  return makeTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255, 214, 140, 1)');
    g.addColorStop(0.35, 'rgba(255, 150, 70, 0.9)');
    g.addColorStop(0.7, 'rgba(255, 90, 60, 0.35)');
    g.addColorStop(1, 'rgba(255, 90, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}
