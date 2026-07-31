import * as THREE from 'three';

function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function buildWorld(level, scene) {
  const group = new THREE.Group();
  group.name = 'world';
  const { colors, biome, water } = level;

  // Lighting
  group.add(new THREE.AmbientLight(0xffffff, 0.45));
  const hemi = new THREE.HemisphereLight(colors.sky, colors.ground, 0.95);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.25);
  sun.position.set(30, 40, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  group.add(sun);

  if (biome === 'cave' || biome === 'crater') {
    const fill = new THREE.PointLight(colors.accent, 1.4, 60);
    fill.position.set(0, 8, 0);
    group.add(fill);
  }

  // Ground
  const groundMat = new THREE.MeshStandardMaterial({
    color: colors.ground,
    roughness: 0.92,
    metalness: 0.02,
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(55, 48), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Soft hills
  for (let i = 0; i < 18; i++) {
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(rand(2, 5), 12, 10),
      new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 1 }),
    );
    const a = rand(0, Math.PI * 2);
    const r = rand(18, 48);
    hill.position.set(Math.cos(a) * r, -1.5, Math.sin(a) * r);
    hill.scale.y = rand(0.35, 0.7);
    hill.receiveShadow = true;
    group.add(hill);
  }

  if (biome === 'forest' || biome === 'swamp') {
    for (let i = 0; i < 42; i++) {
      const tree = makeTree(biome === 'swamp' ? 0x3a5a28 : 0x2f7a3e);
      const a = rand(0, Math.PI * 2);
      const r = rand(14, 48);
      tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      // Keep spawn / nest / chase lane clear for visibility
      if (Math.hypot(tree.position.x, tree.position.z - 10) < 10) continue;
      if (Math.hypot(tree.position.x, tree.position.z + 16) < 8) continue;
      if (Math.abs(tree.position.x) < 4 && tree.position.z > -18 && tree.position.z < 12) continue;
      group.add(tree);
    }
  }

  if (biome === 'cave') {
    for (let i = 0; i < 35; i++) {
      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(rand(0.3, 0.8), rand(1.5, 4), 5),
        new THREE.MeshStandardMaterial({
          color: colors.accent,
          emissive: colors.accent,
          emissiveIntensity: 0.45,
          roughness: 0.3,
        }),
      );
      const a = rand(0, Math.PI * 2);
      const r = rand(6, 40);
      crystal.position.set(Math.cos(a) * r, rand(0.5, 1.2), Math.sin(a) * r);
      crystal.rotation.z = rand(-0.2, 0.2);
      group.add(crystal);
    }
  }

  if (level.fireflies || (biome === 'cave' && colors.accent === 0xf4c14b)) {
    const fireflies = [];
    for (let i = 0; i < 40; i++) {
      const ff = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xf4c14b }),
      );
      ff.position.set(rand(-20, 20), rand(1, 6), rand(-20, 20));
      ff.userData.phase = rand(0, Math.PI * 2);
      ff.userData.base = ff.position.clone();
      group.add(ff);
      fireflies.push(ff);
    }
    group.userData.fireflies = fireflies;
  }

  if (biome === 'crater') {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(12, 2.2, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(10, 0.4, -6);
    group.add(rim);
    const meteor = new THREE.Mesh(
      new THREE.DodecahedronGeometry(2.4),
      new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xc45c26, emissiveIntensity: 0.25 }),
    );
    meteor.position.set(10, 1.2, -6);
    group.add(meteor);
  }

  if (biome === 'volcano') {
    for (let i = 0; i < 20; i++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rand(0.6, 1.8)),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 }),
      );
      const a = rand(0, Math.PI * 2);
      const r = rand(8, 42);
      rock.position.set(Math.cos(a) * r, 0.5, Math.sin(a) * r);
      rock.castShadow = true;
      group.add(rock);
    }
    const lava = new THREE.Mesh(
      new THREE.CircleGeometry(6, 24),
      new THREE.MeshStandardMaterial({
        color: 0xff4d2a,
        emissive: 0xff2a00,
        emissiveIntensity: 0.8,
      }),
    );
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(18, 0.05, -10);
    group.add(lava);
  }

  if (biome === 'desert') {
    for (let i = 0; i < 24; i++) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(rand(0.8, 2), rand(1.2, 2.5), rand(3, 8), 8),
        new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 1 }),
      );
      const a = rand(0, Math.PI * 2);
      const r = rand(12, 45);
      pillar.position.set(Math.cos(a) * r, pillar.geometry.parameters[2] / 2, Math.sin(a) * r);
      group.add(pillar);
    }
  }

  if (water || biome === 'ocean') {
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2a8fb8,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2,
      metalness: 0.3,
    });
    const waterMesh = new THREE.Mesh(new THREE.CircleGeometry(52, 40), waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = water ? 0.4 : 0.08;
    group.add(waterMesh);
    group.userData.waterMesh = waterMesh;

    for (let i = 0; i < 18; i++) {
      const coral = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, rand(1, 2.5), 6),
        new THREE.MeshStandardMaterial({ color: i % 2 ? 0xff8fab : 0xffc14d, roughness: 0.6 }),
      );
      const a = rand(0, Math.PI * 2);
      const r = rand(10, 40);
      coral.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r);
      group.add(coral);
    }
  }

  // Path ring markers
  const path = new THREE.Mesh(
    new THREE.RingGeometry(10, 10.4, 48),
    new THREE.MeshBasicMaterial({ color: 0xf4c14b, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.06;
  group.add(path);

  // Mission landmarks
  const nest = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 2.2, 0.4, 16),
    new THREE.MeshStandardMaterial({ color: 0xc4a35a, roughness: 1 }),
  );
  nest.position.set(0, 0.2, -16);
  nest.receiveShadow = true;
  group.add(nest);
  group.userData.nestPos = nest.position.clone();

  // Roadblocks / route obstacles (kid-friendly crates & rocks)
  const blockers = [];
  for (let i = 0; i < 8; i++) {
    const block = new THREE.Mesh(
      i % 2 === 0
        ? new THREE.BoxGeometry(rand(1.2, 2.2), rand(0.8, 1.6), rand(1.2, 2.2))
        : new THREE.DodecahedronGeometry(rand(0.7, 1.3)),
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xb45309 : 0x6b7280,
        roughness: 0.85,
      }),
    );
    const a = rand(0, Math.PI * 2);
    const r = rand(12, 36);
    block.position.set(Math.cos(a) * r, block.geometry.parameters?.[1] ? block.geometry.parameters[1] / 2 : 0.7, Math.sin(a) * r);
    // Keep center lane somewhat open
    if (Math.abs(block.position.x) < 3.5 && block.position.z > -14 && block.position.z < 14) {
      block.position.x += block.position.x >= 0 ? 5 : -5;
    }
    block.castShadow = true;
    block.userData.radius = 1.4;
    group.add(block);
    blockers.push(block);
  }
  group.userData.blockers = blockers;

  scene.background = new THREE.Color(colors.sky);
  scene.fog = new THREE.Fog(colors.fog, 40, 90);

  scene.add(group);
  return group;
}

function makeTree(leafColor) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.28, 2.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 1 }),
  );
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  g.add(trunk);
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.4, 7),
    new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.9 }),
  );
  leaves.position.y = 2.8;
  leaves.castShadow = true;
  g.add(leaves);
  return g;
}

export function createProjectile(color = 0xf4c14b) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshBasicMaterial({ color }),
  );
  mesh.userData.kind = 'projectile';
  mesh.userData.life = 1.8;
  mesh.userData.velocity = new THREE.Vector3();
  mesh.userData.damage = 14;
  return mesh;
}

export function createSpark(color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 6),
    new THREE.MeshBasicMaterial({ color }),
  );
  mesh.userData.life = 0.35;
  return mesh;
}
