import { Game } from './game/Game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

// Expose for debugging / automated verification
window.__DINO_GUARD__ = game;

console.info('[Dinosaur Guard 2] Ready — WASD/Arrows drive, Space/FIRE shoot');
