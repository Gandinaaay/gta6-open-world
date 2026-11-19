// Vice Bay: Blood & Destiny — make.fun gta6-01 entry (by @gandinaaay).
// Round 3: the entrypoint is re-authored in the recorded session, same
// behaviour — copy game/ + screenshots/ and write dossier.json.
//
// The game lives in this directory's game/ folder: plain static files a
// desktop browser loads offline — game/index.html plus its ES modules, with
// Three.js r149 vendored under game/vendor/ and no network request anywhere.
// This program is the handoff: it copies game/ and screenshots/ from beside
// this file into /output and writes /output/dossier.json, the summary the
// judge reads, using the vendored make.fun library.
//
// The four screenshots are real browser captures of the game itself:
//   1-start  the title at dawn, sunset sun disc low on the horizon
//   2-play   driving the Comet GT through Downtown at midday
//   3-chase  a night police pursuit, 3 wanted stars flashing
//   4-night  the illegal beach race in the rain
//
// Play it locally with `node serve.ts` and open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps come from the scorer's gate (reference/gate.json): text_max_bytes
// shapes the dossier bytes; the others refuse exactly what the scorer would
// refuse — more than 4 screenshots, one over 256 KiB, more than 993 files or
// 48 MiB in game/, or a game/ path over 1000 bytes. game/ counts beside
// /output's own 1000-entry cap, its screenshots/ and dossier.json.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
