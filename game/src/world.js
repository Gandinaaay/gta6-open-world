// Vice Bay — sky, sun, moon, stars, weather (rain) and lighting.
// Time of day is a 0..1 fraction (0 = midnight, 0.5 = noon); the sun disc
// hangs low and orange at dawn and dusk.

export class World {
  constructor(scene) {
    this.scene = scene;
    this.timeOfDay = 0.32; // morning
    this.weather = 'clear'; // clear | rain
    this.rainIntensity = 0;
    this.rain = null;
    this.sun = null;
    this.moon = null;
    this.hemisphere = null;
    this.directional = null;
    this.stars = null;
    this.sunDisc = null;
    this._buildLights();
    this._buildSkyBodies();
    this._buildRain();
    this.setTimeOfDay(this.timeOfDay);
  }

  _buildLights() {
    this.hemisphere = new THREE.HemisphereLight(0xbfd4ff, 0x3a3f35, 0.9);
    this.scene.add(this.hemisphere);
    this.directional = new THREE.DirectionalLight(0xfff2d8, 1.1);
    this.directional.position.set(200, 300, 100);
    this.directional.castShadow = true;
    this.directional.shadow.mapSize.set(2048, 2048);
    this.directional.shadow.camera.left = -220;
    this.directional.shadow.camera.right = 220;
    this.directional.shadow.camera.top = 220;
    this.directional.shadow.camera.bottom = -220;
    this.directional.shadow.camera.far = 900;
    this.scene.add(this.directional);
    this.scene.add(this.directional.target);
  }

  _buildSkyBodies() {
    // Sun disc: a glowing sprite that hangs low at dawn/dusk.
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 128;
    sunCanvas.height = 128;
    const g = sunCanvas.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,220,140,1)');
    grad.addColorStop(0.35, 'rgba(255,160,60,0.9)');
    grad.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const sunTex = new THREE.CanvasTexture(sunCanvas);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false }));
    this.sunDisc.scale.set(180, 180, 1);
    this.scene.add(this.sunDisc);
    // Moon.
    this.moon = new THREE.Mesh(
      new THREE.CircleGeometry(26, 24),
      new THREE.MeshBasicMaterial({ color: 0xe8ecf2, fog: false })
    );
    this.scene.add(this.moon);
    // Stars: points on a dome, visible at night.
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * Math.PI * 0.45 + 0.08;
      const r = 1500;
      starPos[i * 3] = Math.cos(a) * Math.cos(e) * r;
      starPos[i * 3 + 1] = Math.sin(e) * r;
      starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false }));
    this.scene.add(this.stars);
  }

  _buildRain() {
    const count = 2400;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 220;
      pos[i * 3 + 1] = Math.random() * 90;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 220;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaac4e0, size: 0.55, transparent: true, opacity: 0 }));
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  setTimeOfDay(t) {
    this.timeOfDay = ((t % 1) + 1) % 1;
    const day = Math.sin(this.timeOfDay * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5; // 0 night, 1 noon
    const dawn = Math.max(0, 1 - Math.abs(this.timeOfDay - 0.25) * 8) + Math.max(0, 1 - Math.abs(this.timeOfDay - 0.75) * 8);
    // Sky colour: deep blue night, warm dawn, pale day.
    const sky = new THREE.Color();
    if (day > 0.6) sky.setHex(0x87b5e0);
    else if (day > 0.25) sky.setHex(0xe08a4c).lerp(new THREE.Color(0x87b5e0), (day - 0.25) / 0.35);
    else sky.setHex(0x0a1026);
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(sky.getHex(), 260, 1500);
    this.hemisphere.intensity = 0.25 + day * 0.75;
    this.directional.intensity = 0.12 + day * 1.05;
    // Sun position follows the day arc; disc low and orange at dawn/dusk.
    const ang = (this.timeOfDay - 0.25) * Math.PI * 2;
    const sunX = Math.cos(ang) * 1200;
    const sunY = Math.sin(ang) * 900 + 40;
    this.directional.position.set(sunX, Math.max(60, sunY), 300);
    this.sunDisc.position.set(sunX, Math.max(50, sunY), -1100);
    const discScale = 150 + dawn * 120;
    this.sunDisc.scale.set(discScale, discScale, 1);
    this.sunDisc.material.opacity = day > 0.03 ? 1 : 0;
    this.moon.position.set(-sunX, Math.max(80, -sunY + 200), -1000);
    this.moon.lookAt(0, 0, 0);
    this.moon.visible = day < 0.3;
    this.stars.material.opacity = Math.max(0, 1 - day * 3);
    this.stars.visible = day < 0.35;
  }

  setWeather(w) {
    this.weather = w;
    const raining = w === 'rain';
    this.rain.visible = raining;
    this.rainIntensity = raining ? 1 : 0;
    if (raining) {
      this.scene.fog.near = 140;
      this.scene.fog.far = 900;
    } else {
      this.scene.fog.near = 260;
      this.scene.fog.far = 1500;
    }
  }

  update(dt, focus) {
    // Rain falls around the focus point (player/camera).
    if (this.rain.visible && focus) {
      this.rain.position.set(focus.x, 0, focus.z);
      const pos = this.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 55;
        if (y < 0) y = 90;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      this.rain.material.opacity = 0.55;
    }
    // Slow day cycle.
    this.setTimeOfDay(this.timeOfDay + dt / 480);
  }
}
