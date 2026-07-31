# Dinosaur Guard 2 — Rescue Adventure

A browser-based **3D** kids rescue game inspired by [Dinosaur Guard 2](https://play.google.com/store/apps/details?id=com.imayi.dinoguard2), built with **Three.js** + Vite.

> Unity editor projects are not practical inside this cloud environment, so the complete playable game ships as a high-fidelity WebGL/Three.js experience with animated procedural dinosaurs, police cars, submarines, biomes, and the full Guard loop.

## Features

- **10 Jurassic biomes** — Tropical Rainforest, Crystal Cave, Firefly Lights Cave, Danxia Landforms, Vine Swamp, Coral Relics, Lava Volcano, Deep-Sea Swirl, Meteorite Hole, Tropical Ocean Current
- **6 police cars + 4 guard submarines** with progressive unlocks
- **4 named Guard crew** riding along on missions
- **26 animated dinosaur characters** (babies, mothers, predators, marine reptiles, pterosaurs)
- **Rescue missions**: predators chase babies; intercept and fire
- **Weapon modes**: Auto Aim, Zoom, Scatter (hotkeys 1/2/3)
- **Mother dinosaur assist** mid-fight
- **Headbutt risk** if you overshoot the predator (camera shake + HUD alarm)
- **Escort to nest** after the predator retreats (beacon + compass)
- **Collectible dino eggs** during escort for bonus score
- **Mini-map radar** tracking baby, predator, mother, and nest
- **Stamp book / encyclopedia** for rescued species
- **Roadblocks, biome FX** (fireflies, vines, bubbles, volcano ash/lava)
- **Animated jaw chomp / wing / walk cycles** on procedural dinosaurs
- **Touch joystick + FIRE** controls for mobile; keyboard on desktop
- **Offline-friendly** local progress via `localStorage`

## Controls

| Action | Desktop | Touch |
|--------|---------|-------|
| Drive | WASD / Arrow keys | Virtual stick |
| Fire | Space | FIRE button |
| Weapon mode | 1 / 2 / 3 or HUD buttons | HUD buttons |
| Pause | II button | II button |

## Run locally

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

QA unlocks: append `?debug=1` to unlock all levels and vehicles.

## Build & verify

```bash
npm run build
npm run verify
npm run qa
```

### Verification iterations (10)

1. Mini-map radar tracking baby / predator / nest  
2. Drive trails + jaw chomp attack animation  
3. Weapon hotkeys 1/2/3 + roar / collect SFX  
4. First-mission tutorial tip  
5. Escort eggs, headbutt shake/alarm, danger banner, volcano ash  
6. Submarine hull/muzzle face −Z; full 4-crew on subs  
7. Escape/P pause-resume; mother heals baby  
8. Dilophosaurus frill fans + translucent title diorama  
9. Eggs reveal only on escort; drifting sky clouds; HUD cleanup  
10. Reduced-motion support, control-hint polish, browser playtest OK

## Project layout

```
src/
  main.js
  style.css
  game/
    Game.js            # loop, mission phases, combat
    data.js            # levels, dinos, vehicles, crew
    DinosaurFactory.js # animated procedural dinosaurs
    VehicleFactory.js  # police cars / submarines + crew
    WorldBuilder.js    # biome worlds + roadblocks
    Input.js           # keyboard + touch
    UI.js              # hub / garage / stamps / HUD
    Save.js            # local progress
    Audio.js           # procedural SFX
```

## License

Example project for learning and tutorials.
