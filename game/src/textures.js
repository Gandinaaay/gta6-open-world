// Canvas-painted textures: every surface is generated at boot, no image files.

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

export function makeTextures(rng) {
  // Asphalt road with dashes and edge lines.
  const road = canvas(256, 256);
  {
    const g = road.getContext('2d');
    g.fillStyle = '#23262b'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(255,255,255,${rng.next() * 0.05})`;
      g.fillRect(rng.next() * 256, rng.next() * 256, 2, 2);
    }
    g.fillStyle = '#f5c542'; g.fillRect(126, 0, 4, 256);
    g.fillStyle = '#e5e7eb'; g.fillRect(8, 0, 3, 256); g.fillRect(245, 0, 3, 256);
    g.fillStyle = '#f5c542';
    for (let y = 0; y < 256; y += 64) g.fillRect(126, y, 4, 32);
  }
  // Building facade with lit windows.
  const facade = (base, lit) => {
    const c = canvas(128, 256);
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 256);
    for (let y = 12; y < 244; y += 24) {
      for (let x = 10; x < 118; x += 22) {
        g.fillStyle = rng.next() < lit ? '#ffd97a' : '#1f2937';
        g.fillRect(x, y, 14, 14);
      }
    }
    return tex(c);
  };
  // Neon sign with text.
  const neon = (text, color) => {
    const c = canvas(512, 128);
    const g = c.getContext('2d');
    g.fillStyle = '#0b0b12'; g.fillRect(0, 0, 512, 128);
    g.font = 'bold 64px Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 28;
    g.fillStyle = color;
    g.fillText(text, 256, 64);
    g.shadowBlur = 0;
    g.fillStyle = '#ffffff';
    g.fillText(text, 256, 64);
    return tex(c);
  };
  // Sidewalk / plaza tiles.
  const sidewalk = canvas(128, 128);
  {
    const g = sidewalk.getContext('2d');
    g.fillStyle = '#6b7280'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#4b5563'; g.lineWidth = 2;
    for (let i = 0; i <= 128; i += 32) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
    }
  }
  // Grass for parks and beach sand.
  const grass = canvas(128, 128);
  {
    const g = grass.getContext('2d');
    g.fillStyle = '#2d5a2d'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = rng.chance(0.5) ? '#356b35' : '#244d24';
      g.fillRect(rng.next() * 128, rng.next() * 128, 3, 3);
    }
  }
  const sand = canvas(128, 128);
  {
    const g = sand.getContext('2d');
    g.fillStyle = '#d9c08a'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = rng.chance(0.5) ? '#c9ae72' : '#e8d3a0';
      g.fillRect(rng.next() * 128, rng.next() * 128, 2, 2);
    }
  }
  return {
    road: tex(road),
    sidewalk: tex(sidewalk),
    grass: tex(grass),
    sand: tex(sand),
    facadeDowntown: facade('#374151', 0.55),
    facadeHavana: facade('#b45309', 0.45),
    facadePort: facade('#4b5563', 0.25),
    facadeHills: facade('#78350f', 0.7),
    neonTide: neon('NEON TIDE', '#22d3ee'),
    neonHavana: neon('HAVANA MARKET', '#f97316'),
    neonVice: neon('VICE BAY', '#ec4899'),
    neonPier: neon('PIER 21', '#a78bfa'),
  };
}
