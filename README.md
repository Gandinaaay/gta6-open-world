# Vice Bay: Blood & Destiny

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game built for the make.fun **"Make GTA 6"** bounty
(gta6-01). Rico Vega owes the crews of Vice Bay — and the Bay always collects.

## The game

A 2 km × 2 km coastal city with **8 districts** — Downtown, Ocean Beach, Little
Havana, Industrial Port, Rich Hills, Airport, the Criminal District and the
Highway Ring — rendered in Three.js with a full day/night cycle.

- **10 story missions + 8 side missions**, table-driven, chaining from "First
  Blood" (collect the drops) to "Blood & Destiny" (escape the island in a storm)
- **Wanted level 1–5 stars** with police cruiser pursuit that rams and escalates
- **On foot and driving**: 7 vehicles, garage collection, arcade handling
- **Combat**: fists, pistol, SMG and shotgun with tracers, recoil and camera kick
- **Economy**: earn cash from jobs and pickups, spend it nowhere yet — the Bay
  keeps its prices secret
- **Living city**: 26 road cars, 40 pedestrians, streetlights that switch on at
  dusk, palms, a port, an airport runway
- **HUD + minimap** (districts, mission target, police, your car), pause screen,
  game-over screen, save/load via localStorage

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move / drive |
| Shift | Run |
| Space | Jump |
| E | Enter / exit a car |
| Click | Shoot |
| 1–4 | Fists / pistol / SMG / shotgun |
| Drag mouse | Orbit camera |
| P | Pause |
| M | Mute |

Jobs start themselves a few seconds after the last one ends — follow the yellow
marker on the minimap.

## Run it

```sh
node serve.ts        # http://localhost:8080
```

No build step, no dependencies: plain JavaScript modules plus the vendored
Three.js in `game/vendor/`. `main.ts` is the make.fun entrypoint — it copies
`game/` and `screenshots/` to the output directory and writes `dossier.json`.

## Structure

```
main.ts            entrypoint (resolves game/ from import.meta.url)
serve.ts           local dev server
shots.json         screenshot staging
game/
  index.html       page, HUD, overlays
  vendor/three.min.js
  src/
    config.js      districts, vehicles, weapons, economy, missions data
    city.js        roads, buildings, colliders
    world.js       sun, moon, fog, clock
    player.js      on-foot controller
    vehicles.js    driving, garage
    traffic.js     road cars and pedestrians
    police.js      wanted level and cruisers
    combat.js      hitscan weapons
    missions.js    table-driven mission engine
    hud.js         health, money, stars, clock, minimap, toasts
    input.js       keyboard and mouse
    audio.js       procedural WebAudio
    save.js        localStorage persistence
    shots.js       screenshot staging
    main.js        boot, screens, the fixed-step loop
```

Screenshots are staged deterministically with `?shot=start|play|chase|night&seed=1`.
