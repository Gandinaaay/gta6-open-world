// Vice Bay — every texture is painted on a canvas at boot. No image files.
// Roads get dashes and crosswalks, buildings get lit windows, neon signs get
// glowing lettering, and the beach gets sand.

function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function roadTexture() {
  return makeCanvas(128, 128, (g) => {
    g.fillStyle = '#2b2d33';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#33363d';
    g.fillRect(0, 0, 128, 6);
    g.fillRect(0, 122, 128, 6);
    // Centre dashes (horizontal street in the tile).
    g.fillStyle = '#d8c24a';
    for (let x = 0; x < 128; x += 32) g.fillRect(x + 4, 61, 20, 5);
    // Crosswalk stripes at the tile edges.
    g.fillStyle = 'rgba(235,235,235,0.85)';
    for (let y = 8; y < 120; y += 16) {
      g.fillRect(2, y, 10, 8);
      g.fillRect(116, y, 10, 8);
    }
  });
}

export function sidewalkTexture() {
  return makeCanvas(64, 64, (g) => {
    g.fillStyle = '#7d7f85';
    g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#6a6c72';
    g.lineWidth = 2;
    g.strokeRect(1, 1, 62, 62);
    g.beginPath();
    g.moveTo(32, 0); g.lineTo(32, 64);
    g.moveTo(0, 32); g.lineTo(64, 32);
    g.stroke();
  });
}

export function groundTexture(beach) {
  return makeCanvas(256, 256, (g) => {
    if (beach) {
      g.fillStyle = '#e3c998';
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#d9bd8a';
      for (let i = 0; i < 300; i++) g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    } else {
      g.fillStyle = '#4a5240';
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#424a38';
      for (let i = 0; i < 220; i++) g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }
  });
}

export function buildingTexture(base, litRatio, rng) {
  const w = 128, h = 256;
  return makeCanvas(w, h, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    // Subtle vertical shading so facades are not flat.
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.25)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // Window grid, some lit warm yellow.
    for (let y = 14; y < h - 10; y += 22) {
      for (let x = 12; x < w - 12; x += 22) {
        const lit = rng.next() < litRatio;
        g.fillStyle = lit ? '#ffd98a' : '#1d2733';
        g.fillRect(x, y, 13, 14);
      }
    }
  });
}

export function neonTexture(text, color) {
  return makeCanvas(512, 128, (g) => {
    g.fillStyle = '#0a0a12';
    g.fillRect(0, 0, 512, 128);
    g.font = 'bold 64px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 26;
    g.fillStyle = color;
    g.fillText(text, 256, 66);
    g.shadowBlur = 8;
    g.fillStyle = '#ffffff';
    g.fillText(text, 256, 66);
  });
}

export function billboardTexture(text, sub) {
  return makeCanvas(512, 256, (g) => {
    g.fillStyle = '#123a5c';
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#e8a34c';
    g.fillRect(0, 0, 512, 18);
    g.fillRect(0, 238, 512, 18);
    g.font = 'bold 56px Arial, sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#f5f0e6';
    g.fillText(text, 256, 110);
    g.font = '28px Arial, sans-serif';
    g.fillStyle = '#ffd98a';
    g.fillText(sub, 256, 170);
  });
}

export function runwayTexture() {
  return makeCanvas(256, 64, (g) => {
    g.fillStyle = '#23262b';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#e8e8e8';
    for (let x = 0; x < 256; x += 32) g.fillRect(x + 6, 29, 18, 6);
    g.fillStyle = '#d8c24a';
    g.fillRect(0, 4, 256, 3);
    g.fillRect(0, 57, 256, 3);
  });
}
