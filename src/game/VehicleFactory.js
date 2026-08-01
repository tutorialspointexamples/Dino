import * as THREE from 'three';
import { CREW } from './data.js';

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.25,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

function addCrewMember(parent, crew, x, y, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.28, 4, 6), mat(crew.color));
  body.position.y = 0.22;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mat(0xffe0bd));
  head.position.y = 0.48;
  head.castShadow = true;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 10), mat(0x1e3a8a));
  hat.position.y = 0.58;
  g.add(body, head, hat);
  g.position.set(x, y, z);
  g.userData.crew = crew;
  parent.add(g);
  return g;
}

export function createVehicle(def) {
  const root = new THREE.Group();
  root.userData.def = def;
  root.userData.kind = 'vehicle';
  root.userData.hp = def.armor;
  root.userData.maxHp = def.armor;
  root.userData.speed = def.speed;
  root.userData.fireCooldown = 0;
  root.userData.weaponMode = 'auto';
  root.userData.shotsAtPredator = 0;

  const bodyColor = def.color;
  const accent = def.accent;
  const crewNodes = [];

  if (def.type === 'submarine') {
    // Capsule long-axis along Z so nose faces -Z (drive/fire forward)
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 2.2, 8, 16), mat(bodyColor));
    hull.rotation.x = Math.PI / 2;
    hull.position.y = 0.9;
    hull.castShadow = true;
    root.add(hull);

    const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mat(accent));
    cabin.position.set(0, 1.35, -0.35);
    root.add(cabin);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.15), mat(accent));
    fin.position.set(0, 1.25, 1.25);
    root.add(fin);

    for (const x of [-0.55, 0.55]) {
      const prop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.35), mat(0xdddddd));
      prop.position.set(x, 0.9, 1.5);
      root.add(prop);
      root.userData.propellers = root.userData.propellers || [];
      root.userData.propellers.push(prop);
    }

    // Guard crew visible in the conning tower / seats
    crewNodes.push(addCrewMember(root, CREW[0], -0.2, 1.05, -0.2));
    crewNodes.push(addCrewMember(root, CREW[1], 0.2, 1.05, -0.2));
    crewNodes.push(addCrewMember(root, CREW[2], -0.2, 1.05, 0.25));
    crewNodes.push(addCrewMember(root, CREW[3], 0.2, 1.05, 0.25));
  } else {
    // Police / guard land vehicles
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.6), mat(bodyColor));
    chassis.position.y = 0.7;
    chassis.castShadow = true;
    root.add(chassis);
    root.userData.chassis = chassis;

    // Cabin / windshield face -Z (Three.js forward), matching projectile direction
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.55, 1.1), mat(accent));
    cabin.position.set(0, 1.15, 0.15);
    cabin.castShadow = true;
    root.add(cabin);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.35, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x9ad7ff, transparent: true, opacity: 0.65, metalness: 0.4 }),
    );
    glass.position.set(0, 1.2, -0.42);
    root.add(glass);

    const lightbar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.3), mat(0xffffff));
    lightbar.position.set(0, 1.55, 0.1);
    root.add(lightbar);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.12, 0.22),
      mat(0x3b82f6, { emissive: 0x3b82f6, emissiveIntensity: 0.35 }),
    );
    blue.position.set(-0.22, 1.62, 0.1);
    root.add(blue);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.12, 0.22),
      mat(0xef4444, { emissive: 0xef4444, emissiveIntensity: 0.35 }),
    );
    red.position.set(0.22, 1.62, 0.1);
    root.add(red);
    root.userData.sirens = [blue, red];

    // bumper gun — aimed toward -Z (forward); emissive tint shows weapon mode
    const gun = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.7, 10),
      mat(0x333333, { emissive: 0xf4c14b, emissiveIntensity: 0.25 }),
    );
    gun.rotation.x = Math.PI / 2;
    gun.position.set(0, 0.85, -1.45);
    root.add(gun);
    root.userData.gun = gun;
    root.userData.muzzle = new THREE.Object3D();
    root.userData.muzzle.position.set(0, 0.85, -1.9);
    root.add(root.userData.muzzle);

    const wheels = [];
    const frontWheels = [];
    for (const [x, z, front] of [
      [-0.85, 0.9, false],
      [0.85, 0.9, false],
      [-0.85, -0.9, true],
      [0.85, -0.9, true],
    ]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.28, 14), mat(0x222222));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.35, z);
      wheel.castShadow = true;
      wheel.userData.front = front;
      root.add(wheel);
      wheels.push(wheel);
      if (front) frontWheels.push(wheel);
    }
    root.userData.wheels = wheels;
    root.userData.frontWheels = frontWheels;

    // All 4 named guard team members
    const seats = [
      [-0.35, 1.15, 0.15],
      [0.35, 1.15, 0.15],
      [-0.35, 1.15, -0.35],
      [0.35, 1.15, -0.35],
    ];
    CREW.forEach((c, i) => {
      crewNodes.push(addCrewMember(root, c, ...seats[i]));
    });
  }

  if (!root.userData.muzzle) {
    root.userData.muzzle = new THREE.Object3D();
    root.userData.muzzle.position.set(0, 1.0, -1.6);
    root.add(root.userData.muzzle);
  }
  // Sub torpedo tube visual — forward (-Z)
  if (def.type === 'submarine') {
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.6, 10),
      mat(0x333333, { emissive: 0xf4c14b, emissiveIntensity: 0.25 }),
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.85, -1.55);
    root.add(tube);
    root.userData.gun = tube;
    root.userData.muzzle.position.set(0, 0.85, -1.95);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.6, 4),
    new THREE.MeshBasicMaterial({ color: 0x60a5fa }),
  );
  marker.rotation.x = Math.PI;
  marker.position.y = 2.8;
  root.add(marker);
  root.userData.marker = marker;
  root.userData.crew = crewNodes;

  root.userData.radius = 1.35;
  root.scale.setScalar(1.25);
  root.userData.updateAnim = (dt, moving, steer = 0) => {
    const u = root.userData;
    u._steer = THREE.MathUtils.lerp(u._steer || 0, steer, 1 - Math.pow(0.0005, dt));
    if (u.wheels) {
      const spin = (moving ? 12 : 2) * dt * (u.sirenBoost ? 1.35 : 1);
      for (const w of u.wheels) {
        w.rotation.x += spin;
        if (w.userData.front) {
          // Front wheels yaw with steer input (stick x)
          w.rotation.y = THREE.MathUtils.lerp(w.rotation.y || 0, -u._steer * 0.55, 1 - Math.pow(0.001, dt));
        }
      }
    }
    if (u.chassis) {
      const lean = -u._steer * (u.sirenBoost ? 0.14 : 0.09);
      u.chassis.rotation.z = THREE.MathUtils.lerp(u.chassis.rotation.z, lean, 1 - Math.pow(0.002, dt));
    }
    if (u.propellers) {
      // Idle drift when stopped; full spin under throttle / boost
      const propSpin = (moving ? 18 : 3.5) * dt * (u.sirenBoost ? 1.5 : 1);
      for (const p of u.propellers) {
        p.rotation.x += propSpin;
      }
    }
    // Weapon mode tint on gun / torpedo tube
    if (u.gun?.material) {
      const mode = u.weaponMode || 'auto';
      const tint = mode === 'zoom' ? 0x60a5fa : mode === 'scatter' ? 0xffe08a : 0xf4c14b;
      u.gun.material.emissive?.setHex?.(tint);
      u.gun.material.emissiveIntensity = mode === 'scatter' ? 0.55 : mode === 'zoom' ? 0.7 : 0.35;
    }
    if (u.sirens) {
      // Faster flash when alarm/combat boost is active
      const rate = u.sirenBoost ? 0.045 : 0.02;
      const blink = Math.sin(performance.now() * rate) > 0;
      u.sirens[0].visible = blink;
      u.sirens[1].visible = !blink;
      u.sirens[0].material.emissiveIntensity = u.sirenBoost ? (blink ? 1.4 : 0.35) : blink ? 0.7 : 0.2;
      u.sirens[1].material.emissiveIntensity = u.sirenBoost ? (blink ? 0.35 : 1.4) : blink ? 0.2 : 0.7;
    }
    if (u.marker) {
      u.marker.position.y = 2.8 + Math.sin(performance.now() * 0.006) * 0.12;
      u.marker.rotation.y += dt * 2.5;
    }
    for (const c of u.crew || []) {
      if (c.userData.baseY == null) c.userData.baseY = c.position.y;
      c.position.y = c.userData.baseY + Math.sin(performance.now() * 0.008 + c.position.x) * 0.03;
    }
  };

  return root;
}
