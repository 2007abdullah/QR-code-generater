#!/usr/bin/env node
/**
 * Zero-dependency local server that behaves like the production host rules:
 *   /q/<CODE>      -> real HTTP 302 to /scan/<slug>?src=qr (unknown codes -> /tutorials)
 *   /scan/<slug>   -> serves scan.html
 *   /tutorials ... -> clean URLs
 * Run:  node tools/serve.mjs   then open http://localhost:3000
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 3000;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain', '.xml': 'application/xml' };
const pages = new Set(['tutorials', 'about', 'contact', 'privacy']);

const send = async (res, file, status = 200) => {
  try {
    const body = await readFile(file);
    res.writeHead(status, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Permissions-Policy': 'geolocation=(self)' });
    res.end(body);
  } catch {
    if (status === 404) { res.writeHead(404); res.end('Not found'); } else send(res, path.join(root, '404.html'), 404);
  }
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/';

  const qr = p.match(/^\/q\/([^/]+)$/i);
  if (qr) {
    const { products } = JSON.parse(await readFile(path.join(root, 'products.json'), 'utf8'));
    const hit = products.find((x) => x.qrCode.toLowerCase() === qr[1].toLowerCase());
    res.writeHead(302, { Location: hit ? `/scan/${hit.slug}?src=qr` : '/tutorials?ref=unknown-qr' });
    return res.end();
  }
  if (/^\/scan\/[^/]+$/.test(p)) return send(res, path.join(root, 'scan.html'));
  if (p === '/') return send(res, path.join(root, 'index.html'));
  if (pages.has(p.slice(1))) return send(res, path.join(root, `${p.slice(1)}.html`));

  const file = path.join(root, p);
  if (!file.startsWith(root) || p.startsWith('/tools') || p.startsWith('/.')) return send(res, path.join(root, '404.html'), 404);
  return send(res, file);
}).listen(port, () => console.log(`ScanGuide demo running at http://localhost:${port}`));
