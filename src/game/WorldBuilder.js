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

  // Store lore: king flowers in rain forests
  if (biome === 'forest') {
    const flowers = [];
    for (let i = 0; i < 14; i++) {
      const flower = makeKingFlower();
      const a = rand(0, Math.PI * 2);
      const r = rand(8, 36);
      flower.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      if (Math.abs(flower.position.x) < 3.5 && flower.position.z > -14 && flower.position.z < 14) {
        flower.position.x += flower.position.x >= 0 ? 4 : -4;
      }
      group.add(flower);
      flowers.push(flower);
    }
    group.userData.kingFlowers = flowers;

    // Soft rainfall for tropical rainforest atmosphere
    const rain = [];
    for (let i = 0; i < 48; i++) {
      const drop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, rand(0.35, 0.7), 4),
        new THREE.MeshBasicMaterial({
          color: 0xa8d4f0,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        }),
      );
      drop.position.set(rand(-28, 28), rand(4, 14), rand(-28, 28));
      drop.userData.speed = rand(8, 14);
      drop.userData.baseX = drop.position.x;
      drop.userData.baseZ = drop.position.z;
      group.add(drop);
      rain.push(drop);
    }
    group.userData.rainDrops = rain;

    // Soft pollen motes drifting through the rainforest canopy
    const pollen = [];
    for (let i = 0; i < 36; i++) {
      const mote = new THREE.Mesh(
        new THREE.SphereGeometry(rand(0.04, 0.09), 6, 6),
        new THREE.MeshBasicMaterial({
          color: i % 3 === 0 ? 0xffe08a : 0xf4c14b,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        }),
      );
      mote.position.set(rand(-22, 22), rand(1.2, 6), rand(-22, 22));
      mote.userData.base = mote.position.clone();
      mote.userData.phase = rand(0, Math.PI * 2);
      mote.userData.drift = rand(0.3, 0.9);
      group.add(mote);
      pollen.push(mote);
    }
    group.userData.pollen = pollen;
  }

  if (biome === 'swamp') {
    // Store lore: vine swamp — hanging vines that sway in the humid air
    const swingingVines = [];
    for (let i = 0; i < 16; i++) {
      const vine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.08, rand(3, 6), 6),
        new THREE.MeshStandardMaterial({
          color: 0x2f5a22,
          roughness: 0.9,
          emissive: 0x1a3a14,
          emissiveIntensity: 0.08,
        }),
      );
      const a = rand(0, Math.PI * 2);
      const r = rand(10, 40);
      vine.position.set(Math.cos(a) * r, vine.geometry.parameters[2] / 2, Math.sin(a) * r);
      vine.rotation.z = rand(-0.4, 0.4);
      vine.userData.phase = rand(0, Math.PI * 2);
      vine.userData.baseRotZ = vine.rotation.z;
      group.add(vine);
      swingingVines.push(vine);
    }
    group.userData.swingingVines = swingingVines;

    // Mud geyser vents that puff humid swamp mist
    const mudGeysers = [];
    for (let i = 0; i < 6; i++) {
      const vent = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.55, 0.35, 8),
        new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 1 }),
      );
      const a = rand(0, Math.PI * 2);
      const r = rand(12, 34);
      vent.position.set(Math.cos(a) * r, 0.15, Math.sin(a) * r);
      if (Math.abs(vent.position.x) < 4 && vent.position.z > -14 && vent.position.z < 14) {
        vent.position.x += vent.position.x >= 0 ? 5 : -5;
      }
      vent.userData.phase = rand(0, Math.PI * 2);
      vent.userData.kind = 'mudGeyser';
      group.add(vent);
      mudGeysers.push(vent);
    }
    group.userData.mudGeysers = mudGeysers;
  }

  if (biome === 'cave') {
    const crystals = [];
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
      crystal.userData.phase = rand(0, Math.PI * 2);
      group.add(crystal);
      crystals.push(crystal);
    }
    group.userData.caveCrystals = crystals;
    // Store lore: dripping stalactites in rock caves
    const drips = [];
    for (let i = 0; i < 18; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(rand(0.12, 0.28), rand(1.2, 2.6), 6),
        new THREE.MeshStandardMaterial({
          color: colors.accent,
          emissive: colors.accent,
          emissiveIntensity: 0.2,
          roughness: 0.45,
        }),
      );
      spike.rotation.x = Math.PI;
      const a = rand(0, Math.PI * 2);
      const r = rand(4, 28);
      spike.position.set(Math.cos(a) * r, rand(5.5, 7.5), Math.sin(a) * r);
      group.add(spike);
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xb6eaff, transparent: true, opacity: 0.7 }),
      );
      drop.position.copy(spike.position);
      drop.position.y -= 0.4;
      drop.userData.baseY = drop.position.y;
      drop.userData.phase = rand(0, Math.PI * 2);
      group.add(drop);
      drips.push(drop);
    }
    group.userData.stalactiteDrips = drips;
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
    // Soft bioluminescent fill light for Firefly Lights Cave
    const glow = new THREE.PointLight(0xf4c14b, 0.85, 28);
    glow.position.set(0, 4, 0);
    group.add(glow);
    group.userData.fireflyLight = glow;
  }

  if (biome === 'crater') {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(12, 2.2, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1, emissive: 0xc45c26, emissiveIntensity: 0.12 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(10, 0.4, -6);
    group.add(rim);
    const meteor = new THREE.Mesh(
      new THREE.DodecahedronGeometry(2.4),
      new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xc45c26, emissiveIntensity: 0.45 }),
    );
    meteor.position.set(10, 1.2, -6);
    meteor.userData.phase = rand(0, Math.PI * 2);
    group.add(meteor);
    group.userData.meteorCore = meteor;
    // Impact glow light at crater center
    const impactGlow = new THREE.PointLight(0xff6a2a, 1.4, 22);
    impactGlow.position.set(10, 2.2, -6);
    group.add(impactGlow);
    group.userData.meteorImpactGlow = impactGlow;
    // Smoke pillars rising from the meteorite hole
    const smokePillars = [];
    for (let i = 0; i < 8; i++) {
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(rand(0.5, 1.1), 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x6b5a4a, transparent: true, opacity: 0.35, depthWrite: false }),
      );
      const a = (i / 8) * Math.PI * 2;
      smoke.position.set(10 + Math.cos(a) * 3.2, rand(1.5, 3), -6 + Math.sin(a) * 3.2);
      smoke.userData.baseY = smoke.position.y;
      smoke.userData.phase = rand(0, Math.PI * 2);
      group.add(smoke);
      smokePillars.push(smoke);
    }
    group.userData.meteorSmoke = smokePillars;
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
    group.userData.lavaPool = lava;
    // Flowing lava river ribbons across the volcano floor
    const lavaRivers = [];
    for (let i = 0; i < 4; i++) {
      const river = new THREE.Mesh(
        new THREE.PlaneGeometry(rand(2.2, 3.4), rand(10, 16)),
        new THREE.MeshStandardMaterial({
          color: 0xff4d2a,
          emissive: 0xff2a00,
          emissiveIntensity: 0.75,
          roughness: 0.35,
          transparent: true,
          opacity: 0.9,
        }),
      );
      river.rotation.x = -Math.PI / 2;
      river.rotation.z = rand(-0.55, 0.55);
      river.position.set(rand(-16, 22), 0.06, rand(-18, 8));
      // Keep center rescue lane readable
      if (Math.abs(river.position.x) < 4) river.position.x += river.position.x >= 0 ? 6 : -6;
      river.userData.phase = rand(0, Math.PI * 2);
      group.add(river);
      lavaRivers.push(river);
    }
    group.userData.lavaRivers = lavaRivers;
    const ash = [];
    for (let i = 0; i < 36; i++) {
      const flake = new THREE.Mesh(
        new THREE.SphereGeometry(rand(0.05, 0.12), 5, 5),
        new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.55 }),
      );
      flake.position.set(rand(-30, 30), rand(1, 8), rand(-30, 30));
      flake.userData.base = flake.position.clone();
      flake.userData.phase = rand(0, Math.PI * 2);
      group.add(flake);
      ash.push(flake);
    }
    group.userData.ash = ash;
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

  // Store lore: water-eroded Danxia mountain terraces
  if (level.id === 'danxia') {
    const terraces = [];
    for (let i = 0; i < 10; i++) {
      const stack = new THREE.Group();
      const layers = 3 + (i % 3);
      let y = 0;
      for (let L = 0; L < layers; L++) {
        const h = rand(0.7, 1.4);
        const rad = rand(1.4, 2.6) - L * 0.25;
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(rad * 0.85, rad, h, 10),
          new THREE.MeshStandardMaterial({
            color: L % 2 ? 0xc45c26 : 0x8b2e14,
            roughness: 0.95,
            flatShading: true,
          }),
        );
        band.position.y = y + h / 2;
        y += h * 0.92;
        stack.add(band);
      }
      const a = rand(0, Math.PI * 2);
      const r = rand(16, 42);
      stack.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      // Keep rescue lane clear
      if (Math.abs(stack.position.x) < 5 && stack.position.z > -18 && stack.position.z < 14) {
        stack.position.x += stack.position.x >= 0 ? 8 : -8;
      }
      group.add(stack);
      terraces.push(stack);
    }
    group.userData.danxiaTerraces = terraces;
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

    // Store lore: swinging coral relics
    const swingingCoral = [];
    for (let i = 0; i < 18; i++) {
      const coral = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, rand(1, 2.5), 6),
        new THREE.MeshStandardMaterial({
          color: i % 2 ? 0xff8fab : 0xffc14d,
          roughness: 0.6,
          emissive: i % 2 ? 0xff8fab : 0xffc14d,
          emissiveIntensity: 0.12,
        }),
      );
      const a = rand(0, Math.PI * 2);
      const r = rand(10, 40);
      coral.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r);
      coral.userData.phase = rand(0, Math.PI * 2);
      coral.userData.baseRotZ = coral.rotation.z;
      group.add(coral);
      swingingCoral.push(coral);
    }
    group.userData.swingingCoral = swingingCoral;

    const bubbles = [];
    for (let i = 0; i < 24; i++) {
      const b = new THREE.Mesh(
        new THREE.SphereGeometry(rand(0.08, 0.2), 8, 6),
        new THREE.MeshStandardMaterial({
          color: 0xb6eaff,
          transparent: true,
          opacity: 0.45,
          roughness: 0.2,
        }),
      );
      b.position.set(rand(-25, 25), rand(0.5, 4), rand(-25, 25));
      b.userData.baseY = b.position.y;
      b.userData.phase = rand(0, Math.PI * 2);
      group.add(b);
      bubbles.push(b);
    }
    group.userData.bubbles = bubbles;

    // Tiny plankton sparkles drifting in ocean currents
    const plankton = [];
    for (let i = 0; i < 40; i++) {
      const mote = new THREE.Mesh(
        new THREE.SphereGeometry(rand(0.03, 0.07), 5, 5),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? 0xb6eaff : 0x7fd0c0,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        }),
      );
      mote.position.set(rand(-28, 28), rand(0.6, 5), rand(-28, 28));
      mote.userData.base = mote.position.clone();
      mote.userData.phase = rand(0, Math.PI * 2);
      group.add(mote);
      plankton.push(mote);
    }
    group.userData.plankton = plankton;

    // Soft caustic / god-ray light for underwater biomes
    const caustic = new THREE.PointLight(0x7fd0c0, 1.1, 42);
    caustic.position.set(4, 6, -2);
    group.add(caustic);
    group.userData.causticLight = caustic;

    // Deep-Sea Swirl: rotating whirlpool current
    if (level.id === 'deep_swirl') {
      const whirl = new THREE.Group();
      whirl.position.set(8, water ? 0.42 : 0.1, -4);
      const disc = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 7.5, 40),
        new THREE.MeshStandardMaterial({
          color: 0x60a5fa,
          emissive: 0x2563eb,
          emissiveIntensity: 0.55,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          roughness: 0.35,
        }),
      );
      disc.rotation.x = -Math.PI / 2;
      whirl.add(disc);
      const spiral = new THREE.Mesh(
        new THREE.TorusGeometry(4.2, 0.18, 8, 48),
        new THREE.MeshStandardMaterial({
          color: 0xb6eaff,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.7,
          transparent: true,
          opacity: 0.75,
        }),
      );
      spiral.rotation.x = Math.PI / 2;
      whirl.add(spiral);
      group.add(whirl);
      group.userData.whirlpool = { root: whirl, disc, spiral };
    }

    // Tropical Ocean Current: flowing current ribbons kids can see
    if (level.id === 'ocean_current') {
      const currents = [];
      for (let i = 0; i < 7; i++) {
        const ribbon = new THREE.Mesh(
          new THREE.PlaneGeometry(rand(1.2, 2.2), rand(8, 14)),
          new THREE.MeshBasicMaterial({
            color: i % 2 ? 0x7fd0c0 : 0xf4c14b,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        ribbon.rotation.x = -Math.PI / 2;
        ribbon.rotation.z = rand(-0.35, 0.35);
        ribbon.position.set(rand(-18, 18), (water ? 0.48 : 0.14) + i * 0.01, rand(-16, 10));
        ribbon.userData.phase = rand(0, Math.PI * 2);
        ribbon.userData.drift = rand(2.5, 5);
        group.add(ribbon);
        currents.push(ribbon);
      }
      group.userData.oceanCurrents = currents;
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

  // Rescue routes from spawn (z≈12) toward nest (z≈-16) — store: multiple route designs
  const routeMat = new THREE.MeshStandardMaterial({
    color: water ? 0x5ec8e8 : biome === 'volcano' ? 0x6b4226 : 0xc4a35a,
    roughness: 0.95,
    transparent: true,
    opacity: 0.72,
  });
  const route = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 30), routeMat);
  route.rotation.x = -Math.PI / 2;
  route.position.set(0, 0.04, -2);
  group.add(route);
  // Forked alternate lane so kids can choose left or right rescue path
  const forkMat = routeMat.clone();
  forkMat.opacity = 0.55;
  forkMat.color = new THREE.Color(water ? 0x7fd0c0 : biome === 'swamp' ? 0x8aa86a : 0xd4b06a);
  const forkA = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 18), forkMat);
  forkA.rotation.x = -Math.PI / 2;
  forkA.rotation.z = 0.38;
  forkA.position.set(-5.5, 0.045, -1);
  group.add(forkA);
  const forkB = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 18), forkMat.clone());
  forkB.rotation.x = -Math.PI / 2;
  forkB.rotation.z = -0.38;
  forkB.position.set(5.5, 0.045, -1);
  group.add(forkB);
  // Soft side rails so the route reads as a designed path
  for (const sx of [-2.4, 2.4]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.18, 28),
      new THREE.MeshStandardMaterial({
        color: water ? 0x7fd0c0 : 0x8a6a3a,
        emissive: water ? 0x2a8fb8 : 0xf4c14b,
        emissiveIntensity: 0.15,
        roughness: 0.9,
      }),
    );
    rail.position.set(sx, 0.12, -2);
    group.add(rail);
  }
  group.userData.rescueRoute = route;
  group.userData.forkedRoutes = [forkA, forkB];

  // Mugger crocodiles hidden in water bays / swamp (store lore hazard)
  const crocs = [];
  if (biome === 'swamp' || water || biome === 'ocean') {
    for (let i = 0; i < (biome === 'swamp' ? 4 : 3); i++) {
      const croc = makeCrocodile(water ? 0x2a6a5a : 0x3a5a28);
      const side = i % 2 === 0 ? -1 : 1;
      croc.position.set(side * rand(10, 22), water ? 0.25 : 0.05, rand(-12, 8));
      croc.rotation.y = side > 0 ? -0.4 : 0.4;
      croc.userData.kind = 'crocodile';
      croc.userData.radius = 1.6;
      croc.userData.phase = rand(0, Math.PI * 2);
      group.add(croc);
      crocs.push(croc);
    }
  }
  group.userData.crocs = crocs;

  // Mission landmarks
  const nest = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 2.2, 0.4, 16),
    new THREE.MeshStandardMaterial({ color: 0xc4a35a, roughness: 1 }),
  );
  nest.position.set(0, 0.2, -16);
  nest.receiveShadow = true;
  group.add(nest);
  group.userData.nestPos = nest.position.clone();

  // Glowing nest beacon so kids can find the escort target
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 3.2, 8),
    new THREE.MeshStandardMaterial({
      color: 0xf4c14b,
      emissive: 0xf4c14b,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.85,
    }),
  );
  beacon.position.set(0, 1.8, -16);
  group.add(beacon);
  const beaconRing = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.6, 24),
    new THREE.MeshBasicMaterial({ color: 0x62d26f, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  );
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.set(0, 0.12, -16);
  group.add(beaconRing);
  group.userData.nestBeacon = { beacon, beaconRing };

  // Escort collectible eggs for bonus score / learning loop
  const eggs = [];
  for (let i = 0; i < 5; i++) {
    const egg = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 10, 8),
      new THREE.MeshStandardMaterial({
        color: i % 2 ? 0xffe08a : 0xf4c14b,
        emissive: 0xf4c14b,
        emissiveIntensity: 0.25,
        roughness: 0.55,
      }),
    );
    egg.scale.set(0.85, 1.1, 0.85);
    const a = (i / 5) * Math.PI * 2 + 0.4;
    egg.position.set(Math.cos(a) * 8, 0.45, -16 + Math.sin(a) * 5);
    egg.userData.kind = 'egg';
    egg.userData.collected = false;
    egg.visible = false; // revealed during escort phase
    group.add(egg);
    eggs.push(egg);
  }
  group.userData.eggs = eggs;

  // Amber gems — warm glowing collectibles during escort
  const ambers = [];
  for (let i = 0; i < 3; i++) {
    const amber = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffb347,
        emissive: 0xff8c1a,
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.15,
      }),
    );
    const a = (i / 3) * Math.PI * 2 + 1.1;
    amber.position.set(Math.cos(a) * 6.5, 0.55, -16 + Math.sin(a) * 4.2);
    amber.userData.kind = 'amber';
    amber.userData.collected = false;
    amber.visible = false;
    group.add(amber);
    ambers.push(amber);
  }
  group.userData.ambers = ambers;

  // Fossil shards — paleo collectibles for Perfect Rescue
  const fossils = [];
  for (let i = 0; i < 3; i++) {
    const fossil = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.12, 0.55),
      new THREE.MeshStandardMaterial({
        color: 0xd6c4a0,
        emissive: 0xa89070,
        emissiveIntensity: 0.2,
        roughness: 0.85,
      }),
    );
    const a = (i / 3) * Math.PI * 2 + 2.2;
    fossil.position.set(Math.cos(a) * 9.5, 0.2, -16 + Math.sin(a) * 5.5);
    fossil.rotation.y = a;
    fossil.userData.kind = 'fossil';
    fossil.userData.collected = false;
    fossil.visible = false;
    group.add(fossil);
    fossils.push(fossil);
  }
  group.userData.fossils = fossils;

  // Soft sky clouds for atmosphere (not flat single-color sky alone)
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const cloud = new THREE.Group();
    const matC = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      roughness: 1,
    });
    for (let j = 0; j < 3; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(1.2, 2.2), 10, 8), matC);
      puff.position.set(j * 1.4 - 1.4, rand(-0.3, 0.4), rand(-0.4, 0.4));
      puff.scale.y = 0.55;
      cloud.add(puff);
    }
    const a = rand(0, Math.PI * 2);
    const r = rand(20, 45);
    cloud.position.set(Math.cos(a) * r, rand(10, 16), Math.sin(a) * r);
    cloud.userData.drift = rand(0.4, 1.1);
    cloud.userData.baseX = cloud.position.x;
    group.add(cloud);
    clouds.push(cloud);
  }
  group.userData.clouds = clouds;

  // Roadblocks / route obstacles — denser on boss / swamp routes
  const blockers = [];
  const blockCount = level.boss ? 12 : biome === 'swamp' || biome === 'volcano' ? 10 : 8;
  for (let i = 0; i < blockCount; i++) {
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

  // Ambient herd silhouettes at the map rim (alive Jurassic park feel)
  const ambientHerd = [];
  for (let i = 0; i < 5; i++) {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.45, 1.1, 4, 8),
      new THREE.MeshStandardMaterial({
        color: i % 2 ? 0x3f9d5a : 0x4a9bb8,
        roughness: 0.9,
        transparent: true,
        opacity: 0.85,
      }),
    );
    const a = (i / 5) * Math.PI * 2 + 0.3;
    body.position.set(Math.cos(a) * 38, 0.9, Math.sin(a) * 38);
    body.lookAt(0, 0.9, 0);
    body.userData.phase = rand(0, Math.PI * 2);
    body.userData.kind = 'ambientHerd';
    group.add(body);
    ambientHerd.push(body);
  }
  group.userData.ambientHerd = ambientHerd;

  // Occasional sky flyby — distant pterosaur gliders
  const skyFlybys = [];
  for (let i = 0; i < 3; i++) {
    const flyer = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.4, 6),
      new THREE.MeshStandardMaterial({
        color: 0x8b6b4a,
        roughness: 0.75,
        transparent: true,
        opacity: 0.8,
      }),
    );
    flyer.rotation.x = Math.PI / 2;
    flyer.position.set(rand(-30, 30), rand(9, 14), rand(-30, 30));
    flyer.userData.speed = rand(3.5, 6);
    flyer.userData.phase = rand(0, Math.PI * 2);
    flyer.userData.kind = 'skyFlyby';
    group.add(flyer);
    skyFlybys.push(flyer);
  }
  group.userData.skyFlybys = skyFlybys;

  scene.background = new THREE.Color(colors.sky);
  scene.fog = new THREE.Fog(colors.fog, 40, 90);

  scene.add(group);
  return group;
}

