// Sky, sun, moon, day/night cycle and rain.
import { CONFIG } from './config.js';

const THREE = window.THREE;

export function createWorld(scene) {
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a2f26, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.4);
  sun.position.set(400, 600, 200);
  scene.add(sun);
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0.25);
  moon.position.set(-300, 500, -200);
  scene.add(moon);

  const skyGeo = new THREE.SphereGeometry(2800, 16, 12);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x87b5e0, side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(70, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false })
  );
  sunDisc.position.set(1200, 420, -1800);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);

  // Rain: a points cloud that follows the player.
  const rainCount = 1200;
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 120;
    rainPos[i * 3 + 1] = Math.random() * 60;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaac8e8, size: 0.7, transparent: true, opacity: 0.6 }));
  rain.visible = false;
  scene.add(rain);

  scene.fog = new THREE.Fog(0x87b5e0, 300, 1600);

  let timeOfDay = 0.3;
  let weather = 'clear';
  const day = new THREE.Color(0x87b5e0);
  const dusk = new THREE.Color(0xe08a4a);
  const night = new THREE.Color(0x0c1226);

  function apply() {
    const t = timeOfDay;
    let skyCol;
    if (t < 0.5) skyCol = day.clone().lerp(dusk, t * 2);
    else skyCol = dusk.clone().lerp(night, (t - 0.5) * 2);
    skyMat.color.copy(skyCol);
    scene.fog.color.copy(skyCol);
    const bright = t < 0.5 ? 1.4 - t * 0.9 : 0.95 - (t - 0.5) * 1.3;
    sun.intensity = Math.max(0.15, bright);
    moon.intensity = t > 0.55 ? 0.35 : 0.15;
    hemi.intensity = 0.35 + Math.max(0, 1 - t) * 0.5;
    sunDisc.material.color.setHex(t > 0.5 ? 0xff9a4a : 0xffd27a);
    sunDisc.position.y = 420 - t * 260;
    rain.visible = weather === 'rain';
  }

  return {
    setTimeOfDay(t) { timeOfDay = ((t % 1) + 1) % 1; apply(); },
    getTimeOfDay() { return timeOfDay; },
    setWeather(w) { weather = w; apply(); },
    getWeather() { return weather; },
    update(dt, center) {
      timeOfDay = (timeOfDay + dt / CONFIG.dayLength) % 1;
      apply();
      if (rain.visible && center) {
        rain.position.set(center.x, 0, center.z);
        const pos = rainGeo.attributes.position.array;
        for (let i = 0; i < rainCount; i++) {
          pos[i * 3 + 1] -= dt * 55;
          if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 60;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
    },
  };
}
