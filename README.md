# Vice Bay: Blood &amp; Destiny

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Gandinaaay/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01)

An original 3D open-world crime game built for the [Make GTA 6 bounty on make.fun](https://make.fun/bounty/gta6-01). Nothing in it comes from Rockstar or any commercial game: no GTA names, characters, maps or music — every street, car, character and story beat in Vice Bay is original.

## The story

You come home to the coastal city of **Vice Bay** after years away, and walk straight into a war between street gangs, corrupt cops and Kane, the businessman who owns the city. Build your reputation, earn your money, finish ten linked missions and decide the fate of Vice Bay: spare Kane and give the city a second chance, or take the city for yourself.

## What is in the game

- **An open world in 8 districts** — Downtown towers, Ocean Beach, Little Havana, Industrial Port, Rich Hills villas, the Airport, the Criminal District and the Highway Ring, in a compact ~2 km × 2 km living city with its own beach, sea, pier, runway and container port.
- **On foot** — walk, run, sprint, jump, crouch, with a smooth third-person camera that has a speed-sensitive field of view, mouse orbit, a landing squash and a strafe lean.
- **Vehicles** — sports car, sedan, SUV, motorcycle, taxi, truck and police interceptors. Enter, exit and steal cars; arcade driving with a Space handbrake for sliding turns, damage and body roll, headlights and brake lights, and synthesised engine, tyre and skid sounds (WebAudio, no audio files).
- **Living streets** — traffic that drives the road grid in its own lane, stops at red lights and swerves away from your car; pedestrians who panic and flee when they see a crime and hurry for cover in the rain; traffic density that varies by district.
- **Police and the wanted level** — 1–5 stars, patrol and pursuit cars that steer to intercept you with flashing light bars, arrests when they catch you on foot, and a search-and-lose system to cool the heat off. The wanted stars flash with a two-note sting when the heat rises.
- **Combat** — fists plus pistol, SMG, shotgun and rifle, ammo, health and damage, gangsters with chase-and-shoot AI, muzzle flashes, tracers, hit sparks and knockback; downed gangsters sometimes drop pistol ammo.
- **10 linked story missions** — Welcome to Vice Bay, A Dangerous Favor, Street Reputation, The Getaway, The Missing Deal, Betrayal, Night Run, The Hidden Truth, Final Assault, and Blood &amp; Destiny with an ending choice — plus 8 working side missions: taxi driver, street racing, vehicle delivery, police escape, hidden packages, gang territory, time trial and rescue civilians.
- **HUD and minimap** — health, money, reputation, wanted stars, speed, compass, a live minimap with a pulsing mission marker, police blips and enemy dots, and a mission objective with a live distance readout.
- **Economy and progression** — earn money from missions, buy cars for your garage, buy weapons and ammo at Bay Arms, buy clothes, tune your cars.
- **Menus and save** — a main menu over a slowly drifting view of the living city, New Game / Continue, pause, graphics and sound settings, automatic localStorage saves (including time of day and weather).
- **Visuals** — a day/night cycle, a sunset sun disc at dawn and dusk, rain weather, distance fog, dynamic shadows, neon signs, and a fully procedural city: all textures painted on canvas at boot, zero image or audio files, zero network requests.

## How to play

Serve `game/` with any static server (for example `node serve.ts`, then open http://localhost:8080) and play in desktop Chrome with keyboard and mouse:

- **WASD** move / drive · **Shift** sprint · **Space** jump / handbrake · **C** crouch · **F** enter / steal car · **E** interact &amp; shop · **Left click** shoot · **Q** punch · **1–5** switch weapon · **H** horn · **M** missions · **Esc** pause.

Reproducible screenshots: open `?shot=start|play|chase|night&seed=1` — each stages a real moment of the game and sets `window.__shotReady` when the frame is painted.

## Tech

- Three.js r149 vendored locally as `game/vendor/three.min.js` (no CDN, no network at runtime).
- Plain static files under `game/` — no build step. `main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `dossier.json` via the vendored make.fun library.
- All art, textures and sound are generated in code at runtime.

Made by [@gandinaaay](https://github.com/Gandinaaay) for the Make GTA 6 bounty.