/** Flat tire skid mark for hard jeep turns. */
export function createTireSkid(color = 0x2a2118) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, 1.1),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.04;
  mesh.userData.life = 1.8;
  mesh.userData.kind = 'skid';
  return mesh;
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

function makeKingFlower() {
  const g = new THREE.Group();
  g.userData.kind = 'kingFlower';
  g.userData.phase = rand(0, Math.PI * 2);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.09, 1.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x2f7a3e, roughness: 0.9 }),
  );
  stem.position.y = 0.7;
  g.add(stem);
  const bloom = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xff6b8a,
      emissive: 0xc45c26,
      emissiveIntensity: 0.25,
      roughness: 0.55,
    }),
  );
  bloom.position.y = 1.45;
  bloom.scale.set(1, 0.55, 1);
  g.add(bloom);
  g.userData.bloom = bloom;
  const petals = [];
  for (let i = 0; i < 5; i++) {
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xf4c14b, roughness: 0.7, emissive: 0xf4c14b, emissiveIntensity: 0.12 }),
    );
    const a = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.38, 1.4, Math.sin(a) * 0.38);
    petal.scale.set(1, 0.4, 0.7);
    petal.userData.baseR = 0.38;
    petal.userData.angle = a;
    g.add(petal);
    petals.push(petal);
  }
  g.userData.petals = petals;
  return g;
}

