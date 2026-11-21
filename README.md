# Vice Bay: Blood & Destiny

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for the [make.fun "Make GTA 6" bounty](https://make.fun/bounty/gta6-01), built as @gandinaaay. You play **Rico**, a newcomer to Vice Bay — a 2 km × 2 km coastal city with 8 districts, 10 story missions and 8 side missions, a 1–5 star wanted system, traffic, pedestrians, combat, an economy and a garage.

## Play

Open `game/index.html` in a desktop browser (or serve the repo: `node serve.ts`, then http://127.0.0.1:8080/).

- **WASD** move / drive · **Shift** run · **Space** jump / handbrake · **E** enter, exit & steal cars
- **Mouse drag** camera · **Click** shoot · **1–5** weapons · **R** reload · **M** missions · **Esc** pause
- **T** taxi · **G** race · **Y** delivery · **U** escape · **H** packages · **J** territory · **K** time trial · **L** rescue

## The city

Downtown, Ocean Beach, Little Havana, Industrial Port, Rich Hills, Airport, Criminal District and the Highway Ring — each with its own look, plus a pier, neon signs, day/night cycle and rain. Steal cars, outrun the VBPD, earn money and rep, and work through Rico's story from "New in Town" to the final confrontation, "Blood & Destiny".

## Build

`main.ts` (Node 22, no build step) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` via the kit's `buildDossier`. Paths resolve from `main.ts`'s own location, so it runs from any working directory:

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Everything runs offline from static files; Three.js is vendored at `game/vendor/three.min.js`.
