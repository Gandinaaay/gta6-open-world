// Wanted 1-5, pursuit cars, roadblocks, police helicopter (wanted >= 3), arrest.
export function createPolice(scene, city, vehicles, audio, onBusted) {
  let wanted = 0;
  let heat = 0;
  let clearTimer = 0;
  let arrestTimer = 0;
  const pursuit = [];
  let heli = null;
  let heliLight = null;
  let roadblocks = [];
  function spawnHeli() {
    if (heli) return;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 5.2), new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.5, metalness: 0.4 }));
    body.castShadow = true;
    g.add(body);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    rotor.position.y = 1.0;
    g.add(rotor);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 4.5), new THREE.MeshStandardMaterial({ color: 0x1a202c }));
    tail.position.set(0, 0.2, -4.2);
    g.add(tail);
    heliLight = new THREE.Mesh(new THREE.ConeGeometry(7, 26, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    heliLight.position.y = -13;
    g.add(heliLight);
    g.userData.rotor = rotor;
    scene.add(g);
    heli = g;
  }
  function removeHeli() {
    if (!heli) return;
    scene.remove(heli);
    heli = null;
    heliLight = null;
  }
  function setRoadblocks(on, px, pz) {
    for (const b of roadblocks) scene.remove(b.mesh);
    roadblocks = [];
    if (!on) return;
    for (let i = 0; i < 2; i++) {
      const car = vehicles.spawn('police', px + (i === 0 ? 60 : -60), pz + 120, Math.PI / 2);
      car.driver = 'police';
      car.speed = 0;
      roadblocks.push({ mesh: car.mesh, car });
    }
  }
  function update(dt, playerPos, playerInCar, playerSpeed) {
    if (wanted > 0) {
      heat = Math.max(0, heat - dt * 0.12);
      if (heat <= 0) {
        clearTimer += dt;
        if (clearTimer > 5) {
          wanted = 0;
          clearTimer = 0;
          for (const c of pursuit) { c.driver = 'traffic'; c.speed = 10; }
          pursuit.length = 0;
          removeHeli();
          setRoadblocks(false, 0, 0);
          audio.setSiren(false);
        }
      } else {
        clearTimer = 0;
      }
    }
    // Spawn pursuit cars up to the wanted level.
    if (wanted > 0 && pursuit.length < wanted) {
      const a = Math.random() * Math.PI * 2;
      const car = vehicles.spawn('police', playerPos.x + Math.cos(a) * 260, playerPos.z + Math.sin(a) * 260, 0);
      car.driver = 'police';
      pursuit.push(car);
      audio.setSiren(true);
    }
    // Helicopter at wanted >= 3.
    if (wanted >= 3) spawnHeli();
    else removeHeli();
    if (heli) {
      // Keep the helicopter low and ahead of the player so it reads in the chase camera.
      heli.position.set(playerPos.x - 25, 40, playerPos.z + 55);
      heli.userData.rotor.rotation.y += dt * 22;
      heli.rotation.y += dt * 0.15;
    }
    // Roadblocks at wanted >= 2.
    if (wanted >= 2 && roadblocks.length === 0) setRoadblocks(true, playerPos.x, playerPos.z);
    if (wanted < 2 && roadblocks.length > 0) setRoadblocks(false, 0, 0);
    // Pursuit steering: intercept the player.
    for (const car of pursuit) {
      const dx = playerPos.x - car.pos.x;
      const dz = playerPos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const target = Math.atan2(dx, dz);
      let diff = target - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const targetSpeed = 24 + wanted * 3.5;
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 0.8);
      car.update(dt);
      // Flash the light bar.
      const bar = car.mesh.userData.lightBar;
      if (bar) {
        const on = Math.floor(performance.now() / 260) % 2 === 0;
        bar[0].material.color.setHex(on ? 0xff2222 : 0x550000);
        bar[1].material.color.setHex(on ? 0x000055 : 0x2244ff);
      }
      // Arrest on foot contact.
      if (!playerInCar && dist < 3.2) {
        arrestTimer += dt;
        if (arrestTimer > 2) {
          arrestTimer = 0;
          wanted = 0;
          heat = 0;
          for (const c of pursuit) { c.driver = 'traffic'; c.speed = 10; }
          pursuit.length = 0;
          removeHeli();
          setRoadblocks(false, 0, 0);
          audio.setSiren(false);
          onBusted();
        }
      } else {
        arrestTimer = 0;
      }
    }
  }
  return {
    update,
    get wanted() { return wanted; },
    get pursuitCars() { return pursuit; },
    get heli() { return heli; },
    addHeat: (n) => { wanted = Math.min(5, wanted + n); heat = Math.min(5, heat + n); clearTimer = 0; },
    clear: () => { wanted = 0; heat = 0; },
  };
}