function makeCrocodile(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 1.4, 4, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, emissive: color, emissiveIntensity: 0.08 }),
  );
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.25;
  body.castShadow = true;
  g.add(body);
  const snout = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.22, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x2a4030, roughness: 0.9 }),
  );
  snout.position.set(1.05, 0.28, 0);
  g.add(snout);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xf4c14b }),
  );
  eye.position.set(0.55, 0.48, 0.18);
  g.add(eye);
  const eye2 = eye.clone();
  eye2.position.z = -0.18;
  g.add(eye2);
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

export function createTrailPuff(color, water = false) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(water ? 0.18 : 0.22, 6, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: water ? 0.45 : 0.4 }),
  );
  mesh.userData.life = 0.45;
  mesh.userData.kind = 'trail';
  return mesh;
}

/** Short-lived additive muzzle flash for weapon fire feedback. */
export function createMuzzleFlash(color = 0xfff3a0, scale = 1) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.28 * scale, 8, 8),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    }),
  );
  mesh.userData.life = 0.12;
  mesh.userData.maxLife = 0.12;
  mesh.userData.kind = 'muzzle';
  mesh.userData.baseScale = scale;
  return mesh;
}

/** Oval footprint left by walking dinosaurs. */
export function createFootprint(color = 0x3a2a18) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 10),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(0.7, 1.15, 1);
  mesh.userData.life = 1.8;
  mesh.userData.kind = 'footprint';
  return mesh;
}

