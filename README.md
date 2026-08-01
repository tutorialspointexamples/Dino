# Dinosaur Guard 2 — Rescue Adventure

A browser-based **3D** kids rescue game inspired by [Dinosaur Guard 2](https://play.google.com/store/apps/details?id=com.imayi.dinoguard2), built with **Three.js** + Vite.

> Unity editor projects are not practical inside this cloud environment, so the complete playable game ships as a high-fidelity WebGL/Three.js experience with animated procedural dinosaurs, police cars, submarines, biomes, and the full Guard loop.

## Features

- **10 Jurassic biomes** — Tropical Rainforest, Crystal Cave, Firefly Lights Cave, Danxia Landforms, Vine Swamp, Coral Relics, Lava Volcano, Deep-Sea Swirl, Meteorite Hole, Tropical Ocean Current
- **6 police cars + 4 guard submarines** with progressive unlocks
- **4 named Guard crew** with in-mission callouts
- **27 animated dinosaur characters** (babies, mothers, predators, marine reptiles, pterosaurs)
- **Alarm countdown** before each rescue (3-2-1-GO)
- **Rescue missions**: predators chase babies; intercept and fire
- **Weapon modes**: Auto Aim, Zoom, Scatter — auto-cycle in combat + hotkeys 1/2/3
- **Mother dinosaur assist** mid-fight
- **Headbutt risk** if you overshoot the predator (camera shake + HUD alarm)
- **Escort to nest** after the predator retreats (beacon + compass + celebration)
- **Collectible dino eggs** during escort for bonus score
- **Mugger crocodiles** in swamp / ocean biomes
- **Designed rescue routes** + roadblocks
- **Mini-map radar** tracking baby, predator, mother, nest, and crocs
- **Stamp book / encyclopedia** with unlock pop animation
- **Biome FX** (fireflies, vines, bubbles, volcano ash/lava, sky clouds)
- **Animated blink / jaw / wing / walk cycles** on procedural dinosaurs
- **Touch joystick + FIRE** controls for mobile; keyboard on desktop
- **Offline-friendly** via `localStorage` + web app manifest

## Controls

| Action | Desktop | Touch |
|--------|---------|-------|
| Drive | WASD / Arrow keys | Virtual stick |
| Fire | Space | FIRE button |
| Weapon mode | 1 / 2 / 3 or HUD buttons | HUD buttons |
| Pause | Esc / P / II button | II button |

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

### Verification iterations (this branch)

1. **Skip countdown** button during the alarm 3-2-1  
2. **Phase objective ribbon** (Chase / Combat / Mother / Escort / Headbutt)  
3. **Predator limp** when HP drops below 35%  
4. **Nest celebration confetti** burst  
5. **Jeep dust kicks** on hard land acceleration  
6. **Baby HP HUD** with critical pulse  
7. **Educational fact briefing** on the vehicle-pick screen  
8. **Escort nest chevrons** on the ground path  
9. **Mobile fire haptics** via `navigator.vibrate`  
10. **Stamp detail modal** encyclopedia cards 

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
    WorldBuilder.js    # biome worlds + routes + crocs
    Input.js           # keyboard + touch
    UI.js              # hub / garage / stamps / HUD
    Save.js            # local progress
    Audio.js           # procedural SFX
```

## License

Example project for learning and tutorials.
