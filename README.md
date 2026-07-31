# Dinosaur Guard 2 — Rescue Adventure

A browser-based **3D** kids rescue game inspired by [Dinosaur Guard 2](https://play.google.com/store/apps/details?id=com.imayi.dinoguard2), built with **Three.js** + Vite.

> Unity editor projects are not practical inside this cloud environment, so the complete playable game ships as a high-fidelity WebGL/Three.js experience with animated procedural dinosaurs, vehicles, biomes, and the core Guard loop.

## Features

- **10 Jurassic biomes** (rainforest, crystal cave, firefly cave, Danxia, swamp, coral ocean, volcano, deep sea, meteorite crater, tropical current)
- **Drive guard vehicles**: jeeps, police cars, and submarines (progressive unlocks)
- **Rescue missions**: predators chase baby dinosaurs; you intercept and fire
- **Weapon modes**: Auto Aim, Zoom, Scatter
- **Mother dinosaur assist** mid-fight
- **Headbutt risk** if you overshoot the predator
- **Escort to nest** after the predator retreats
- **Stamp book / encyclopedia** for rescued species
- **Touch joystick + FIRE** controls for mobile; keyboard on desktop
- **Offline-friendly** local progress via `localStorage`

## Controls

| Action | Desktop | Touch |
|--------|---------|-------|
| Drive | WASD / Arrow keys | Virtual stick |
| Fire | Space | FIRE button |
| Weapon mode | HUD buttons | HUD buttons |
| Pause | II button | II button |

## Run locally

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Project layout

```
src/
  main.js
  style.css
  game/
    Game.js            # loop, mission phases, combat
    data.js            # levels, dinos, vehicles
    DinosaurFactory.js # animated procedural dinosaurs
    VehicleFactory.js  # jeep / police / submarine meshes
    WorldBuilder.js    # biome worlds
    Input.js           # keyboard + touch
    UI.js              # hub / garage / stamps / HUD
    Save.js            # local progress
```

## License

Example project for learning and tutorials.
