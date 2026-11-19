// Sky, sun/moon, day-night cycle, rain weather, lighting.
import { clamp, lerp } from './random.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.timeOfDay = 10; // hours, 0-24
    this.weather = 'clear'; // 'clear' | 'rain'
    this.sunLight = new THREE.DirectionalLight(0xfff2d8, 1.1);
    this.sunLight.position.set(200, 300, 100);
    scene.add(this.sunLight);
    this.ambient = new THREE.AmbientLight(0x8090a0, 0.55);
    scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0x9db8d8, 0x3a2f26, 0.5);
    scene.add(this.hemi);
    scene.fog = new THREE.Fog(0x9db8d8, 300, 1600);

    // Sun disc that hangs low at dawn/dusk.
    this.sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(60, 32),
      new THREE.MeshBasicMaterial({ color: 0xffb347, fog: false, transparent: true, opacity: 0.95 })
    );
    scene.add(this.sunDisc);
    // Moon disc.
    this.moonDisc = new THREE.Mesh(
      new THREE.CircleGeometry(28, 32),
      new THREE.MeshBasicMaterial({ color: 0xe8ecf4, fog: false })
    );
    scene.add(this.moonDisc);

    // Rain: a points cloud that falls around the camera.
    const rainGeo = new THREE.BufferGeometry();
    const N = 900;
    this.rainPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.rainPos[i * 3] = (Math.random() - 0.5) * 220;
      this.rainPos[i * 3 + 1] = Math.random() * 80;
      this.rainPos[i * 3 + 2] = (Math.random() - 0.5) * 220;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaaccee, size: 0.7, transparent: true, opacity: 0.6 }));
    this.rain.visible = false;
    scene.add(this.rain);
  }

  setTime(h) { this.timeOfDay = ((h % 24) + 24) % 24; this.apply(); }
  setWeather(w) {
    this.weather = w;
    this.rain.visible = w === 'rain';
  }

  get isNight() { return this.timeOfDay < 6 || this.timeOfDay > 19; }
  get isDawn() { return (this.timeOfDay >= 5.5 && this.timeOfDay <= 7.5) || (this.timeOfDay >= 17.5 && this.timeOfDay <= 19.5); }

  apply() {
    const t = this.timeOfDay;
    // Sun angle: 6h sunrise east, 18h sunset west.
    const ang = ((t - 6) / 12) * Math.PI;
    const elev = Math.sin(ang);
    const azim = Math.cos(ang);
    const R = 900;
    this.sunDisc.position.set(azim * R, Math.max(elev, -0.08) * R * 0.6 + 30, -200);
    this.sunDisc.lookAt(0, 40, 0);
    this.moonDisc.position.set(-azim * R, Math.max(-elev, -0.05) * R * 0.6 + 60, 200);
    this.moonDisc.lookAt(0, 40, 0);
    const day = clamp(elev, 0, 1);
    const dusk = this.isDawn ? 1 : 0;
    // Sky color: day blue, dusk orange, night dark blue.
    const sky = new THREE.Color().setHSL(0.58, 0.55, lerp(0.06, 0.62, day));
    if (dusk) sky.setHSL(0.07, 0.8, lerp(0.1, 0.45, day));
    if (this.weather === 'rain') sky.multiplyScalar(0.55);
    this.scene.background = sky;
    this.scene.fog.color.copy(sky);
    this.sunLight.intensity = 0.15 + day * 1.0;
    this.sunLight.position.set(azim * 400, Math.max(elev, 0.05) * 400, -150);
    this.ambient.intensity = 0.25 + day * 0.35;
    this.hemi.intensity = 0.2 + day * 0.35;
    // Sun disc glows orange at dawn/dusk.
    this.sunDisc.material.color.setHex(dusk ? 0xff7a2a : 0xffd27a);
    this.sunDisc.visible = elev > -0.12;
    this.moonDisc.visible = elev < 0.1;
  }

  update(dt, camPos) {
    // Time advances slowly: a full day in ~16 real minutes.
    this.timeOfDay = (this.timeOfDay + dt * 0.025) % 24;
    this.apply();
    if (this.weather === 'rain' && camPos) {
      this.rain.position.set(camPos.x, 0, camPos.z);
      const p = this.rainPos;
      for (let i = 0; i < p.length; i += 3) {
        p[i + 1] -= dt * 55;
        if (p[i + 1] < 0) p[i + 1] = 80;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  }
}
