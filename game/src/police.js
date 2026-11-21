// Wanted level 1-5, pursuit cars, arrest and lose-the-cops.
export function createPolice(scene, city, vehicles, audio, onBusted) {
  let wanted = 0;
  let heat = 0;
  let loseTimer = 0;
  const pursuit = [];
  let flashT = 0;

  function spawnPursuit() {
    const half = 1000;
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * 600;
    const z = Math.sin(a) * 600;
    const car = vehicles.spawn('police', x, z, 0);
    car.driver = 'police';
    car.speed = 30;
    pursuit.push(car);
    return car;
  }

  function addHeat(n) {
    heat = Math.min(100, heat + n * 25);
    const level = Math.min(5, Math.ceil(heat / 20));
    if (level > wanted) {
      wanted = level;
      while (pursuit.length < wanted) spawnPursuit();
    }
  }

  function clear() {
    wanted = 0;
    heat = 0;
    loseTimer = 0;
    for (const c of pursuit) {
      c.mesh.visible = false;
      c.speed = 0;
    }
    pursuit.length = 0;
    audio.setSiren(false);
  }

  function update(dt, playerPos, playerInCar, playerSpeed) {
    if (wanted > 0) {
      heat = Math.max(0, heat - dt * 2.2);
      audio.setSiren(true);
      const dist = Math.hypot(playerPos.x, playerPos.z);
      if (heat <= 0) {
        loseTimer += dt;
        if (loseTimer > 5) clear();
      } else {
        loseTimer = 0;
      }
      flashT += dt;
      for (const c of pursuit) {
        if (!c.mesh.visible) continue;
        const dx = playerPos.x - c.pos.x;
        const dz = playerPos.z - c.pos.z;
        const d = Math.hypot(dx, dz);
        const targetHeading = Math.atan2(dx, dz);
        let diff = targetHeading - c.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        const targetSpeed = 24 + wanted * 3;
        c.speed += (targetSpeed - c.speed) * dt;
        c.update(dt, null, false);
        if (c.mesh.userData.lightBar) {
          c.mesh.userData.lightBar.material.color.setHex(Math.sin(flashT * 10) > 0 ? 0x2244ff : 0xff2020);
        }
        // Arrest: on foot and touched for 2 seconds.
        if (!playerInCar && d < 4) {
          c._arrestT = (c._arrestT || 0) + dt;
          if (c._arrestT > 2) {
            clear();
            onBusted();
            return;
          }
        } else {
          c._arrestT = 0;
        }
      }
    } else {
      audio.setSiren(false);
    }
  }

  return {
    get wanted() { return wanted; },
    get heat() { return heat; },
    addHeat,
    clear,
    update,
    pursuit,
  };
}
