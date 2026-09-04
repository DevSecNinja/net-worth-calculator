import { access, readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = `${root}\\dist`;
const required = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  '.nojekyll',
  'favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

for (const file of required) await access(`${dist}\\${file}`);

const expectedSizes = new Map([
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-192.png', 192],
  ['maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]);

for (const [file, size] of expectedSizes) {
  const metadata = await sharp(`${dist}\\icons\\${file}`).metadata();
  if (metadata.width !== size || metadata.height !== size) {
    throw new Error(`${file} must be ${size}x${size}.`);
  }
}

const html = await readFile(`${dist}\\index.html`, 'utf8');
if (!html.includes('Content-Security-Policy')) throw new Error('Built HTML is missing the CSP.');
if (!html.includes('/net-worth-calculator/'))
  throw new Error('Built HTML is missing the Pages base.');

const manifest = JSON.parse(await readFile(`${dist}\\manifest.webmanifest`, 'utf8'));
if (
  manifest.start_url !== '/net-worth-calculator/' ||
  manifest.scope !== '/net-worth-calculator/'
) {
  throw new Error('Manifest start_url and scope must use the Pages base.');
}
if (!manifest.icons.some((icon) => icon.purpose === 'maskable')) {
  throw new Error('Manifest must include maskable icons.');
}

const files = await readdir(dist, { recursive: true });
if (files.some((file) => file.endsWith('.map'))) {
  throw new Error('Release output must not contain source maps.');
}

const assetFiles = files.filter((file) => /^assets[\\/].+\.(?:css|js)$/.test(file));
const totalBytes = (
  await Promise.all(assetFiles.map(async (file) => (await stat(`${dist}\\${file}`)).size))
).reduce((sum, size) => sum + size, 0);
if (totalBytes > 1_600_000) {
  throw new Error(`JavaScript and CSS total ${totalBytes} bytes; limit is 1,600,000.`);
}

const serviceWorker = await readFile(`${dist}\\sw.js`, 'utf8');
if (!serviceWorker.includes('precacheAndRoute')) {
  throw new Error('Generated service worker is missing a precache manifest.');
}
if (/indexedDB|net-worth-backup/.test(serviceWorker)) {
  throw new Error('Service worker must not reference vault storage or exports.');
}

console.log(`Build verified: ${assetFiles.length} hashed assets, ${totalBytes} bytes.`);
