# Vice Bay: Blood & Destiny

![make.fun](https://make.fun/badge/gta6-01.svg)
![Rank](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/rank.svg)
![Reward](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/reward.svg)

An original open-world crime game for the [make.fun](https://make.fun/bounty/gta6-01) gta6-01 bounty — built with Three.js, playable in a desktop browser from static files, no network needed. You play **Rico**, a newcomer who has to run the city — or be run out of it.

## How to play

Open `game/index.html` in a desktop browser (or serve the repo: `node serve.ts`, then http://127.0.0.1:8080/).

- **WASD** — walk / drive · **Shift** — run · **Space** — jump / handbrake
- **E** — enter / exit / steal a car · **Mouse drag** — camera pitch · **Click** — shoot
- **1–5** — fists / pistol / SMG / shotgun / rifle · **R** — reload
- **M** — missions menu · **Esc** — pause

## The game

Vice Bay is a 2 km × 2 km coastal city with 8 districts: Downtown, Ocean Beach, Little Havana, Industrial Port, Rich Hills, Airport, Criminal District and the Highway Ring. Drive or walk anywhere, steal cars, dodge traffic and pedestrians, and outrun the police as your wanted level climbs from 1 to 5 stars.

**Story (10 missions):** Welcome to Vice Bay, A Dangerous Favor, Street Reputation, The Getaway, The Missing Deal, Betrayal, Night Run, The Hidden Truth, Final Assault, and Blood & Destiny — ending in a choice that decides who runs the city.

**Side missions (8):** taxi fares, street racing, vehicle delivery, police escape, hidden packages, territory takeover, time trial, rescue civilians.

**Systems:** HUD with health, money, reputation, wanted stars, speed, compass and a live minimap; shops, garage and upgrades; localStorage save; day/night cycle and rain; fully synthesized WebAudio sound; canvas-painted textures and neon signs.

## Build

`node main.ts` copies `game/` + `screenshots/` to the output directory (`$MAKEFUN_OUTPUT_DIR`, default `/output`) and writes `dossier.json` there. Paths are resolved from the location of `main.ts` itself, so it works from any working directory.