/** Expanding ring wake for submarines. */
export function createWakeRing(color = 0xb6eaff) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.55, 20),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.life = 0.7;
  mesh.userData.kind = 'wake';
  return mesh;
}

/** Soft heal spark for mother-assist soothing. */
export function createHealSpark() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0x62d26f, transparent: true, opacity: 0.9 }),
  );
  mesh.userData.life = 0.7;
  mesh.userData.kind = 'heal';
  mesh.userData.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 1.2,
    1.5 + Math.random(),
    (Math.random() - 0.5) * 1.2,
  );
  return mesh;
}

/** Bright confetti flake for nest celebration. */
export function createConfetti(color = 0xf4c14b) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.08, 0.04),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
  );
  mesh.userData.life = 1.4;
  mesh.userData.kind = 'confetti';
  mesh.userData.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 5,
    3 + Math.random() * 4,
    (Math.random() - 0.5) * 5,
  );
  mesh.userData.spin = (Math.random() - 0.5) * 10;
  return mesh;
}

/** Soft dust kick when the jeep accelerates on land. */
export function createDustKick(color = 0xc4a35a) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 6, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }),
  );
  mesh.userData.life = 0.55;
  mesh.userData.kind = 'dust';
  mesh.userData.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 1.2,
    0.8 + Math.random() * 0.6,
    (Math.random() - 0.5) * 1.2,
  );
  return mesh;
}

