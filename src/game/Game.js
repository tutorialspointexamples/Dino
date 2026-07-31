import * as THREE from 'three';
import { DINOSAURS, LEVELS, VEHICLES } from './data.js';
import { loadSave, writeSave, markCleared } from './Save.js';
import { createDinosaur } from './DinosaurFactory.js';
import { createVehicle } from './VehicleFactory.js';
import { buildWorld, createProjectile, createSpark, createTrailPuff } from './WorldBuilder.js';
import { Input } from './Input.js';
import { UI } from './UI.js';
import { AudioBus } from './Audio.js';

const PHASE = {
  COUNTDOWN: 'countdown',
  INTRO: 'intro',
  CHASE: 'chase',
  COMBAT: 'combat',
  MOTHER: 'mother',
  HEADBUTT: 'headbutt',
  ESCORT: 'escort',
  CELEBRATE: 'celebrate',
  WIN: 'win',
  LOSE: 'lose',
};

const WEAPON_CYCLE = ['auto', 'zoom', 'scatter'];

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

    this._prevTime = performance.now();
    this.state = 'title';
    this.paused = false;
    this.missionScore = 0;
    this.projectiles = [];
    this.sparks = [];
    this.trails = [];
    this.shakeT = 0;
    this._trailCooldown = 0;
    this._roarCooldown = 0;
    this._weaponCycleT = 0;
    this._weaponCycleIdx = 0;
    this._floaters = [];
    this._countdownStep = 3;
    this._celebrateT = 0;
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
    for (const t of this.trails) this.scene.remove(t);
    this.projectiles = [];
    this.sparks = [];
    this.trails = [];
    this.shakeT = 0;
    this._weaponCycleT = 0;
    this._weaponCycleIdx = 0;
    this._countdownStep = 3;
    this._celebrateT = 0;
    for (const f of this._floaters || []) f.el?.remove();
    this._floaters = [];
    this.ui.setDanger(false);
    this.ui.setHeadbuttAlarm(false);
    this.ui.updateNestCompass(false);
    this.ui.hideCountdown();
    this.ui.hideCrewCallout();
    this.ui.setAlarmRing(false);
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
    this.phase = PHASE.COUNTDOWN;
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
    this.baby.position.set(1.5, 0, -8);
    this.baby.userData.anim.state = 'idle';
    // Kids-friendly buffer so missions don't fail instantly
    this.baby.userData.hp = level.water ? 70 : 55;
    this.baby.userData.maxHp = this.baby.userData.hp;
    if (level.water) this.baby.userData.speed *= 1.15;
    this.scene.add(this.baby);

    this.predator = createDinosaur(DINOSAURS[level.predator]);
    // Spawn predator farther so the Guard can intercept first
    this.predator.position.set(level.water ? 10 : 6, 0, level.water ? 4 : -1);
    this.predator.userData.anim.state = 'idle';
    // Tuned for kids: normal missions resolve quickly; bosses last longer
    // Bosses soak more darts; normal missions stay kid-quick
    this.predator.userData.hp = level.boss ? 180 : 70;
    this.predator.userData.maxHp = this.predator.userData.hp;
    const basePredSpeed = DINOSAURS[level.predator].role === 'predator' ? 7.5 : 6;
    this.predator.userData.speed = basePredSpeed * (level.boss ? 1.08 : 1) * (level.water ? 0.82 : 1);
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

    this.phase = PHASE.COUNTDOWN;
    this.phaseT = 0;
    this._countdownStep = 3;
    this._weaponCycleIdx = 0;
    this._weaponCycleT = 0;

    this.ui.showHud(`Protect ${DINOSAURS[level.baby].name}!`);
    this.ui.updateNestCompass(false);
    this.ui.setDanger(false);
    this.ui.setHeadbuttAlarm(false);
    this.ui.setWeaponModeUI('auto');
    this.ui.setAlarmRing(true);
    this.ui.showCountdown('3');
    this.ui.crewCallout('Captain Rio', 'Alarm! Baby dinosaur in danger — roll out!');
    this.ui.toast(level.boss ? 'Alarm! Boss dinosaur alert!' : 'Alarm! Rescue countdown…');
    this.ui.showAim(false);
    this.audio.alarm();
    this.audio.countdown();
    if (level.boss) this.audio.roar();
    // First-clear tutorial for rainforest
    if (level.id === 'rainforest' && !this.save.cleared.includes('rainforest')) {
      this.ui.showTutorial('Drive close to the big dino, then FIRE. Mother will help — escort baby to the glowing nest!');
    } else if (level.water) {
      this.ui.showTutorial('Water mission! Steer your submarine and fire torpedo darts at the ocean hunter. Watch for crocs!');
    } else if (level.biome === 'swamp') {
      this.ui.showTutorial('Swamp tip: mugger crocs slow your jeep — steer around them!');
    }
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

  _handlePauseHotkey() {
    if (!this.input.consumePause()) return;
    if (this.state === 'mission' && this.paused) this.resume();
    else if (this.state === 'mission') this.pause();
  }

  quitToHub() {
    this.paused = false;
    this.ui.hidePause();
    this.showTitleScene();
    this.ui.showHub();
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._prevTime) / 1000);
    this._prevTime = now;
    if (this.state === 'mission') this._handlePauseHotkey();
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
    this._updateFloaters(dt);

    // Countdown freezes chase until GO
    if (this.phase === PHASE.COUNTDOWN) {
      this._updateCountdown(dt);
      this._updateCamera(dt);
      this._updateActors(dt);
      this._updateFireflies(dt);
      this._updateWorldFX(dt);
      this._updateRadar();
      return;
    }

    if (this.phase === PHASE.CELEBRATE) {
      this._updateCelebrate(dt);
      this._updateCamera(dt);
      this._updateActors(dt);
      this._updateSparks(dt);
      this._updateWorldFX(dt);
      this._updateRadar();
      return;
    }

    const hotkey = this.input.consumeWeaponHotkey();
    if (hotkey) {
      this.setWeaponMode(hotkey);
      this.ui.setWeaponModeUI(hotkey);
      this.ui.toast(hotkey === 'auto' ? 'Auto Aim' : hotkey === 'zoom' ? 'Zoom Aim' : 'Scatter Shot');
      this._weaponCycleIdx = WEAPON_CYCLE.indexOf(hotkey);
      this._weaponCycleT = 0;
    }
    this._autoCycleWeapons(dt);
    if (this.vehicle) {
      this.vehicle.userData.sirenBoost = [PHASE.COMBAT, PHASE.MOTHER, PHASE.HEADBUTT].includes(this.phase);
    }
    const axis = this.input.getAxis();
    this._driveVehicle(dt, axis);
    this._updateCamera(dt);
    this._updatePhase(dt);
    this._updateActors(dt);
    this._updateProjectiles(dt);
    this._updateSparks(dt);
    this._updateTrails(dt);
    this._updateRadar();
    this._updateEggs();

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
    this._resolveCrocs(dt);
    this._updateFireflies(dt);
    this._updateWorldFX(dt);
  }

  _updateCountdown(dt) {
    // 3 → 2 → 1 → GO across ~3.2s
    const step = Math.max(0, 3 - Math.floor(this.phaseT));
    if (step !== this._countdownStep && step >= 1) {
      this._countdownStep = step;
      this.ui.showCountdown(String(step));
      this.audio.countdown();
    }
    if (this.phaseT >= 3.0 && this._countdownStep !== 0) {
      this._countdownStep = 0;
      this.ui.showCountdown('GO!');
      this.audio.go();
      this.ui.setAlarmRing(false);
      this.ui.crewCallout('Scout Mina', 'Predator spotted — chase and protect the baby!');
    }
    if (this.phaseT >= 3.6) {
      this.ui.hideCountdown();
      this.phase = PHASE.INTRO;
      this.phaseT = 0;
      if (this.baby) this.baby.userData.anim.state = 'run';
      if (this.predator) this.predator.userData.anim.state = 'chase';
      this.ui.setMission(`Protect ${DINOSAURS[this.level.baby].name}!`);
    }
    // Gentle idle bob during countdown
    if (this.predator) this.predator.userData.updateAnim(dt, false);
    if (this.baby) this.baby.userData.updateAnim(dt, false);
  }

  _autoCycleWeapons(dt) {
    if (![PHASE.COMBAT, PHASE.MOTHER].includes(this.phase) || !this.vehicle) return;
    this._weaponCycleT += dt;
    // Store feature: smart aiming modes launch automatically at the right moment
    if (this._weaponCycleT < 4.2) return;
    this._weaponCycleT = 0;
    this._weaponCycleIdx = (this._weaponCycleIdx + 1) % WEAPON_CYCLE.length;
    const mode = WEAPON_CYCLE[this._weaponCycleIdx];
    this.setWeaponMode(mode);
    this.ui.setWeaponModeUI(mode);
    const label = mode === 'auto' ? 'Auto Aim' : mode === 'zoom' ? 'Zoom Aim' : 'Scatter Shot';
    this.ui.toast(`Smart mode: ${label}`);
    this.ui.crewCallout('Gunner Kai', `${label} online!`);
  }

  _resolveCrocs(dt) {
    const crocs = this.world?.userData?.crocs;
    if (!crocs?.length || !this.vehicle) return;
    const t = performance.now() * 0.001;
    for (const c of crocs) {
      // Idle lurk sway
      c.position.x += Math.sin(t * 0.7 + c.userData.phase) * dt * 0.35;
      c.rotation.y += Math.sin(t + c.userData.phase) * dt * 0.2;
      const d = this.vehicle.position.distanceTo(c.position);
      if (d < (c.userData.radius || 1.6) + this.vehicle.userData.radius * 0.5) {
        // Slow the jeep briefly — do not wreck kids' runs
        const push = this.vehicle.position.clone().sub(c.position).setY(0).normalize();
        this.vehicle.position.addScaledVector(push, 0.08);
        this.vehicle.userData.hp = Math.max(8, this.vehicle.userData.hp - 6 * dt);
        if (!c.userData.warnT || c.userData.warnT <= 0) {
          this.ui.toast('Mugger crocodile! Steer around!');
          this.ui.crewCallout('Medic Luma', 'Croc bay — keep clear of the water edge!');
          c.userData.warnT = 1.8;
        }
      }
      if (c.userData.warnT > 0) c.userData.warnT -= dt;
    }
  }

  _spawnDamageFloater(worldPos, amount) {
    const el = document.createElement('div');
    el.className = 'dmg-floater';
    el.textContent = `-${Math.round(amount)}`;
    document.getElementById('app')?.appendChild(el);
    this._floaters.push({ el, life: 0.9, pos: worldPos.clone() });
  }

  _updateFloaters(dt) {
    if (!this._floaters?.length) return;
    for (let i = this._floaters.length - 1; i >= 0; i--) {
      const f = this._floaters[i];
      f.life -= dt;
      f.pos.y += dt * 1.4;
      const v = f.pos.clone().project(this.camera);
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      f.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      f.el.style.opacity = String(Math.max(0, f.life / 0.9));
      if (f.life <= 0 || v.z > 1) {
        f.el.remove();
        this._floaters.splice(i, 1);
      }
    }
  }

  _updateCelebrate(dt) {
    this._celebrateT += dt;
    const nest = this.world?.userData?.nestPos;
    if (this.baby && nest) {
      this.baby.position.lerp(new THREE.Vector3(nest.x, 0, nest.z), 1 - Math.pow(0.02, dt));
      this.baby.rotation.y += dt * 2.2;
      this.baby.userData.anim.state = 'idle';
    }
    if (this.mother?.visible && nest) {
      this._chase(this.mother, nest, this.mother.userData.speed * 0.8, dt);
    }
    if (this._celebrateT > 0.35 && this._celebrateT < 0.4) {
      this._spawnSparks(this.baby.position.clone().setY(1.5), 0xf4c14b, 16);
      this._spawnSparks(this.baby.position.clone().setY(1.2), 0x62d26f, 12);
      this.ui.crewCallout('Medic Luma', 'Baby safe at the nest — stamp unlocked!');
    }
    if (this._celebrateT >= 1.6) this._finishWin();
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

  _updateWorldFX(dt) {
    const water = this.world?.userData?.waterMesh;
    if (water) {
      water.position.y = (this.level.water ? 0.4 : 0.08) + Math.sin(performance.now() * 0.002) * 0.06;
      water.material.opacity = 0.5 + Math.sin(performance.now() * 0.0015) * 0.08;
    }
    const nestFX = this.world?.userData?.nestBeacon;
    if (nestFX) {
      const pulse = 0.55 + Math.sin(performance.now() * 0.005) * 0.35;
      nestFX.beacon.material.emissiveIntensity = pulse;
      nestFX.beaconRing.scale.setScalar(1 + Math.sin(performance.now() * 0.004) * 0.08);
      nestFX.beaconRing.material.opacity = 0.35 + pulse * 0.35;
    }
    const bubbles = this.world?.userData?.bubbles;
    if (bubbles) {
      const t = performance.now() * 0.001;
      for (const b of bubbles) {
        b.position.y = b.userData.baseY + ((t * 0.7 + b.userData.phase) % 3);
        if (b.position.y > b.userData.baseY + 2.8) b.userData.baseY = Math.random() * 2;
        b.material.opacity = 0.25 + Math.sin(t * 3 + b.userData.phase) * 0.2;
      }
    }
    const lava = this.world?.userData?.lavaPool;
    if (lava) {
      lava.material.emissiveIntensity = 0.65 + Math.sin(performance.now() * 0.006) * 0.35;
      lava.scale.setScalar(1 + Math.sin(performance.now() * 0.003) * 0.04);
    }
    const ash = this.world?.userData?.ash;
    if (ash) {
      const t = performance.now() * 0.001;
      for (const flake of ash) {
        const b = flake.userData.base;
        const p = flake.userData.phase;
        flake.position.x = b.x + Math.sin(t * 0.8 + p) * 1.2;
        flake.position.y = ((b.y + t * 0.9 + p) % 8) + 0.5;
        flake.position.z = b.z + Math.cos(t * 0.6 + p) * 1.2;
        flake.material.opacity = 0.3 + Math.sin(t * 4 + p) * 0.2;
      }
    }
    const eggs = this.world?.userData?.eggs;
    if (eggs) {
      const t = performance.now() * 0.001;
      for (const egg of eggs) {
        if (egg.userData.collected) continue;
        egg.position.y = 0.45 + Math.sin(t * 3 + egg.position.x) * 0.12;
        egg.rotation.y += dt * 1.5;
      }
    }
    const clouds = this.world?.userData?.clouds;
    if (clouds) {
      for (const c of clouds) {
        c.position.x += c.userData.drift * dt * 0.35;
        if (c.position.x > c.userData.baseX + 30) c.position.x = c.userData.baseX - 30;
      }
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

    this._trailCooldown -= dt;
    if (moving && this._trailCooldown <= 0) {
      this._trailCooldown = 0.08;
      const puff = createTrailPuff(this.level.water ? 0xb6eaff : 0xc4a35a, this.level.water);
      puff.position.copy(v.position);
      puff.position.y = this.level.water ? 0.5 : 0.15;
      puff.position.add(new THREE.Vector3(0, 0, 1.1).applyQuaternion(v.quaternion));
      this.scene.add(puff);
      this.trails.push(puff);
    }

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
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      this.camera.position.x += (Math.random() - 0.5) * 0.35;
      this.camera.position.y += (Math.random() - 0.5) * 0.2;
    }
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
    if (this.phase === PHASE.COUNTDOWN || this.phase === PHASE.CELEBRATE) return;

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
      baby.rotation.y += Math.PI;
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
        this._weaponCycleT = 0;
        this.ui.setMission('Fire! Use Auto / Zoom / Scatter');
        this.ui.showAim(true);
        this.ui.toast('Smart aiming unlocked!');
        this.ui.crewCallout('Gunner Kai', 'Smart aiming modes launching — Auto, Zoom, Scatter!');
        this.setWeaponMode('auto');
        this.ui.setWeaponModeUI('auto');
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
        this.ui.crewCallout('Scout Mina', 'Mother dinosaur is charging in to help!');
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
        this.ui.setHeadbuttAlarm(true);
        this.audio.headbutt();
        this.audio.roar();
        this.shakeT = 0.55;
      }
    }

    if (this.phase === PHASE.MOTHER) {
      this._chase(mother, predator.position, mother.userData.speed, dt);
      // Mother damages predator on contact
      if (mother.position.distanceTo(predator.position) < 2.8) {
        predator.userData.hp -= 18 * dt;
        predator.userData.anim.state = 'hurt';
      }
      // Mother soothes baby while helping
      if (mother.position.distanceTo(baby.position) < 5) {
        baby.userData.hp = Math.min(baby.userData.maxHp, baby.userData.hp + 8 * dt);
      }
      // Predator may smack mother
      if (this.phaseT > 2 && Math.random() < 0.004) {
        this.ui.toast('Predator hits the mother — shoot now!');
        mother.userData.anim.state = 'hurt';
        predator.userData.anim.state = 'attack';
        this.audio.roar();
        this.shakeT = 0.35;
      }
      if (predator.userData.hp <= 0) this._beginEscort();
      if (vehicle.userData.shotsAtPredator >= 22) {
        this.phase = PHASE.HEADBUTT;
        this.phaseT = 0;
        this.ui.setHeadbuttAlarm(true);
        this.audio.roar();
      }
    }

    if (this.phase === PHASE.HEADBUTT) {
      this.ui.setHeadbuttAlarm(true);
      this._chase(predator, vehicle.position, predator.userData.speed * 1.6, dt);
      if (predator.position.distanceTo(vehicle.position) < 2.4) {
        vehicle.userData.hp -= 28;
        this._spawnSparks(vehicle.position, 0xe85d4c, 10);
        this.audio.headbutt();
        this.shakeT = 0.7;
        predator.position.add(
          predator.position.clone().sub(vehicle.position).setY(0).normalize().multiplyScalar(3),
        );
        vehicle.userData.shotsAtPredator = 0;
        this.phase = predator.userData.hp < predator.userData.maxHp * 0.72 ? PHASE.MOTHER : PHASE.COMBAT;
        this.phaseT = 0;
        predator.userData.anim.state = 'chase';
        this.ui.setHeadbuttAlarm(false);
        this.ui.setMission('Keep protecting the baby!');
        if (vehicle.userData.hp <= 0) this._fail('Your vehicle was wrecked by a headbutt!');
      }
      if (predator.userData.hp <= 0) this._beginEscort();
    } else if (this.phase !== PHASE.HEADBUTT) {
      this.ui.setHeadbuttAlarm(false);
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
      // Nest compass relative to camera-forward / vehicle heading
      if (vehicle) {
        const toNest = Math.atan2(nest.x - vehicle.position.x, nest.z - vehicle.position.z);
        const rel = toNest - vehicle.rotation.y;
        this.ui.updateNestCompass(true, -rel);
      }
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
      predator &&
      baby
    ) {
      const threatDist = predator.position.distanceTo(baby.position);
      this.ui.setDanger(threatDist < 4.5 && this.phase !== PHASE.ESCORT);
      if (threatDist < 1.55) {
        // Slower drain so kids can still save after a close call
        this.baby.userData.hp -= (this.level.water ? 12 : 18) * dt;
        this._roarCooldown -= dt;
        if (this._roarCooldown <= 0) {
          this.audio.roar();
          this._roarCooldown = 1.4;
        }
        if (this.baby.userData.hp <= 0) {
          this._fail('The predator reached the baby dinosaur!');
        }
      }
    } else {
      this.ui.setDanger(false);
    }
  }

  _beginEscort() {
    if (this.phase === PHASE.ESCORT || this.phase === PHASE.WIN) return;
    this.phase = PHASE.ESCORT;
    this.phaseT = 0;
    this._escortDwelling = 0;
    if (this.predator) this.predator.userData.anim.state = 'hurt';
    this.ui.showAim(false);
    this.ui.setDanger(false);
    this.ui.setHeadbuttAlarm(false);
    const tip = document.getElementById('tutorial-tip');
    if (tip) tip.classList.add('hidden');
    // Reveal escort eggs
    for (const egg of this.world?.userData?.eggs || []) {
      if (!egg.userData.collected) egg.visible = true;
    }
    this.ui.toast('Predator retreats! Escort the baby — grab glowing eggs!');
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
    if (
      this.phase === PHASE.WIN ||
      this.phase === PHASE.LOSE ||
      this.phase === PHASE.CELEBRATE
    ) {
      return;
    }
    this.phase = PHASE.CELEBRATE;
    this.phaseT = 0;
    this._celebrateT = 0;
    this.ui.setDanger(false);
    this.ui.setHeadbuttAlarm(false);
    this.ui.updateNestCompass(false);
    this.ui.setAlarmRing(false);
    document.getElementById('tutorial-tip')?.classList.add('hidden');
    this.ui.setMission('Safe at the nest — celebration!');
    this.ui.toast('Baby dinosaur rescued!');
    this.audio.win();
  }

  _finishWin() {
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
    this.ui.updateNestCompass(false);
    this.ui.hideCrewCallout();
    this.ui.showResult({
      win: true,
      message: `Great work, Guard! +${this.missionScore} points`,
      stampName: stamp?.name || 'Stamp',
      stampColor: stamp ? `#${stamp.color.toString(16).padStart(6, '0')}` : undefined,
      fact: stamp?.facts || DINOSAURS[this.level.predator]?.facts,
    });
    this.state = 'result';
  }

  _fail(message) {
    if (this.phase === PHASE.LOSE) return;
    this.phase = PHASE.LOSE;
    this.ui.setDanger(false);
    this.ui.setHeadbuttAlarm(false);
    this.ui.updateNestCompass(false);
    document.getElementById('tutorial-tip')?.classList.add('hidden');
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
    // Dino meshes face +Z; lookAt aims -Z, so flip 180°
    actor.lookAt(actor.position.x + dir.x, actor.position.y, actor.position.z + dir.z);
    actor.rotation.y += Math.PI;
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
          this._spawnDamageFloater(p.position.clone().setY(2.2), p.userData.damage);
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

  _updateTrails(dt) {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.userData.life -= dt;
      t.position.y += dt * 0.4;
      t.scale.multiplyScalar(1.02);
      t.material.opacity = Math.max(0, t.userData.life * 0.9);
      if (t.userData.life <= 0) {
        this.scene.remove(t);
        this.trails.splice(i, 1);
      }
    }
  }

  _updateEggs() {
    if (this.phase !== PHASE.ESCORT || !this.vehicle) return;
    const eggs = this.world?.userData?.eggs;
    if (!eggs) return;
    for (const egg of eggs) {
      if (egg.userData.collected) continue;
      if (this.vehicle.position.distanceTo(egg.position) < 2.2) {
        egg.userData.collected = true;
        egg.visible = false;
        this.missionScore += 50;
        this.ui.updateScore(this.missionScore);
        this.audio.collect();
        this._spawnSparks(egg.position.clone().setY(1), 0xffe08a, 8);
        this.ui.toast('Dino egg collected! +50');
      }
    }
  }

  _updateRadar() {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas || !this.vehicle) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 1.35;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15, 40, 28, 0.95)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(244, 193, 75, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, 58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.stroke();

    const plot = (obj, color, r = 4) => {
      if (!obj || !obj.visible) return;
      const dx = (obj.position.x - this.vehicle.position.x) * scale;
      const dz = (obj.position.z - this.vehicle.position.z) * scale;
      // Rotate into vehicle heading so forward is up
      const ang = -this.vehicle.rotation.y;
      const rx = dx * Math.cos(ang) - dz * Math.sin(ang);
      const ry = dx * Math.sin(ang) + dz * Math.cos(ang);
      const x = cx + rx;
      const y = cy + ry;
      if (x < 4 || x > w - 4 || y < 4 || y > h - 4) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    if (this.world?.userData?.nestPos) {
      const nest = { position: this.world.userData.nestPos, visible: true };
      plot(nest, '#62d26f', 5);
    }
    plot(this.baby, '#f4c14b', 4);
    plot(this.predator, '#e85d4c', 5);
    if (this.mother?.visible) plot(this.mother, '#60a5fa', 4);
    for (const c of this.world?.userData?.crocs || []) plot(c, '#3a5a28', 3);
    // Vehicle always center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.closePath();
    ctx.fill();
  }
}
