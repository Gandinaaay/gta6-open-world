// Sky, sun (with shadows that follow the player), moon, stars, rain, time of day.
import { CONFIG } from './config.js';

export function createWorld(scene) {
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a2f22, 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b3, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 900;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  scene.add(sun.target);
  const moon = new THREE.DirectionalLight(0x8fb2ff, 0.35);
  moon.position.set(-300, 400, -200);
  scene.add(moon);
  // Sky dome: big sphere, vertex-colored gradient swapped by time of day.
  const skyGeo = new THREE.SphereGeometry(2400, 24, 12);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x87b5e0, side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
  // Sun disc + moon disc.
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(60, 24), new THREE.MeshBasicMaterial({ color: 0xffdf8a, fog: false }));
  scene.add(sunDisc);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(36, 24), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false }));
  scene.add(moonDisc);
  // Stars (visible at night).
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * Math.PI * 0.45 + 0.08;
    const r = 2200;
    starPos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    starPos[i * 3 + 1] = Math.sin(e) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0 }));
  scene.add(stars);
  // Rain.
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(1200 * 3);
  for (let i = 0; i < 1200; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 120;
    rainPos[i * 3 + 1] = Math.random() * 60;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaac4de, size: 0.35, transparent: true, opacity: 0 }));
  scene.add(rain);
  let timeOfDay = 0.3;
  let weather = 'clear';
  const day = new THREE.Color(0x87b5e0);
  const dusk = new THREE.Color(0xe8734a);
  const night = new THREE.Color(0x0d1526);
  const fogDay = new THREE.Color(0x9db8cc);
  const fogNight = new THREE.Color(0x0d1526);
  scene.fog = new THREE.Fog(0x9db8cc, 500, 2200);
  function apply() {
    const t = timeOfDay;
    let sky;
    if (t < 0.5) sky = day.clone().lerp(dusk, t * 2);
    else sky = dusk.clone().lerp(night, (t - 0.5) * 2);
    skyMat.color.copy(sky);
    const nightF = t > 0.55 ? Math.min(1, (t - 0.55) * 2.4) : 0;
    stars.material.opacity = nightF * 0.9;
    scene.fog.color.copy(fogDay.clone().lerp(fogNight, nightF));
    const ang = t * Math.PI * 2;
    const sx = Math.cos(ang) * 1600;
    const sy = Math.sin(ang) * 900 + 80;
    const sz = 400;
    sun.position.set(sx, Math.max(sy, 60), sz);
    sun.intensity = 0.25 + 1.5 * Math.max(0, Math.sin(ang));
    hemi.intensity = 0.3 + 0.55 * Math.max(0, Math.sin(ang));
    moon.intensity = nightF * 0.5;
    sunDisc.position.set(sx * 1.35, Math.max(sy, 40) * 1.35, sz * 1.35);
    sunDisc.lookAt(0, 0, 0);
    moonDisc.position.set(-sx * 1.3, 700, -sz * 1.3);
    moonDisc.lookAt(0, 0, 0);
    rain.material.opacity = weather === 'rain' ? 0.65 : 0;
  }
  apply();
  return {
    setTimeOfDay: (t) => { timeOfDay = t; apply(); },
    getTimeOfDay: () => timeOfDay,
    setWeather: (w) => { weather = w; apply(); },
    getWeather: () => weather,
    update: (dt, center) => {
      timeOfDay = (timeOfDay + dt / CONFIG.dayLength) % 1;
      apply();
      // Shadow camera follows the player.
      if (center) {
        sun.target.position.set(center.x, 0, center.z);
        sun.position.set(center.x + 260, 380, center.z + 160);
        sky.position.set(center.x, 0, center.z);
        stars.position.set(center.x, 0, center.z);
        rain.position.set(center.x, 20, center.z);
        if (weather === 'rain') {
          const p = rainGeo.attributes.position;
          for (let i = 0; i < p.count; i++) {
            let y = p.getY(i) - dt * 42;
            if (y < 0) y = 60;
            p.setY(i, y);
          }
          p.needsUpdate = true;
        }
      }
    },
  };
}
