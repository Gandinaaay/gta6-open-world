// Sky, sun/moon, day-night cycle and rain.

import { CONFIG } from './config.js';

export function createWorld(scene) {
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a2f22, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b3, 1.6);
  sun.position.set(300, 500, 200);
  sun.castShadow = false;
  scene.add(sun);
  const moon = new THREE.DirectionalLight(0x8fb4ff, 0.25);
  moon.position.set(-300, 400, -200);
  scene.add(moon);

  // Sky dome: a big sphere whose color we lerp through the day.
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x87b5e0, side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 24, 16), skyMat);
  scene.add(sky);

  // Sun disc that sits low at dawn/dusk.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(60, 32),
    new THREE.MeshBasicMaterial({ color: 0xff9a3c, fog: false }),
  );
  sunDisc.position.set(0, 120, -2400);
  scene.add(sunDisc);

  // Rain: a points cloud that only renders when weather is rain.
  const rainCount = 1200;
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 400;
    rainPos[i * 3 + 1] = Math.random() * 120;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 400;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x9db8d6, size: 0.7, transparent: true, opacity: 0.6 }));
  rain.visible = false;
  scene.add(rain);

  const day = new THREE.Color(0x87b5e0);
  const dusk = new THREE.Color(0xff7a3c);
  const night = new THREE.Color(0x0b1026);
  const tmp = new THREE.Color();

  let timeOfDay = 0.35; // 0..1, 0.35 = morning
  let weather = 'clear';

  function apply(t) {
    // t: 0 dawn, 0.25 noon, 0.5 dusk, 0.75 midnight.
    if (t < 0.5) tmp.copy(day).lerp(dusk, t * 2);
    else tmp.copy(dusk).lerp(night, (t - 0.5) * 2);
    skyMat.color.copy(tmp);
    const sunH = Math.sin(t * Math.PI * 2) * 0.8 + 0.2;
    sun.intensity = Math.max(0.15, sunH * 1.6);
    hemi.intensity = Math.max(0.25, sunH * 0.9);
    moon.intensity = t > 0.45 && t < 0.95 ? 0.35 : 0.1;
    sunDisc.position.y = 80 + Math.sin(t * Math.PI) * 200;
    sunDisc.material.color.setHex(t > 0.4 && t < 0.6 ? 0xff5a1f : 0xffc46b);
    if (scene.fog) scene.fog.color.copy(tmp);
  }

  return {
    setTimeOfDay(t) { timeOfDay = t; apply(t); },
    getTimeOfDay() { return timeOfDay; },
    setWeather(w) { weather = w; rain.visible = w === 'rain'; },
    getWeather() { return weather; },
    update(dt, center) {
      timeOfDay = (timeOfDay + dt / CONFIG.dayLength) % 1;
      apply(timeOfDay);
      if (rain.visible) {
        rain.position.set(center.x, 0, center.z);
        const pos = rainGeo.attributes.position;
        for (let i = 0; i < rainCount; i++) {
          let y = pos.getY(i) - dt * 90;
          if (y < 0) y = 120;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }
    },
  };
}
