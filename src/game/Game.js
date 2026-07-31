import * as THREE from 'three';
import { DINOSAURS, LEVELS, VEHICLES } from './data.js';
import { loadSave, writeSave, markCleared } from './Save.js';
import { createDinosaur } from './DinosaurFactory.js';
import { createVehicle } from './VehicleFactory.js';
import { buildWorld, createProjectile, createSpark } from './WorldBuilder.js';
import { Input } from './Input.js';
import { UI } from './UI.js';
import { AudioBus } from './Audio.js';

const PHASE = {
  INTRO: 'intro',
  CHASE: 'chase',
  COMBAT: 'combat',
  MOTHER: 'mother',
  HEADBUTT: 'headbutt',
  ESCORT: 'escort',
  WIN: 'win',
  LOSE: 'lose',
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.save = loadSave();
    this.input = new Input();
    this.ui = new UI(this);
    this.audio = new AudioBus();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 14, 18);

    this.clock = new THREE.Clock();
    this.state = 'title';
    this.paused = false;
    this.missionScore = 0;
    this.projectiles = [];
    this.sparks = [];
    this.world = null;
    this.vehicle = null;
    this.baby = null;
    this.mother = null;
    this.predator = null;
    this.level = null;
    this.phase = PHASE.INTRO;
    this.phaseT = 0;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();

    window.addEventListener('resize', () => this.onResize());

    // Debug unlocks for QA: ?debug=1
    if (new URLSearchParams(location.search).has('debug')) {
      this.save.cleared = LEVELS.map((l) => l.id);
      writeSave(this.save);
    }

    this._buildTitleDiorama();
    this.ui.showTitle();
    this.loop();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  clearSceneExtras() {
    if (this.world) {
      this.scene.remove(this.world);
      this.world = null;
    }
    for (const obj of [this.vehicle, this.baby, this.mother, this.predator]) {
      if (obj) this.scene.remove(obj);
    }
    this.vehicle = this.baby = this.mother = this.predator = null;
    for (const p of this.projectiles) this.scene.remove(p);
    for (const s of this.sparks) this.scene.remove(s);
    this.projectiles = [];
    this.sparks = [];
  }

  _buildTitleDiorama() {
    this.clearSceneExtras();
    this.scene.background = new THREE.Color(0x7ec8e3);
    this.scene.fog = new THREE.Fog(0x8fbf88, 25, 60);
    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    amb.name = 'titleAmb';
    this.scene.add(amb);
    const hemi = new THREE.HemisphereLight(0xb1e1ff, 0x3f9d5a, 1.1);
    hemi.name = 'titleLight';
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0c8, 1.35);
    sun.position.set(10, 20, 8);
    sun.castShadow = true;
    sun.name = 'titleSun';
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x2f7a3e, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'titleGround';
    this.scene.add(ground);

    this.titleDinos = [];
    const showcase = [
      { id: 'trex', pos: [2.2, 0, -1] },
      { id: 'baby_trike', pos: [-1.8, 0, 1.5] },
      { id: 'mother_trike', pos: [-3.8, 0, -0.5] },
      { id: 'baby_ptera', pos: [3.8, 0, 1.2] },
      { id: 'spinosaurus', pos: [-0.5, 0, -3.5] },
    ];
    for (const s of showcase) {
      const d = createDinosaur(DINOSAURS[s.id]);
      d.position.set(...s.pos);
      d.rotation.y = Math.PI * 0.15 + Math.random() * 0.4;
      this.scene.add(d);
      this.titleDinos.push(d);
    }
    const jeep = createVehicle(VEHICLES[0]);
    jeep.position.set(0.2, 0, 3.2);
    jeep.rotation.y = -0.4;
    this.scene.add(jeep);
    this.titleVehicle = jeep;
    this.camera.position.set(4, 5.5, 9);
    this.camera.lookAt(0, 1.4, 0);
  }

  _clearTitleDiorama() {
    for (const o of [...this.scene.children]) {
      if (
        ['titleLight', 'titleSun', 'titleGround', 'titleAmb'].includes(o.name) ||
        o.userData?.kind === 'dinosaur' ||
        o.userData?.kind === 'vehicle' ||
        o.name === 'world'
      ) {
        this.scene.remove(o);
      }
    }
    this.titleDinos = [];
    this.titleVehicle = null;
  }

  showTitleScene() {
    this.state = 'title';
    this.paused = false;
    this._clearTitleDiorama();
    this.clearSceneExtras();
    this._buildTitleDiorama();
  }

  showHubScene() {
    this.state = 'hub';
    // keep title diorama spinning in background
  }

  startMission(level, vehicleId) {
    this._clearTitleDiorama();
    this.clearSceneExtras();
    this.level = level;
    this.missionScore = 0;
    this.phase = PHASE.INTRO;
    this.phaseT = 0;
    this.paused = false;
    this.state = 'mission';

    this.world = buildWorld(level, this.scene);

    const vDef = VEHICLES.find((v) => v.id === vehicleId) || VEHICLES[0];
    this.vehicle = createVehicle(vDef);
    // Face -Z toward the nest / rescue action (Three.js default forward)
    this.vehicle.position.set(0, 0, 12);
    this.vehicle.rotation.y = 0;
    this.scene.add(this.vehicle);

    this.baby = createDinosaur(DINOSAURS[level.baby]);
    this.baby.position.set(1.5, 0, -6);
    this.baby.userData.anim.state = 'run';
    this.scene.add(this.baby);

    this.predator = createDinosaur(DINOSAURS[level.predator]);
    this.predator.position.set(5, 0, -2);
    this.predator.userData.anim.state = 'chase';
    // Tuned for kids: normal missions resolve quickly; bosses last longer
    this.predator.userData.hp = level.boss ? 140 : 70;
    this.predator.userData.maxHp = this.predator.userData.hp;
    this.scene.add(this.predator);

    this.mother = createDinosaur(DINOSAURS[level.mother]);
    this.mother.position.set(-30, 0, -20);
    this.mother.visible = false;
    this.mother.userData.anim.state = 'idle';
    this.scene.add(this.mother);

    // Snap chase camera onto the jeep immediately
    const back = new THREE.Vector3(0, 4.8, 7.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.vehicle.rotation.y);
    this.camera.position.copy(this.vehicle.position).add(back);
    this.camera.lookAt(this.vehicle.position.x, 1.4, this.vehicle.position.z - 4);

    this.ui.showHud(`Protect ${DINOSAURS[level.baby].name}!`);
    this.ui.toast(level.boss ? 'Alarm! Boss dinosaur alert!' : 'Rescue mission started!');
    this.ui.showAim(false);
    this.audio.ui();
    const hint = document.getElementById('control-hint');
    if (hint) {
      hint.classList.remove('fade');
      setTimeout(() => hint.classList.add('fade'), 4500);
    }
    writeSave(this.save);
  }

  setWeaponMode(mode) {
    if (this.vehicle) this.vehicle.userData.weaponMode = mode;
  }

  pause() {
    if (this.state !== 'mission') return;
    this.paused = true;
    this.ui.showPause();
  }

  resume() {
    this.paused = false;
    this.ui.hidePause();
  }

  quitToHub() {
    this.paused = false;
    this.ui.hidePause();
    this.showTitleScene();
    this.ui.showHub();
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.state === 'title' || this.state === 'hub') {
      this._updateTitle(dt);
    } else if (this.state === 'mission' && !this.paused) {
      this._updateMission(dt);
    }
    this.renderer.render(this.scene, this.camera);
  }

  _updateTitle(dt) {
    for (const d of this.titleDinos || []) {
      d.rotation.y += dt * 0.35;
      d.userData.updateAnim(dt, true);
    }
    if (this.titleVehicle) {
      this.titleVehicle.userData.updateAnim(dt, true);
      this.titleVehicle.rotation.y += dt * 0.2;
    }
    const t = performance.now() * 0.00035;
    this.camera.position.x = Math.sin(t) * 5;
    this.camera.position.y = 5.2;
    this.camera.position.z = 8.5 + Math.cos(t) * 1.5;
    this.camera.lookAt(0, 1.4, 0);
  }

  _updateMission(dt) {
    this.phaseT += dt;
    const axis = this.input.getAxis();
    this._driveVehicle(dt, axis);
    this._updateCamera(dt);
    this._updatePhase(dt);
    this._updateActors(dt);
    this._updateProjectiles(dt);
    this._updateSparks(dt);

    if (this.vehicle) {
      this.ui.updateHp(this.vehicle.userData.hp / this.vehicle.userData.maxHp);
    }
    if (this.predator) {
      const bar = document.getElementById('predator-bar');
      if (bar) {
        bar.style.transform = `scaleX(${Math.max(0, this.predator.userData.hp / this.predator.userData.maxHp)})`;
      }
    }
    this._resolveBlockers();
    this._updateFireflies(dt);
  }

  _updateFireflies(dt) {
    const flies = this.world?.userData?.fireflies;
    if (!flies) return;
    const t = performance.now() * 0.001;
    for (const ff of flies) {
      const p = ff.userData.phase;
      const b = ff.userData.base;
      ff.position.x = b.x + Math.sin(t * 1.7 + p) * 0.8;
      ff.position.y = b.y + Math.sin(t * 2.3 + p * 1.3) * 0.5;
      ff.position.z = b.z + Math.cos(t * 1.4 + p) * 0.8;
      ff.material.opacity = 0.45 + Math.sin(t * 5 + p) * 0.35;
      ff.material.transparent = true;
    }
  }

  _resolveBlockers() {
    const blocks = this.world?.userData?.blockers;
    if (!blocks || !this.vehicle) return;
    for (const b of blocks) {
      const d = this.vehicle.position.distanceTo(b.position);
      const min = (b.userData.radius || 1.4) + this.vehicle.userData.radius * 0.55;
      if (d < min && d > 0.001) {
        const push = this.vehicle.position.clone().sub(b.position).setY(0).normalize();
        this.vehicle.position.addScaledVector(push, (min - d) * 0.85);
      }
    }
  }

  _driveVehicle(dt, axis) {
    const v = this.vehicle;
    if (!v) return;
    const moving = Math.abs(axis.x) + Math.abs(axis.y) > 0.05;
    if (moving) {
      const steer = -axis.x * 2.2 * dt;
      v.rotation.y += steer;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(v.quaternion);
      // W/up is negative y in stick → forward
      const throttle = -axis.y;
      const speed = v.userData.speed * (throttle >= 0 ? 1 : 0.55);
      v.position.addScaledVector(forward, throttle * speed * dt);
    }
    // clamp arena
    const r = 48;
    const len = Math.hypot(v.position.x, v.position.z);
    if (len > r) {
      v.position.x *= r / len;
      v.position.z *= r / len;
    }
    v.position.y = this.level.water ? 0.35 : 0;
    v.userData.updateAnim(dt, moving);
    v.userData.fireCooldown = Math.max(0, v.userData.fireCooldown - dt);

    const wantFire = this.input.consumeFire();
    if (wantFire && this.phase !== PHASE.WIN && this.phase !== PHASE.LOSE) {
      this._tryFire();
    }
  }

  _tryFire() {
    const v = this.vehicle;
    if (!v || v.userData.fireCooldown > 0) return;
    const mode = v.userData.weaponMode || 'auto';
    const rate = v.userData.def.fireRate * (mode === 'scatter' ? 0.7 : 1);
    v.userData.fireCooldown = rate;

    const origins = [];
    const muzzle = new THREE.Vector3();
    v.userData.muzzle.getWorldPosition(muzzle);

    if (mode === 'scatter') {
      for (let i = -2; i <= 2; i++) origins.push({ pos: muzzle.clone(), yaw: i * 0.12 });
    } else {
      origins.push({ pos: muzzle.clone(), yaw: 0 });
    }

    let dir = new THREE.Vector3(0, 0, -1).applyQuaternion(v.quaternion);
    if ((mode === 'auto' || mode === 'zoom') && this.predator && this.predator.visible) {
      dir = this.predator.position.clone().sub(muzzle).setY(0).normalize();
    }

    const speed = mode === 'zoom' ? 38 : 28;
    const damage = mode === 'zoom' ? 22 : mode === 'scatter' ? 8 : 14;

    for (const o of origins) {
      const p = createProjectile(mode === 'zoom' ? 0x60a5fa : 0xf4c14b);
      p.position.copy(o.pos);
      const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw);
      p.userData.velocity.copy(d.multiplyScalar(speed));
      p.userData.damage = damage;
      this.scene.add(p);
      this.projectiles.push(p);
    }
    this.audio.shoot();

    if (this.predator) {
      v.userData.shotsAtPredator += mode === 'scatter' ? 3 : 1;
    }
  }

  _updateCamera(dt) {
    if (!this.vehicle) return;
    const mode = this.vehicle.userData.weaponMode;
    const zoom = mode === 'zoom' && this.phase === PHASE.COMBAT ? 1 : 0;
    const back = THREE.MathUtils.lerp(7.5, 5.2, zoom);
    const height = THREE.MathUtils.lerp(4.8, 3.4, zoom);
    const offset = new THREE.Vector3(0, height, back).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.vehicle.rotation.y,
    );
    const target = this.vehicle.position.clone().add(offset);
    this.camera.position.lerp(target, 1 - Math.pow(0.0008, dt));
    const look = this.vehicle.position.clone();
    look.y += 1.4;
    look.add(new THREE.Vector3(0, 0, -4).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.vehicle.rotation.y));
    if (zoom && this.predator) {
      look.lerp(this.predator.position, 0.55);
    }
    this.camera.lookAt(look);
  }

  _updatePhase(dt) {
    const baby = this.baby;
    const predator = this.predator;
    const mother = this.mother;
    const vehicle = this.vehicle;

    // Predator chases baby
    if (this.phase === PHASE.INTRO || this.phase === PHASE.CHASE || this.phase === PHASE.COMBAT) {
      this._chase(predator, baby.position, predator.userData.speed * (this.level.boss ? 1.15 : 1), dt);
      // Baby flees toward nest then away from predator
      const flee = baby.position.clone().sub(predator.position).normalize();
      const nest = this.world.userData.nestPos;
      const toNest = nest.clone().sub(baby.position).normalize();
      const dir = flee.multiplyScalar(0.55).add(toNest.multiplyScalar(0.45)).normalize();
      baby.position.addScaledVector(dir, baby.userData.speed * dt);
      baby.lookAt(baby.position.x + dir.x, baby.position.y, baby.position.z + dir.z);
      this._clamp(baby, 46);
    }

    if (this.phase === PHASE.INTRO && this.phaseT > 1.2) {
      this.phase = PHASE.CHASE;
      this.ui.setMission('Chase the predator — get close!');
    }

    if (this.phase === PHASE.CHASE) {
      const dist = vehicle.position.distanceTo(predator.position);
      if (dist < 14) {
        this.phase = PHASE.COMBAT;
        this.phaseT = 0;
        this.ui.setMission('Fire! Use Auto / Zoom / Scatter');
        this.ui.showAim(true);
        this.ui.toast('Smart aiming unlocked!');
      }
    }

    if (this.phase === PHASE.COMBAT) {
      if (this.phaseT > 2.5) this.ui.showAim(false);
      // Mother arrives after some damage
      const hpRatio = predator.userData.hp / predator.userData.maxHp;
      if (hpRatio < 0.72 && !mother.visible) {
        mother.visible = true;
        mother.position.set(vehicle.position.x - 18, 0, vehicle.position.z - 8);
        mother.userData.anim.state = 'run';
        this.phase = PHASE.MOTHER;
        this.phaseT = 0;
        this.ui.setMission('Mother dinosaur is helping!');
        this.ui.toast(`${DINOSAURS[this.level.mother].name} arrives!`);
        this.audio.mother();
      }
      if (predator.userData.hp <= 0) {
        this._beginEscort();
      }
      // Overshoot headbutt risk (higher threshold so kids can finish fights)
      if (vehicle.userData.shotsAtPredator >= 28 && hpRatio > 0.35) {
        this.phase = PHASE.HEADBUTT;
        this.phaseT = 0;
        predator.userData.anim.state = 'attack';
        this.ui.setMission('Watch out — headbutt!');
        this.ui.toast('Too many shots! Predator charges the jeep!');
        this.audio.headbutt();
      }
    }

    if (this.phase === PHASE.MOTHER) {
      this._chase(mother, predator.position, mother.userData.speed, dt);
      // Mother damages predator on contact
      if (mother.position.distanceTo(predator.position) < 2.8) {
        predator.userData.hp -= 18 * dt;
        predator.userData.anim.state = 'hurt';
      }
      // Predator may smack mother
      if (this.phaseT > 2 && Math.random() < 0.004) {
        this.ui.toast('Predator hits the mother — shoot now!');
        mother.userData.anim.state = 'hurt';
        predator.userData.anim.state = 'attack';
      }
      if (predator.userData.hp <= 0) this._beginEscort();
      if (vehicle.userData.shotsAtPredator >= 22) {
        this.phase = PHASE.HEADBUTT;
        this.phaseT = 0;
      }
    }

    if (this.phase === PHASE.HEADBUTT) {
      this._chase(predator, vehicle.position, predator.userData.speed * 1.6, dt);
      if (predator.position.distanceTo(vehicle.position) < 2.4) {
        vehicle.userData.hp -= 28;
        this._spawnSparks(vehicle.position, 0xe85d4c, 10);
        this.audio.headbutt();
        predator.position.add(
          predator.position.clone().sub(vehicle.position).setY(0).normalize().multiplyScalar(3),
        );
        vehicle.userData.shotsAtPredator = 0;
        this.phase = predator.userData.hp < predator.userData.maxHp * 0.72 ? PHASE.MOTHER : PHASE.COMBAT;
        this.phaseT = 0;
        predator.userData.anim.state = 'chase';
        this.ui.setMission('Keep protecting the baby!');
        if (vehicle.userData.hp <= 0) this._fail('Your vehicle was wrecked by a headbutt!');
      }
      if (predator.userData.hp <= 0) this._beginEscort();
    }

    if (this.phase === PHASE.ESCORT) {
      // Escort baby to nest
      const nest = this.world.userData.nestPos;
      this._chase(baby, nest, baby.userData.speed * 1.8, dt);
      if (mother.visible) this._chase(mother, baby.position, mother.userData.speed * 1.1, dt);
      if (predator) {
        predator.userData.anim.state = 'hurt';
        predator.position.y = THREE.MathUtils.lerp(predator.position.y, -2, dt);
        predator.visible = predator.position.y > -1.5;
      }
      const nestDist = Math.hypot(baby.position.x - nest.x, baby.position.z - nest.z);
      this.ui.setMission(`Escort the baby to the nest! (${Math.max(0, nestDist - 3).toFixed(0)}m)`);
      // Complete when baby arrives — generous radius + short dwell
      if (nestDist < 3.5) {
        this._escortDwelling = (this._escortDwelling || 0) + dt;
        if (this._escortDwelling > 0.35 || nestDist < 1.6) this._win();
      } else {
        this._escortDwelling = 0;
      }
      // Safety: if escort runs long, auto-complete once baby is near nest lane
      if (this.phaseT > 20 && nestDist < 8) this._win();
      if (this.phaseT > 35) this._win();
    }

    // Fail if predator reaches baby hard
    if (
      [PHASE.INTRO, PHASE.CHASE, PHASE.COMBAT, PHASE.MOTHER, PHASE.HEADBUTT].includes(this.phase) &&
      predator.position.distanceTo(baby.position) < 1.6
    ) {
      this.baby.userData.hp -= 25 * dt;
      if (this.baby.userData.hp <= 0) {
        this._fail('The predator reached the baby dinosaur!');
      }
    }
  }

  _beginEscort() {
    if (this.phase === PHASE.ESCORT || this.phase === PHASE.WIN) return;
    this.phase = PHASE.ESCORT;
    this.phaseT = 0;
    this._escortDwelling = 0;
    if (this.predator) this.predator.userData.anim.state = 'hurt';
    this.ui.showAim(false);
    this.ui.toast('Predator retreats! Escort the baby!');
    this.missionScore += 200;
    this.ui.updateScore(this.missionScore);
    // Nudge baby toward nest so completion is reliable
    if (this.baby && this.world?.userData?.nestPos) {
      const nest = this.world.userData.nestPos;
      const dir = nest.clone().sub(this.baby.position).setY(0);
      if (dir.lengthSq() > 0.01) {
        dir.normalize();
        this.baby.position.addScaledVector(dir, 0.5);
      }
    }
  }

  _win() {
    if (this.phase === PHASE.WIN || this.phase === PHASE.LOSE) return;
    this.phase = PHASE.WIN;
    this.missionScore += 500 + Math.floor(this.vehicle?.userData?.hp || 0);
    this.ui.updateScore(this.missionScore);
    const stampId = this.level.stamp;
    const stamp = DINOSAURS[stampId];
    markCleared(this.save, this.level.id, stampId, this.missionScore);
    // Also stamp predator / mother for encyclopedia depth
    if (!this.save.stamps.includes(this.level.predator)) {
      this.save.stamps.push(this.level.predator);
    }
    if (!this.save.stamps.includes(this.level.mother)) {
      this.save.stamps.push(this.level.mother);
    }
    if (!this.save.stamps.includes(this.level.baby)) {
      this.save.stamps.push(this.level.baby);
    }
    writeSave(this.save);
    if (this.baby) {
      this._spawnSparks(this.baby.position.clone().setY(1.5), 0xf4c14b, 18);
      this._spawnSparks(this.baby.position.clone().setY(1.2), 0x62d26f, 12);
    }
    this.audio.win();
    this.ui.showResult({
      win: true,
      message: `Great work, Guard! +${this.missionScore} points`,
      stampName: stamp?.name || 'Stamp',
      stampColor: stamp ? `#${stamp.color.toString(16).padStart(6, '0')}` : undefined,
    });
    this.state = 'result';
  }

  _fail(message) {
    if (this.phase === PHASE.LOSE) return;
    this.phase = PHASE.LOSE;
    this.audio.lose();
    this.ui.showResult({ win: false, message });
    this.state = 'result';
  }

  _chase(actor, target, speed, dt) {
    if (!actor || !actor.visible) return;
    const dir = this.tmp.copy(target).sub(actor.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 0.05) return;
    dir.normalize();
    actor.position.addScaledVector(dir, speed * dt);
    actor.lookAt(actor.position.x + dir.x, actor.position.y, actor.position.z + dir.z);
    this._clamp(actor, 46);
    actor.userData.updateAnim(dt, true);
  }

  _clamp(obj, r) {
    const len = Math.hypot(obj.position.x, obj.position.z);
    if (len > r) {
      obj.position.x *= r / len;
      obj.position.z *= r / len;
    }
  }

  _updateActors(dt) {
    for (const a of [this.baby, this.mother, this.predator]) {
      if (!a || !a.visible) continue;
      a.userData.updateAnim(dt, a.userData.anim.state !== 'idle');
      if (this.level.water) a.position.y = 0.2;
      const hp = a.userData.parts?.hpBar;
      if (hp) {
        hp.bg.lookAt(this.camera.position);
      }
    }
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.position.addScaledVector(p.userData.velocity, dt);
      p.userData.life -= dt;
      let hit = false;
      if (this.predator && this.predator.visible && this.phase !== PHASE.ESCORT) {
        const dx = p.position.x - this.predator.position.x;
        const dz = p.position.z - this.predator.position.z;
        const hitR = this.predator.userData.radius * this.predator.scale.x + 0.85;
        if (dx * dx + dz * dz < hitR * hitR) {
          this.predator.userData.hp -= p.userData.damage;
          this.predator.userData.anim.state = 'hurt';
          this._spawnSparks(p.position.clone().setY(1.2), 0xf4c14b, 6);
          this.missionScore += 10;
          this.ui.updateScore(this.missionScore);
          this.audio.hit();
          hit = true;
          if (this.phase === PHASE.INTRO || this.phase === PHASE.CHASE) {
            this.phase = PHASE.COMBAT;
            this.phaseT = 0;
            this.ui.showAim(true);
          }
        }
      }
      if (hit || p.userData.life <= 0 || p.position.length() > 60) {
        this.scene.remove(p);
        this.projectiles.splice(i, 1);
      }
    }
  }

  _spawnSparks(pos, color, n) {
    for (let i = 0; i < n; i++) {
      const s = createSpark(color);
      s.position.copy(pos);
      s.userData.velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5)
        .normalize()
        .multiplyScalar(4 + Math.random() * 4);
      this.scene.add(s);
      this.sparks.push(s);
    }
  }

  _updateSparks(dt) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.position.addScaledVector(s.userData.velocity, dt);
      s.userData.life -= dt;
      s.scale.multiplyScalar(0.96);
      if (s.userData.life <= 0) {
        this.scene.remove(s);
        this.sparks.splice(i, 1);
      }
    }
  }
}
