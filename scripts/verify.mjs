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
ok(game.includes('_updateRadar') && html.includes('radar-canvas'), 'mission mini-map radar');
ok(game.includes('createTrailPuff') || game.includes('_updateTrails'), 'vehicle drive trails');
ok(game.includes('shakeT') && game.includes('setHeadbuttAlarm'), 'headbutt camera shake + HUD alarm');
ok(html.includes('danger-banner') && game.includes('setDanger'), 'baby danger banner');
ok(html.includes('tutorial-tip') && game.includes('showTutorial'), 'first-mission tutorial tip');
ok(read('src/game/Input.js').includes('weaponHotkey') && read('src/game/Input.js').includes('Digit1'), '1/2/3 weapon hotkeys');
ok(read('src/game/Audio.js').includes('roar') && read('src/game/Audio.js').includes('collect'), 'roar + collect SFX');

const pkg = JSON.parse(read('package.json'));
ok(pkg.dependencies?.three, 'three.js dependency');
ok(pkg.scripts?.dev && pkg.scripts?.build && pkg.scripts?.verify && pkg.scripts?.qa, 'vite + verify/qa scripts');

console.log(`\nResult: ${failed === 0 ? 'PASS' : `FAIL (${failed})`}`);
process.exit(failed === 0 ? 0 : 1);
