// Canvas-painted textures: roads, sidewalks, grass, sand, facades, neon signs.
export function makeTextures(rng) {
  const cv = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };
  const road = cv(256, 256, (g, w, h) => {
    g.fillStyle = '#23262b';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2c3036';
    for (let i = 0; i < 900; i++) g.fillRect(rng.range(0, w), rng.range(0, h), 2, 2);
    g.fillStyle = '#e8c832';
    g.fillRect(w / 2 - 3, 0, 6, 34);
    g.fillRect(w / 2 - 3, 64, 6, 34);
    g.fillRect(w / 2 - 3, 128, 6, 34);
    g.fillRect(w / 2 - 3, 192, 6, 34);
    g.fillStyle = '#dfe6ea';
    g.fillRect(8, 0, 4, h);
    g.fillRect(w - 12, 0, 4, h);
  });
  const sidewalk = cv(128, 128, (g, w, h) => {
    g.fillStyle = '#8b8d90';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6f7174';
    g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke();
      g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke();
    }
  });
  const grass = cv(128, 128, (g, w, h) => {
    g.fillStyle = '#3f6b2f';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = rng.chance(0.5) ? '#4a7a38' : '#355e28';
      g.fillRect(rng.range(0, w), rng.range(0, h), 3, 3);
    }
  });
  const sand = cv(128, 128, (g, w, h) => {
    g.fillStyle = '#d9c48a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = rng.chance(0.5) ? '#c9b478' : '#e6d49a';
      g.fillRect(rng.range(0, w), rng.range(0, h), 2, 2);
    }
  });
  const facade = (base, win) => cv(256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 14; y < h - 14; y += 30) {
      for (let x = 14; x < w - 14; x += 28) {
        g.fillStyle = rng.chance(0.55) ? win : '#1c2430';
        g.fillRect(x, y, 18, 20);
      }
    }
  });
  const neon = (text, color) => cv(512, 128, (g, w, h) => {
    g.fillStyle = '#0d0d12';
    g.fillRect(0, 0, w, h);
    g.font = 'bold 64px Arial';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 26;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 2);
    g.shadowBlur = 0;
    g.fillStyle = '#ffffff';
    g.fillText(text, w / 2, h / 2 + 2);
  });
  return {
    road,
    sidewalk,
    grass,
    sand,
    facadeDowntown: facade('#3b4763', '#ffd27f'),
    facadeHavana: facade('#6b4a3a', '#ff9d5c'),
    facadePort: facade('#4a4a4d', '#ffb347'),
    facadeHills: facade('#5a4a6b', '#c9a0ff'),
    neonTide: neon('NEON TIDE', '#ff2fb3'),
    neonHavana: neon('HAVANA MARKET', '#ff9d2e'),
    neonVice: neon('VICE BAY', '#3fd2ff'),
    neonPier: neon('PIER 21', '#7dff6a'),
  };
}
