// Vice Bay: Blood & Destiny — tiny static server for local development only.
// Serves game/ on http://localhost:8080 (or $PORT). Not part of the entry.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath(new URL('.', import.meta.url)) already IS this file's directory
// (with a trailing slash). Do NOT wrap it in dirname: dirname strips the last
// segment, so it would point at the parent directory instead.
const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'game');
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.css': 'text/css',
};
const port = Number(process.env.PORT || 8080);

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const file = join(root, path === '/' ? 'index.html' : path);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (err) {
    console.error(`serve failed for ${req.url} -> ${file}: ${err.message}`);
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log(`Vice Bay: Blood & Destiny at http://localhost:${port}`);
});
