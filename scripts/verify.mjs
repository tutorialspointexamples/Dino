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

const pkg = JSON.parse(read('package.json'));
ok(pkg.dependencies?.three, 'three.js dependency');
ok(pkg.scripts?.dev && pkg.scripts?.build && pkg.scripts?.verify && pkg.scripts?.qa, 'vite + verify/qa scripts');

console.log(`\nResult: ${failed === 0 ? 'PASS' : `FAIL (${failed})`}`);
process.exit(failed === 0 ? 0 : 1);
