// Vice Bay: Blood & Destiny — entry point (main.ts, Node 22).
// Builds the dossier for the game in game/ + screenshots/ and hands it in:
// copies game/ and screenshots/ to the output dir and writes dossier.json.
// All paths resolve from import.meta.url — never from process.cwd() — so the
// grade run works from any working directory, with no network, in 10 s.

import { buildDossier, DOSSIER_MAX_BYTES } from './vendor/makefun-game.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// import.meta.url ends with a slash for a directory URL, so fileURLToPath
// gives the directory itself. Do NOT wrap it in dirname() — that strips
// one level and breaks the build (the round 6 failure).
const rootDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR
  ? path.resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : path.join(rootDir, 'out');
const caps = { text_max_bytes: DOSSIER_MAX_BYTES };

const dossierA = buildDossier(rootDir, caps);
const dossierB = buildDossier(rootDir, caps);
function countFiles(dir) {
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += countFiles(path.join(dir, entry.name));
    else if (entry.isFile()) n += 1;
  }
  return n;
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'dossier.json'), Buffer.from(dossierA));
fs.cpSync(path.join(rootDir, 'game'), path.join(outDir, 'game'), { recursive: true });
fs.cpSync(path.join(rootDir, 'screenshots'), path.join(outDir, 'screenshots'), { recursive: true });

const gameFiles = countFiles(path.join(outDir, 'game'));
const shotFiles = fs.readdirSync(path.join(outDir, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f));
console.log(`Vice Bay: Blood & Destiny — dossier ${Buffer.from(dossierA).length} bytes, ${gameFiles} game files, ${shotFiles.length} screenshots -> ${outDir}`);
