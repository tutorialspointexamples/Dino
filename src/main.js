import { Game } from './game/Game.js';
import { LEVELS, VEHICLES } from './game/data.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

window.__DINO_GUARD__ = game;
window.__DINO_GUARD_QA__ = {
  LEVELS,
  VEHICLES,
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
  forceEscort() {
    if (game.predator) game.predator.userData.hp = 0;
    game._beginEscort();
  },
  forceWin() {
    game._win();
  },
  getPhase: () => game.phase,
  getScore: () => game.missionScore,
  getSave: () => game.save,
};

console.info('[Dinosaur Guard 2] Ready — WASD/Arrows drive, Space/FIRE shoot');
