import * as THREE from 'three';

function mat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25 });
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

  if (def.type === 'submarine') {
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 2.2, 8, 16), mat(bodyColor));
    hull.rotation.z = Math.PI / 2;
    hull.position.y = 0.9;
    hull.castShadow = true;
    root.add(hull);

    const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mat(accent));
    cabin.position.set(0.4, 1.25, 0);
    root.add(cabin);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.8), mat(accent));
    fin.position.set(-1.2, 1.2, 0);
    root.add(fin);

    for (const z of [-0.55, 0.55]) {
      const prop = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.5), mat(0xdddddd));
      prop.position.set(-1.45, 0.9, z);
      root.add(prop);
      root.userData.propellers = root.userData.propellers || [];
      root.userData.propellers.push(prop);
    }
  } else {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.6), mat(bodyColor));
    chassis.position.y = 0.7;
    chassis.castShadow = true;
    root.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.55, 1.1), mat(accent));
    cabin.position.set(0, 1.15, -0.15);
    cabin.castShadow = true;
    root.add(cabin);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.35, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x9ad7ff, transparent: true, opacity: 0.65, metalness: 0.4 }),
    );
    glass.position.set(0, 1.2, 0.42);
    root.add(glass);

    if (def.type === 'police') {
      const lightbar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.3), mat(0xffffff));
      lightbar.position.set(0, 1.55, -0.1);
      root.add(lightbar);
      const blue = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.22), mat(0x3b82f6));
      blue.position.set(-0.22, 1.62, -0.1);
      root.add(blue);
      const red = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.22), mat(0xef4444));
      red.position.set(0.22, 1.62, -0.1);
      root.add(red);
      root.userData.sirens = [blue, red];
    }

    // bumper gun
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 10), mat(0x333333));
    gun.rotation.x = Math.PI / 2;
    gun.position.set(0, 0.85, 1.45);
    root.add(gun);
    root.userData.muzzle = new THREE.Object3D();
    root.userData.muzzle.position.set(0, 0.85, 1.9);
    root.add(root.userData.muzzle);

    const wheels = [];
    for (const [x, z] of [
      [-0.85, 0.9],
      [0.85, 0.9],
      [-0.85, -0.9],
      [0.85, -0.9],
    ]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.28, 14),
        mat(0x222222),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.35, z);
      wheel.castShadow = true;
      root.add(wheel);
      wheels.push(wheel);
    }
    root.userData.wheels = wheels;
  }

  if (!root.userData.muzzle) {
    root.userData.muzzle = new THREE.Object3D();
    root.userData.muzzle.position.set(0.9, 1.0, 0);
    root.add(root.userData.muzzle);
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

  // Guard crew silhouettes in the cabin / deck
  if (def.type !== 'submarine') {
    const crewColors = [0xf4c14b, 0x60a5fa, 0xe85d4c, 0x62d26f];
    crewColors.forEach((c, i) => {
      const crew = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.25, 4, 6), mat(c));
      body.position.y = 0.2;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat(0xffe0bd));
      head.position.y = 0.42;
      crew.add(body, head);
      crew.position.set((i % 2 === 0 ? -0.35 : 0.35), 1.15, i < 2 ? 0.15 : -0.35);
      root.add(crew);
    });
  } else {
    const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mat(0xffe0bd));
    pilot.position.set(0.35, 1.25, 0);
    root.add(pilot);
  }

  root.userData.radius = 1.35;
  root.scale.setScalar(1.25);
  root.userData.updateAnim = (dt, moving) => {
    const u = root.userData;
    if (u.wheels) {
      for (const w of u.wheels) {
        w.rotation.x += (moving ? 12 : 2) * dt;
      }
    }
    if (u.propellers) {
      for (const p of u.propellers) {
        p.rotation.x += 18 * dt;
      }
    }
    if (u.sirens) {
      const blink = Math.sin(performance.now() * 0.02) > 0;
      u.sirens[0].visible = blink;
      u.sirens[1].visible = !blink;
    }
    if (u.marker) {
      u.marker.position.y = 2.8 + Math.sin(performance.now() * 0.006) * 0.12;
      u.marker.rotation.y += dt * 2.5;
    }
  };

  return root;
}
