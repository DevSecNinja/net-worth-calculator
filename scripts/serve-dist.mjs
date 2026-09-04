import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const argumentsMap = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  argumentsMap.set(process.argv[index], process.argv[index + 1]);
}

const root = resolve(argumentsMap.get('--dir') ?? 'dist');
const port = Number(argumentsMap.get('--port') ?? 4173);
const host = '127.0.0.1';
const base = '/net-worth-calculator/';
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
]);

function fileFor(url) {
  const parsed = new URL(url, `http://${host}:${port}`);
  if (!parsed.pathname.startsWith(base)) return undefined;
  const relative = decodeURIComponent(parsed.pathname.slice(base.length)) || 'index.html';
  const candidate = resolve(join(root, relative));
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return undefined;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  if (!extname(relative)) return join(root, 'index.html');
  return undefined;
}

const server = createServer((request, response) => {
  const file = fileFor(request.url ?? '/');
  if (!file || !existsSync(file)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  const extension = extname(file);
  const filename = file.split(/[\\/]/).at(-1);
  const noCache = filename === 'sw.js' || filename === 'index.html' || extension === '.webmanifest';
  response.writeHead(200, {
    'Content-Type': contentTypes.get(extension) ?? 'application/octet-stream',
    'Cache-Control': noCache ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}${base}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
