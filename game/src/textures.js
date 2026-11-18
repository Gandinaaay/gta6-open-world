// Procedural canvas textures: every surface in Vice Bay is painted at boot from code,
// so the game ships zero image files and makes zero network requests.
function canvasTexture(w, h, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

function litWindows(ctx, w, h, cols, rows, litChance, random) {
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = random() < litChance;
      ctx.fillStyle = lit ? (random() < 0.7 ? '#ffd98a' : '#9fd8ff') : '#1c2733';
      ctx.fillRect(6 + c * ((w - 12) / cols), 6 + r * ((h - 12) / rows), (w - 12) / cols - 5, (h - 12) / rows - 6);
    }
  }
}

export function buildingTexture(base, random, floors = 12) {
  return canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, w, 8);
    ctx.fillRect(0, h - 10, w, 10);
    litWindows(ctx, w, h, 6, floors, 0.45, random);
  });
}

export function houseTexture(base, random) {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5a3a28';
    ctx.fillRect(0, 0, w, 26);
    ctx.fillStyle = '#2b1d16';
    ctx.fillRect(w / 2 - 10, h - 34, 20, 34);
    litWindows(ctx, w, h, 3, 2, 0.6, random);
  });
}

export function roadTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2b2e33';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#34383f';
    for (let i = 0; i < 40; i += 1) ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    ctx.fillStyle = '#d8c84a';
    ctx.fillRect(w / 2 - 2, 8, 4, 40);
    ctx.fillRect(w / 2 - 2, h - 48, 4, 40);
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(4, 0, 3, h);
    ctx.fillRect(w - 7, 0, 3, h);
  }, 1, 80);
}

export function sidewalkTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
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
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4a7c3a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i += 1) {
      ctx.fillStyle = Math.random() < 0.5 ? '#557f42' : '#3f6b31';
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
  }, 24, 24);
}

export function sandTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d9c08a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i += 1) {
      ctx.fillStyle = Math.random() < 0.5 ? '#c9ae72' : '#e8d5a4';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, 6, 40);
}

export function waterTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#1e6f8e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i += 1) {
      ctx.beginPath();
      const y = Math.random() * h;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(30, y - 6, 70, y + 6, w, y);
      ctx.stroke();
    }
  }, 10, 10);
}

export function runwayTexture() {
  return canvasTexture(128, 256, (ctx, w, h) => {
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
  return canvasTexture(128, 64, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
  });
}

export function billboardTexture(text, bg, fg) {
  return canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = text.split(' ');
    let line = '';
    const lines = [];
    for (const word of words) {
      if ((line + ' ' + word).trim().length > 14) { lines.push(line.trim()); line = word; }
      else line += ' ' + word;
    }
    lines.push(line.trim());
    lines.forEach((l, i) => ctx.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 38));
  });
}
