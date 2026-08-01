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

function addMesh(parent, geo, color, pos = [0, 0, 0], rot = [0, 0, 0], emis = 0.14) {
  const m = new THREE.Mesh(geo, mat(color, emis));
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/**
 * Organic procedural dinosaurs with morph-specific features and walk cycles.
 */
export function createDinosaur(def) {
  const root = new THREE.Group();
  root.userData.def = def;
  root.userData.kind = 'dinosaur';
  root.userData.hp = def.role === 'predator' ? 100 : 40;
  root.userData.maxHp = root.userData.hp;
  root.userData.anim = { t: Math.random() * 10, state: def.role === 'predator' ? 'chase' : 'idle' };

  const s = def.scale;
  const morph = def.morph || 'theropod';
  const body = new THREE.Group();
  root.add(body);

  const neckLen = morph === 'longneck' ? 1.1 : morph === 'ptera' ? 0.35 : 0.45;
  const torsoH = morph === 'ankylo' ? 0.85 : 1.1;

  const torso = addMesh(
    body,
    new THREE.CapsuleGeometry(0.55 * s, torsoH * s, 6, 12),
    def.color,
    [0, 1.15 * s, 0],
    [Math.PI / 2, 0, 0],
  );

  addMesh(body, new THREE.SphereGeometry(0.5 * s, 14, 12), def.accent, [0, 0.95 * s, 0.15 * s]);

  const neck = new THREE.Group();
  neck.position.set(0, morph === 'longneck' ? 1.55 * s : 1.45 * s, 0.85 * s);
  body.add(neck);
  addMesh(
    neck,
    new THREE.CapsuleGeometry(0.22 * s, neckLen * s, 4, 8),
    def.color,
    [0, neckLen * 0.35 * s, 0.1 * s],
    [morph === 'longneck' ? -0.2 : 0.6, 0, 0],
  );

  const head = new THREE.Group();
  head.position.set(0, morph === 'longneck' ? 0.85 * s : 0.35 * s, morph === 'longneck' ? 0.2 * s : 0.45 * s);
  neck.add(head);
  addMesh(head, new THREE.SphereGeometry(0.38 * s, 14, 12), def.color, [0, 0, 0]);
  const jaw = addMesh(
    head,
    new THREE.CapsuleGeometry(0.16 * s, morph === 'mosa' ? 0.7 * s : 0.45 * s, 4, 8),
    def.accent,
    [0, -0.05 * s, morph === 'mosa' ? 0.55 * s : 0.42 * s],
    [Math.PI / 2, 0, 0],
  );

  const eyeL = addMesh(head, new THREE.SphereGeometry(0.07 * s, 10, 8), 0xffffff, [-0.16 * s, 0.1 * s, 0.28 * s]);
  const eyeR = addMesh(head, new THREE.SphereGeometry(0.07 * s, 10, 8), 0xffffff, [0.16 * s, 0.1 * s, 0.28 * s]);
  addMesh(head, new THREE.SphereGeometry(0.035 * s, 8, 6), 0x111111, [-0.16 * s, 0.1 * s, 0.34 * s]);
  addMesh(head, new THREE.SphereGeometry(0.035 * s, 8, 6), 0x111111, [0.16 * s, 0.1 * s, 0.34 * s]);
  root.userData._eyes = [eyeL, eyeR];

  // Morph ornaments
  if (morph === 'trike') {
    const frill = addMesh(head, new THREE.CircleGeometry(0.7 * s, 16), def.accent, [0, 0.15 * s, -0.2 * s]);
    frill.material.side = THREE.DoubleSide;
    addMesh(head, new THREE.ConeGeometry(0.08 * s, 0.55 * s, 6), 0xf5f0e0, [0, 0.05 * s, 0.7 * s], [Math.PI / 2, 0, 0]);
    addMesh(head, new THREE.ConeGeometry(0.06 * s, 0.35 * s, 6), 0xf5f0e0, [-0.22 * s, 0.25 * s, 0.2 * s], [0.4, 0, 0.2]);
    addMesh(head, new THREE.ConeGeometry(0.06 * s, 0.35 * s, 6), 0xf5f0e0, [0.22 * s, 0.25 * s, 0.2 * s], [0.4, 0, -0.2]);
  }

  if (morph === 'stego') {
    for (let i = 0; i < 6; i++) {
      addMesh(
        body,
        new THREE.ConeGeometry(0.18 * s, 0.55 * s, 4),
        def.accent,
        [(i % 2 === 0 ? -0.1 : 0.1) * s, 1.7 * s, (-0.7 + i * 0.28) * s],
      );
    }
  }

  if (morph === 'spino') {
    addMesh(body, new THREE.BoxGeometry(0.12 * s, 1.5 * s, 1.5 * s), def.accent, [0, 1.9 * s, -0.1 * s]);
  }

  if (morph === 'dilopho') {
    addMesh(head, new THREE.ConeGeometry(0.12 * s, 0.4 * s, 5), def.accent, [-0.18 * s, 0.3 * s, 0], [0, 0, 0.4]);
    addMesh(head, new THREE.ConeGeometry(0.12 * s, 0.4 * s, 5), def.accent, [0.18 * s, 0.3 * s, 0], [0, 0, -0.4]);
    // Frill fans (animated during chase/attack)
    const fanL = addMesh(head, new THREE.CircleGeometry(0.45 * s, 10), def.accent, [-0.35 * s, 0.05 * s, 0], [0, 0.4, 0.5], 0.35);
    fanL.material.side = THREE.DoubleSide;
    const fanR = addMesh(head, new THREE.CircleGeometry(0.45 * s, 10), def.accent, [0.35 * s, 0.05 * s, 0], [0, -0.4, -0.5], 0.35);
    fanR.material.side = THREE.DoubleSide;
    root.userData._fans = [fanL, fanR];
  }

  if (morph === 'para') {
    addMesh(head, new THREE.CapsuleGeometry(0.08 * s, 0.7 * s, 4, 6), def.accent, [0, 0.35 * s, -0.05 * s], [0.9, 0, 0]);
  }

  if (morph === 'carno') {
    addMesh(head, new THREE.ConeGeometry(0.1 * s, 0.35 * s, 5), def.accent, [-0.28 * s, 0.28 * s, 0], [0, 0, 0.7]);
    addMesh(head, new THREE.ConeGeometry(0.1 * s, 0.35 * s, 5), def.accent, [0.28 * s, 0.28 * s, 0], [0, 0, -0.7]);
  }

  if (morph === 'ankylo') {
    for (let i = 0; i < 5; i++) {
      addMesh(body, new THREE.SphereGeometry(0.18 * s, 8, 6), def.accent, [(i % 2 ? -0.35 : 0.35) * s, 1.45 * s, (-0.5 + i * 0.25) * s]);
    }
  }

  const wings = [];
  if (morph === 'ptera') {
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(side * 0.35 * s, 1.35 * s, 0.1 * s);
      const membrane = addMesh(
        wing,
        new THREE.BoxGeometry(1.6 * s, 0.06 * s, 0.7 * s),
        def.accent,
        [side * 0.8 * s, 0, 0],
        [0, 0, side * 0.15],
        0.25,
      );
      membrane.material.side = THREE.DoubleSide;
      body.add(wing);
      wings.push(wing);
    }
  }

  const tail = new THREE.Group();
  tail.position.set(0, 1.1 * s, -0.9 * s);
  body.add(tail);
  addMesh(tail, new THREE.CapsuleGeometry(0.28 * s, 0.7 * s, 4, 8), def.color, [0, 0, -0.35 * s], [Math.PI / 2, 0, 0]);
  if (morph === 'ankylo') {
    addMesh(tail, new THREE.SphereGeometry(0.35 * s, 10, 8), def.accent, [0, 0, -1.15 * s]);
  } else if (morph === 'stego') {
    addMesh(tail, new THREE.ConeGeometry(0.12 * s, 0.4 * s, 4), 0xf5f0e0, [-0.15 * s, 0, -1.1 * s], [Math.PI / 2, 0, 0]);
    addMesh(tail, new THREE.ConeGeometry(0.12 * s, 0.4 * s, 4), 0xf5f0e0, [0.15 * s, 0, -1.1 * s], [Math.PI / 2, 0, 0]);
  } else {
    addMesh(tail, new THREE.CapsuleGeometry(0.16 * s, 0.6 * s, 4, 8), def.accent, [0, 0, -1.0 * s], [Math.PI / 2, 0, 0]);
  }

  const legs = [];
  const isAquatic = morph === 'mosa';
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
  } else if (morph === 'ptera') {
    for (const x of [-0.25, 0.25]) {
      const leg = new THREE.Group();
      leg.position.set(x * s, 0.2 * s, -0.2 * s);
      addMesh(leg, new THREE.CapsuleGeometry(0.08 * s, 0.35 * s, 4, 6), def.color, [0, 0.25 * s, 0]);
      body.add(leg);
      legs.push(leg);
    }
  } else {
    const isBiped = def.role === 'predator' || morph === 'raptor' || morph === 'theropod' || morph === 'spino' || morph === 'carno' || morph === 'dilopho';
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

  root.userData.parts = { body, neck, head, jaw, tail, legs, wings, shadow, marker, hpBar, torso };
  root.userData.radius = 1.2 * s;
  root.userData.speed = def.role === 'predator' ? 7.5 : def.role === 'mother' ? 6 : 3.5;
  root.scale.setScalar(1.4);

  root.userData.updateAnim = (dt, moving = false) => {
    const u = root.userData;
    u.anim.t += dt;
    const t = u.anim.t;
    const limp = !!u.limp;
    const walk = moving || u.anim.state === 'chase' || u.anim.state === 'run' ? 1 : 0.25;
    const limpWalk = limp ? 0.55 : 1;
    const attackBoost = u.anim.state === 'attack' ? 1.4 : 1;
    const panicBoost = u.anim.panic ? 1.55 : 1;

    const celebrating = u.anim.state === 'celebrate';
    const hop = celebrating ? Math.abs(Math.sin(t * 10)) * 0.35 * s : 0;
    body.position.y =
      hop + Math.sin(t * 8 * walk * panicBoost * limpWalk) * 0.05 * s * (u.anim.panic ? 1.4 : 1);
    if (celebrating) {
      body.rotation.y = Math.sin(t * 6) * 0.35;
      neck.rotation.x = -0.25 + Math.sin(t * 8) * 0.15;
    } else {
      body.rotation.y = THREE.MathUtils.lerp(body.rotation.y || 0, 0, 1 - Math.pow(0.01, dt));
      neck.rotation.x = Math.sin(t * 3) * 0.1 + (u.anim.state === 'attack' ? -0.35 : 0);
    }
    head.rotation.y = Math.sin(t * 2.2) * 0.15;
    head.rotation.x = u.anim.state === 'attack' ? Math.sin(t * 12) * 0.2 : Math.sin(t * 1.5) * 0.05;
    if (jaw) {
      jaw.rotation.x = u.anim.state === 'attack' ? Math.sin(t * 14) * 0.55 : Math.sin(t * 2) * 0.08;
      jaw.position.y = (u.anim.state === 'attack' ? -0.12 : -0.05) * s;
    }
    tail.rotation.y = Math.sin(t * 5 * walk * limpWalk) * 0.45;
    tail.rotation.x = Math.sin(t * 4) * 0.1;

    legs.forEach((leg, i) => {
      const phase = i % 2 === 0 ? 1 : -1;
      // Injured predators drag one side with a shorter, slower stride
      const limpAmp = limp ? (i % 2 === 0 ? 0.35 : 0.85) : 1;
      if (isAquatic) {
        leg.rotation.z = Math.sin(t * 6 * walk * limpWalk) * 0.35 * phase * limpAmp;
      } else {
        leg.rotation.x =
          Math.sin(t * 9 * walk * attackBoost * panicBoost * limpWalk) * 0.65 * phase * walk * limpAmp;
      }
    });

    wings.forEach((wing, i) => {
      const side = i === 0 ? -1 : 1;
      wing.rotation.z = side * (0.25 + Math.sin(t * 7 * walk) * 0.45 * walk);
    });

    if (root.userData._fans) {
      const flare = u.anim.state === 'attack' || u.anim.state === 'chase' ? 0.55 : 0.2;
      root.userData._fans[0].rotation.z = 0.5 + Math.sin(t * 6) * flare;
      root.userData._fans[1].rotation.z = -0.5 - Math.sin(t * 6) * flare;
    }

    if (u.anim.state === 'hurt') {
      body.rotation.z = Math.sin(t * 30) * 0.12 + (limp ? 0.12 : 0);
      body.position.x = Math.sin(t * 40) * 0.05;
    } else if (limp) {
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0.14 + Math.sin(t * 5) * 0.04, 1 - Math.pow(0.01, dt));
      body.position.x = THREE.MathUtils.lerp(body.position.x, 0.04, 1 - Math.pow(0.01, dt));
    } else {
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, 1 - Math.pow(0.001, dt));
      body.position.x = THREE.MathUtils.lerp(body.position.x, 0, 1 - Math.pow(0.001, dt));
    }

    if (morph === 'ptera') {
      body.position.y += 0.35 * s + Math.sin(t * 3) * 0.12 * s;
    }

    if (u.parts.marker) {
      u.parts.marker.position.y = 2.8 * s + 0.6 + Math.sin(t * 4) * 0.15;
      u.parts.marker.rotation.y += dt * 2;
    }
    if (u.parts.hpBar) {
      const ratio = Math.max(0, u.hp / u.maxHp);
      u.parts.hpBar.fill.scale.x = Math.max(0.01, ratio);
      u.parts.hpBar.fill.position.x = -((1 - ratio) * u.parts.hpBar.width) / 2;
      u.parts.hpBar.bg.rotation.set(0, 0, 0);
    }

    // Occasional blink for lively characters
    if (root.userData._eyes) {
      const blink = Math.sin(t * 1.7) > 0.96;
      for (const eye of root.userData._eyes) {
        eye.scale.y = blink ? 0.15 : 1;
      }
    }
  };

  return root;
}
