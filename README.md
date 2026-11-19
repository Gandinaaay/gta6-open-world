# Vice Bay: Blood & Destiny

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Explore Vice Bay — a
2 km × 2 km coastal city with 8 districts — on foot and by car, steal vehicles,
outrun the police, and work through 10 linked story missions plus 8 side jobs.
The city remembers every choice.

## Play

Open `game/index.html` in desktop Chrome (the game runs offline from static
files — no build step, no network). Or serve the repo and open
`http://127.0.0.1:8080/game/`:

```
node serve.ts
```

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Run |
| Space | Jump / handbrake (in car) |
| E | Enter / exit / steal car |
| Mouse drag | Camera pitch / yaw |
| Click | Shoot |
| 1–5 | Switch weapon (fists, pistol, SMG, shotgun, rifle) |
| R | Reload |
| M | Mission list |
| Esc | Pause |

## Features

- 8 districts: Downtown, Ocean Beach, Little Havana, Industrial Port, Rich
  Hills, Airport, Criminal District, Highway Ring
- Traffic with red lights and panicking pedestrians, wanted level 1–5 with
  police pursuit and arrests
- Combat: fists plus 4 guns, enemy AI, tracers, knockback, ammo/health drops
- 10 story missions with an ending choice + 8 side missions (taxi, racing,
  delivery, escape, packages, territory, time trial, rescue)
- HUD with health, money, reputation, wanted stars, speed, compass and a
  live minimap with a pulsing objective ring
- Economy (shops, garage, upgrades), localStorage saves, day/night cycle
  and rain weather
- All sound synthesized with WebAudio; all textures painted on canvas at boot

## Tech

Three.js r149 vendored locally (`game/vendor/three.min.js`), ES modules under
`game/src/`, one module per job. `main.ts` (Node 22, stdlib only) copies
`game/` + `screenshots/` to the output directory and writes `dossier.json`.

## License

MIT
