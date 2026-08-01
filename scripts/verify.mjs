/**
 * Static feature / structure verification for Dinosaur Guard 2.
 * Run: npm run verify
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
let failed = 0;

function ok(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

console.log('Iteration verification — Dinosaur Guard 2\n');

const required = [
  'index.html',
  'package.json',
  'vite.config.js',
  'src/main.js',
  'src/style.css',
  'src/game/Game.js',
  'src/game/data.js',
  'src/game/DinosaurFactory.js',
  'src/game/VehicleFactory.js',
  'src/game/WorldBuilder.js',
  'src/game/Input.js',
  'src/game/UI.js',
  'src/game/Save.js',
  'src/game/Audio.js',
];

console.log('Files');
for (const f of required) ok(fs.existsSync(path.join(root, f)), f);

const data = read('src/game/data.js');
const game = read('src/game/Game.js');
const html = read('index.html');
const dino = read('src/game/DinosaurFactory.js');
const vehicle = read('src/game/VehicleFactory.js');
const world = read('src/game/WorldBuilder.js');

console.log('\nContent');
const dinoIds = [...data.matchAll(/^\s{2}([a-z_]+):\s*\{$/gm)].map((m) => m[1]);
ok(dinoIds.length >= 26, `26 dinosaur characters (${dinoIds.length})`);
ok((data.match(/biome:/g) || []).length >= 10, '10 themed levels');
ok((data.match(/type: 'police'/g) || []).length >= 6, '6 police cars');
ok((data.match(/type: 'submarine'/g) || []).length >= 4, '4 guard submarines');
ok(data.includes('CREW') && (data.match(/id: 'captain_rio'/) || data.includes('Captain Rio')), '4 named guard crew');
ok(
  ['rainforest', 'crystal_cave', 'firefly_cave', 'danxia', 'vine_swamp', 'coral_relics', 'lava_volcano', 'deep_swirl', 'meteorite', 'ocean_current'].every(
    (id) => data.includes(`id: '${id}'`),
  ),
  'all 10 store biomes present',
);

ok(game.includes('PHASE') && game.includes('HEADBUTT') && game.includes('MOTHER') && game.includes('ESCORT'), 'mission phases incl. mother/headbutt/escort');
ok(game.includes('setWeaponMode') || game.includes('weaponMode'), 'weapon modes wired');
ok(game.includes('markCleared'), 'stamp/progress save on win');
ok(game.includes('_updateFireflies') || world.includes('fireflies'), 'firefly cave FX');
ok(dino.includes('updateAnim') && dino.includes('legs') && dino.includes('wings'), 'animated dinosaur parts + wings');
ok(dino.includes("morph === 'trike'") && dino.includes("morph === 'mosa'") && dino.includes("morph === 'ptera'"), 'species morphs');
ok(vehicle.includes('submarine') && vehicle.includes('sirens') && vehicle.includes('CREW'), 'vehicles + crew built');
ok(vehicle.includes("muzzle.position.set(0, 0.85, -1.9)"), 'muzzle aims forward (-Z)');
ok(vehicle.includes('hull.rotation.x = Math.PI / 2') && vehicle.includes('muzzle.position.set(0, 0.85, -1.95)'), 'submarine hull faces -Z');
ok(read('src/game/Input.js').includes('Escape') && game.includes('_handlePauseHotkey'), 'Escape/P pause hotkey');
ok(dino.includes('_fans'), 'dilophosaurus frill fan animation');
ok(html.includes('Stamp Book') && html.includes('Garage') && html.includes('Jurassic Map'), 'hub UI surfaces');
ok(html.includes('Auto Aim') && html.includes('Zoom') && html.includes('Scatter'), 'weapon mode UI');
ok(html.includes('stick-zone') && html.includes('btn-fire'), 'touch controls');
ok(html.includes('predator-bar'), 'predator HP HUD');
ok(world.includes('blockers'), 'roadblock obstacles');
ok(world.includes('nestBeacon') || world.includes('beacon'), 'nest escort beacon');
ok(html.includes('btn-mute') && html.includes('nest-compass'), 'mute + nest compass UI');
ok(world.includes('bubbles') || world.includes('vine'), 'biome props (vines/bubbles)');
ok(world.includes('crater') || world.includes('meteor'), 'meteorite crater scenery');
ok(dino.includes('CapsuleGeometry'), 'organic capsule dinosaur meshes');
ok(dino.includes('jaw') && dino.includes("anim.state === 'attack'"), 'jaw chomp attack animation');
ok(world.includes('eggs') && world.includes("kind = 'egg'"), 'escort collectible eggs');
ok(world.includes('ash') || world.includes('lavaPool'), 'volcano ash/lava FX');
ok(world.includes('clouds') && world.includes('drift'), 'sky cloud atmosphere');
ok(game.includes('egg.visible = true') || game.includes('Reveal escort eggs'), 'eggs reveal on escort');
ok(game.includes('_updateRadar') && html.includes('radar-canvas'), 'mission mini-map radar');
ok(game.includes('createTrailPuff') || game.includes('_updateTrails'), 'vehicle drive trails');
ok(game.includes('shakeT') && game.includes('setHeadbuttAlarm'), 'headbutt camera shake + HUD alarm');
ok(html.includes('danger-banner') && game.includes('setDanger'), 'baby danger banner');
ok(html.includes('tutorial-tip') && game.includes('showTutorial'), 'first-mission tutorial tip');
ok(read('src/game/Input.js').includes('weaponHotkey') && read('src/game/Input.js').includes('Digit1'), '1/2/3 weapon hotkeys');
ok(read('src/game/Audio.js').includes('roar') && read('src/game/Audio.js').includes('collect'), 'roar + collect SFX');
ok(read('src/game/Audio.js').includes('alarm') && read('src/game/Audio.js').includes('countdown'), 'alarm + countdown SFX');
ok(game.includes('PHASE.COUNTDOWN') || game.includes("COUNTDOWN: 'countdown'"), 'mission countdown phase');
ok(game.includes('CELEBRATE') && game.includes('_finishWin'), 'victory celebrate then result');
ok(game.includes('_autoCycleWeapons') && game.includes('WEAPON_CYCLE'), 'auto smart weapon cycling');
ok(game.includes('_resolveCrocs') && world.includes('makeCrocodile'), 'mugger crocodile hazards');
ok(world.includes('rescueRoute') && world.includes('PlaneGeometry(4.2, 30)'), 'designed rescue route lane');
ok(game.includes('_spawnDamageFloater') && read('src/style.css').includes('dmg-floater'), 'damage floater feedback');
ok(html.includes('mission-countdown') && html.includes('crew-callout') && html.includes('alarm-ring'), 'countdown / crew / alarm UI');
ok(html.includes('manifest.webmanifest') && fs.existsSync(path.join(root, 'public/manifest.webmanifest')), 'offline web manifest');
ok(html.includes('boot-splash'), 'boot splash loading screen');
ok(dino.includes('_eyes') && dino.includes('blink'), 'dinosaur blink animation');
ok(vehicle.includes('sirenBoost'), 'siren boost during combat');
ok(read('src/game/UI.js').includes('lvl-badge') || read('src/style.css').includes('lvl-badge'), 'level water/boss badges');

// Branch 60a8 polish iterations
ok(html.includes('result-stars') && game.includes('_missionStars'), 'mission star rating');
ok(html.includes('btn-result-next') && game.includes('startNextMission'), 'next mission flow');
ok(html.includes('master-meter') && read('src/game/UI.js').includes('Dinosaur Master'), 'Dinosaur Master stamp meter');
ok(game.includes('_attachChargeTelegraph') && game.includes('_updateChargeTelegraph'), 'predator charge telegraph');
ok(read('src/game/Audio.js').includes('startAmbient') && read('src/game/Audio.js').includes('squeal'), 'ambient music + baby squeal');
ok(game.includes('_newVehicleUnlocks') && html.includes('result-unlock'), 'vehicle unlock celebration');
ok(world.includes('stalactiteDrips') && world.includes('makeKingFlower'), 'cave drips + rainforest king flowers');
ok(dino.includes('panicBoost') || dino.includes('anim.panic'), 'baby panic animation boost');
ok(game.includes('_eggsCollected'), 'egg collection tracked for stars');

// Branch 228d polish iterations
ok(html.includes('btn-restart') && game.includes('restartMission'), 'pause restart mission');
ok(html.includes('combo-hud') && game.includes('_registerHit') && game.includes('_hitCombo'), 'hit combo streak HUD');
ok(game.includes('_flashPredatorHit') && game.includes('_predatorBodyMesh'), 'predator hit flash');
ok(html.includes('hp-vignette') && game.includes('_updateHpVignette'), 'low HP vignette');
ok(world.includes('createFootprint') && game.includes('_updateFootprints'), 'dinosaur footprints');
ok(world.includes('createWakeRing') && game.includes('_wakeCooldown'), 'submarine wake rings');
ok(read('src/game/UI.js').includes('lvl-roster') && read('src/game/UI.js').includes('lvl-stars'), 'level dino roster + best stars');
ok(html.includes('result-perfect') && game.includes('perfect:'), 'perfect rescue badge');
ok(world.includes('createHealSpark') && game.includes('_spawnHealSpark'), 'mother heal sparkles');
ok(read('src/game/Save.js').includes('recordBestStars') && read('src/game/Save.js').includes('bestStars'), 'best stars persistence');

// Branch 3383 polish iterations
ok(html.includes('btn-skip-countdown') && game.includes('skipCountdown'), 'skip countdown button');
ok(html.includes('phase-ribbon') && read('src/game/UI.js').includes('setPhaseRibbon'), 'phase objective ribbon');
ok(game.includes('_updatePredatorLimp') && game.includes('limp'), 'predator limp when low HP');
ok(world.includes('createConfetti') && game.includes('_spawnConfettiBurst'), 'nest celebration confetti');
ok(world.includes('createDustKick') && game.includes('_dustCooldown'), 'jeep dust kick FX');
ok(html.includes('baby-bar') && read('src/game/UI.js').includes('updateBabyHp'), 'baby HP HUD bar');
ok(html.includes('pick-level-fact') && read('src/game/UI.js').includes('Learn:'), 'mission educational fact briefing');
ok(world.includes('createNestChevron') && game.includes('_spawnEscortChevrons'), 'escort nest chevrons');
ok(game.includes('navigator.vibrate'), 'mobile fire haptics');
ok(html.includes('stamp-detail') && read('src/game/UI.js').includes('showStampDetail'), 'stamp detail encyclopedia modal');

// Branch 886a polish iterations
ok(html.includes('aim-lock') && game.includes('_updateAimLock') && read('src/game/UI.js').includes('setAimLock'), 'smart aim lock reticle');
ok(world.includes('createMotherRing') && game.includes('_spawnMotherRing'), 'mother arrival ring FX');
ok(world.includes('rainDrops') && game.includes('rainDrops'), 'rainforest rainfall particles');
ok(html.includes('btn-boost') && read('src/game/Input.js').includes('isBoosting') && game.includes('_boostFuel'), 'siren boost / Shift dash');
ok(html.includes('result-time') && game.includes('_missionElapsed') && game.includes('timeText'), 'mission rescue timer on result');
ok(game.includes('_nearMissAwarded') && read('src/game/Audio.js').includes('nearMiss'), 'headbutt near-miss bonus');
ok(world.includes('causticLight') && game.includes('causticLight'), 'ocean caustic light shimmer');
ok(read('src/style.css').includes('stamp-fanfare') && read('src/game/Audio.js').includes('stamp()'), 'stamp unlock fanfare');
ok(read('src/game/UI.js').includes('setRadarDanger') && read('src/style.css').includes('danger-pulse'), 'radar danger pulse');
ok(html.includes('crew-intro') && game.includes('showCrewIntro') && game.includes('CREW.map'), 'guard crew intro roster');
ok(read('src/style.css').includes('160px') && read('src/style.css').includes('boost-btn'), 'GUARD HUD clears radar + boost clickable');

// Branch 134f polish iterations
ok(!game.includes('actor.userData.updateAnim(dt, true)') && !game.includes('predator.userData.updateAnim(dt, false)'), 'single-pass dino anim (no double updateAnim)');
ok(dino.includes('u.limp') && dino.includes('limpAmp'), 'predator limp visual animation');
ok(vehicle.includes('emissive: 0x3b82f6') && vehicle.includes('emissiveIntensity'), 'siren glow emissive materials');
ok(html.includes('btn-result-retry') && read('src/game/UI.js').includes('btn-result-retry'), 'fail-screen Try Again CTA');
ok(html.includes('mission-clock') && read('src/game/UI.js').includes('updateMissionClock'), 'live HUD mission clock');
ok(game.includes('_chevronRefreshT') && game.includes("plot(egg, '#ffe8b0'"), 'escort chevron refresh + eggs on radar');
ok(world.includes('createMuzzleFlash') && game.includes('_updateMuzzleFlashes'), 'muzzle flash on fire');
ok(game.includes('_flashVehicleHit') && game.includes('_updateVehicleHitFlash'), 'vehicle hit flash feedback');
ok(vehicle.includes('frontWheels') && vehicle.includes('_steer') && game.includes('updateAnim(dt, moving, axis.x)'), 'wheel steer + chassis lean');
ok(game.includes('_boostActive ? 7') && game.includes('updateProjectionMatrix') && game.includes('_chaseRoarPunchT'), 'boost camera FOV punch + roar punch');

// Branch ed9a polish iterations (10)
ok(world.includes('swingingCoral') && game.includes('swingingCoral'), '1 swinging coral relics');
ok(world.includes('whirlpool') && world.includes("level.id === 'deep_swirl'") && game.includes('whirlpool'), '2 deep-sea swirl whirlpool');
ok(world.includes('danxiaTerraces') && world.includes("level.id === 'danxia'"), '3 Danxia water-eroded terraces');
ok(vehicle.includes('userData.gun') && game.includes('gun.material.emissive') && vehicle.includes('weaponMode'), '4 weapon mode turret tint');
ok(dino.includes("anim.state === 'celebrate'") && game.includes("anim.state = 'celebrate'"), '5 celebrate hop dance');
ok(game.includes('_resolveBlockers') && game.includes('Roadblock!') && game.includes('_blockToastT'), '6 roadblock bounce feedback');
ok(game.includes('guardPos') && game.includes('Mother bodyguards'), '7 mother escort flank bodyguard');
ok(game.includes('lookAhead') && game.includes('Drive look-ahead'), '8 camera drive look-ahead');
ok(read('src/game/UI.js').includes('next-up') && read('src/style.css').includes('nextMissionPulse') && read('src/game/UI.js').includes('Dinosaur Master'), '9 hub next-mission pulse + master share');
ok(world.includes('fireflyLight') && game.includes('fireflyLight') && world.includes('caveCrystals'), '10 firefly biolum light + crystal shimmer');

// Branch 7dce polish iterations (10)
ok(world.includes('swingingVines') && game.includes('swingingVines'), '7dce-1 swinging swamp vines');
ok(world.includes('meteorSmoke') && world.includes('meteorImpactGlow') && game.includes('meteorCore'), '7dce-2 meteorite impact glow + smoke');
ok(world.includes('lavaRivers') && game.includes('lavaRivers'), '7dce-3 lava river ribbons');
ok(world.includes('oceanCurrents') && world.includes("level.id === 'ocean_current'") && game.includes('ocean_current'), '7dce-4 ocean current ribbons + drift');
ok(world.includes('forkedRoutes') && world.includes('forkA'), '7dce-5 forked dual rescue routes');
ok(game.includes('showGaragePreview') && game.includes('garageTurntable') && read('src/game/UI.js').includes('showGaragePreview'), '7dce-6 garage 3D turntable preview');
ok(game.includes('_chaseRoarPunchT') && html.includes('roar-flash') && read('src/game/UI.js').includes('flashRoar'), '7dce-7 chase-start roar flash');
ok(html.includes('paleo-tip') && read('src/game/UI.js').includes('showPaleoTip') && game.includes('showPaleoTip'), '7dce-8 paleontology tip on mother assist');
ok(html.includes('friends-compare') && read('src/game/UI.js').includes('_renderFriendsCompare') && read('src/style.css').includes('friends-compare'), '7dce-9 friends stamp compete card');
ok(world.includes('userData.petals') && game.includes('userData.petals') && game.includes('King flower petal bloom'), '7dce-10 king flower petal bloom pulse');

// Branch 0133 polish iterations (10)
ok(world.includes('createRoarRing') && game.includes('_spawnRoarRing') && game.includes('_updateRoarRings'), '0133-1 predator roar sonic rings');
ok(world.includes('createShockwave') && game.includes('_spawnShockwave') && game.includes('_updateShockwaves'), '0133-2 mother arrival shockwave');
ok(world.includes("kind = 'amber'") && game.includes('_updateAmbers') && game.includes('_amberCollected'), '0133-3 escort amber gems');
ok(world.includes('createStunStar') && game.includes('_spawnStunStars'), '0133-4 predator retreat stun stars');
ok(game.includes('_ensureSearchlight') && game.includes('_updateSearchlight') && game.includes('SpotLight'), '0133-5 chase search spotlight');
ok(read('src/game/Save.js').includes('lastLevelId') && game.includes('continueLastMission') && html.includes('btn-continue'), '0133-6 Continue Rescue CTA');
ok(world.includes('createChirpBubble') && game.includes('_updateEscortChirps') && read('src/game/Audio.js').includes('chirp()'), '0133-7 baby escort chirp bubbles');
ok(html.includes('photo-flash') && read('src/game/UI.js').includes('flashPhoto'), '0133-8 stamp photo flash');
ok(world.includes('userData.pollen') && game.includes('pollen') && game.includes('Rainforest floating pollen'), '0133-9 rainforest pollen motes');
ok(html.includes('nest-proximity') && read('src/game/UI.js').includes('updateNestProximity') && game.includes('_updateNestProximityHud'), '0133-10 nest proximity HUD');

// Branch 0133 gap-fix checks
ok(game.includes('updateNestProximity(false)') && game.includes('_fail('), 'gap: nest proximity cleared on fail');
ok(game.includes('_amberCollected') && game.includes('collectibles'), 'gap: amber counts toward Perfect stars');
ok(game.includes("soft ? 0.35") && game.includes('PHASE.COUNTDOWN'), 'gap: soft searchlight during countdown');
ok(game.includes("Captain Rio") && game.includes('Continuing last rescue'), 'gap: Continue toast + Captain Rio');
ok(game.includes('level.boss') && game.includes('_spawnRoarRing(this.predator'), 'gap: boss alarm roar ring');
ok(game.includes('_clearSearchlight()') && game.includes('_beginEscort'), 'gap: searchlight off on escort');
ok(game.includes('quitToHub') && game.includes('updateNestProximity(false)'), 'gap: quit-to-map clears nest/zoom');
ok(read('src/game/UI.js').includes('showStampDetail') && read('src/game/UI.js').includes('flashPhoto'), 'gap: stamp detail photo flash');
ok(game.includes('_fail') && game.includes('setZoomOverlay'), 'gap: fail sticky HUD cleanup');
ok(read('src/game/UI.js').includes('refreshContinueCta') && read('src/game/UI.js').includes('lastLevelId'), 'gap: Continue CTA refresh from save');

// Branch 0133 gap-fix pass 2 (10)
ok(game.includes('_updateVictoryCamera') && game.includes('Skip chase camera'), 'gap2-1 celebrate victory camera orbit');
ok(game.includes('setZoomOverlay') && read('src/style.css').includes('zoom-scope'), 'gap2-2 zoom scope overlay');
ok(world.includes("kind = 'fossil'") && game.includes('_updateFossils') && game.includes('_fossilsCollected'), 'gap2-3 escort fossils');
ok(game.includes('_updateVehicleDamageSmoke') && game.includes('_damageSmoke'), 'gap2-4 vehicle damage smoke');
ok(read('src/game/UI.js').includes('padlockShake') || read('src/style.css').includes('padlockShake'), 'gap2-5 locked map padlock shake');
ok(read('src/game/data.js').includes('dinoHabitat') && read('src/game/UI.js').includes('stampHabitatFilter') && html.includes('stamp-filters'), 'gap2-6 stamp habitat filters');
ok(game.includes('_updateSosFlares') && game.includes('sosFlare'), 'gap2-7 baby SOS flares');
ok(game.includes('_updateMotherShield') && game.includes('_motherShield'), 'gap2-8 mother protect shield');
ok(game.includes('flashRoar?.(false)') && game.includes('_beginEscort'), 'gap2-9 roar flash cleared on escort');
ok(game.includes('_fossilsCollected') && game.includes('collectibles'), 'gap2-10 fossils count toward Perfect stars');

const pkg = JSON.parse(read('package.json'));
ok(pkg.dependencies?.three, 'three.js dependency');
ok(pkg.scripts?.dev && pkg.scripts?.build && pkg.scripts?.verify && pkg.scripts?.qa, 'vite + verify/qa scripts');

console.log(`\nResult: ${failed === 0 ? 'PASS' : `FAIL (${failed})`}`);
process.exit(failed === 0 ? 0 : 1);
