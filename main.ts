// Vice Bay: Blood & Destiny — entrypoint. Copies game/ and screenshots/
// into the output directory and writes /output/dossier.json with the
// kit's buildDossier, exactly as the scorer will compute it.

import { buildDossier } from './vendor/makefun-game.ts';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTree(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) copyFileSync(from, to);
  }
}

function main(): void {
  const gameSrc = join(process.cwd(), 'game');
  const shotsSrc = join(process.cwd(), 'screenshots');
  if (!existsSync(gameSrc) || !statSync(gameSrc).isDirectory()) {
    throw new Error('game/: no such directory — run main.ts from the repository root');
  }
  mkdirSync(outDir, { recursive: true });
  copyTree(gameSrc, join(outDir, 'game'));
  if (existsSync(shotsSrc) && statSync(shotsSrc).isDirectory()) {
    copyTree(shotsSrc, join(outDir, 'screenshots'));
  }
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  const dossierPath = join(outDir, 'dossier.json');
  writeFileSync(dossierPath, dossier);
  console.log(`wrote ${dossierPath} (${dossier.length} bytes)`);
  // Round-trip check: the file on disk must equal a fresh buildDossier call
  // over the same output directory, or the scorer would refuse it.
  const again = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  const onDisk = readFileSync(dossierPath);
  if (!onDisk.equals(Buffer.from(again))) {
    throw new Error('dossier.json on disk differs from a fresh buildDossier run — not deterministic');
  }
  console.log('dossier round-trip verified: identical bytes');
}

main();
