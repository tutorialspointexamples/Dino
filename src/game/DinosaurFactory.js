import * as THREE from 'three';

function mat(color, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.05,
    emissive,
    emissiveIntensity,
  });
}

function box(w, h, d, color, y = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(r, color, y = 0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(color));
  m.position.y = y;
  m.castShadow = true;
  return m;
}

/**
 * Procedural animated dinosaur with leg / tail / head motion.
 */
export function createDinosaur(def) {
  const root = new THREE.Group();
  root.userData.def = def;
  root.userData.kind = 'dinosaur';
  root.userData.hp = def.role === 'predator' ? 100 : 40;
  root.userData.maxHp = root.userData.hp;
  root.userData.anim = { t: Math.random() * 10, phase: def.role === 'predator' ? 'chase' : 'idle' };

  const body = new THREE.Group();
  root.add(body);

  const torso = box(1.4 * def.scale, 0.9 * def.scale, 2.2 * def.scale, def.color, 1.1 * def.scale);
  body.add(torso);

  const belly = box(1.1 * def.scale, 0.55 * def.scale, 1.6 * def.scale, def.accent, 0.75 * def.scale);
  belly.position.z = 0.1 * def.scale;
  body.add(belly);

  const neck = new THREE.Group();
  neck.position.set(0, 1.35 * def.scale, 1.0 * def.scale);
  body.add(neck);
  const neckMesh = box(0.45 * def.scale, 0.7 * def.scale, 0.7 * def.scale, def.color, 0);
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.set(0, 0.35 * def.scale, 0.45 * def.scale);
  neck.add(head);
  const skull = box(0.7 * def.scale, 0.55 * def.scale, 0.9 * def.scale, def.color, 0);
  head.add(skull);
  const snout = box(0.45 * def.scale, 0.35 * def.scale, 0.7 * def.scale, def.accent, -0.05 * def.scale);
  snout.position.z = 0.55 * def.scale;
  head.add(snout);

  // Eyes
  const eyeL = sphere(0.08 * def.scale, 0xffffff);
  eyeL.position.set(-0.22 * def.scale, 0.12 * def.scale, 0.35 * def.scale);
  head.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x *= -1;
  head.add(eyeR);
  const pupilL = sphere(0.04 * def.scale, 0x111111);
  pupilL.position.copy(eyeL.position).add(new THREE.Vector3(0, 0, 0.05 * def.scale));
  head.add(pupilL);
  const pupilR = pupilL.clone();
  pupilR.position.x *= -1;
  head.add(pupilR);

  if (def.id.includes('trike')) {
    const frill = box(1.4 * def.scale, 1.1 * def.scale, 0.15 * def.scale, def.accent, 0.2 * def.scale);
    frill.position.z = -0.2 * def.scale;
    head.add(frill);
    const horn = box(0.1 * def.scale, 0.1 * def.scale, 0.55 * def.scale, 0xf5f0e0, 0.1 * def.scale);
    horn.position.z = 0.85 * def.scale;
    head.add(horn);
  }

  if (def.id.includes('stego')) {
    for (let i = 0; i < 5; i++) {
      const plate = box(0.08 * def.scale, 0.55 * def.scale, 0.4 * def.scale, def.accent, 1.7 * def.scale);
      plate.position.z = -0.7 * def.scale + i * 0.35 * def.scale;
      body.add(plate);
    }
  }

  if (def.id.includes('spinosaurus') || def.id === 'bahariasaurus') {
    const sail = box(0.12 * def.scale, 1.4 * def.scale, 1.6 * def.scale, def.accent, 1.9 * def.scale);
    body.add(sail);
  }

  if (def.id.includes('dilophosaurus')) {
    const crestL = box(0.08 * def.scale, 0.45 * def.scale, 0.35 * def.scale, def.accent, 0.35 * def.scale);
    crestL.position.set(-0.2 * def.scale, 0.2 * def.scale, 0);
    head.add(crestL);
    const crestR = crestL.clone();
    crestR.position.x *= -1;
    head.add(crestR);
  }

  if (def.id.includes('mosa') || def.id.includes('haino')) {
    // flippers instead of legs later
  }

  const tail = new THREE.Group();
  tail.position.set(0, 1.1 * def.scale, -1.1 * def.scale);
  body.add(tail);
  const t1 = box(0.55 * def.scale, 0.45 * def.scale, 0.9 * def.scale, def.color, 0);
  t1.position.z = -0.35 * def.scale;
  tail.add(t1);
  const t2 = box(0.35 * def.scale, 0.3 * def.scale, 0.8 * def.scale, def.accent, 0);
  t2.position.z = -1.0 * def.scale;
  tail.add(t2);

  const legs = [];
  const isAquatic = def.id.includes('mosa') || def.id.includes('haino');
  if (isAquatic) {
    for (const [x, z] of [
      [-0.7, 0.5],
      [0.7, 0.5],
      [-0.7, -0.6],
      [0.7, -0.6],
    ]) {
      const flip = box(0.7 * def.scale, 0.12 * def.scale, 0.45 * def.scale, def.accent, 0.7 * def.scale);
      flip.position.set(x * def.scale, 0, z * def.scale);
      body.add(flip);
      legs.push(flip);
    }
  } else {
    const isBiped = def.role === 'predator' && !def.id.includes('stego');
    const layout = isBiped
      ? [
          [-0.45, -0.2],
          [0.45, -0.2],
        ]
      : [
          [-0.45, 0.55],
          [0.45, 0.55],
          [-0.45, -0.55],
          [0.45, -0.55],
        ];
    for (const [x, z] of layout) {
      const leg = new THREE.Group();
      leg.position.set(x * def.scale, 0, z * def.scale);
      const thigh = box(0.28 * def.scale, 0.7 * def.scale, 0.28 * def.scale, def.color, 0.45 * def.scale);
      const foot = box(0.32 * def.scale, 0.16 * def.scale, 0.42 * def.scale, def.accent, 0.08 * def.scale);
      foot.position.z = 0.05 * def.scale;
      leg.add(thigh, foot);
      body.add(leg);
      legs.push(leg);
    }
    if (isBiped) {
      // tiny arms
      for (const x of [-0.5, 0.5]) {
        const arm = box(0.16 * def.scale, 0.35 * def.scale, 0.16 * def.scale, def.color, 1.15 * def.scale);
        arm.position.set(x * def.scale, 0, 0.7 * def.scale);
        body.add(arm);
      }
    }
  }

  // Ground shadow disc
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.9 * def.scale, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  root.userData.parts = { body, neck, head, tail, legs, shadow };
  root.userData.radius = 1.1 * def.scale;
  root.userData.speed = def.role === 'predator' ? 7.5 : def.role === 'mother' ? 6 : 3.5;

  root.userData.updateAnim = (dt, moving = false) => {
    const u = root.userData;
    u.anim.t += dt;
    const t = u.anim.t;
    const walk = moving || u.anim.state === 'chase' || u.anim.state === 'run' ? 1 : 0.25;
    const bob = Math.sin(t * 8 * walk) * 0.04 * def.scale;
    body.position.y = bob;
    neck.rotation.x = Math.sin(t * 3) * 0.08 + (u.anim.state === 'attack' ? -0.25 : 0);
    head.rotation.y = Math.sin(t * 2.2) * 0.12;
    tail.rotation.y = Math.sin(t * 5 * walk) * 0.35;
    tail.rotation.x = Math.sin(t * 4) * 0.08;
    legs.forEach((leg, i) => {
      const phase = i % 2 === 0 ? 1 : -1;
      leg.rotation.x = Math.sin(t * 9 * walk) * 0.55 * phase * walk;
    });
    if (u.anim.state === 'hurt') {
      body.rotation.z = Math.sin(t * 30) * 0.08;
    } else {
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, 1 - Math.pow(0.001, dt));
    }
  };

  return root;
}
