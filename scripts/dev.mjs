import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createServer as createApiServer } from '../api/server.js';
import { createStore } from '../api/store.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 8765);
const API_DOWN = process.env.API_DOWN === '1';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

const store = createStore(process.env.DB_PATH ?? ':memory:');
const apiServer = createApiServer({ store, secret: randomBytes(32).toString('hex'), config: { origin: `http://localhost:${PORT}` } });
const apiHandler = apiServer.listeners('request')[0];

async function serveStatic(request, response) {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const relative = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let path = join(ROOT, relative);
  if (path.startsWith(ROOT) === false) {
    response.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(path)).isDirectory() === true) path = join(path, 'index.html');
    const body = await readFile(path);
    response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
}

http
  .createServer((request, response) => {
    let path;
    try {
      path = new URL(request.url ?? '/', 'http://localhost').pathname;
    } catch {
      response.writeHead(400).end();
      return;
    }
    if (path.startsWith('/api/') === true || path.startsWith('/r/') === true) {
      if (API_DOWN === true) {
        response.writeHead(502).end();
        return;
      }
      apiHandler(request, response);
      return;
    }
    serveStatic(request, response);
  })
  .listen(PORT, () => console.log(`dev server on http://localhost:${PORT}${API_DOWN === true ? ' (API down)' : ''}`));
