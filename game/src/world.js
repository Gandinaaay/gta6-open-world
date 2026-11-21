// Vice Bay: Blood & Destiny — time of day, sun, sky and fog.
// One cycle lasts WORLD.dayLength seconds; the light level drives the HUD clock,
// the headlights and how far the police can see.

import { PALETTE, WORLD } from './config.js';

const THREE = globalThis.THREE;

const DAY_SKY = new THREE.Color(PALETTE.sky);
const DUSK_SKY = new THREE.Color(0xd97b4a);
const NIGHT_SKY = new THREE.Color(PALETTE.night);
const DAY_FOG = new THREE.Color(0x9fc3d8);
const NIGHT_FOG = new THREE.Color(0x0b1026);

export function createWorldState(scene) {
  const sun = new THREE.DirectionalLight(0xffe9a8, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.far = 900;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xbfd9ea, 0x3a4a3a, 0.7);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xdfe8ff, 0.25);
  scene.add(moon);
  scene.fog = new THREE.Fog(0x9fc3d8, 220, 900);

  let time = 0.32; // 0..1 across the day; starts in the morning.
  let lightLevel = 1;

  function update(dt) {
    time = (time + dt / WORLD.dayLength) % 1;
    // Sun height: noon at 0.5, midnight at 0.0/1.0.
    const sunH = Math.sin(time * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
    const dusk = Math.max(0, 1 - Math.abs(sunH - 0.18) * 6);
    const sky = DAY_SKY.clone().lerp(NIGHT_SKY, 1 - sunH);
    if (dusk > 0) sky.lerp(DUSK_SKY, dusk * 0.55);
    scene.background = sky;
    scene.fog.color.copy(DAY_FOG).lerp(NIGHT_FOG, 1 - sunH);
    const angle = time * Math.PI * 2;
    sun.position.set(Math.cos(angle) * 300, Math.max(40, Math.sin(angle) * 300 + 60), Math.sin(angle) * 300);
    sun.intensity = 0.25 + sunH * 1.5;
    hemi.intensity = 0.25 + sunH * 0.55;
    moon.position.set(-Math.cos(angle) * 300, Math.max(30, -Math.sin(angle) * 300 + 60), -Math.sin(angle) * 300);
    moon.intensity = (1 - sunH) * 0.3;
    lightLevel = 0.15 + sunH * 0.85;
  }

  function clockText() {
    const hours = Math.floor(time * 24);
    const mins = Math.floor((time * 24 - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  function isNight() {
    return lightLevel < 0.45;
  }

  function setTime(t) {
    time = ((t % 1) + 1) % 1;
    update(0);
  }

  update(0);
  return { update, clockText, isNight, setTime, get lightLevel() { return lightLevel; }, get time() { return time; } };
}
