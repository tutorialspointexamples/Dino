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

### Verification iterations (branch 0133)

1. **Predator roar sonic rings** — expanding rings on chase-start ROAR  
2. **Mother arrival shockwave** — blue ground punch when mother assists  
3. **Escort amber gems** — collectible amber (+ radar + Perfect stars)  
4. **Predator retreat stun stars** — floating stars when the hunter flees  
5. **Chase search spotlight** — soft during alarm, bright during chase  
6. **Continue Rescue CTA** — title button resumes `lastLevelId`  
7. **Baby escort chirp bubbles** — chirp SFX + floating bubbles to the nest  
8. **Stamp photo flash** — camera flash on result stamp + encyclopedia detail  
9. **Rainforest pollen motes** — floating golden pollen in forest biomes  
10. **Nest proximity HUD** — distance meter while escorting  

Gap-fix passes cover sticky HUD cleanup, amber/fossil Perfect stars, countdown soft light, Continue toast/callout, boss alarm roar ring, escort light-off, quit-to-map overlays, celebrate victory orbit, zoom scope, damage smoke, padlock shake, stamp habitat filters, baby SOS flares, and mother protect shield.

Prior branches (7dce/ed9a+) also cover garage turntable, roar flash, paleo tips, friends compete, vines/lava/ocean FX, coral sway, whirlpool, and more (see `npm run verify`).

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
