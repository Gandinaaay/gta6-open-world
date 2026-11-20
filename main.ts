// Vice Bay: Blood & Destiny — entrypoint.
//
// Copies game/ + screenshots/ to the output directory and writes
// dossier.json there via buildDossier from ./vendor/makefun-game.ts.
//
// Paths are resolved from THIS file's location (import.meta.url), never
// from process.cwd(): the grader runs `node /bot/main.ts` from another
// working directory, so a cwd-relative game/ would crash with
// "game/: no such directory" (that is exactly how round 6 failed).
//
// Plain JavaScript only — no TypeScript annotations, interfaces or enums —
// so Node 22 runs this file with no flags, no build and no install.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
const outDir = process.env.MAKEFUN_OUTPUT_DIR ? resolve(process.env.MAKEFUN_OUTPUT_DIR) : '/output';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
  throw new Error(`game/: no such directory next to main.ts (${gameDir})`);
}
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html: no such file');
}

mkdirSync(outDir, { recursive: true });
// Clear stale output first, so a re-run never ships files from an older build.
for (const sub of ['game', 'screenshots']) {
  const target = join(outDir, sub);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
} else {
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
}
const shotCount = readdirSync(join(outDir, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f)).length;
console.log(`Vice Bay: copied game/ and ${shotCount} screenshot(s) to ${outDir}`);

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Round-trip: the dossier on disk must equal a fresh buildDossier call.
const roundTrip = buildDossier(outDir, CAPS);
const written = readFileSync(join(outDir, 'dossier.json'));
if (!written.equals(roundTrip)) {
  throw new Error('dossier.json round-trip mismatch: the file on disk differs from a fresh buildDossier call');
}

console.log(`Vice Bay: wrote ${join(outDir, 'dossier.json')} (${written.length} bytes)`);
