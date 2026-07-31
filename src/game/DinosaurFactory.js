import * as THREE from 'three';

function mat(color, emissiveIntensity = 0.14) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.08,
    emissive: color,
    emissiveIntensity,
  });
}

function addMesh(parent, geo, color, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/**
 * Organic-styled procedural dinosaurs (capsules/spheres) with walk cycles.
 */
export function createDinosaur(def) {
  const root = new THREE.Group();
  root.userData.def = def;
  root.userData.kind = 'dinosaur';
  root.userData.hp = def.role === 'predator' ? 100 : 40;
  root.userData.maxHp = root.userData.hp;
  root.userData.anim = { t: Math.random() * 10, state: def.role === 'predator' ? 'chase' : 'idle' };

  const s = def.scale;
  const body = new THREE.Group();
  root.add(body);

  const torso = addMesh(
    body,
    new THREE.CapsuleGeometry(0.55 * s, 1.1 * s, 6, 12),
    def.color,
    [0, 1.15 * s, 0],
    [Math.PI / 2, 0, 0],
  );

  addMesh(
    body,
    new THREE.SphereGeometry(0.5 * s, 14, 12),
    def.accent,
    [0, 0.95 * s, 0.15 * s],
  );

  const neck = new THREE.Group();
  neck.position.set(0, 1.45 * s, 0.85 * s);
  body.add(neck);
  addMesh(neck, new THREE.CapsuleGeometry(0.22 * s, 0.45 * s, 4, 8), def.color, [0, 0.15 * s, 0.1 * s], [0.6, 0, 0]);

  const head = new THREE.Group();
  head.position.set(0, 0.35 * s, 0.45 * s);
  neck.add(head);
  addMesh(head, new THREE.SphereGeometry(0.38 * s, 14, 12), def.color, [0, 0, 0]);
  addMesh(head, new THREE.CapsuleGeometry(0.16 * s, 0.45 * s, 4, 8), def.accent, [0, -0.05 * s, 0.42 * s], [Math.PI / 2, 0, 0]);

  const eyeL = addMesh(head, new THREE.SphereGeometry(0.07 * s, 10, 8), 0xffffff, [-0.16 * s, 0.1 * s, 0.28 * s]);
  const eyeR = addMesh(head, new THREE.SphereGeometry(0.07 * s, 10, 8), 0xffffff, [0.16 * s, 0.1 * s, 0.28 * s]);
  addMesh(head, new THREE.SphereGeometry(0.035 * s, 8, 6), 0x111111, [-0.16 * s, 0.1 * s, 0.34 * s]);
  addMesh(head, new THREE.SphereGeometry(0.035 * s, 8, 6), 0x111111, [0.16 * s, 0.1 * s, 0.34 * s]);
  void eyeL;
  void eyeR;

  if (def.id.includes('trike')) {
    addMesh(head, new THREE.CircleGeometry(0.7 * s, 16), def.accent, [0, 0.15 * s, -0.2 * s], [0, 0, 0]);
    head.children[head.children.length - 1].material.side = THREE.DoubleSide;
    addMesh(head, new THREE.ConeGeometry(0.08 * s, 0.55 * s, 6), 0xf5f0e0, [0, 0.05 * s, 0.7 * s], [Math.PI / 2, 0, 0]);
    addMesh(head, new THREE.ConeGeometry(0.06 * s, 0.35 * s, 6), 0xf5f0e0, [-0.22 * s, 0.25 * s, 0.2 * s], [0.4, 0, 0.2]);
    addMesh(head, new THREE.ConeGeometry(0.06 * s, 0.35 * s, 6), 0xf5f0e0, [0.22 * s, 0.25 * s, 0.2 * s], [0.4, 0, -0.2]);
  }

  if (def.id.includes('stego')) {
    for (let i = 0; i < 6; i++) {
      addMesh(
        body,
        new THREE.ConeGeometry(0.18 * s, 0.55 * s, 4),
        def.accent,
        [(i % 2 === 0 ? -0.1 : 0.1) * s, 1.7 * s, (-0.7 + i * 0.28) * s],
      );
    }
  }

  if (def.id.includes('spinosaurus') || def.id === 'bahariasaurus') {
    addMesh(body, new THREE.BoxGeometry(0.12 * s, 1.5 * s, 1.5 * s), def.accent, [0, 1.9 * s, -0.1 * s]);
  }

  if (def.id.includes('dilophosaurus')) {
    addMesh(head, new THREE.ConeGeometry(0.12 * s, 0.4 * s, 5), def.accent, [-0.18 * s, 0.3 * s, 0], [0, 0, 0.4]);
    addMesh(head, new THREE.ConeGeometry(0.12 * s, 0.4 * s, 5), def.accent, [0.18 * s, 0.3 * s, 0], [0, 0, -0.4]);
  }

  if (def.id.includes('para')) {
    addMesh(head, new THREE.CapsuleGeometry(0.08 * s, 0.7 * s, 4, 6), def.accent, [0, 0.35 * s, -0.05 * s], [0.9, 0, 0]);
  }

  const tail = new THREE.Group();
  tail.position.set(0, 1.1 * s, -0.9 * s);
  body.add(tail);
  addMesh(tail, new THREE.CapsuleGeometry(0.28 * s, 0.7 * s, 4, 8), def.color, [0, 0, -0.35 * s], [Math.PI / 2, 0, 0]);
  addMesh(tail, new THREE.CapsuleGeometry(0.16 * s, 0.6 * s, 4, 8), def.accent, [0, 0, -1.0 * s], [Math.PI / 2, 0, 0]);

  const legs = [];
  const isAquatic = def.id.includes('mosa') || def.id.includes('haino');
  if (isAquatic) {
    for (const [x, z] of [
      [-0.65, 0.45],
      [0.65, 0.45],
      [-0.65, -0.55],
      [0.65, -0.55],
    ]) {
      const flip = addMesh(
        body,
        new THREE.CapsuleGeometry(0.12 * s, 0.7 * s, 4, 8),
        def.accent,
        [x * s, 0.75 * s, z * s],
        [0, 0, Math.PI / 2],
      );
      legs.push(flip);
    }
  } else {
    const isBiped = def.role === 'predator';
    const layout = isBiped
      ? [
          [-0.4, -0.15],
          [0.4, -0.15],
        ]
      : [
          [-0.4, 0.5],
          [0.4, 0.5],
          [-0.4, -0.5],
          [0.4, -0.5],
        ];
    for (const [x, z] of layout) {
      const leg = new THREE.Group();
      leg.position.set(x * s, 0, z * s);
      addMesh(leg, new THREE.CapsuleGeometry(0.14 * s, 0.55 * s, 4, 8), def.color, [0, 0.45 * s, 0]);
      addMesh(leg, new THREE.SphereGeometry(0.16 * s, 10, 8), def.accent, [0, 0.1 * s, 0.08 * s]);
      body.add(leg);
      legs.push(leg);
    }
    if (isBiped) {
      for (const x of [-0.45, 0.45]) {
        addMesh(body, new THREE.CapsuleGeometry(0.08 * s, 0.28 * s, 4, 6), def.color, [x * s, 1.2 * s, 0.55 * s]);
      }
    }
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.95 * s, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const markerColor = def.role === 'predator' ? 0xe85d4c : def.role === 'baby' ? 0xf4c14b : 0x62d26f;
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.28 * Math.max(s, 0.7), 0.55 * Math.max(s, 0.7), 4),
    new THREE.MeshBasicMaterial({ color: markerColor }),
  );
  marker.rotation.x = Math.PI;
  marker.position.y = 2.8 * s + 0.6;
  root.add(marker);

  // Tiny floating HP pip for predators
  let hpBar = null;
  if (def.role === 'predator') {
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4 * s, 0.14 * s),
      new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.7 }),
    );
    bg.position.y = 3.1 * s + 0.6;
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.32 * s, 0.1 * s),
      new THREE.MeshBasicMaterial({ color: 0xe85d4c }),
    );
    fill.position.z = 0.01;
    bg.add(fill);
    root.add(bg);
    hpBar = { bg, fill, width: 1.32 * s };
  }

  root.userData.parts = { body, neck, head, tail, legs, shadow, marker, hpBar, torso };
  root.userData.radius = 1.2 * s;
  root.userData.speed = def.role === 'predator' ? 7.5 : def.role === 'mother' ? 6 : 3.5;
  root.scale.setScalar(1.4);

  root.userData.updateAnim = (dt, moving = false) => {
    const u = root.userData;
    u.anim.t += dt;
    const t = u.anim.t;
    const walk = moving || u.anim.state === 'chase' || u.anim.state === 'run' ? 1 : 0.25;
    body.position.y = Math.sin(t * 8 * walk) * 0.05 * s;
    neck.rotation.x = Math.sin(t * 3) * 0.1 + (u.anim.state === 'attack' ? -0.3 : 0);
    head.rotation.y = Math.sin(t * 2.2) * 0.15;
    tail.rotation.y = Math.sin(t * 5 * walk) * 0.4;
    tail.rotation.x = Math.sin(t * 4) * 0.1;
    legs.forEach((leg, i) => {
      const phase = i % 2 === 0 ? 1 : -1;
      leg.rotation.x = Math.sin(t * 9 * walk) * 0.6 * phase * walk;
    });
    if (u.anim.state === 'hurt') {
      body.rotation.z = Math.sin(t * 30) * 0.1;
    } else {
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, 1 - Math.pow(0.001, dt));
    }
    if (u.parts.marker) {
      u.parts.marker.position.y = 2.8 * s + 0.6 + Math.sin(t * 4) * 0.15;
      u.parts.marker.rotation.y += dt * 2;
    }
    if (u.parts.hpBar) {
      const ratio = Math.max(0, u.hp / u.maxHp);
      u.parts.hpBar.fill.scale.x = Math.max(0.01, ratio);
      u.parts.hpBar.fill.position.x = -((1 - ratio) * u.parts.hpBar.width) / 2;
      u.parts.hpBar.bg.quaternion.copy(root.parent?.quaternion || new THREE.Quaternion());
      // Billboard-ish: face camera approximately by resetting world yaw via look at later in game if needed
      u.parts.hpBar.bg.rotation.set(0, 0, 0);
    }
  };

  return root;
}
