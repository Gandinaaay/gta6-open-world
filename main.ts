// Vice Bay: Blood & Destiny — build entry (Node 22, plain JavaScript).
// Copies game/ + screenshots/ into the output dir and writes dossier.json.
// Paths resolve from THIS file's location (import.meta.url), never process.cwd().
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
const outDir = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.cwd(), process.env.MAKEFUN_OUTPUT_DIR)
  : '/output';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function toText(value) {
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) return Buffer.from(value).toString('utf8');
  return String(value);
}

if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
  throw new Error(`game/: no such directory (resolved from main.ts: ${gameDir})`);
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
const gameFiles = readdirSync(join(outDir, 'game'), { recursive: true }).filter((f) => typeof f === 'string');
console.log(`Vice Bay: copied game/ (${gameFiles.length} entries) and ${shotCount} screenshot(s) to ${outDir}`);

const written = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), written);
console.log(`Vice Bay: wrote ${join(outDir, 'dossier.json')} (${written.length} bytes)`);

// Round-trip check: buildDossier must reproduce its own output exactly.
const roundTrip = buildDossier(outDir, CAPS);
if (toText(written) !== toText(roundTrip)) {
  throw new Error('dossier round-trip mismatch: buildDossier output is not deterministic');
}
console.log('Vice Bay: dossier round-trip OK');
