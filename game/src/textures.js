// All textures are painted on canvas at boot — no image files.
function canvasTex(w, h, draw, repeatX, repeatY) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  if (repeatX) t.repeat.set(repeatX, repeatY || repeatX);
  t.anisotropy = 4;
  return t;
}

export function makeTextures() {
  const road = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#2b2d33'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#33363d';
    for (let i = 0; i < 200; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    g.fillStyle = '#e8c33a';
    g.fillRect(w / 2 - 2, 0, 4, 30); g.fillRect(w / 2 - 2, 64, 4, 30);
    g.fillStyle = '#dddddd';
    g.fillRect(4, 0, 3, h); g.fillRect(w - 7, 0, 3, h);
  }, 1, 16);

  const sidewalk = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#8d8d88'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6f6f6a'; g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  }, 8, 8);

  const facade = (base, win, lit) => canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 3);
    for (let y = 16; y < h; y += 32) {
      for (let x = 12; x < w; x += 28) {
        const on = Math.random() < lit;
        g.fillStyle = on ? '#ffd98a' : win;
        g.fillRect(x, y, 16, 18);
      }
    }
  });

  const neon = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#0a0618'; g.fillRect(0, 0, w, h);
    g.font = 'bold 64px Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff2fb3'; g.shadowBlur = 26;
    g.fillStyle = '#ff5ec4';
    g.fillText('NEON TIDE', w / 2, h / 2 - 8);
    g.shadowColor = '#37e0ff'; g.shadowBlur = 18;
    g.fillStyle = '#7df0ff';
    g.font = 'bold 26px Arial';
    g.fillText('DANCE  •  DRINKS  •  ALL NIGHT', w / 2, h - 22);
  });

  const billboard = canvasTex(512, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#ff7a1a'); grad.addColorStop(1, '#c81d5e');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff8e0';
    g.font = 'bold 52px Arial'; g.textAlign = 'center';
    g.fillText('HAVANA MARKET', w / 2, 92);
    g.font = 'bold 30px Arial';
    g.fillText('FRESH • CHEAP • OPEN 24H', w / 2, 150);
    g.fillStyle = '#1a1a1a';
    g.fillRect(30, 190, w - 60, 8);
  });

  const sand = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#dcc78f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#cbb57e';
    for (let i = 0; i < 160; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 2);
  }, 20, 20);

  const grass = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#4a7a3a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3d6b30';
    for (let i = 0; i < 200; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 4);
  }, 20, 20);

  const water = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#1a5a7a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2;
    for (let y = 8; y < h; y += 22) {
      g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.3 + y) * 3);
      g.stroke();
    }
  }, 12, 12);

  const runway = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#23262b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2f2f2';
    for (let y = 10; y < h; y += 42) g.fillRect(w / 2 - 3, y, 6, 24);
    g.fillStyle = '#e8c33a';
    g.fillRect(6, 0, 4, h); g.fillRect(w - 10, 0, 4, h);
  });

  return {
    road, sidewalk, sand, grass, water, runway,
    facadeTower: facade('#5a6b7d', '#2a3644', 0.35),
    facadeMid: facade('#8a5a3a', '#33241a', 0.45),
    facadeLow: facade('#c8b088', '#5a4a30', 0.3),
    facadeInd: facade('#6a6a62', '#3a3a34', 0.15),
    facadeVilla: facade('#e8d8c0', '#6a5a40', 0.5),
    neon, billboard,
  };
}
