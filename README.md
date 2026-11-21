[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01)

# Vice Bay: Blood & Destiny

An original open-world crime game built for the [Make GTA 6](https://make.fun/bounty/gta6-01) bounty on make.fun — in the spirit of GTA 6, with its own city, characters, vehicles, names, story, art and sound. No Rockstar Games name, logo, character, map or asset.

Rico just docked in Vice Bay with $250 and a borrowed jacket. Run missions for Mama Rosa and Don Sal, steal cars, outrun the Vice Bay police, build a garage of fast cars, and take the city — from the first pickup to the finale, **Blood & Destiny**.

## Play it

```sh
node serve.ts
# open http://localhost:8080/game/
```

Or open `game/index.html` directly in a desktop browser. No build step, no network: Three.js is vendored under `game/vendor/`, all art and sound are procedural.

## What is in the game

- **A 2 km × 2 km coastal city** — 8 districts (Downtown, Marina Bay, Old Town, Ironworks, Palm Suburbs, Beachfront, University Hill, Port Delgado), a bay bridge, a beach pier and the 185 m Vice Tower.
- **On foot and by car** — third-person walking and jumping, 6 drivable car models, arcade driving, car stealing (press E), a garage with owned cars.
- **Traffic and pedestrians** — cars looping the road grid, pedestrians on the sidewalks.
- **Wanted system and police** — 1–5 stars driven by a heat meter; interceptors chase, bust and fine Rico; hide to cool off.
- **Missions and a story** — 10 main missions (Fresh Off the Boat → Blood & Destiny) and 8 side jobs (taxi, pizza, stunt jump, vigilante, courier, street race, photo spots, ambulance), with a beacon, a mission menu (M) and cash rewards.
- **Combat** — fists (F) and a pistol (click to shoot), with a hitscan raycast and a muzzle flash.
- **HUD with a minimap** — money, health, wanted stars, clock, district name, objective tracker and a live minimap with the player, police, traffic and the mission marker.
- **A start screen and a save** — progress (money, garage, finished missions) persists in localStorage.
- **Procedural sound** — engine hum, sirens, gunshots and jingles, all synthesised with WebAudio.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Mouse (drag) | Orbit camera |
| Shift | Run |
| Space | Jump |
| E | Enter / exit car |
| F | Punch |
| Click | Shoot |
| H | Horn |
| M | Missions |
| P | Pause |

## Build the dossier

```sh
node main.ts
# writes dossier.json + game/ + screenshots/ to $MAKEFUN_OUTPUT_DIR (default: ./out)
```

## Referral

Built with make.fun — try it yourself: https://make.fun/r/fywkmv2t

## License

MIT — see [LICENSE](LICENSE).
