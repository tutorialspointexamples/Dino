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
];

console.log('Files');
for (const f of required) ok(fs.existsSync(path.join(root, f)), f);

const data = read('src/game/data.js');
const game = read('src/game/Game.js');
const html = read('index.html');
const dino = read('src/game/DinosaurFactory.js');
const vehicle = read('src/game/VehicleFactory.js');

console.log('\nContent');
ok((data.match(/id: '/g) || []).length >= 10, 'data defines many dinosaur entries');
ok((data.match(/id: '/g) || []).length >= 20, 'rich roster (dinos + vehicles)');
ok(data.includes('LEVELS') && (data.match(/biome:/g) || []).length >= 10, '10 themed levels');
ok(data.includes("type: 'jeep'") && data.includes("type: 'police'") && data.includes("type: 'submarine'"), 'jeep/police/submarine vehicles');

ok(game.includes('PHASE') && game.includes('HEADBUTT') && game.includes('MOTHER') && game.includes('ESCORT'), 'mission phases incl. mother/headbutt/escort');
ok(game.includes("weaponMode") || game.includes('setWeaponMode'), 'weapon modes wired');
ok(game.includes('markCleared'), 'stamp/progress save on win');
ok(dino.includes('updateAnim') && dino.includes('legs'), 'animated dinosaur parts');
ok(vehicle.includes('submarine') && vehicle.includes('police'), 'vehicle types built');
ok(html.includes('Stamp Book') && html.includes('Garage') && html.includes('Jurassic Map'), 'hub UI surfaces');
ok(html.includes('Auto Aim') && html.includes('Zoom') && html.includes('Scatter'), 'weapon mode UI');
ok(html.includes('stick-zone') && html.includes('btn-fire'), 'touch controls');

const pkg = JSON.parse(read('package.json'));
ok(pkg.dependencies?.three, 'three.js dependency');
ok(pkg.scripts?.dev && pkg.scripts?.build, 'vite scripts');

console.log(`\nResult: ${failed === 0 ? 'PASS' : `FAIL (${failed})`}`);
process.exit(failed === 0 ? 0 : 1);
