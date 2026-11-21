# Vice Bay: Blood & Destiny

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for the [make.fun](https://make.fun) **Make GTA 6** bounty (gta6-01), built as @gandinaaay. Rico arrives in Vice Bay — a 2 km × 2 km coastal city with 8 districts — and fights his way from street nobody to the throne of the bay.

## Play

Open `game/index.html` in a desktop browser (or serve the repo: `node serve.ts`, then http://127.0.0.1:8080/).

- **On foot:** WASD move, Shift run, Space jump, mouse-drag camera
- **Driving:** WASD, Space handbrake, E enter / exit / steal a car
- **Combat:** click to shoot, keys 1–5 weapons (fists, pistol, SMG, shotgun, rifle), R reload
- **Systems:** wanted level 1–5 with police pursuit, roadblocks and a helicopter; traffic AI and pedestrians; 10 story missions + 8 side missions (M for the mission list); economy and garage (G to buy and spawn cars); radio (Q cycles Vice FM / Bay Jazz); save (autosaves every 30 s, CONTINUE on the title screen)

## Build

`main.ts` (Node 22, plain JavaScript, no build step) copies `game/` and `screenshots/` into the output directory and writes `dossier.json` via the kit's `buildDossier`. Paths resolve from `main.ts`'s own location, so it works from any working directory:

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Tech

Three.js (vendored in `game/vendor/three.min.js`), ES modules, no network at runtime — every script, texture and sound is a file under `game/` or generated at runtime (canvas textures, WebAudio synth).