/** Ground chevron pointing toward the nest during escort. */
export function createNestChevron(color = 0xf4c14b) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.55);
  shape.lineTo(0.42, -0.35);
  shape.lineTo(0, -0.1);
  shape.lineTo(-0.42, -0.35);
  shape.closePath();
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.06;
  mesh.userData.kind = 'chevron';
  return mesh;
}

/** Expanding ground ring when the mother dinosaur arrives to help. */
export function createMotherRing(color = 0xf4c14b) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.95, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.08;
  mesh.userData.life = 1.1;
  mesh.userData.kind = 'motherRing';
  return mesh;
}

/** Sonic roar ring that expands from a predator bellow. */
export function createRoarRing(color = 0xe85d4c) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.85, 36),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.12;
  mesh.userData.life = 0.85;
  mesh.userData.kind = 'roarRing';
  return mesh;
}

/** Fast mother-arrival shockwave disc. */
export function createShockwave(color = 0x60a5fa) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 1.1, 40),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.1;
  mesh.userData.life = 0.7;
  mesh.userData.kind = 'shockwave';
  return mesh;
}

/** Floating stun star when the predator retreats. */
export function createStunStar(color = 0xffe08a) {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18, 0),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
  );
  mesh.userData.life = 1.2;
  mesh.userData.kind = 'stunStar';
  mesh.userData.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 2.2,
    1.8 + Math.random() * 1.4,
    (Math.random() - 0.5) * 2.2,
  );
  mesh.userData.spin = (Math.random() - 0.5) * 12;
  return mesh;
}

