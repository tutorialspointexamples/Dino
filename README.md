# Dinosaur Guard 2 — Rescue Adventure

A browser-based **3D** kids rescue game inspired by [Dinosaur Guard 2](https://play.google.com/store/apps/details?id=com.imayi.dinoguard2), built with **Three.js** + Vite.

> Unity editor projects are not practical inside this cloud environment, so the complete playable game ships as a high-fidelity WebGL/Three.js experience with animated procedural dinosaurs, police cars, submarines, biomes, and the full Guard loop.

## Features

- **10 Jurassic biomes** — Tropical Rainforest, Crystal Cave, Firefly Lights Cave, Danxia Landforms, Vine Swamp, Coral Relics, Lava Volcano, Deep-Sea Swirl, Meteorite Hole, Tropical Ocean Current
- **6 police cars + 4 guard submarines** with progressive unlocks
- **4 named Guard crew** with in-mission callouts + mission-start roster
- **27 animated dinosaur characters** (babies, mothers, predators, marine reptiles, pterosaurs)
- **Alarm countdown** before each rescue (3-2-1-GO) with Skip
- **Rescue missions**: predators chase babies; intercept and fire
- **Weapon modes**: Auto Aim, Zoom, Scatter — auto-cycle + lock reticle + hotkeys 1/2/3
- **Siren boost** (Shift / BOOST) for short speed bursts
- **Mother dinosaur assist** with arrival ground ring
- **Headbutt risk** + near-miss dodge bonus
- **Escort to nest** after the predator retreats (beacon + compass + chevrons + celebration)
- **Collectible dino eggs** during escort for bonus score
- **Mugger crocodiles** in swamp / ocean biomes
- **Designed rescue routes** + roadblocks
- **Mini-map radar** with danger pulse when the baby is threatened
- **Stamp book / encyclopedia** with fanfare unlock animation + detail modal
- **Biome FX** (rain, fireflies, vines, bubbles, caustics, volcano ash/lava, sky clouds)
- **Animated blink / jaw / wing / walk cycles** on procedural dinosaurs
- **Touch joystick + FIRE + BOOST** controls for mobile; keyboard on desktop
- **Offline-friendly** via `localStorage` + web app manifest

## Controls

| Action | Desktop | Touch |
|--------|---------|-------|
| Drive | WASD / Arrow keys | Virtual stick |
| Fire | Space | FIRE button |
| Boost | Shift | BOOST button |
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

### Verification iterations (branch c535)

1. **Predator roar sonic rings** — expanding ground rings on chase-start / boss alarm  
2. **Mother arrival shockwave** — blue shockwave + protect shield when mother assists  
3. **Escort amber gems** — glowing amber collectibles on radar / score / Perfect stars  
4. **Predator retreat stun stars** — floating stars when the predator is driven off  
5. **Chase search spotlight** — soft SpotLight during alarm countdown and chase  
6. **Continue Rescue CTA** — title button resumes `lastLevelId` with Captain Rio callout  
7. **Baby escort chirp bubbles** — chirp SFX + rising bubbles during escort  
8. **Stamp photo flash** — camera flash on result stamp + encyclopedia detail  
9. **Rainforest pollen motes** — drifting golden pollen in the Tropical Rainforest  
10. **Nest proximity HUD** — meter + distance while escorting the baby home  

Gap-fix pass (10): title siren pulse, scatter golden trails, Perfect Rescue toast, sky flybys, tire skids, ocean plankton, mud geysers, Continue CTA after quit, ambient herds, skid fade — plus fossils, victory camera, zoom scope, damage smoke, padlock shake, habitat filters, SOS flares, and sticky HUD cleanup.

Prior branches (7dce / ed9a+) also cover coral sway, whirlpool, Danxia terraces, garage turntable, roar flash, paleo tip, friends compete, king flowers, and more (see `npm run verify`).

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
