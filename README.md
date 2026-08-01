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

### Verification iterations (branch 7dce)

1. **Swinging swamp vines** — vine swamp hangers sway with emissive pulse  
2. **Meteorite impact glow + smoke** — crater core glow light + rising smoke pillars  
3. **Lava river ribbons** — flowing emissive lava streams on the volcano floor  
4. **Ocean current ribbons + drift** — tropical current lanes + subtle sub drift  
5. **Forked dual rescue routes** — left/right alternate rescue path designs  
6. **Garage 3D turntable** — spinning vehicle preview in garage / mission pick  
7. **Chase-start roar flash** — screen flash + FOV punch when chase begins  
8. **Paleontology tip** — educational fact toast when mother dinosaur assists  
9. **Friends stamp compete card** — collection race UI + share challenge  
10. **King flower petal bloom** — rainforest petals spin and pulse  

Prior branches (ed9a+) also cover coral sway, whirlpool, Danxia terraces, turret tint, celebrate hop, roadblock feedback, mother flank, look-ahead camera, firefly biolum, limp anim, muzzle flash, and more (see `npm run verify`).

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
