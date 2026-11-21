// Canvas-painted textures: roads, pavements, lawns, sand and building facades.
// THREE arrives as a global from the classic <script> tag (game/vendor/three.min.js).
const THREE = window.THREE;

function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeTextures(rng) {
  const road = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#26292e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2d3036';
    for (let i = 0; i < 900; i++) g.fillRect(rng.range(0, w), rng.range(0, h), 2, 2);
    g.fillStyle = '#c8b23a';
    g.fillRect(w / 2 - 3, 0, 6, h);
    g.fillStyle = '#d8d8d8';
    for (let y = 0; y < h; y += 64) { g.fillRect(28, y + 8, 5, 32); g.fillRect(w - 33, y + 8, 5, 32); }
  });
  const pavement = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#8d8a80'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#76736a'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke();
    }
    g.fillStyle = '#7c796f';
    for (let i = 0; i < 40; i++) g.fillRect(rng.range(0, w), rng.range(0, h), 3, 3);
  });
  const grass = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#4a7a35'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = rng.pick(['#3d6a2c', '#557f3d', '#466f33']);
      g.fillRect(rng.range(0, w), rng.range(0, h), 3, 5);
    }
  });
  const sand = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#cbb27f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = rng.pick(['#bfa36e', '#d8c08d', '#c4a878']);
      g.fillRect(rng.range(0, w), rng.range(0, h), 2, 2);
    }
  });
  const facades = {};
  const facadeDefs = {
    downtown: ['#33455c', '#3d4f63', '#2c3e52'],
    havana: ['#a8623c', '#b5744a', '#96603a'],
    port: ['#4d5257', '#565b60', '#45494e'],
    hills: ['#5a6b52', '#66765e', '#4f5f49'],
  };
  for (const [key, cols] of Object.entries(facadeDefs)) {
    facades[key] = cols.map((base) => canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 3);
      for (let y = 16; y < h; y += 32) {
        for (let x = 10; x < w; x += 28) {
          g.fillStyle = rng.chance(0.45) ? '#ffd98a' : '#20262e';
          g.fillRect(x, y, 16, 18);
        }
      }
    }));
  }
  const neon = (text, color) => canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#0d0d14'; g.fillRect(0, 0, w, h);
    g.font = 'bold 64px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 26;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2);
    g.shadowBlur = 0;
    g.fillStyle = '#ffffff';
    g.fillText(text, w / 2, h / 2);
  });
  return {
    road, pavement, grass, sand, facades,
    neonVice: neon('VICE BAY', '#ff3df0'),
    neonHavana: neon('HAVANA CLUB', '#ffb02e'),
    neonPier: neon('PIER 21', '#3dd8ff'),
    neonTide: neon('NEON TIDE', '#39ff88'),
  };
}
