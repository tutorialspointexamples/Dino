import { Game } from './game/Game.js';
import { CREW, DINOSAURS, LEVELS, VEHICLES } from './game/data.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

window.__DINO_GUARD__ = game;
window.__DINO_GUARD_QA__ = {
  LEVELS,
  VEHICLES,
  CREW,
  DINOSAURS,
  dinosaurCount: () => Object.keys(DINOSAURS).length,
  startLevel(i = 0, vehicleId) {
    const level = LEVELS[i];
    const pick =
      vehicleId ||
      (level.water
        ? VEHICLES.find((x) => x.type === 'submarine' && x.unlocked)?.id ||
          VEHICLES.find((x) => x.type === 'submarine')?.id
        : 'police_scout');
    game.startMission(level, pick);
  },
  /** Skip countdown for automated QA / skip button */
  skipCountdown() {
    game.skipCountdown();
  },
  forceEscort() {
    game.ui.hideCountdown();
    game.ui.setAlarmRing(false);
    if (game.predator) game.predator.userData.hp = 0;
    game._beginEscort();
  },
  forceWin() {
    game._finishWin();
  },
  getPhase: () => game.phase,
  getScore: () => game.missionScore,
  getSave: () => game.save,
  getStars: () => game._lastStars || game._missionStars?.() || 0,
  forceHeadbutt() {
    game.phase = 'headbutt';
    game.phaseT = 0;
    game.ui.setHeadbuttAlarm(true);
    if (game.predator) game.predator.userData.anim.state = 'attack';
  },
};

const splash = document.getElementById('boot-splash');
if (splash) {
  requestAnimationFrame(() => {
    setTimeout(() => splash.classList.add('done'), 700);
  });
}

console.info('[Dinosaur Guard 2] Ready — WASD/Arrows drive, Space/FIRE shoot');
