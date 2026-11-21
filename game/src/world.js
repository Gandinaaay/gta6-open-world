// Three.js world for Vice Bay: sky, sea, ground, buildings, palms, lamps.
// Renders the city layout from city.js. Time of day drives sun, fog and
// the lit-window glow. No network, no external assets.

import { WORLD } from './config.js';
import { buildCity } from './city.js';
import { facadeTexture, groundTexture, glowTexture } from './textures.js';
import { DISTRICTS } from './config.js';

const facadeMats = new Map();

function facadeMaterial(color, style) {
  const key = color + '|' + style;
  if (facadeMats.has(key)) return facadeMats.get(key);
  const lit = style === 'tower' ? '#ffd166' : '#ffe0a3';
  const { map, emissiveMap } = facadeTexture(color, lit, color.length * 7 + style.length * 13);
  const mat = new THREE.MeshLambertMaterial({ map, emissiveMap, emissive: 0xffc46b, emissiveIntensity: 0 });
  facadeMats.set(key, mat);
  return mat;
}

function buildingMesh(b, G) {
  const mat = facadeMaterial(b.color, b.style);
  const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(b.x, b.h / 2, b.z);
  mesh.userData.building = b;
  const grp = new THREE.Group();
  grp.add(mesh);
  if (b.roof === 'antenna') {
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 14, 6),
      new THREE.MeshLambertMaterial({ color: 0x888888 }),
    );
    ant.position.set(b.x, b.h + 7, b.z);
    grp.add(ant);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    tip.position.set(b.x, b.h + 14, b.z);
    grp.add(tip);
  } else if (b.roof === 'crown') {
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(b.w * 0.4, 6, b.d * 0.4),
      new THREE.MeshLambertMaterial({ color: 0x222222, emissive: 0xffd166, emissiveIntensity: 0.6 }),
    );
    crown.position.set(b.x, b.h + 3, b.z);
    grp.add(crown);
  } else if (b.roof === 'gable') {
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.72, b.h * 0.16 + 3, 4),
      new THREE.MeshLambertMaterial({ color: 0x5d4037 }),
    );
    roof.position.set(b.x, b.h + (b.h * 0.16 + 3) / 2 - 0.5, b.z);
    roof.rotation.y = Math.PI / 4;
    grp.add(roof);
  }
  return grp;
}

function palmMesh(t) {
  const grp = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.45, t.h, 6),
    new THREE.MeshLambertMaterial({ color: 0x8d6e63 }),
  );
  trunk.position.y = t.h / 2;
  trunk.rotation.z = 0.08;
  grp.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.4, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.4, t.h + 0.4, Math.sin(a) * 1.4);
    leaf.rotation.z = Math.cos(a) * 1.1;
    leaf.rotation.x = -Math.sin(a) * 1.1;
    grp.add(leaf);
  }
  grp.position.set(t.x, 0, t.z);
  return grp;
}

function propMesh(p) {
  const grp = new THREE.Group();
  if (p.kind === 'umbrella') {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 3, 6),
      new THREE.MeshLambertMaterial({ color: 0xeeeeee }),
    );
    pole.position.y = 1.5;
    grp.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: 0xff7043 }),
    );
    top.position.y = 3.4;
    grp.add(top);
  } else if (p.kind === 'yacht') {
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.6, 12),
      new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }),
    );
    hull.position.y = 0.8;
    grp.add(hull);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.6, 5),
      new THREE.MeshLambertMaterial({ color: 0x90a4ae }),
    );
    cabin.position.set(0, 2.2, -1);
    grp.add(cabin);
  } else if (p.kind === 'bridge') {
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(60, 3, 220),
      new THREE.MeshLambertMaterial({ color: 0x78909c }),
    );
    deck.position.y = 12;
    grp.add(deck);
    for (const dz of [-70, 70]) {
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(6, 34, 6),
        new THREE.MeshLambertMaterial({ color: 0x546e7a }),
      );
      tower.position.set(0, 17, dz);
      grp.add(tower);
    }
  }
  grp.position.set(p.x, 0, p.z);
  return grp;
}

