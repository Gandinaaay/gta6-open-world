// Procedural canvas textures for Vice Bay. Everything is drawn, never
// fetched: the game runs fully offline from its own static files.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

// Building facade: two canvases — a day map (dark glass windows on a
// tinted wall) and a night emissive map (only the lit windows, warm).
// The material's emissiveIntensity cross-fades between them by time of day.
export function facadeTexture(base, lit, seed) {
  const c = makeCanvas(128, 256);
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, 128, 256);
  // subtle vertical grime
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(0,0,0,${0.03 + ((seed * (i + 7)) % 10) / 160})`;
    x.fillRect((seed * (i + 3) * 37) % 128, 0, 3, 256);
  }
  const e = makeCanvas(128, 256);
  const ex = e.getContext('2d');
  ex.fillStyle = '#000000';
  ex.fillRect(0, 0, 128, 256);
  const cols = 6;
  const rows = 12;
  const cw = 128 / cols;
  const rh = 256 / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const on = ((seed + r * 7 + col * 13) % 5) < 2;
      x.fillStyle = on ? 'rgba(70,95,120,0.9)' : 'rgba(12,18,28,0.85)';
      x.fillRect(col * cw + 3, r * rh + 4, cw - 6, rh - 8);
      if (on) {
        ex.fillStyle = lit;
        ex.fillRect(col * cw + 3, r * rh + 4, cw - 6, rh - 8);
      }
    }
  }
  x.fillStyle = 'rgba(0,0,0,0.35)';
  x.fillRect(0, 0, 128, 6);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const emissiveMap = new THREE.CanvasTexture(e);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap };
}

// Ground texture: 1024x1024 canvas covering the whole 2000 m map.
// District tints, the road grid, sidewalks, beach sand and the sea edge.
export function groundTexture(districts, world) {
  const S = 1024;
  const c = makeCanvas(S, S);
  const x = c.getContext('2d');
  const toPx = (v) => ((v + world.half) / world.size) * S;
  x.fillStyle = '#2e4a3a';
  x.fillRect(0, 0, S, S);
  for (const d of districts) {
    const b = d.bounds;
    x.fillStyle = d.ground;
    x.fillRect(toPx(b[0]), toPx(b[2]), toPx(b[1]) - toPx(b[0]), toPx(b[3]) - toPx(b[2]));
  }
  // sea: east edge and south edge beyond the land
  x.fillStyle = '#14425e';
  x.fillRect(toPx(1000), 0, S - toPx(1000), S);
  x.fillRect(0, toPx(1000), S, S - toPx(1000));
  // beach sand along the south coast and east shore
  x.fillStyle = '#d9c48f';
  x.fillRect(0, toPx(960), S, toPx(1000) - toPx(960));
  x.fillRect(toPx(960), 0, toPx(1000) - toPx(960), S);
  // road grid
  const roadPx = (world.roadHalfWidth * 2 / world.size) * S;
  x.fillStyle = '#26262b';
  for (let v = -900; v <= 900; v += world.roadSpacing) {
    x.fillRect(toPx(v) - roadPx / 2, 0, roadPx, S);
    x.fillRect(0, toPx(v) - roadPx / 2, S, roadPx);
  }
  // centre dashes (3 m dash, 16 m period)
  x.fillStyle = '#d8c56a';
  for (let v = -900; v <= 900; v += world.roadSpacing) {
    for (let u = -1000; u < 1000; u += 16) {
      x.fillRect(toPx(u), toPx(v) - 0.5, 3, 1);
      x.fillRect(toPx(v) - 0.5, toPx(u), 1, 3);
    }
  }
  // sidewalks: lighter borders along roads
  x.fillStyle = 'rgba(200,200,190,0.25)';
  for (let v = -900; v <= 900; v += world.roadSpacing) {
    x.fillRect(toPx(v) - roadPx / 2 - 3, 0, 3, S);
    x.fillRect(toPx(v) + roadPx / 2, 0, 3, S);
    x.fillRect(0, toPx(v) - roadPx / 2 - 3, S, 3);
    x.fillRect(0, toPx(v) + roadPx / 2, S, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Simple radial glow sprite used for the sun, markers and headlights.
export function glowTexture(inner, outer) {
  const c = makeCanvas(128, 128);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export { shade };
