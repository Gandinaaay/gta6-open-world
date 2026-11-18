# Vice Bay: Blood & Destiny

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01)

An original 3D open-world crime game built for the [Make GTA 6 bounty on make.fun](https://make.fun/bounty/gta6-01). No Rockstar assets, names, characters, maps or music — every street, car, character and story beat in Vice Bay is original.

## The story

You come home to the coastal city of **Vice Bay** after years away — and walk straight into a war between street gangs, corrupt cops, and Kane, the businessman who owns the city. Build your reputation, earn your money, finish ten linked missions and decide the fate of Vice Bay: spare Kane and give the city a second chance, or take the city for yourself.

## What is in the game

- **Open world, 8 districts** — Downtown towers, Ocean Beach, Little Havana, Industrial Port, Rich Hills villas, the Airport, the Criminal District and the Highway Ring, in a compact ~2 km × 2 km living city.
- **On foot** — walk, run, sprint, jump, crouch, smooth third-person camera.
- **Vehicles** — sports car, sedan, SUV, motorcycle, taxi, truck and police interceptors. Enter, exit and steal cars; arcade driving with damage; synthesised engine and tyre sounds (WebAudio, no audio files).
- **Living streets** — traffic that drives the road grid and stops at red lights, pedestrians who panic and flee when they see a crime, traffic density that varies by district.
- **Police & wanted level** — 1–5 stars, patrol and pursuit cars, arrests when they catch you on foot, and a search-and-lose system to cool the heat off.
- **Combat** — fists plus pistol, SMG, shotgun and rifle, ammo, health and damage, gangsters with chase-and-shoot AI, muzzle flashes and tracers.
- **10 linked story missions** — Welcome to Vice Bay, A Dangerous Favor, Street Reputation, The Getaway, The Missing Deal, Betrayal, Night Run, The Hidden Truth, Final Assault, and Blood & Destiny with an ending choice — plus 8 working side missions (taxi driver, street racing, vehicle delivery, police escape, hidden packages, gang territory, time trial, rescue civilians).
- **HUD & minimap** — health, money, reputation, wanted stars, speed, compass, live minimap with mission markers and police blips.
- **Economy & progression** — earn money from missions, buy cars for your garage, buy weapons and ammo at Bay Arms, buy clothes, tune your cars.
- **Menus & save** — main menu, New Game / Continue, pause, graphics and sound settings, automatic localStorage saves.
- **Visuals** — day/night cycle, dusk and night lighting, rain weather, distance fog, dynamic shadows, and a fully procedural city (all textures painted on canvas at boot — zero image or audio files, zero network requests).

## How to play

Serve `game/` with any static server (for example `node serve.ts`, then open http://localhost:8080) and play in desktop Chrome with keyboard and mouse:

- **WASD** move / drive · **Shift** sprint · **Space** jump · **C** crouch · **F** enter / steal car · **E** interact & shop · **Left click** shoot · **Q** punch · **1–5** switch weapon · **H** horn · **M** missions · **Esc** pause.

Reproducible screenshots: open `?shot=start|play|chase|night&seed=1` — each stages a real moment of the game and sets `window.__shotReady` when the frame is painted.

## Tech

- Three.js r149 vendored locally as `game/vendor/three.min.js` (no CDN, no network at runtime).
- Plain static files under `game/` — no build step. `main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `dossier.json` via the vendored make.fun library.
- All art, textures and sound are generated in code at runtime.

Built by Aspri Nay for [@gandinaaay](https://make.fun/) — entry for gta6-01, deadline 24 November 2026.