/** Soft chirp bubble above the baby during escort. */
export function createChirpBubble(color = 0xffffff) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }),
  );
  mesh.userData.life = 0.9;
  mesh.userData.kind = 'chirp';
  mesh.userData.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 0.4,
    1.4 + Math.random() * 0.6,
    (Math.random() - 0.5) * 0.4,
  );
  return mesh;
}

/** Baby SOS flare spark when threatened. */
export function createSosFlare(color = 0xff6b4a) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 6, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
  );
  mesh.userData.life = 0.65;
  mesh.userData.kind = 'sos';
  mesh.userData.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 0.8,
    2.2 + Math.random(),
    (Math.random() - 0.5) * 0.8,
  );
  return mesh;
}

/** Soft protect shield dome around mother/baby. */
export function createMotherShield(color = 0x62d26f) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 16, 12),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.userData.life = 2.4;
  mesh.userData.kind = 'motherShield';
  return mesh;
}

/** Thin vehicle damage smoke puff at low Guard HP. */
export function createDamageSmoke(color = 0x6b7280) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 6, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }),
  );
  mesh.userData.life = 0.7;
  mesh.userData.kind = 'damageSmoke';
  mesh.userData.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 0.5,
    1.1 + Math.random() * 0.6,
    (Math.random() - 0.5) * 0.5,
  );
  return mesh;
}
