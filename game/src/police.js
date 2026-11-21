// Wanted level 1-5, police pursuit, arrest, losing the cops.

export function createPolice(scene, city, vehicles, audio, onBusted) {
  const pursuit = [];
  let wanted = 0;
  let heat = 0;
  let loseTimer = 0;
  let arrestTimer = 0;
  let flash = 0;

  function spawnPursuit(x, z) {
    const car = vehicles.spawn('police', x, z, 0);
    car.driver = 'police';
    car.cruise = 30;
    pursuit.push(car);
    return car;
  }

  function setWanted(n) {
    const prev = wanted;
    wanted = Math.max(0, Math.min(5, n));
    if (wanted > prev) {
      heat = 100;
      loseTimer = 0;
      audio.sting();
      // Spawn pursuit cars at the city edge.
      const need = wanted - pursuit.length;
      for (let i = 0; i < need; i++) {
        const a = Math.random() * Math.PI * 2;
        spawnPursuit(Math.cos(a) * 600, Math.sin(a) * 600);
      }
    }
    return wanted;
  }

  return {
    get wanted() { return wanted; },
    get flash() { return flash; },
    get pursuit() { return pursuit; },
    addHeat(n) { setWanted(wanted + n); },
    clear() {
      wanted = 0;
      heat = 0;
      for (const car of pursuit.splice(0)) {
        scene.remove(car.mesh);
        const i = vehicles.list.indexOf(car);
        if (i >= 0) vehicles.list.splice(i, 1);
      }
    },
    update(dt, playerPos, playerInCar, playerSpeed) {
      flash = (flash + dt * 6) % 2;
      if (wanted === 0) return;
      // Heat decays when the player is far and slow.
      heat -= dt * (playerSpeed > 20 ? 0.5 : 4);
      if (heat <= 0) {
        loseTimer += dt;
        if (loseTimer > 5) setWanted(0);
      } else loseTimer = 0;

      for (const car of pursuit) {
        // Steer toward the player's position.
        const dx = playerPos.x - car.pos.x, dz = playerPos.z - car.pos.z;
        const targetHeading = Math.atan2(dx, dz);
        let diff = targetHeading - car.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
        car.speed += ((24 + wanted * 3) - car.speed) * Math.min(1, dt * 1.5);
        car.pos.x += Math.sin(car.heading) * car.speed * dt;
        car.pos.z += Math.cos(car.heading) * car.speed * dt;
        car.mesh.rotation.y = car.heading;
        for (const w of car.wheels) w.rotation.x += car.speed * dt * 2;
        // Flashing light bar.
        if (car.mesh.userData.lightBar) {
          car.mesh.userData.lightBar.material.color.setHex(flash < 1 ? 0x2244ff : 0xff2222);
        }
        // Arrest: on foot and a cop gets close.
        const d = Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z);
        if (!playerInCar && d < 4) {
          arrestTimer += dt;
          if (arrestTimer > 2) {
            arrestTimer = 0;
            setWanted(0);
            onBusted();
          }
        }
        // Ram the player's car.
        if (playerInCar && d < 3.5) {
          car.speed *= 0.5;
        }
      }
      audio.setSiren(wanted > 0);
    },
  };
}
