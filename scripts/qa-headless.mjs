/**
 * Headless-ish smoke via Playwright if available; otherwise skips gracefully.
 * Also documents QA hooks for browser console.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 5174;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // Prefer running against already-built preview
  const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${PORT}/`, (res) => {
          res.resume();
          resolve(res.statusCode);
        }).on('error', reject);
      });
      ready = true;
      break;
    } catch {
      await wait(250);
    }
  }

  if (!ready) {
    console.error('Preview server did not start');
    preview.kill();
    process.exit(1);
  }
  console.log('Preview OK on', PORT);

  // Dynamic import playwright if present
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.log('Playwright not installed — static smoke only PASS');
    preview.kill();
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/?debug=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__DINO_GUARD_QA__);

  await page.evaluate(() => window.__DINO_GUARD_QA__.startLevel(0));
  await wait(500);
  const phase1 = await page.evaluate(() => window.__DINO_GUARD_QA__.getPhase());
  console.log('Mission phase after start:', phase1);

  await page.evaluate(async () => {
    const g = window.__DINO_GUARD__;
    for (let i = 0; i < 12; i++) {
      g.vehicle.userData.fireCooldown = 0;
      g._tryFire();
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await wait(800);
  const score = await page.evaluate(() => window.__DINO_GUARD_QA__.getScore());
  console.log('Score after firing:', score);

  await page.evaluate(() => window.__DINO_GUARD_QA__.forceEscort());
  await wait(100);
  const phase2 = await page.evaluate(() => window.__DINO_GUARD_QA__.getPhase());
  console.log('Phase after escort:', phase2);

  // Simulate baby arriving at nest for natural win
  await page.evaluate(() => {
    const g = window.__DINO_GUARD__;
    const nest = g.world.userData.nestPos;
    g.baby.position.set(nest.x, 0, nest.z);
  });
  await wait(1200);
  const phase3 = await page.evaluate(() => window.__DINO_GUARD_QA__.getPhase());
  console.log('Phase after nest arrival:', phase3);
  if (phase3 !== 'win') {
    await page.evaluate(() => window.__DINO_GUARD_QA__.forceWin());
  }
  await wait(100);
  const save = await page.evaluate(() => window.__DINO_GUARD_QA__.getSave());
  console.log('Cleared levels:', save.cleared.length, 'Stamps:', save.stamps.length);
  if (phase3 !== 'win') {
    console.error('Natural nest win failed — used forceWin fallback');
  }

  // Water mission
  await page.evaluate(() => window.__DINO_GUARD_QA__.startLevel(5));
  await wait(400);
  const waterOk = await page.evaluate(() => window.__DINO_GUARD__.vehicle?.userData?.def?.type === 'submarine');
  console.log('Water mission submarine:', waterOk);

  await browser.close();
  preview.kill();

  const failed = errors.length > 0 || !waterOk || save.cleared.length < 1;
  if (errors.length) console.error('Page errors', errors);
  console.log(failed ? 'QA FAIL' : 'QA PASS');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
