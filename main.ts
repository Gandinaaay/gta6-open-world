// Vice Bay: Blood & Destiny — make.fun entrypoint (gta6-01).
//
// Copies game/ and screenshots/ from this repository into the output directory
// and writes /output/dossier.json. Every path is resolved from this file's own
// location (import.meta.url), never from the working directory: the grader runs
// `node /bot/main.ts` from another directory, with no network, in 10 seconds.

import { fileURLToPath } from 'node:url';
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

// fileURLToPath(new URL('.', import.meta.url)) already IS this file's directory
// (with a trailing slash). Do NOT wrap it in dirname: dirname strips the last
// segment, so it would point at the parent directory instead.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(out, { recursive: true });
const gameDir = join(here, 'game');
if (!existsSync(gameDir)) {
  throw new Error(`game/ is missing next to main.ts (looked in ${gameDir})`);
}
cpSync(gameDir, join(out, 'game'), { recursive: true });
const shotsDir = join(here, 'screenshots');
if (existsSync(shotsDir)) {
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
}

const dossier = String(buildDossier(out, caps));
writeFileSync(join(out, 'dossier.json'), dossier);

// The dossier must be byte-identical when rebuilt: the grader runs this entry
// twice and both runs have to agree. buildDossier returns a String object, so
// compare the primitive strings — comparing the objects would always differ.
const dossierAgain = String(buildDossier(out, caps));
if (dossier !== dossierAgain) {
  throw new Error('dossier is not deterministic across builds');
}
console.log(`wrote ${join(out, 'dossier.json')} (${dossier.length} bytes)`);