export function createWorld(G) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  document.getElementById('app').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x9fc3e0, 500, 2400);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 5000);
  camera.position.set(0, 60, 120);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a4a3a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.6);
  sun.position.set(300, 400, 200);
  scene.add(sun);
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0.25);
  moon.position.set(-200, 300, -100);
  scene.add(moon);

  // ground: one textured plane for the whole map
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, WORLD.size),
    new THREE.MeshLambertMaterial({ map: groundTexture(DISTRICTS, WORLD) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  // sea: a wide plane just below ground level, around the land
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size + WORLD.seaMargin * 4, WORLD.size + WORLD.seaMargin * 4),
    new THREE.MeshLambertMaterial({ color: 0x14506e, transparent: true, opacity: 0.94 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = WORLD.waterLevel;
  scene.add(sea);

  // sun glow sprite
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,240,180,1)', 'rgba(255,180,80,0)'),
    transparent: true, depthWrite: false,
  }));
  sunSprite.scale.set(320, 320, 1);
  scene.add(sunSprite);

  const city = buildCity();
  G.city = city;
  const cityGroup = new THREE.Group();
  for (const b of city.buildings) cityGroup.add(buildingMesh(b, G));
  for (const t of city.trees) cityGroup.add(palmMesh(t));
  for (const p of city.props) cityGroup.add(propMesh(p));
  // lamps: one shared geometry/material, emissive heads at night
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
  const lampHeadMat = new THREE.MeshLambertMaterial({ color: 0xfff9c4, emissive: 0xffe082, emissiveIntensity: 0 });
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
  const headGeo = new THREE.BoxGeometry(0.9, 0.35, 0.35);
  for (const l of city.lamps) {
    const pole = new THREE.Mesh(poleGeo, lampMat);
    pole.position.set(l.x, 3.5, l.z);
    cityGroup.add(pole);
    const head = new THREE.Mesh(headGeo, lampHeadMat);
    head.position.set(l.x, 7.1, l.z);
    cityGroup.add(head);
  }
  scene.add(cityGroup);

  G.scene = scene;
  G.camera = camera;
  G.renderer = renderer;
  G.lights = { hemi, sun, moon, lampHeadMat, sunSprite };
  G.groundMesh = ground;
  setTimeOfDay(G, G.time);
  return G;
}

// Time of day: hours 0-24. Returns a 0..1 daylight factor.
export function setTimeOfDay(G, hours) {
  G.time = ((hours % 24) + 24) % 24;
  const t = G.time;
  const dayF = Math.max(0, Math.sin(((t - 6) / 12) * Math.PI));
  const duskF = Math.max(0, 1 - Math.abs(t - 18.5) / 2.5);
  const dawnF = Math.max(0, 1 - Math.abs(t - 6.5) / 2);
  const { sun, moon, hemi, sunSprite } = G.lights;
  const ang = ((t - 6) / 12) * Math.PI;
  sun.position.set(Math.cos(ang) * 600, Math.max(40, Math.sin(ang) * 600), 260);
  sun.intensity = 0.25 + dayF * 1.5;
  sun.color.setHSL(0.09 + dayF * 0.02, 0.7, 0.55 + dayF * 0.2);
  moon.intensity = dayF > 0.15 ? 0.05 : 0.35;
  hemi.intensity = 0.35 + dayF * 0.65;
  sunSprite.position.set(Math.cos(ang) * 1500, Math.max(60, Math.sin(ang) * 900), -1200);
  sunSprite.material.opacity = 0.25 + dayF * 0.65;
  const bg = new THREE.Color();
  if (dayF > 0.55) bg.setHex(0x87b5e0);
  else if (duskF > 0.2) bg.setHex(0xe8734a).lerp(new THREE.Color(0x2c1e4f), 1 - duskF);
  else if (dawnF > 0.2) bg.setHex(0xf2a65e).lerp(new THREE.Color(0x87b5e0), 1 - dawnF);
  else if (dayF > 0.15) bg.setHex(0x87b5e0).lerp(new THREE.Color(0x0b1026), (0.55 - dayF) / 0.4);
  else bg.setHex(0x0b1026);
  G.scene.background = bg;
  G.scene.fog.color.copy(bg).lerp(new THREE.Color(0xffffff), dayF * 0.25);
  // lit windows + lamp heads glow at night
  const glow = dayF < 0.2 ? 0.95 : dayF < 0.45 ? 0.4 : 0;
  for (const mat of facadeMats.values()) mat.emissiveIntensity = glow;
  G.lights.lampHeadMat.emissiveIntensity = glow * 1.6;
  return dayF;
}

// AABB collision against buildings. Returns the building hit, or null.
export function collideBuildings(G, x, z, r) {
  for (const b of G.city.buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r) return b;
  }
  return null;
}

export function clampToWorld(x, z) {
  const m = WORLD.half - 4;
  return [Math.max(-m, Math.min(m, x)), Math.max(-m, Math.min(m, z))];
}
