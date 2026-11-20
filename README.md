# Vice Bay: Blood & Destiny

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Explore Vice Bay — a 2 km × 2 km coastal city with 8 districts — on foot or behind the wheel, steal cars, outrun the VCPD, and fight your way through 10 story missions to take the throne of the city.

Nothing here comes from Rockstar's GTA or any commercial game: the city, characters, story and code are all original, built with Three.js (vendored locally) and plain static files. The game runs fully offline in a desktop browser — no network requests at runtime.

## How to play

Open `game/index.html` in a desktop browser (or serve the repo root, e.g. `node serve.ts`, then visit http://127.0.0.1:8080/).

| Key | Action |
| --- | --- |
| WASD | Move / drive |
| Space | Handbrake (in a car) / jump (on foot) |
| E | Enter a car, steal it |
| Mouse drag | Orbit the camera |
| Click / F | Shoot (fists or the equipped gun) |
| Q | Switch weapon |
| R | Reload |
| M | Missions menu (10 story + 8 side) |
| B | Shop, when standing near one |
| Esc | Pause |
| N | Mute |

## Features

- **Open world:** 8 districts — Downtown, Ocean Beach, Little Havana, Industrial Port, Rich Hills, Airport, Criminal District and the Highway Ring — with a full road grid, neon signs, a beach pier, port cranes and an airport runway.
- **Driving:** 7 vehicle types with arcade physics, handbrake drifting, damage smoke, headlights and brake lights.
- **Traffic & pedestrians:** AI cars that follow lanes and stop at red lights; pedestrians who panic in the rain or when shots are fired.
- **Wanted system:** 1–5 stars, police interceptors with flashing light bars, arrests on foot, and losing the cops by distance and time.
- **Combat:** fists plus pistol, SMG, shotgun and rifle, with ammo, reloads, enemy AI that shoots back, tracers and knockback.
- **Story:** 10 linked missions — Welcome to Vice Bay, A Dangerous Favor, Street Reputation, The Getaway, The Missing Deal, Betrayal, Night Run, The Hidden Truth, Final Assault, Blood & Destiny — plus 8 side missions (taxi, racing, deliveries, escapes, hidden packages, territory, time trial, rescues).
- **HUD & minimap:** health, money, reputation, wanted stars, speed, compass and a live minimap with a pulsing objective ring and distance in metres.
- **Economy & save:** shops, garage upgrades, and a localStorage save (money, reputation, story progress, time of day, weather).
- **Atmosphere:** day/night cycle with a low sunset sun disc, rain weather, and all sound synthesized with WebAudio (engine hum, gunshots, sirens, mission stings). All textures are painted on canvas at boot.

## Build

`main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `buildDossier`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Run it twice — the dossier is byte-identical every time.
