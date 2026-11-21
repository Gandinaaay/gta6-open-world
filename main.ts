// Vice Bay: Blood & Destiny — entrypoint. Copies game/ and screenshots/ into the
// output directory and writes dossier.json from the kit's buildDossier.
// Paths resolve from this file's own location (import.meta.url), never from
// process.cwd(), so the grader's `node /bot/main.ts` works from any directory.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

if (!existsSync(gameDir)) throw new Error('game/: no such directory');
if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html: no such file');

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
const dossierPath = join(outDir, 'dossier.json');
writeFileSync(dossierPath, dossier);

// Round-trip check: the written dossier must equal a fresh buildDossier call.
// buildDossier returns bytes; both sides are normalised to String primitives
// before the comparison so the check compares strings, not objects.
const writtenText = String(Buffer.from(readFileSync(dossierPath)).toString('utf8'));
const roundTrip = buildDossier(outDir, CAPS);
const roundTripText = String(
  roundTrip instanceof Uint8Array
    ? Buffer.from(roundTrip).toString('utf8')
    : String(roundTrip)
);
if (writtenText !== roundTripText) throw new Error('dossier.json: round-trip mismatch');
console.log(`Vice Bay: wrote ${dossierPath} (${writtenText.length} chars)`);
