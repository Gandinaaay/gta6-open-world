// Cars: detailed box-built meshes, player driving physics, damage + smoke.
import { VEHICLE_TYPES } from './config.js';

function buildCarMesh(type, spec) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.35, metalness: 0.55 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0e1a24, roughness: 0.15, metalness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, roughness: 0.2, metalness: 0.9 });
  const isBike = type === 'bike';
  const isTruck = type === 'truck';
  const bodyLen = isBike ? 2.4 : isTruck ? 6.5 : 4.4;
  const bodyW = isBike ? 0.7 : 2.0;
  const bodyH = isBike ? 0.5 : 0.75;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyLen), paint);
  body.position.y = 0.65;
  body.castShadow = true;
  g.add(body);
  if (!isBike) {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.86, 0.62, bodyLen * 0.48), glass);
    cabin.position.set(0, 1.25, isTruck ? 1.4 : -0.25);
    cabin.castShadow = true;
    g.add(cabin);
    // Hood + trunk lip.
    const hood = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.94, 0.12, bodyLen * 0.2), paint);
    hood.position.set(0, 1.02, bodyLen * 0.38);
    g.add(hood);
    // Grille + bumper.
    const grille = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.7, 0.22, 0.1), chrome);
    grille.position.set(0, 0.55, bodyLen / 2 + 0.02);
    g.add(grille);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(bodyW, 0.22, 0.18), dark);
    bumper.position.set(0, 0.35, bodyLen / 2);
    g.add(bumper);
    // Spoiler on sports cars.
    if (type === 'comet') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.45), dark);
      wing.position.set(0, 1.12, -bodyLen / 2 + 0.15);
      g.add(wing);
    }
    // Headlights + brake lights.
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    for (const s of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.08), hlMat);
      hl.position.set(s * 0.68, 0.72, bodyLen / 2 + 0.02);
      g.add(hl);
    }
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    for (const s of [-1, 1]) {
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.08), brakeMat);
      br.position.set(s * 0.68, 0.72, -bodyLen / 2 - 0.02);
      g.add(br);
    }
    // Police light bar.
    if (type === 'police') {
      const barR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      barR.position.set(-0.3, 1.62, -0.25);
      const barB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
      barB.position.set(0.3, 1.62, -0.25);
      g.add(barR, barB);
      g.userData.lightBar = [barR, barB];
    }
  } else {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.9), dark);
    seat.position.y = 1.0;
    g.add(seat);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
    hl.position.set(0, 0.7, 1.22);
    g.add(hl);
  }
  // Wheels.
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelPositions = isBike
    ? [[0, 0.36, 0.95], [0, 0.36, -0.95]]
    : [[-0.95, 0.36, 1.45], [0.95, 0.36, 1.45], [-0.95, 0.36, -1.45], [0.95, 0.36, -1.45]];
  for (const [x, y, z] of wheelPositions) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(x, y, z);
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  }
  // Damage smoke emitter.
  const smoke = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: 0x555555, size: 1.4, transparent: true, opacity: 0 })
  );
  smoke.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 1.4, 0.6]), 3));
  g.add(smoke);
  g.userData.smoke = smoke;
  return { group: g, wheels };
}

export function createVehicles(scene, colliders) {
  const list = [];
  function spawn(type, x, z, heading) {
    const spec = VEHICLE_TYPES[type];
    const { group, wheels } = buildCarMesh(type, spec);
    scene.add(group);
    const car = {
      type, spec, mesh: group, wheels,
      pos: new THREE.Vector3(x, 0, z),
      heading: heading || 0,
      speed: 0,
      steer: 0,
      health: 100,
      smoke: group.userData.smoke,
      driver: 'traffic',
      update: (dt) => {
        car.pos.x += Math.sin(car.heading) * car.speed * dt;
        car.pos.z += Math.cos(car.heading) * car.speed * dt;
        car.mesh.position.copy(car.pos);
        car.mesh.rotation.y = car.heading;
        const spin = car.speed * dt * 2.8;
        for (const w of wheels) w.rotation.x += spin;
        if (car.health < 40) car.smoke.material.opacity = 0.55;
        else car.smoke.material.opacity = 0;
      },
      damage: (n) => { car.health = Math.max(0, car.health - n); },
    };
    list.push(car);
    return car;
  }
  function nearest(x, z, maxDist) {
    let best = null;
    let bd = maxDist;
    for (const c of list) {
      const d = Math.hypot(c.pos.x - x, c.pos.z - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  function drive(car, dt, input, colliders) {
    const spec = car.spec;
    let throttle = 0;
    if (input.is('w') || input.is('arrowup')) throttle = 1;
    if (input.is('s') || input.is('arrowdown')) throttle = -0.55;
    let steer = 0;
    if (input.is('a') || input.is('arrowleft')) steer = 1;
    if (input.is('d') || input.is('arrowright')) steer = -1;
    const handbrake = input.is(' ');
    if (handbrake) {
      car.speed *= Math.max(0, 1 - 2.6 * dt);
    } else if (throttle !== 0) {
      car.speed += throttle * spec.accel * dt;
    } else {
      car.speed *= Math.max(0, 1 - 1.4 * dt);
    }
    car.speed = Math.max(-12, Math.min(spec.top, car.speed));
    const dir = car.speed >= 0 ? 1 : -1;
    car.heading += steer * spec.grip * dt * dir * Math.min(1, Math.abs(car.speed) / 8);
    const nx = car.pos.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.pos.z + Math.cos(car.heading) * car.speed * dt;
    // Collider slide + damage.
    let hit = false;
    for (const c of colliders) {
      const d = Math.hypot(nx - c.x, nz - c.z);
      if (d < c.r + 1.6) { hit = true; break; }
    }
    if (hit) {
      if (Math.abs(car.speed) > 9) { car.damage(9); }
      car.speed *= 0.35;
    } else {
      car.pos.x = nx;
      car.pos.z = nz;
    }
    const half = 1000;
    car.pos.x = Math.max(-half - 100, Math.min(half, car.pos.x));
    car.pos.z = Math.max(-half, Math.min(half, car.pos.z));
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    const spin = car.speed * dt * 2.8;
    for (const w of car.wheels) w.rotation.x += spin;
    if (car.health < 40) car.smoke.material.opacity = 0.55;
    else car.smoke.material.opacity = 0;
    return Math.abs(car.speed);
  }
  return { list, spawn, nearest, drive };
}
