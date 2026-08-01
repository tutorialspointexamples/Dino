import * as THREE from 'three';
import { CREW, DINOSAURS, LEVELS, VEHICLES } from './data.js';
import { loadSave, writeSave, markCleared, isVehicleUnlocked, recordBestStars } from './Save.js';
import { createDinosaur } from './DinosaurFactory.js';
import { createVehicle } from './VehicleFactory.js';
import {
  buildWorld,
  createProjectile,
  createSpark,
  createTrailPuff,
  createFootprint,
  createWakeRing,
  createHealSpark,
  createConfetti,
  createDustKick,
  createNestChevron,
  createMotherRing,
  createMuzzleFlash,
  createSonarPing,
  createSosFlare,
  createRetreatSmoke,
  createBoostBubble,
  createMotherShield,
  createThankYouHeart,
  createDamageSmoke,
  createPlankton,
} from './WorldBuilder.js';
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
    this._squealCooldown = 0;
    this._eggsCollected = 0;
    this._lastStars = 0;
    this._chargeTelegraph = null;
    this._hitCombo = 0;
    this._comboTimer = 0;
    this._footprintCooldown = 0;
    this._wakeCooldown = 0;
    this._healFxCooldown = 0;
    this._hitFlashT = 0;
    this._missionVehicleId = null;
    this._dustCooldown = 0;
    this._confetti = [];
    this._chevrons = [];
    this._motherRings = [];
    this._predatorBaseSpeed = 0;
    this._boostFuel = 1;
    this._boostActive = false;
    this._boostSfxT = 0;
    this._missionElapsed = 0;
    this._nearMissAwarded = false;
    this._headbuttClosest = 99;
    this._muzzleFlashes = [];
    this._vehicleHitFlashT = 0;
    this._chevronRefreshT = 0;
    this._baseFov = 55;
    this.heals = [];
    this.garagePreview = null;
    this.garageTurntable = null;
    this._chaseRoarPunchT = 0;
    this._panicDustT = 0;
    this._hatchSparkT = 0;
    this._lightningT = 3;
    this._lightningFlashT = 0;
    this._sonarT = 0;
    this._sosT = 0;
    this._boostBubbleT = 0;
    this._proximityRoarT = 0;
    this._sonars = [];
    this._sosFlares = [];
    this._wasBoosting = false;
    this._damageSmokeT = 0;
    this._planktonT = 0;
    this._motherShield = null;
    this._hearts = [];
    this.titleSpotlight = null;
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
    for (const h of this.heals || []) this.scene.remove(h);
    for (const c of this._confetti || []) this.scene.remove(c);
    for (const c of this._chevrons || []) this.scene.remove(c);
    for (const r of this._motherRings || []) this.scene.remove(r);
    for (const f of this._muzzleFlashes || []) this.scene.remove(f);
    for (const s of this._sonars || []) this.scene.remove(s);
    for (const s of this._sosFlares || []) this.scene.remove(s);
    this.projectiles = [];
    this.sparks = [];
    this.trails = [];
    this.heals = [];
    this._confetti = [];
    this._chevrons = [];
    this._motherRings = [];
    this._muzzleFlashes = [];
    this._sonars = [];
    this._sosFlares = [];
    this._vehicleHitFlashT = 0;
    this.ui?.setSosBanner?.(false);
    this.ui?.setSonarHud?.(false);
    this._chevronRefreshT = 0;
    this.camera.fov = this._baseFov || 55;
    this.camera.updateProjectionMatrix();
    this._clearChargeTelegraph();
    this.ui?.setCombo?.(0);
    this.ui?.setHpVignette?.(0);
    this.ui?.showSkipCountdown?.(false);
    this.ui?.setPhaseRibbon?.(false);
    this.ui?.updateBabyHp?.(1, false);
    this.ui?.setAimLock?.(false);
    this.ui?.setRadarDanger?.(false);
    this.ui?.showCrewIntro?.(false);
    this.ui?.setBoostHud?.(false, 1);
    this.ui?.updateMissionClock?.(0);
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
    this._clearChargeTelegraph();
    this._eggsCollected = 0;
    this._squealCooldown = 0;
    this.audio.stopAmbient();
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

    // Soft spotlight sweep so the title diorama feels alive
    const spot = new THREE.SpotLight(0xfff3a0, 1.35, 40, 0.55, 0.45, 1);
    spot.position.set(6, 12, 8);
    spot.target.position.set(0, 1.2, 0);
    spot.name = 'titleSpot';
    this.scene.add(spot);
    this.scene.add(spot.target);
    this.titleSpotlight = spot;

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
    this.clearGaragePreview();
    for (const o of [...this.scene.children]) {
      if (
        ['titleLight', 'titleSun', 'titleGround', 'titleAmb', 'titleSpot'].includes(o.name) ||
        o.userData?.kind === 'dinosaur' ||
        o.userData?.kind === 'vehicle' ||
        o.name === 'world'
      ) {
        this.scene.remove(o);
      }
    }
    this.titleDinos = [];
    this.titleVehicle = null;
    this.titleSpotlight = null;
  }

  showTitleScene() {
    this.state = 'title';
    this.paused = false;
    this.clearGaragePreview();
    this._clearTitleDiorama();
    this.clearSceneExtras();
    this._buildTitleDiorama();
  }

  showHubScene() {
    this.state = 'hub';
    // keep title diorama spinning in background
    this.clearGaragePreview();
  }

  /** 3D turntable preview when browsing garage / mission vehicle pick */
  showGaragePreview(vehicleId) {
    const def = VEHICLES.find((v) => v.id === vehicleId) || VEHICLES[0];
    if (!def) return;
    // Leaving a mission for menu browse — tear down world then show turntable
    if (this.state === 'mission') {
      this.paused = false;
      this.audio.stopAmbient();
      this.clearSceneExtras();
      this._clearTitleDiorama();
      this._buildTitleDiorama();
    }
    if (this.garagePreview?.userData?.defId === def.id && this.state === 'garage') return;
    this.clearGaragePreview();
    // Ensure title lights/ground exist while previewing from garage screens
    if (!this.titleVehicle && !this.titleDinos?.length) {
      this._buildTitleDiorama();
    }
    // Hide title jeep / dinos so the selected ride is the clear hero turntable
    if (this.titleVehicle) this.titleVehicle.visible = false;
    for (const d of this.titleDinos || []) d.visible = false;
    const preview = createVehicle(def);
    preview.position.set(0, 0.15, 2.4);
    preview.rotation.y = -0.4;
    preview.scale.setScalar(1.25);
    preview.userData.defId = def.id;
    preview.userData.kind = 'vehicle';
    preview.userData.isGaragePreview = true;
    // Soft glowing turntable disc under the vehicle
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.8, 0.18, 32),
      new THREE.MeshStandardMaterial({
        color: 0x1f6b3a,
        emissive: 0xf4c14b,
        emissiveIntensity: 0.35,
        roughness: 0.55,
        metalness: 0.15,
      }),
    );
    pad.position.set(0, 0.05, 2.4);
    pad.name = 'garageTurntable';
    this.scene.add(pad);
    this.garageTurntable = pad;
    this.scene.add(preview);
    this.garagePreview = preview;
    this.state = 'garage';
  }

  clearGaragePreview() {
    if (this.garagePreview) {
      this.scene.remove(this.garagePreview);
      this.garagePreview = null;
    }
    if (this.garageTurntable) {
      this.scene.remove(this.garageTurntable);
      this.garageTurntable = null;
    }
    if (this.titleVehicle) this.titleVehicle.visible = true;
    for (const d of this.titleDinos || []) d.visible = true;
  }

  startMission(level, vehicleId) {
    this.clearGaragePreview();
    this._clearTitleDiorama();
    this.clearSceneExtras();
    this._chaseRoarPunchT = 0;
    this.level = level;
    this._missionVehicleId = vehicleId;
    this.missionScore = 0;
    this.phase = PHASE.COUNTDOWN;
    this.phaseT = 0;
    this.paused = false;
    this.state = 'mission';
    this._hitCombo = 0;
    this._comboTimer = 0;
    this._footprintCooldown = 0;
    this._wakeCooldown = 0;
    this._healFxCooldown = 0;
    this._hitFlashT = 0;
    this._dustCooldown = 0;
    this._confetti = [];
    this._chevrons = [];
    this._motherRings = [];
    this._boostFuel = 1;
    this._boostActive = false;
    this._boostSfxT = 0;
    this._missionElapsed = 0;
    this._nearMissAwarded = false;
    this._headbuttClosest = 99;
    this._muzzleFlashes = [];
    this._vehicleHitFlashT = 0;
    this._chevronRefreshT = 0;
    this.camera.fov = this._baseFov;
    this.camera.updateProjectionMatrix();
    this.ui.updateMissionClock(0);

    this.world = buildWorld(level, this.scene);

    const vDef = VEHICLES.find((v) => v.id === vehicleId) || VEHICLES[0];
    this.vehicle = createVehicle(vDef);
    // Face -Z toward the nest / rescue action (Three.js default forward)
    this.vehicle.position.set(0, 0, 12);
    this.vehicle.rotation.y = 0;
    // Cave / crater headlights cut through dark biomes
    const needLights = level.biome === 'cave' || level.biome === 'crater';
    this.vehicle.userData.headlightsOn = needLights;
    for (const h of this.vehicle.userData.headlights || []) {
      if (h.spot) h.spot.intensity = needLights ? 1.5 : 0;
      if (h.lamp?.material) h.lamp.material.emissiveIntensity = needLights ? 0.8 : 0.12;
    }
    this.scene.add(this.vehicle);
    this._lightningT = 2.5 + Math.random() * 2;
    this._lightningFlashT = 0;
    this._sonarT = 0;
    this._sosT = 0;
    this._boostBubbleT = 0;
    this._proximityRoarT = 0;
    this._sonars = [];
    this._sosFlares = [];
    this.ui.setSosBanner(false);
    this.ui.setSonarHud(!!level.water);

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
    this._predatorBaseSpeed = basePredSpeed * (level.boss ? 1.08 : 1) * (level.water ? 0.82 : 1);
    this.predator.userData.speed = this._predatorBaseSpeed;
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
    this.ui.showSkipCountdown(true);
    this.ui.setPhaseRibbon(true, 'ALARM', 'combat');
    this.ui.updateBabyHp(1, false);
    this.ui.setAimLock(false);
    this.ui.setRadarDanger(false);
    this.ui.setBoostHud(false, 1);
    this.ui.showCrewIntro(true, CREW.map((c) => c.name).join(' · '));
    this.ui.crewCallout('Captain Rio', 'Alarm! Baby dinosaur in danger — roll out!');
    this.ui.toast(level.boss ? 'Alarm! Boss dinosaur alert!' : 'Alarm! Rescue countdown…');
    this.ui.showAim(false);
    this.audio.alarm();
    this.audio.countdown();
    this.audio.startAmbient();
    if (level.boss) this.audio.roar();
    this._eggsCollected = 0;
    this._attachChargeTelegraph();
    // Hide crew roster after the alarm settles
    setTimeout(() => this.ui?.showCrewIntro?.(false), 3200);
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
    if (!this.vehicle) return;
    this.vehicle.userData.weaponMode = mode;
    // Immediate turret tint feedback (also refreshed in vehicle updateAnim)
    const gun = this.vehicle.userData.gun;
    if (gun?.material?.emissive) {
      const tint = mode === 'zoom' ? 0x60a5fa : mode === 'scatter' ? 0xffe08a : 0xf4c14b;
      gun.material.emissive.setHex(tint);
      gun.material.emissiveIntensity = mode === 'scatter' ? 0.55 : mode === 'zoom' ? 0.7 : 0.35;
    }
  }

  /** Skip the 3-2-1 alarm countdown (UI button + QA). */
  skipCountdown() {
    if (this.phase !== PHASE.COUNTDOWN) return;
    this.phase = PHASE.INTRO;
    this.phaseT = 0;
    this._countdownStep = 0;
    this.ui.hideCountdown();
    this.ui.showSkipCountdown(false);
    this.ui.setAlarmRing(false);
    this.ui.setPhaseRibbon(true, 'CHASE', 'chase');
    if (this.baby) this.baby.userData.anim.state = 'run';
    if (this.predator) this.predator.userData.anim.state = 'chase';
    this.ui.setMission(`Protect ${DINOSAURS[this.level.baby].name}!`);
    this.ui.crewCallout('Scout Mina', 'Skipping ahead — protect the baby now!');
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
    this.audio.stopAmbient();
    this.showTitleScene();
    this.ui.showHub();
  }

  restartMission() {
    if (!this.level) {
      this.ui.showHub();
      return;
    }
    const vehicleId =
      this._missionVehicleId ||
      this.save.selectedVehicle ||
      (this.level.water
        ? VEHICLES.find((v) => v.type === 'submarine')?.id
        : 'police_scout');
    this.paused = false;
    this.ui.hidePause();
    this.audio.stopAmbient();
    this.startMission(this.level, vehicleId);
    this.ui.toast('Mission restarted — Guard roll out!');
  }

  startNextMission() {
    if (!this.level) {
      this.ui.showHub();
      return;
    }
    const idx = LEVELS.findIndex((l) => l.id === this.level.id);
    const next = LEVELS[idx + 1];
    if (!next) {
      this.ui.showHub();
      return;
    }
    const unlocked = this.save.cleared.includes(this.level.id);
    if (!unlocked && idx >= 0) {
      this.ui.showHub();
      return;
    }
    this.ui.openVehiclePick(next);
  }

  _attachChargeTelegraph() {
    this._clearChargeTelegraph();
    if (!this.predator) return;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.05, 28),
      new THREE.MeshBasicMaterial({
        color: 0xe85d4c,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    this.predator.add(ring);
    this._chargeTelegraph = ring;
  }

  _clearChargeTelegraph() {
    if (this._chargeTelegraph) {
      this._chargeTelegraph.parent?.remove(this._chargeTelegraph);
      this._chargeTelegraph = null;
    }
  }

  _updateChargeTelegraph(dt) {
    const ring = this._chargeTelegraph;
    if (!ring || !this.predator) return;
    const charging = this.phase === PHASE.HEADBUTT;
    const target = charging ? 0.85 : 0;
    ring.material.opacity = THREE.MathUtils.lerp(ring.material.opacity, target, 1 - Math.pow(0.02, dt));
    if (charging) {
      const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.12;
      ring.scale.setScalar(pulse);
      // Wind-up glow on predator body
      const body = this._predatorBodyMesh();
      if (body?.material) {
        body.material.emissive = body.material.emissive || new THREE.Color(0x000000);
        body.material.emissive.setHex(0xe85d4c);
        body.material.emissiveIntensity = 0.35 + Math.sin(performance.now() * 0.025) * 0.25;
      }
    } else if (this._hitFlashT <= 0) {
      const body = this._predatorBodyMesh();
      if (body?.material?.emissiveIntensity != null) {
        body.material.emissiveIntensity = THREE.MathUtils.lerp(body.material.emissiveIntensity, 0.05, 0.1);
      }
    }
  }

  _missionStars() {
    const babyRatio = this.baby
      ? Math.max(0, this.baby.userData.hp / (this.baby.userData.maxHp || 1))
      : 0;
    const jeepRatio = this.vehicle
      ? Math.max(0, this.vehicle.userData.hp / (this.vehicle.userData.maxHp || 1))
      : 0;
    let stars = 1;
    if (babyRatio > 0.35 && jeepRatio > 0.25) stars = 2;
    if (babyRatio > 0.65 && jeepRatio > 0.45 && this._eggsCollected >= 2) stars = 3;
    return stars;
  }

  _newVehicleUnlocks(prevCleared, nextCleared) {
    return VEHICLES.filter(
      (v) => !isVehicleUnlocked(v, prevCleared) && isVehicleUnlocked(v, nextCleared),
    );
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._prevTime) / 1000);
    this._prevTime = now;
    if (this.state === 'mission') this._handlePauseHotkey();
    if (this.state === 'title' || this.state === 'hub' || this.state === 'garage') {
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
    if (this.titleVehicle?.visible) {
      this.titleVehicle.userData.updateAnim(dt, true);
      this.titleVehicle.rotation.y += dt * 0.2;
      // Title jeep siren pulse — Guard presence on the hub diorama
      for (const s of this.titleVehicle.userData.sirens || []) {
        if (s.material) {
          s.material.emissiveIntensity = 0.35 + Math.sin(performance.now() * 0.008) * 0.45;
        }
      }
    }
    // Garage / pick turntable — spin the selected vehicle hero
    if (this.garagePreview) {
      this.garagePreview.userData.updateAnim(dt, true);
      this.garagePreview.rotation.y += dt * 1.15;
      this.garagePreview.position.y = 0.15 + Math.sin(performance.now() * 0.0025) * 0.1;
      if (this.garageTurntable) {
        this.garageTurntable.rotation.y -= dt * 0.55;
        this.garageTurntable.material.emissiveIntensity = 0.28 + Math.sin(performance.now() * 0.004) * 0.18;
      }
    }
    // Spotlight sweep across the title cast
    if (this.titleSpotlight) {
      const st = performance.now() * 0.00055;
      this.titleSpotlight.position.x = Math.sin(st) * 8;
      this.titleSpotlight.position.z = 6 + Math.cos(st * 0.8) * 4;
      this.titleSpotlight.intensity = 1.1 + Math.sin(st * 3) * 0.35;
    }
    const t = performance.now() * 0.00035;
    const focusZ = this.garagePreview ? 2.4 : 0;
    this.camera.position.x = Math.sin(t) * (this.garagePreview ? 2.4 : 5);
    this.camera.position.y = this.garagePreview ? 3.8 : 5.2;
    this.camera.position.z = (this.garagePreview ? 6.4 : 8.5) + Math.cos(t) * 0.9;
    this.camera.lookAt(0, 1.1, focusZ * 0.45);
  }

  _updateMission(dt) {
    this.phaseT += dt;
    this._updateFloaters(dt);
    if (
      this.phase !== PHASE.WIN &&
      this.phase !== PHASE.LOSE &&
      this.phase !== PHASE.COUNTDOWN
    ) {
      this._missionElapsed += dt;
    }

    // Countdown freezes chase until GO
    if (this.phase === PHASE.COUNTDOWN) {
      this._updateCountdown(dt);
      this._updateCamera(dt);
      this._updateActors(dt);
      this._updateFireflies(dt);
      this._updateWorldFX(dt);
      this._updateRadar();
      this._updateAimLock();
      return;
    }

    if (this.phase === PHASE.CELEBRATE) {
      this._updateCelebrate(dt);
      this._updateCamera(dt);
      this._updateActors(dt);
      this._updateSparks(dt);
      this._updateWorldFX(dt);
      this._updateThankYouHearts(dt);
      this._updateNestCrack(dt);
      this._updateRadar();
      this._updateAimLock();
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
    const axis = this.input.getAxis();
    this._driveVehicle(dt, axis);
    if (this.vehicle) {
      const combatSiren = [PHASE.COMBAT, PHASE.MOTHER, PHASE.HEADBUTT].includes(this.phase);
      this.vehicle.userData.sirenBoost = combatSiren || this._boostActive;
    }
    this._updateProximityTension(dt);
    this._updateCamera(dt);
    this._updatePhase(dt);
    this._updateChargeTelegraph(dt);
    this._updateActors(dt);
    this._updateProjectiles(dt);
    this._updateSparks(dt);
    this._updateTrails(dt);
    this._updateHeals(dt);
    this._updateFootprints(dt);
    this._updateHitFlash(dt);
    this._updateVehicleHitFlash(dt);
    this._updateMuzzleFlashes(dt);
    this._updateCombo(dt);
    this._updateConfetti(dt);
    this._updateChevrons(dt);
    this._updatePredatorLimp();
    this._updateRadar();
    this._updateAimLock();
    this._updateEggs();
    this._updateBabyPanicDust(dt);
    this._updateHpVignette();
    this._updateSonar(dt);
    this._updateSosFlares(dt);
    this._updateBoostBubbles(dt);
    this._updateDamageSmoke(dt);
    this._updatePlankton(dt);
    this._updateMotherShield(dt);
    this._updateThankYouHearts(dt);
    this.ui.updateMissionClock(this._missionElapsed);

    if (this.vehicle) {
      this.ui.updateHp(this.vehicle.userData.hp / this.vehicle.userData.maxHp);
    }
    if (this.baby) {
      const ratio = this.baby.userData.hp / (this.baby.userData.maxHp || 1);
      this.ui.updateBabyHp(ratio, ratio < 0.35);
      const dangerOn = !document.getElementById('danger-banner')?.classList.contains('hidden');
      this.ui.setRadarDanger(ratio < 0.4 || dangerOn);
    }
    if (this.predator) {
      const bar = document.getElementById('predator-bar');
      if (bar) {
        bar.style.transform = `scaleX(${Math.max(0, this.predator.userData.hp / this.predator.userData.maxHp)})`;
      }
    }
    this._resolveBlockers(dt);
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
      this.ui.showSkipCountdown(false);
      this.ui.crewCallout('Scout Mina', 'Predator spotted — chase and protect the baby!');
    }
    if (this.phaseT >= 3.6) {
      this.ui.hideCountdown();
      this.ui.showSkipCountdown(false);
      this.phase = PHASE.INTRO;
      this.phaseT = 0;
      if (this.baby) this.baby.userData.anim.state = 'run';
      if (this.predator) this.predator.userData.anim.state = 'chase';
      this.ui.setMission(`Protect ${DINOSAURS[this.level.baby].name}!`);
      this.ui.setPhaseRibbon(true, 'CHASE', 'chase');
    }
    // Actor idle bob handled once via _updateActors (avoid double-speed walk)
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
          this._flashVehicleHit(0x3a5a28);
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
      // Victory hop dance for the rescued baby
      this.baby.userData.anim.state = 'celebrate';
      this.baby.position.y = this.level?.water ? 0.2 : 0;
    }
    if (this.mother?.visible && nest) {
      this._chase(this.mother, nest, this.mother.userData.speed * 0.8, dt);
      this.mother.userData.anim.state = 'celebrate';
    }
    this._updateConfetti(dt);
    // Nest hatch sparkles while celebrating a safe return
    this._hatchSparkT = (this._hatchSparkT || 0) - dt;
    if (this._hatchSparkT <= 0 && this.baby) {
      this._hatchSparkT = 0.18;
      this._spawnSparks(this.baby.position.clone().setY(0.9 + Math.random()), 0xffe08a, 4);
      this._spawnHealSpark?.(this.baby.position.clone().setY(1.1));
    }
    if (this._celebrateT > 0.35 && this._celebrateT < 0.4) {
      this._spawnSparks(this.baby.position.clone().setY(1.5), 0xf4c14b, 16);
      this._spawnSparks(this.baby.position.clone().setY(1.2), 0x62d26f, 12);
      this._spawnConfettiBurst(this.baby.position.clone(), 28);
      this.ui.setPhaseRibbon(true, 'SAFE!', 'escort');
      this.ui.crewCallout('Medic Luma', 'Baby safe at the nest — stamp unlocked!');
      this._radioChatter('Nest secure — hatch celebration!');
    }
    if (this._celebrateT >= 1.6) this._finishWin();
  }

  _updateFireflies(dt) {
    const flies = this.world?.userData?.fireflies;
    if (!flies) return;
    const t = performance.now() * 0.001;
    let ax = 0;
    let ay = 0;
    let az = 0;
    for (const ff of flies) {
      const p = ff.userData.phase;
      const b = ff.userData.base;
      ff.position.x = b.x + Math.sin(t * 1.7 + p) * 0.8;
      ff.position.y = b.y + Math.sin(t * 2.3 + p * 1.3) * 0.5;
      ff.position.z = b.z + Math.cos(t * 1.4 + p) * 0.8;
      ff.material.opacity = 0.45 + Math.sin(t * 5 + p) * 0.35;
      ff.material.transparent = true;
      ax += ff.position.x;
      ay += ff.position.y;
      az += ff.position.z;
    }
    const glow = this.world?.userData?.fireflyLight;
    if (glow && flies.length) {
      glow.position.set(ax / flies.length, ay / flies.length + 0.6, az / flies.length);
      glow.intensity = 0.55 + Math.sin(t * 3.2) * 0.45;
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
      if (nestFX.nestIncubator) {
        const warm = 0.22 + Math.sin(performance.now() * 0.0035) * 0.12;
        nestFX.nestIncubator.material.opacity = warm;
        nestFX.nestIncubator.scale.setScalar(1 + Math.sin(performance.now() * 0.0028) * 0.1);
      }
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
    const drips = this.world?.userData?.stalactiteDrips;
    if (drips) {
      const t = performance.now() * 0.001;
      for (const drop of drips) {
        const fall = ((t * 1.4 + drop.userData.phase) % 2.2);
        drop.position.y = drop.userData.baseY - fall;
        drop.material.opacity = fall < 1.8 ? 0.75 : Math.max(0, 1 - (fall - 1.8) * 2);
      }
    }
    const flowers = this.world?.userData?.kingFlowers;
    if (flowers) {
      const t = performance.now() * 0.001;
      for (const f of flowers) {
        const p = f.userData.phase || 0;
        f.rotation.y = Math.sin(t * 0.8 + f.position.x) * 0.15;
        f.position.y = Math.sin(t * 2 + f.position.z) * 0.04;
        // King flower petal bloom pulse (store rainforest wonder)
        const bloom = 1 + Math.sin(t * 2.4 + p) * 0.12;
        if (f.userData.bloom) {
          f.userData.bloom.scale.set(bloom, 0.55 * bloom, bloom);
          f.userData.bloom.material.emissiveIntensity = 0.2 + Math.sin(t * 3 + p) * 0.18;
        }
        for (const petal of f.userData.petals || []) {
          const a = petal.userData.angle;
          const r = (petal.userData.baseR || 0.38) * bloom;
          petal.position.set(Math.cos(a + t * 0.4) * r, 1.4, Math.sin(a + t * 0.4) * r);
          petal.rotation.y = t * 1.2 + a;
          if (petal.material?.emissiveIntensity != null) {
            petal.material.emissiveIntensity = 0.08 + Math.sin(t * 3.5 + a) * 0.1;
          }
        }
      }
    }
    // Swinging vine swamp vines
    const vines = this.world?.userData?.swingingVines;
    if (vines) {
      const t = performance.now() * 0.001;
      for (const v of vines) {
        const p = v.userData.phase || 0;
        v.rotation.z = (v.userData.baseRotZ || 0) + Math.sin(t * 1.5 + p) * 0.28;
        v.rotation.x = Math.sin(t * 1.1 + p * 0.6) * 0.1;
        if (v.material?.emissiveIntensity != null) {
          v.material.emissiveIntensity = 0.05 + Math.sin(t * 2.2 + p) * 0.05;
        }
      }
    }
    // Meteorite hole impact glow + smoke pillars
    const meteor = this.world?.userData?.meteorCore;
    if (meteor) {
      const t = performance.now() * 0.001;
      meteor.material.emissiveIntensity = 0.35 + Math.sin(t * 3.2 + (meteor.userData.phase || 0)) * 0.3;
      meteor.rotation.y += dt * 0.35;
      meteor.rotation.x = Math.sin(t * 0.8) * 0.08;
    }
    const impactGlow = this.world?.userData?.meteorImpactGlow;
    if (impactGlow) {
      impactGlow.intensity = 1.1 + Math.sin(performance.now() * 0.004) * 0.55;
    }
    const smoke = this.world?.userData?.meteorSmoke;
    if (smoke) {
      const t = performance.now() * 0.001;
      for (const s of smoke) {
        const p = s.userData.phase || 0;
        s.position.y = s.userData.baseY + ((t * 0.9 + p) % 3.5);
        s.scale.setScalar(0.85 + Math.sin(t * 2 + p) * 0.25);
        s.material.opacity = 0.18 + Math.sin(t * 1.5 + p) * 0.12;
      }
    }
    // Lava volcano river ribbons
    const rivers = this.world?.userData?.lavaRivers;
    if (rivers) {
      const t = performance.now() * 0.001;
      for (const r of rivers) {
        const p = r.userData.phase || 0;
        r.material.emissiveIntensity = 0.55 + Math.sin(t * 4 + p) * 0.35;
        r.material.opacity = 0.75 + Math.sin(t * 2.2 + p) * 0.12;
        r.position.y = 0.06 + Math.sin(t * 3 + p) * 0.015;
      }
    }
    // Tropical ocean current ribbons
    const currents = this.world?.userData?.oceanCurrents;
    if (currents) {
      const t = performance.now() * 0.001;
      for (const c of currents) {
        const p = c.userData.phase || 0;
        c.position.z += (c.userData.drift || 3) * dt * 0.35;
        if (c.position.z > 14) c.position.z = -18;
        c.material.opacity = 0.18 + Math.sin(t * 2.5 + p) * 0.1;
        c.rotation.z = Math.sin(t * 0.6 + p) * 0.2;
      }
    }
    const rain = this.world?.userData?.rainDrops;
    if (rain) {
      for (const drop of rain) {
        drop.position.y -= drop.userData.speed * dt;
        if (drop.position.y < 0.2) {
          drop.position.y = 8 + Math.random() * 6;
          drop.position.x = drop.userData.baseX + (Math.random() - 0.5) * 6;
          drop.position.z = drop.userData.baseZ + (Math.random() - 0.5) * 6;
        }
      }
    }
    // Rainforest lightning flash + thunder
    const lightning = this.world?.userData?.lightningLight;
    if (lightning && rain) {
      this._lightningT = (this._lightningT ?? 3) - dt;
      if (this._lightningFlashT > 0) {
        this._lightningFlashT -= dt;
        lightning.intensity = Math.max(0, this._lightningFlashT * 28);
        if (this._lightningFlashT <= 0) lightning.intensity = 0;
      } else if (this._lightningT <= 0) {
        this._lightningT = 4.5 + Math.random() * 6;
        this._lightningFlashT = 0.14;
        lightning.intensity = 3.8;
        this.audio.thunder?.();
      }
    }
    const caustic = this.world?.userData?.causticLight;
    if (caustic) {
      const t = performance.now() * 0.001;
      caustic.intensity = 0.85 + Math.sin(t * 2.4) * 0.45;
      caustic.position.x = Math.sin(t * 0.7) * 8;
      caustic.position.z = Math.cos(t * 0.55) * 8 - 2;
    }
    // Swinging coral relics (store lore)
    const corals = this.world?.userData?.swingingCoral;
    if (corals) {
      const t = performance.now() * 0.001;
      for (const c of corals) {
        const p = c.userData.phase || 0;
        c.rotation.z = Math.sin(t * 1.6 + p) * 0.35;
        c.rotation.x = Math.sin(t * 1.1 + p * 0.7) * 0.12;
        if (c.material?.emissiveIntensity != null) {
          c.material.emissiveIntensity = 0.1 + Math.sin(t * 2.5 + p) * 0.08;
        }
      }
    }
    // Deep-sea swirl whirlpool spin
    const whirl = this.world?.userData?.whirlpool;
    if (whirl) {
      const t = performance.now() * 0.001;
      whirl.root.rotation.y += dt * 1.35;
      whirl.spiral.rotation.z = t * 2.2;
      whirl.disc.material.opacity = 0.4 + Math.sin(t * 3) * 0.15;
      whirl.disc.material.emissiveIntensity = 0.45 + Math.sin(t * 4) * 0.25;
    }
    // Crystal cave shimmer
    const crystals = this.world?.userData?.caveCrystals;
    if (crystals) {
      const t = performance.now() * 0.001;
      for (const c of crystals) {
        c.material.emissiveIntensity = 0.3 + Math.sin(t * 2.8 + (c.userData.phase || 0)) * 0.35;
      }
    }
    // Crystal prism rainbow beams
    const beams = this.world?.userData?.prismBeams;
    if (beams) {
      const t = performance.now() * 0.001;
      for (const b of beams) {
        const p = b.userData.phase || 0;
        b.material.opacity = (b.userData.baseOpacity || 0.25) + Math.sin(t * 2.6 + p) * 0.12;
        b.rotation.y += dt * 0.35;
        b.scale.y = 1 + Math.sin(t * 1.8 + p) * 0.08;
      }
    }
    // Danxia sand dust wind
    const sand = this.world?.userData?.sandDust;
    if (sand) {
      const t = performance.now() * 0.001;
      for (const grit of sand) {
        const b = grit.userData.base;
        const p = grit.userData.phase || 0;
        const spd = grit.userData.speed || 3;
        grit.position.x = b.x + ((t * spd + p * 4) % 40) - 20;
        grit.position.y = b.y + Math.sin(t * 2 + p) * 0.35;
        grit.position.z = b.z + Math.sin(t * 0.7 + p) * 2.5;
        grit.material.opacity = 0.25 + Math.sin(t * 3 + p) * 0.2;
      }
    }
    // Swamp mud geyser bubbles
    const geysers = this.world?.userData?.mudGeysers;
    if (geysers) {
      const t = performance.now() * 0.001;
      for (const pot of geysers) {
        const p = pot.userData.phase || 0;
        if (pot.userData.pool?.material) {
          pot.userData.pool.material.emissiveIntensity = 0.2 + Math.sin(t * 4 + p) * 0.18;
        }
        for (const blob of pot.userData.blobs || []) {
          const bp = blob.userData.phase || 0;
          const rise = ((t * 1.6 + bp) % 1.8);
          blob.position.y = (blob.userData.baseY || 0.35) + rise * 1.1;
          blob.position.x = Math.sin(t * 3 + bp) * 0.12;
          blob.material.opacity = Math.max(0.05, 0.75 - rise * 0.4);
          blob.scale.setScalar(0.7 + rise * 0.5);
        }
      }
    }
    // Ambient pterosaur sky flybys
    const flybys = this.world?.userData?.skyFlybys;
    if (flybys) {
      const t = performance.now() * 0.001;
      for (const f of flybys) {
        const p = f.userData.phase || 0;
        const r = f.userData.radius || 28;
        const ang = t * (f.userData.speed || 5) * 0.08 + p;
        f.position.x = Math.cos(ang) * r;
        f.position.z = Math.sin(ang) * r;
        f.position.y = (f.userData.height || 11) + Math.sin(t * 2 + p) * 0.6;
        f.rotation.y = -ang + Math.PI / 2;
        for (const w of f.userData.wings || []) {
          w.rotation.x = Math.sin(t * 8 + p) * 0.45 * (w.userData.side || 1);
        }
      }
    }
    // Volcano ember sparks rise from lava
    const embers = this.world?.userData?.emberSparks;
    if (embers) {
      const t = performance.now() * 0.001;
      for (const e of embers) {
        const b = e.userData.base;
        const p = e.userData.phase || 0;
        const spd = e.userData.speed || 1.6;
        const rise = ((t * spd + p) % 4.5);
        e.position.x = b.x + Math.sin(t * 2 + p) * 0.35;
        e.position.y = 0.3 + rise * 1.8;
        e.position.z = b.z + Math.cos(t * 1.4 + p) * 0.35;
        e.material.opacity = Math.max(0.05, 0.95 - rise * 0.18);
        e.scale.setScalar(0.7 + Math.sin(t * 6 + p) * 0.25);
      }
    }
    this._updateMotherRings(dt);
  }

  /** Baby panic dust trail while fleeing a predator */
  _updateBabyPanicDust(dt) {
    if (!this.baby?.visible) return;
    if (![PHASE.INTRO, PHASE.CHASE, PHASE.COMBAT, PHASE.MOTHER, PHASE.HEADBUTT].includes(this.phase)) {
      return;
    }
    this._panicDustT = (this._panicDustT || 0) - dt;
    if (this._panicDustT > 0) return;
    this._panicDustT = 0.14;
    const dust = createDustKick(0xc4a35a);
    dust.position.copy(this.baby.position);
    dust.position.y = 0.08;
    dust.position.x += (Math.random() - 0.5) * 0.4;
    dust.position.z += (Math.random() - 0.5) * 0.4;
    this.scene.add(dust);
    this.sparks.push(dust);
  }

  /** Guard radio chatter beep + toast on phase changes */
  _radioChatter(line) {
    this.audio.radio?.();
    this.ui.showRadioChatter?.(line);
  }

  /** Submarine sonar pings — water missions only */
  _updateSonar(dt) {
    if (!this.level?.water || !this.vehicle) {
      this.ui.setSonarHud?.(false);
      return;
    }
    this.ui.setSonarHud?.(true);
    this._sonarT = (this._sonarT || 0) - dt;
    if (this._sonarT <= 0) {
      this._sonarT = 1.65;
      const ping = createSonarPing(0x7dd3fc);
      ping.position.copy(this.vehicle.position);
      ping.position.y = 0.14;
      this.scene.add(ping);
      this._sonars.push(ping);
      this.audio.sonar?.();
      this.ui.pulseSonarHud?.();
    }
    for (let i = this._sonars.length - 1; i >= 0; i--) {
      const s = this._sonars[i];
      s.userData.life -= dt;
      s.scale.multiplyScalar(1.045);
      s.material.opacity = Math.max(0, s.userData.life * 0.65);
      if (s.userData.life <= 0) {
        this.scene.remove(s);
        this._sonars.splice(i, 1);
      }
    }
  }

  /** Baby SOS flares when critically threatened */
  _updateSosFlares(dt) {
    if (!this.baby?.visible) {
      this.ui.setSosBanner?.(false);
      return;
    }
    const ratio = this.baby.userData.hp / (this.baby.userData.maxHp || 1);
    const critical =
      ratio < 0.32 &&
      [PHASE.CHASE, PHASE.COMBAT, PHASE.MOTHER, PHASE.HEADBUTT].includes(this.phase);
    this.ui.setSosBanner?.(critical);
    if (critical) {
      this._sosT = (this._sosT || 0) - dt;
      if (this._sosT <= 0) {
        this._sosT = 0.85;
        const flare = createSosFlare(0xff6b4a);
        flare.position.copy(this.baby.position);
        flare.position.y = 1.2;
        this.scene.add(flare);
        this._sosFlares.push(flare);
        this.audio.sos?.();
        this._radioChatter('SOS — baby in critical danger!');
      }
    }
    for (let i = this._sosFlares.length - 1; i >= 0; i--) {
      const f = this._sosFlares[i];
      f.position.addScaledVector(f.userData.velocity, dt);
      f.userData.velocity.y -= 4.5 * dt;
      f.userData.life -= dt;
      f.material.opacity = Math.max(0, f.userData.life / 1.35);
      f.scale.setScalar(0.8 + (1 - f.userData.life / 1.35) * 0.8);
      if (f.userData.life <= 0) {
        this.scene.remove(f);
        this._sosFlares.splice(i, 1);
      }
    }
  }

  /** Boost bubble jets behind submarines */
  _updateBoostBubbles(dt) {
    if (!this.vehicle || this.vehicle.userData.def?.type !== 'submarine') return;
    if (!this._boostActive) return;
    this._boostBubbleT = (this._boostBubbleT || 0) - dt;
    if (this._boostBubbleT > 0) return;
    this._boostBubbleT = 0.06;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.vehicle.rotation.y,
    );
    for (let i = 0; i < 3; i++) {
      const bub = createBoostBubble();
      bub.position.copy(this.vehicle.position);
      bub.position.y += 0.5 + Math.random() * 0.4;
      bub.position.addScaledVector(forward, 1.1 + Math.random() * 0.3);
      bub.position.x += (Math.random() - 0.5) * 0.5;
      this.scene.add(bub);
      this.sparks.push(bub);
    }
  }

  /** Predator proximity tension — occasional roar; FOV applied in _updateCamera */
  _updateProximityTension(dt) {
    this._proximityTension = 0;
    if (!this.vehicle || !this.predator?.visible) return;
    if ([PHASE.ESCORT, PHASE.CELEBRATE, PHASE.WIN, PHASE.LOSE, PHASE.COUNTDOWN].includes(this.phase)) {
      return;
    }
    const dist = this.vehicle.position.distanceTo(this.predator.position);
    if (dist < 9) {
      const tension = 1 - dist / 9;
      this._proximityTension = tension;
      this._proximityRoarT = (this._proximityRoarT || 0) - dt;
      if (this._proximityRoarT <= 0 && dist < 5.5) {
        this._proximityRoarT = 2.4;
        this.audio.roar();
        this.shakeT = Math.max(this.shakeT, 0.18 + tension * 0.2);
      }
    }
  }

  /** Predator retreat smoke cloud when escort begins */
  _spawnRetreatSmoke() {
    if (!this.predator) return;
    for (let i = 0; i < 10; i++) {
      const smoke = createRetreatSmoke();
      smoke.position.copy(this.predator.position);
      smoke.position.y = 0.6 + Math.random() * 1.2;
      smoke.position.x += (Math.random() - 0.5) * 1.5;
      smoke.position.z += (Math.random() - 0.5) * 1.5;
      this.scene.add(smoke);
      this.sparks.push(smoke);
    }
  }

  _resolveBlockers(dt = 0.016) {
    const blocks = this.world?.userData?.blockers;
    if (!blocks || !this.vehicle) return;
    if (this._blockToastT > 0) this._blockToastT -= dt;
    for (const b of blocks) {
      if (b.userData.hitCooldown > 0) b.userData.hitCooldown -= dt;
      const d = this.vehicle.position.distanceTo(b.position);
      const min = (b.userData.radius || 1.4) + this.vehicle.userData.radius * 0.55;
      if (d < min && d > 0.001) {
        const push = this.vehicle.position.clone().sub(b.position).setY(0).normalize();
        this.vehicle.position.addScaledVector(push, (min - d) * 0.85);
        // Roadblock bounce feedback — spark + soft toast throttle
        if (!b.userData.hitCooldown || b.userData.hitCooldown <= 0) {
          this._spawnSparks(this.vehicle.position.clone().setY(0.9), 0xc4a35a, 4);
          this.shakeT = Math.max(this.shakeT, 0.12);
          b.userData.hitCooldown = 0.7;
          if (!this._blockToastT || this._blockToastT <= 0) {
            this.ui.toast('Roadblock! Steer around!');
            this._blockToastT = 2.2;
          }
        }
      }
    }
  }

  _driveVehicle(dt, axis) {
    const v = this.vehicle;
    if (!v) return;
    const moving = Math.abs(axis.x) + Math.abs(axis.y) > 0.05;
    // Siren boost: hold Shift / BOOST for a short speed burst
    const wantBoost = this.input.isBoosting() && moving && -axis.y > 0.15;
    if (wantBoost && this._boostFuel > 0.05) {
      this._boostFuel = Math.max(0, this._boostFuel - dt * 0.45);
      // Jeep / sub horn on boost engage (rising edge)
      if (!this._wasBoosting) {
        this.audio.horn?.();
        this.ui.crewCallout?.('Captain Rio', 'Siren boost — hang on!');
      }
      this._boostActive = true;
      this._wasBoosting = true;
      this._boostSfxT -= dt;
      if (this._boostSfxT <= 0) {
        this.audio.boost();
        this._boostSfxT = 0.35;
      }
    } else {
      this._boostActive = false;
      this._wasBoosting = false;
      this._boostFuel = Math.min(1, this._boostFuel + dt * 0.22);
    }
    this.ui.setBoostHud(this._boostActive, this._boostFuel);

    if (moving) {
      const steer = -axis.x * (this._boostActive ? 1.7 : 2.2) * dt;
      v.rotation.y += steer;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(v.quaternion);
      // W/up is negative y in stick → forward
      const throttle = -axis.y;
      const boostMul = this._boostActive ? 1.45 : 1;
      const speed = v.userData.speed * (throttle >= 0 ? 1 : 0.55) * boostMul;
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
    // Tropical Ocean Current: subtle sideways drift so currents feel real
    if (this.level?.id === 'ocean_current' && this.world?.userData?.oceanCurrents) {
      const drift = Math.sin(performance.now() * 0.0012) * 1.6 * dt;
      v.position.x += drift;
    }
    v.userData.updateAnim(dt, moving, axis.x);
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

    // Land dust kicks when the jeep accelerates hard
    if (!this.level.water && moving && -axis.y > 0.55) {
      this._dustCooldown -= dt;
      if (this._dustCooldown <= 0) {
        this._dustCooldown = 0.12;
        const dust = createDustKick(0xc4a35a);
        dust.position.copy(v.position);
        dust.position.y = 0.2;
        dust.position.add(new THREE.Vector3(0, 0, 1.2).applyQuaternion(v.quaternion));
        this.scene.add(dust);
        this.trails.push(dust);
      }
    }

    // Submarine wake rings expand behind the hull
    if (this.level.water && moving) {
      this._wakeCooldown -= dt;
      if (this._wakeCooldown <= 0) {
        this._wakeCooldown = 0.22;
        const wake = createWakeRing(0xb6eaff);
        wake.position.copy(v.position);
        wake.position.y = 0.28;
        wake.position.add(new THREE.Vector3(0, 0, 1.4).applyQuaternion(v.quaternion));
        this.scene.add(wake);
        this.trails.push(wake);
      }
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
    // Soft haptic for mobile FIRE taps
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(mode === 'scatter' ? 18 : 10);
      }
    } catch {
      /* ignore unsupported vibrate */
    }

    if (this.predator) {
      v.userData.shotsAtPredator += mode === 'scatter' ? 3 : 1;
    }

    // Muzzle flash feedback — bigger/bluer for zoom, wider for scatter
    const flashColor = mode === 'zoom' ? 0x60a5fa : mode === 'scatter' ? 0xffe08a : 0xfff3a0;
    const flashScale = mode === 'scatter' ? 1.45 : mode === 'zoom' ? 1.25 : 1;
    const flash = createMuzzleFlash(flashColor, flashScale);
    flash.position.copy(muzzle);
    this.scene.add(flash);
    this._muzzleFlashes.push(flash);
  }

  _updateMuzzleFlashes(dt) {
    if (!this._muzzleFlashes?.length) return;
    for (let i = this._muzzleFlashes.length - 1; i >= 0; i--) {
      const f = this._muzzleFlashes[i];
      f.userData.life -= dt;
      const k = Math.max(0, f.userData.life / (f.userData.maxLife || 0.12));
      f.material.opacity = k;
      const s = (f.userData.baseScale || 1) * (0.7 + (1 - k) * 1.4);
      f.scale.setScalar(s);
      if (f.userData.life <= 0) {
        this.scene.remove(f);
        this._muzzleFlashes.splice(i, 1);
      }
    }
  }

  _vehicleBodyMesh() {
    const v = this.vehicle;
    if (!v) return null;
    if (v.userData.chassis?.material?.emissive) return v.userData.chassis;
    let found = null;
    v.traverse((child) => {
      if (!found && child.isMesh && child.material?.emissive && child !== v.userData.sirens?.[0] && child !== v.userData.sirens?.[1]) {
        found = child;
      }
    });
    return found;
  }

  _flashVehicleHit(color = 0xe85d4c) {
    const body = this._vehicleBodyMesh();
    if (!body?.material) return;
    if (!body.material.emissive) body.material.emissive = new THREE.Color(0x000000);
    body.material.emissive.setHex(color);
    body.material.emissiveIntensity = 0.9;
    this._vehicleHitFlashT = 0.22;
  }

  _updateVehicleHitFlash(dt) {
    if (this._vehicleHitFlashT <= 0) return;
    this._vehicleHitFlashT -= dt;
    const body = this._vehicleBodyMesh();
    if (!body?.material) return;
    if (this._vehicleHitFlashT <= 0) {
      body.material.emissiveIntensity = 0;
    } else {
      body.material.emissiveIntensity = 0.15 + this._vehicleHitFlashT * 3.2;
    }
  }

  _updatePredatorLimp() {
    if (!this.predator || !this._predatorBaseSpeed) return;
    const ratio = this.predator.userData.hp / (this.predator.userData.maxHp || 1);
    if (ratio < 0.35 && this.phase !== PHASE.ESCORT && this.phase !== PHASE.HEADBUTT) {
      this.predator.userData.speed = this._predatorBaseSpeed * 0.62;
      if (this.predator.userData.anim.state === 'chase') {
        this.predator.userData.anim.state = 'hurt';
      }
      this.predator.userData.limp = true;
    } else if (this.phase !== PHASE.HEADBUTT) {
      this.predator.userData.speed = this._predatorBaseSpeed;
      this.predator.userData.limp = false;
    }
  }

  _spawnConfettiBurst(origin, count = 22) {
    const palette = [0xf4c14b, 0x62d26f, 0x60a5fa, 0xe85d4c, 0xfff3a0];
    for (let i = 0; i < count; i++) {
      const c = createConfetti(palette[i % palette.length]);
      c.position.copy(origin);
      c.position.y += 1.2;
      this.scene.add(c);
      this._confetti.push(c);
    }
  }

  _updateConfetti(dt) {
    if (!this._confetti?.length) return;
    for (let i = this._confetti.length - 1; i >= 0; i--) {
      const c = this._confetti[i];
      c.userData.velocity.y -= 9 * dt;
      c.position.addScaledVector(c.userData.velocity, dt);
      c.rotation.z += (c.userData.spin || 4) * dt;
      c.userData.life -= dt;
      c.material.opacity = Math.max(0, c.userData.life / 1.4);
      if (c.userData.life <= 0) {
        this.scene.remove(c);
        this._confetti.splice(i, 1);
      }
    }
  }

  _spawnEscortChevrons() {
    for (const c of this._chevrons || []) this.scene.remove(c);
    this._chevrons = [];
    const nest = this.world?.userData?.nestPos;
    if (!nest || !this.baby) return;
    const from = this.baby.position.clone();
    const to = nest.clone();
    const dir = to.clone().sub(from).setY(0);
    const dist = dir.length();
    if (dist < 2) return;
    dir.normalize();
    const steps = Math.min(6, Math.max(3, Math.floor(dist / 5)));
    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 1);
      const chev = createNestChevron(i === steps ? 0x62d26f : 0xf4c14b);
      chev.position.set(from.x + dir.x * dist * t, 0.06, from.z + dir.z * dist * t);
      chev.rotation.z = Math.atan2(dir.x, dir.z);
      this.scene.add(chev);
      this._chevrons.push(chev);
    }
  }

  _updateChevrons(dt) {
    if (this.phase === PHASE.ESCORT) {
      this._chevronRefreshT = (this._chevronRefreshT || 0) - dt;
      if (this._chevronRefreshT <= 0) {
        this._chevronRefreshT = 0.5;
        this._spawnEscortChevrons();
      }
    }
    if (!this._chevrons?.length) return;
    const t = performance.now() * 0.001;
    for (const c of this._chevrons) {
      c.material.opacity = 0.45 + Math.sin(t * 4 + c.position.x) * 0.3;
      c.position.y = 0.06 + Math.sin(t * 3 + c.position.z) * 0.02;
    }
  }

  _updateCamera(dt) {
    if (!this.vehicle) return;
    const mode = this.vehicle.userData.weaponMode;
    const zoom = mode === 'zoom' && this.phase === PHASE.COMBAT ? 1 : 0;
    const axis = this.input.getAxis();
    const throttle = Math.max(0, -axis.y);
    const lookAhead = (this._boostActive ? 3.2 : 1.8) * throttle + (zoom ? 0.6 : 0);
    this._camLookAhead = lookAhead;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.vehicle.rotation.y,
    );
    const back = THREE.MathUtils.lerp(7.5, 5.2, zoom);
    const height = THREE.MathUtils.lerp(4.8, 3.4, zoom);
    const offset = new THREE.Vector3(0, height, back).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.vehicle.rotation.y,
    );
    // Drive look-ahead: camera sits slightly ahead of the jeep when moving
    const target = this.vehicle.position.clone().add(offset).addScaledVector(forward, lookAhead * 0.35);
    this.camera.position.lerp(target, 1 - Math.pow(0.0008, dt));
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      this.camera.position.x += (Math.random() - 0.5) * 0.35;
      this.camera.position.y += (Math.random() - 0.5) * 0.2;
    }
    // Chase roar FOV punch decays, then siren boost / zoom take over
    if (this._chaseRoarPunchT > 0) {
      this._chaseRoarPunchT -= dt;
      if (this._chaseRoarPunchT <= 0) this.ui.flashRoar?.(false);
    }
    const roarBoost = this._chaseRoarPunchT > 0 ? 10 * Math.min(1, this._chaseRoarPunchT / 0.75) : 0;
    const proximityTighten = (this._proximityTension || 0) * 5.5;
    const wantFov =
      this._baseFov +
      roarBoost +
      (this._boostActive ? 7 : zoom ? -4 : 0) -
      proximityTighten;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, wantFov, 1 - Math.pow(0.002, dt));
    this.camera.updateProjectionMatrix();
    const look = this.vehicle.position.clone();
    look.y += 1.4;
    look.add(forward.clone().multiplyScalar(4 + lookAhead));
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
      this.ui.setPhaseRibbon(true, 'CHASE', 'chase');
      // Chase-start roar punch — camera + screen flash
      this.audio.roar();
      this.shakeT = Math.max(this.shakeT, 0.45);
      this._chaseRoarPunchT = 0.75;
      this.camera.fov = this._baseFov + 10;
      this.camera.updateProjectionMatrix();
      this.ui.flashRoar?.(true);
      this.ui.toast('ROAR! The boss is chasing the baby!');
      this.ui.crewCallout('Scout Mina', 'ROAR! Predator on the move — intercept!');
      this._radioChatter('Chase active — intercept the predator!');
    }

    if (this.phase === PHASE.CHASE) {
      const dist = vehicle.position.distanceTo(predator.position);
      if (dist < 14) {
        this.phase = PHASE.COMBAT;
        this.phaseT = 0;
        this._weaponCycleT = 0;
        this.ui.setMission('Fire! Use Auto / Zoom / Scatter');
        this.ui.setPhaseRibbon(true, 'COMBAT', 'combat');
        this.ui.showAim(true);
        this.ui.toast('Smart aiming unlocked!');
        this.ui.crewCallout('Gunner Kai', 'Smart aiming modes launching — Auto, Zoom, Scatter!');
        this.setWeaponMode('auto');
        this.ui.setWeaponModeUI('auto');
        this._radioChatter('Weapons free — Auto / Zoom / Scatter online!');
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
        this.ui.setPhaseRibbon(true, 'MOTHER HELP', 'mother');
        this.ui.toast(`${DINOSAURS[this.level.mother].name} arrives!`);
        this.ui.crewCallout('Scout Mina', 'Mother dinosaur is charging in to help!');
        // Educational paleontology tip when mother assists (learning through play)
        const momFact = DINOSAURS[this.level.mother]?.facts;
        const predFact = DINOSAURS[this.level.predator]?.facts;
        if (momFact) {
          this.ui.showPaleoTip?.(`Learn: ${DINOSAURS[this.level.mother].name} — ${momFact}`);
        } else if (predFact) {
          this.ui.showPaleoTip?.(`Learn: ${DINOSAURS[this.level.predator].name} — ${predFact}`);
        }
        this.audio.mother();
        this.audio.roar();
        this.shakeT = Math.max(this.shakeT, 0.35);
        this._spawnSparks(mother.position.clone().setY(1.6), 0xf4c14b, 10);
        this._spawnMotherRing(mother.position.clone());
        this._spawnMotherShield(mother);
        this._radioChatter('Mother assist inbound — cover the baby!');
      }
      if (predator.userData.hp <= 0) {
        this._beginEscort();
      }
      // Overshoot headbutt risk (higher threshold so kids can finish fights)
      if (vehicle.userData.shotsAtPredator >= 28 && hpRatio > 0.35) {
        this.phase = PHASE.HEADBUTT;
        this.phaseT = 0;
        this._nearMissAwarded = false;
        this._headbuttClosest = 99;
        predator.userData.anim.state = 'attack';
        this.ui.setMission('Watch out — headbutt!');
        this.ui.setPhaseRibbon(true, 'HEADBUTT!', 'headbutt');
        this.ui.toast('Charge telegraph! Predator winds up a headbutt!');
        this.ui.crewCallout('Scout Mina', 'Red ring — dodge the charge!');
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
        this._healFxCooldown -= dt;
        if (this._healFxCooldown <= 0) {
          this._healFxCooldown = 0.18;
          this._spawnHealSpark(baby.position.clone().setY(1.2));
        }
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
        this._nearMissAwarded = false;
        this._headbuttClosest = 99;
        this.ui.setPhaseRibbon(true, 'HEADBUTT!', 'headbutt');
        this.ui.setHeadbuttAlarm(true);
        this.audio.roar();
      }
    }

    if (this.phase === PHASE.HEADBUTT) {
      this.ui.setHeadbuttAlarm(true);
      this._chase(predator, vehicle.position, predator.userData.speed * 1.6, dt);
      const chargeDist = predator.position.distanceTo(vehicle.position);
      this._headbuttClosest = Math.min(this._headbuttClosest, chargeDist);
      // Near-miss bonus when the charge grazes past without a full hit
      if (
        !this._nearMissAwarded &&
        chargeDist > 2.4 &&
        chargeDist < 3.6 &&
        this._headbuttClosest < 3.2
      ) {
        const moving =
          Math.abs(this.input.getAxis().x) + Math.abs(this.input.getAxis().y) > 0.2 || this._boostActive;
        if (moving) {
          this._nearMissAwarded = true;
          this.missionScore += 75;
          this.ui.updateScore(this.missionScore);
          this.ui.toast('Near miss! +75');
          this.ui.crewCallout('Scout Mina', 'Nice dodge — that was close!');
          this.audio.nearMiss();
          this._spawnSparks(vehicle.position.clone().setY(1.2), 0x60a5fa, 8);
        }
      }
      if (chargeDist < 2.4) {
        vehicle.userData.hp -= 28;
        this._spawnSparks(vehicle.position, 0xe85d4c, 10);
        this._flashVehicleHit(0xe85d4c);
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
        this._nearMissAwarded = false;
        this._headbuttClosest = 99;
        if (vehicle.userData.hp <= 0) this._fail('Your vehicle was wrecked by a headbutt!');
      }
      if (predator.userData.hp <= 0) this._beginEscort();
    } else {
      this.ui.setHeadbuttAlarm(false);
    }

    if (this.phase === PHASE.ESCORT) {
      // Escort baby to nest
      const nest = this.world.userData.nestPos;
      this._chase(baby, nest, baby.userData.speed * 1.8, dt);
      // Mother bodyguards on the baby's flank (store: dinosaur companions help)
      if (mother.visible) {
        const toNest = nest.clone().sub(baby.position).setY(0);
        if (toNest.lengthSq() < 0.01) toNest.set(0, 0, -1);
        else toNest.normalize();
        const flank = new THREE.Vector3(-toNest.z, 0, toNest.x).multiplyScalar(2.4);
        const guardPos = baby.position.clone().add(flank).addScaledVector(toNest, -1.2);
        mother.userData.guardMode = 'flank_guard';
        this._chase(mother, guardPos, mother.userData.speed * 1.15, dt);
        mother.userData.anim.state = 'run';
      }
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
      const inDanger = threatDist < 4.5 && this.phase !== PHASE.ESCORT;
      this.ui.setDanger(inDanger);
      if (inDanger) {
        baby.userData.anim.panic = true;
        if (baby.userData.baseSpeed == null) baby.userData.baseSpeed = baby.userData.speed;
        baby.userData.speed = baby.userData.baseSpeed * 1.35;
        this._squealCooldown -= dt;
        if (this._squealCooldown <= 0) {
          this.audio.squeal();
          this._squealCooldown = 1.1;
        }
      } else if (baby.userData.anim) {
        baby.userData.anim.panic = false;
        if (baby.userData.baseSpeed != null) baby.userData.speed = baby.userData.baseSpeed;
      }
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
      if (baby?.userData?.anim) baby.userData.anim.panic = false;
    }
  }

  _beginEscort() {
    if (this.phase === PHASE.ESCORT || this.phase === PHASE.WIN) return;
    this.phase = PHASE.ESCORT;
    this.phaseT = 0;
    this._escortDwelling = 0;
    if (this.predator) this.predator.userData.anim.state = 'hurt';
    this._spawnRetreatSmoke();
    this.ui.showAim(false);
    this.ui.setDanger(false);
    this.ui.setSosBanner?.(false);
    this.ui.setHeadbuttAlarm(false);
    this.ui.setPhaseRibbon(true, 'ESCORT TO NEST', 'escort');
    this.ui.setMission('Escort baby to the glowing nest!');
    const tip = document.getElementById('tutorial-tip');
    if (tip) tip.classList.add('hidden');
    // Reveal escort eggs
    for (const egg of this.world?.userData?.eggs || []) {
      if (!egg.userData.collected) egg.visible = true;
    }
    this._spawnEscortChevrons();
    this.ui.toast('Predator retreats! Escort the baby — grab glowing eggs!');
    this._radioChatter('Escort mode — follow the nest beacon!');
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
    this.ui.setPhaseRibbon(true, 'CELEBRATE', 'escort');
    this.ui.showSkipCountdown(false);
    this.ui.toast('Baby dinosaur rescued!');
    this.audio.win();
    this._revealNestCrack();
    this._spawnThankYouHearts();
  }

  _finishWin() {
    if (this.phase === PHASE.WIN || this.phase === PHASE.LOSE) return;
    this.phase = PHASE.WIN;
    this.audio.stopAmbient();
    const stars = this._missionStars();
    this._lastStars = stars;
    this.missionScore += 500 + Math.floor(this.vehicle?.userData?.hp || 0) + stars * 50;
    if (this._hitCombo > 4) this.missionScore += this._hitCombo * 5;
    this.ui.updateScore(this.missionScore);
    const stampId = this.level.stamp;
    const stamp = DINOSAURS[stampId];
    const prevCleared = this.save.cleared.length;
    markCleared(this.save, this.level.id, stampId, this.missionScore);
    recordBestStars(this.save, this.level.id, stars);
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
    const unlocks = this._newVehicleUnlocks(prevCleared, this.save.cleared.length);
    let unlockText = '';
    if (unlocks.length) {
      unlockText = `New ride unlocked: ${unlocks.map((v) => v.name).join(', ')}!`;
      this.audio.unlock();
      this.ui.toast(unlockText);
    }
    const idx = LEVELS.findIndex((l) => l.id === this.level.id);
    const hasNext = idx >= 0 && idx < LEVELS.length - 1;
    const elapsed = Math.max(0, Math.round(this._missionElapsed || 0));
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeText = `Rescue time: ${mins}:${String(secs).padStart(2, '0')}`;
    this.audio.stamp();
    this.ui.updateNestCompass(false);
    this.ui.hideCrewCallout();
    this.ui.setPhaseRibbon(false);
    this.ui.showSkipCountdown(false);
    this.ui.setAimLock(false);
    this.ui.setRadarDanger(false);
    this.ui.setBoostHud(false, this._boostFuel);
    if (stars >= 3) {
      this.audio.perfect?.();
      this.ui.showAchievementToast?.('PERFECT RESCUE!', 'All stars — eggs, baby & jeep safe!');
    }
    this.ui.showResult({
      win: true,
      message: `Great work, Guard! +${this.missionScore} points`,
      stampName: stamp?.name || 'Stamp',
      stampColor: stamp ? `#${stamp.color.toString(16).padStart(6, '0')}` : undefined,
      fact: stamp?.facts || DINOSAURS[this.level.predator]?.facts,
      stars,
      perfect: stars >= 3,
      unlockText,
      hasNext,
      timeText,
    });
    this.state = 'result';
  }

  _fail(message) {
    if (this.phase === PHASE.LOSE) return;
    this.phase = PHASE.LOSE;
    this.audio.stopAmbient();
    this.ui.setDanger(false);
    this.ui.setHeadbuttAlarm(false);
    this.ui.updateNestCompass(false);
    document.getElementById('tutorial-tip')?.classList.add('hidden');
    this.audio.lose();
    this.ui.setPhaseRibbon(false);
    this.ui.showSkipCountdown(false);
    this.ui.setAimLock(false);
    this.ui.setRadarDanger(false);
    this.ui.setBoostHud(false, this._boostFuel);
    const elapsed = Math.max(0, Math.round(this._missionElapsed || 0));
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    this.ui.showResult({
      win: false,
      message,
      stars: 0,
      hasNext: false,
      timeText: `Time: ${mins}:${String(secs).padStart(2, '0')}`,
    });
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
    // Animation advanced once in _updateActors — keeps walk cycles at correct speed
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
          this._registerHit(p.userData.damage);
          this._flashPredatorHit();
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
      if (s.userData.velocity) s.position.addScaledVector(s.userData.velocity, dt);
      if (s.userData.kind === 'retreatSmoke') {
        s.userData.velocity.y += 0.4 * dt;
        s.scale.multiplyScalar(1.02);
        s.material.opacity = Math.max(0, s.userData.life * 0.5);
      } else if (s.userData.kind === 'boostBubble') {
        s.userData.velocity.y += 0.6 * dt;
        s.scale.multiplyScalar(1.01);
        s.material.opacity = Math.max(0, s.userData.life * 1.1);
      } else if (s.userData.kind === 'damageSmoke') {
        s.userData.velocity.y += 0.5 * dt;
        s.scale.multiplyScalar(1.025);
        s.material.opacity = Math.max(0, s.userData.life * 0.55);
      } else if (s.userData.kind === 'plankton') {
        s.userData.velocity.y += 0.15 * dt;
        s.scale.multiplyScalar(1.015);
        s.material.opacity = Math.max(0, s.userData.life * 0.95);
      } else {
        s.scale.multiplyScalar(0.96);
      }
      s.userData.life -= dt;
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
      if (t.userData.kind === 'wake') {
        t.scale.multiplyScalar(1.04);
        t.material.opacity = Math.max(0, t.userData.life * 0.75);
      } else if (t.userData.kind === 'footprint') {
        t.material.opacity = Math.max(0, t.userData.life * 0.25);
      } else if (t.userData.kind === 'dust') {
        if (t.userData.velocity) t.position.addScaledVector(t.userData.velocity, dt);
        t.scale.multiplyScalar(1.03);
        t.material.opacity = Math.max(0, t.userData.life * 0.85);
      } else {
        t.position.y += dt * 0.4;
        t.scale.multiplyScalar(1.02);
        t.material.opacity = Math.max(0, t.userData.life * 0.9);
      }
      if (t.userData.life <= 0) {
        this.scene.remove(t);
        this.trails.splice(i, 1);
      }
    }
  }

  _registerHit(_baseDamage) {
    this._hitCombo += 1;
    this._comboTimer = 1.6;
    const mult = Math.min(4, 1 + Math.floor(this._hitCombo / 3) * 0.5);
    const bonus = Math.round(10 * mult);
    this.missionScore += bonus;
    this.ui.updateScore(this.missionScore);
    this.ui.setCombo(this._hitCombo);
    if (this._hitCombo >= 5 && this._hitCombo % 5 === 0) {
      this.ui.toast(`Combo x${this._hitCombo}!`);
      this.ui.crewCallout('Gunner Kai', `Keep the streak — x${this._hitCombo}!`);
      this.ui.flashComboMilestone?.(this._hitCombo);
      this.audio.combo?.(this._hitCombo);
    }
  }

  _updateCombo(dt) {
    if (this._hitCombo <= 0) return;
    this._comboTimer -= dt;
    if (this._comboTimer <= 0) {
      this._hitCombo = 0;
      this.ui.setCombo(0);
    }
  }

  _predatorBodyMesh() {
    const parts = this.predator?.userData?.parts;
    if (!parts) return null;
    // `body` is a Group; `torso` is the lit MeshStandardMaterial mesh
    if (parts.torso?.material?.emissive) return parts.torso;
    if (parts.body?.material?.emissive) return parts.body;
    let found = null;
    parts.body?.traverse?.((child) => {
      if (!found && child.isMesh && child.material?.emissive) found = child;
    });
    return found;
  }

  _flashPredatorHit() {
    const body = this._predatorBodyMesh();
    if (!body?.material) return;
    if (!body.material.emissive) body.material.emissive = new THREE.Color(0x000000);
    body.material.emissive.setHex(0xfff3a0);
    body.material.emissiveIntensity = 0.85;
    this._hitFlashT = 0.18;
  }

  _updateHitFlash(dt) {
    if (this._hitFlashT <= 0) return;
    this._hitFlashT -= dt;
    const body = this._predatorBodyMesh();
    if (!body?.material) return;
    if (this._hitFlashT <= 0) {
      body.material.emissiveIntensity = 0.05;
    } else {
      body.material.emissiveIntensity = 0.2 + this._hitFlashT * 3.5;
    }
  }

  _updateHpVignette() {
    const babyRatio = this.baby
      ? this.baby.userData.hp / (this.baby.userData.maxHp || 1)
      : 1;
    const jeepRatio = this.vehicle
      ? this.vehicle.userData.hp / (this.vehicle.userData.maxHp || 1)
      : 1;
    const danger = Math.min(babyRatio, jeepRatio);
    // Stronger red edge when either is critical
    const amount = danger < 0.4 ? (0.4 - danger) / 0.4 : 0;
    this.ui.setHpVignette(amount);
  }

  _updateFootprints(dt) {
    if (this.level?.water) return;
    this._footprintCooldown -= dt;
    if (this._footprintCooldown > 0) return;
    this._footprintCooldown = 0.28;
    for (const dino of [this.baby, this.predator, this.mother]) {
      if (!dino?.visible) continue;
      if (dino.userData.anim?.state === 'idle') continue;
      const print = createFootprint(0x2a1c10);
      print.position.set(dino.position.x, 0.03, dino.position.z);
      print.rotation.z = -dino.rotation.y;
      // Offset slightly behind the body
      print.position.x -= Math.sin(dino.rotation.y) * 0.35;
      print.position.z -= Math.cos(dino.rotation.y) * 0.35;
      this.scene.add(print);
      this.trails.push(print);
    }
  }

  _spawnHealSpark(pos) {
    const s = createHealSpark();
    s.position.copy(pos);
    this.scene.add(s);
    this.heals.push(s);
  }

  _updateHeals(dt) {
    for (let i = this.heals.length - 1; i >= 0; i--) {
      const h = this.heals[i];
      h.position.addScaledVector(h.userData.velocity, dt);
      h.userData.life -= dt;
      h.material.opacity = Math.max(0, h.userData.life);
      h.scale.multiplyScalar(0.98);
      if (h.userData.life <= 0) {
        this.scene.remove(h);
        this.heals.splice(i, 1);
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
        this._eggsCollected = (this._eggsCollected || 0) + 1;
        this.missionScore += 50;
        this.ui.updateScore(this.missionScore);
        this.audio.collect();
        this._spawnSparks(egg.position.clone().setY(1), 0xffe08a, 8);
        this.ui.toast(`Dino egg collected! +50 (${this._eggsCollected}/5)`);
      }
    }
  }

  _spawnMotherRing(origin) {
    const ring = createMotherRing(0xf4c14b);
    ring.position.set(origin.x, 0.08, origin.z);
    this.scene.add(ring);
    this._motherRings.push(ring);
  }

  /** Mother protect shield bubble on arrival */
  _spawnMotherShield(mother) {
    if (this._motherShield) {
      this.scene.remove(this._motherShield);
      this._motherShield = null;
    }
    const shield = createMotherShield(0x60a5fa);
    shield.position.copy(mother.position);
    shield.position.y = 1.2;
    this.scene.add(shield);
    this._motherShield = shield;
  }

  _updateMotherShield(dt) {
    const shield = this._motherShield;
    if (!shield) return;
    if (this.mother?.visible) {
      shield.position.x = this.mother.position.x;
      shield.position.z = this.mother.position.z;
      shield.position.y = 1.2 + Math.sin(performance.now() * 0.004) * 0.15;
    }
    shield.userData.life -= dt;
    shield.rotation.y += dt * 1.4;
    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.06;
    shield.scale.setScalar(pulse);
    shield.material.opacity = Math.max(0, Math.min(0.35, shield.userData.life * 0.14));
    if (shield.userData.life <= 0) {
      this.scene.remove(shield);
      this._motherShield = null;
    }
  }

  /** Thank-you hearts when baby is safe at the nest */
  _spawnThankYouHearts() {
    if (!this.baby) return;
    this.audio.hearts?.();
    for (let i = 0; i < 8; i++) {
      const heart = createThankYouHeart(i % 2 ? 0xff6b8a : 0xffa0c0);
      heart.position.copy(this.baby.position);
      heart.position.y = 1.1;
      heart.position.x += (Math.random() - 0.5) * 0.8;
      heart.position.z += (Math.random() - 0.5) * 0.8;
      this.scene.add(heart);
      this._hearts.push(heart);
    }
  }

  _updateThankYouHearts(dt) {
    if (!this._hearts?.length) return;
    for (let i = this._hearts.length - 1; i >= 0; i--) {
      const h = this._hearts[i];
      h.position.addScaledVector(h.userData.velocity, dt);
      h.userData.life -= dt;
      h.rotation.y += dt * 3;
      h.material.opacity = Math.max(0, h.userData.life / 1.4);
      h.scale.setScalar(0.8 + (1 - h.userData.life / 1.4) * 0.6);
      if (h.userData.life <= 0) {
        this.scene.remove(h);
        this._hearts.splice(i, 1);
      }
    }
  }

  /** Show nest hatch crack during celebrate */
  _revealNestCrack() {
    const crack = this.world?.userData?.nestBeacon?.nestCrack;
    if (!crack) return;
    crack.visible = true;
    crack.scale.setScalar(0.2);
    crack.userData.revealT = 0;
  }

  _updateNestCrack(dt) {
    const crack = this.world?.userData?.nestBeacon?.nestCrack;
    if (!crack?.visible) return;
    crack.userData.revealT = (crack.userData.revealT || 0) + dt;
    const t = Math.min(1, crack.userData.revealT / 0.45);
    crack.scale.setScalar(0.2 + t * 0.9);
    crack.rotation.y += dt * 0.8;
  }

  /** Critical Guard HP damage smoke */
  _updateDamageSmoke(dt) {
    if (!this.vehicle) return;
    const ratio = this.vehicle.userData.hp / (this.vehicle.userData.maxHp || 1);
    if (ratio >= 0.35) return;
    if ([PHASE.WIN, PHASE.LOSE, PHASE.COUNTDOWN].includes(this.phase)) return;
    this._damageSmokeT = (this._damageSmokeT || 0) - dt;
    if (this._damageSmokeT > 0) return;
    this._damageSmokeT = 0.16;
    const smoke = createDamageSmoke();
    smoke.position.copy(this.vehicle.position);
    smoke.position.y = 1.1 + Math.random() * 0.3;
    smoke.position.x += (Math.random() - 0.5) * 0.4;
    this.scene.add(smoke);
    this.sparks.push(smoke);
  }

  /** Ocean bioluminescent plankton trail behind water vehicles */
  _updatePlankton(dt) {
    if (!this.level?.water || !this.vehicle) return;
    const axis = this.input.getAxis();
    const moving = Math.abs(axis.x) + Math.abs(axis.y) > 0.08 || this._boostActive;
    if (!moving) return;
    this._planktonT = (this._planktonT || 0) - dt;
    if (this._planktonT > 0) return;
    this._planktonT = 0.08;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.vehicle.rotation.y,
    );
    for (let i = 0; i < 2; i++) {
      const p = createPlankton(i % 2 ? 0x7ef0c8 : 0x60a5fa);
      p.position.copy(this.vehicle.position);
      p.position.y = 0.2 + Math.random() * 0.5;
      p.position.addScaledVector(forward, 0.9 + Math.random() * 0.5);
      p.position.x += (Math.random() - 0.5) * 0.7;
      this.scene.add(p);
      this.sparks.push(p);
    }
  }

  _updateMotherRings(dt) {
    if (!this._motherRings?.length) return;
    for (let i = this._motherRings.length - 1; i >= 0; i--) {
      const ring = this._motherRings[i];
      ring.userData.life -= dt;
      const grow = 1 + (1.1 - ring.userData.life) * 3.2;
      ring.scale.setScalar(grow);
      ring.material.opacity = Math.max(0, ring.userData.life * 0.75);
      if (ring.userData.life <= 0) {
        this.scene.remove(ring);
        this._motherRings.splice(i, 1);
      }
    }
  }

  _updateAimLock() {
    const mode = this.vehicle?.userData?.weaponMode;
    const combat =
      this.predator?.visible &&
      [PHASE.COMBAT, PHASE.MOTHER, PHASE.HEADBUTT].includes(this.phase) &&
      (mode === 'auto' || mode === 'zoom');
    if (!combat || !this.predator || !this.camera) {
      this.ui.setAimLock(false);
      return;
    }
    // Project predator to screen for the lock reticle
    const pos = this.predator.position.clone();
    pos.y += 1.6;
    pos.project(this.camera);
    if (pos.z > 1) {
      this.ui.setAimLock(false);
      return;
    }
    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
    this.ui.setAimLock(true, x, y, mode === 'zoom');
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
    // Escort eggs — cream blips so kids can hunt them on the radar
    for (const egg of this.world?.userData?.eggs || []) {
      if (!egg.visible || egg.userData.collected) continue;
      plot(egg, '#ffe8b0', 3);
    }
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
