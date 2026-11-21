// Vice Bay: Blood & Destiny — procedural textures, painted on canvas at boot.
// No image file is loaded: every surface the city shows is drawn here, so the game
// works fully offline and every run with the same seed looks the same.

const THREE = globalThis.THREE;

function canvasTexture(size, draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

function speckle(ctx, size, rand, colors, count, minR, maxR) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rand.next() * colors.length)];
    const r = minR + rand.next() * (maxR - minR);
    ctx.beginPath();
    ctx.arc(rand.next() * size, rand.next() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function facade(ctx, size, rand, base, litRatio) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // Window grid: some windows lit, most dark.
  const cols = 6;
  const rows = 9;
  const cw = size / cols;
  const ch = size / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const lit = rand.next() < litRatio;
      ctx.fillStyle = lit ? '#ffd98a' : '#20242c';
      ctx.fillRect(x * cw + cw * 0.2, y * ch + ch * 0.22, cw * 0.6, ch * 0.56);
    }
  }
  speckle(ctx, size, rand, ['#00000022', '#ffffff14'], 40, 1, 3);
}

export function makeTextures(rand) {
  const asphalt = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#26292e';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rand, ['#33373d', '#1c1e22', '#3a3e45'], 500, 0.5, 2);
  }, 40, 40);

  const sidewalk = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#8a8f96';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#6f747b';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * s) / 4);
      ctx.lineTo(s, (i * s) / 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((i * s) / 4, 0);
      ctx.lineTo((i * s) / 4, s);
      ctx.stroke();
    }
    speckle(ctx, s, rand, ['#7a7f86', '#9aa0a7'], 200, 0.5, 1.5);
  }, 30, 30);

  const grass = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#4d7a3a';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rand, ['#5d8a46', '#3d6a2e', '#6a9a52'], 700, 0.5, 2.5);
  }, 24, 24);

  const sand = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#d9c27a';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rand, ['#c9b26a', '#e8d28e', '#bfa55e'], 600, 0.5, 2);
  }, 20, 20);

  const water = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#1e5f8a';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#2f7aa8';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const y = rand.next() * s;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(s * 0.3, y + 6, s * 0.7, y - 6, s, y);
      ctx.stroke();
    }
  }, 12, 12);

  const facades = [
    canvasTexture(256, (ctx, s) => facade(ctx, s, rand, '#5a6b7d', 0.28)),
    canvasTexture(256, (ctx, s) => facade(ctx, s, rand, '#7d5a4a', 0.2)),
    canvasTexture(256, (ctx, s) => facade(ctx, s, rand, '#4a5a6b', 0.34)),
    canvasTexture(256, (ctx, s) => facade(ctx, s, rand, '#6b6b52', 0.16)),
  ];

  const roof = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#3c4046';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#4a4e55';
    ctx.fillRect(8, 8, s - 16, s - 16);
    speckle(ctx, s, rand, ['#33373d', '#55595f'], 120, 1, 3);
  });

  const roadLine = canvasTexture(64, (ctx, s) => {
    ctx.fillStyle = '#26292e';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#e8c832';
    ctx.fillRect(s / 2 - 3, 0, 6, s / 2);
  }, 1, 40);

  return { asphalt, sidewalk, grass, sand, water, facades, roof, roadLine };
}
