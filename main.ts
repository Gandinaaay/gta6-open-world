// Vice Bay: Blood & Destiny — build entrypoint (Node 22, stdlib only).
// Copies game/ + screenshots/ to the output directory and writes dossier.json
// via buildDossier from the kit's vendor/makefun-game.ts (unchanged).
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const root = process.cwd();

mkdirSync(outDir, { recursive: true });
rmSync(join(outDir, 'game'), { recursive: true, force: true });
rmSync(join(outDir, 'screenshots'), { recursive: true, force: true });
rmSync(join(outDir, 'dossier.json'), { force: true });

cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
// Verify the dossier round-trips: parse it back and report its shape, so a
// truncated or malformed write fails loudly here instead of at the scorer.
import { readFileSync } from 'node:fs';
const check = JSON.parse(readFileSync(join(outDir, 'dossier.json'), 'utf8'));
console.log(`built ${outDir} (dossier ${dossier.length} bytes, ${check.images.length} images, text ${check.text.length} chars)`);
