import { execFileSync } from 'node:child_process';
import { access, readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { resolveExpectedBasePath } from './build-base.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const base = resolveExpectedBasePath();
const initialBudget = 300 * 1024;
const required = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  '.nojekyll',
  'favicon.svg',
  'theme-init.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

for (const file of required) await access(join(dist, file));

const packageMetadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const expectedCommit = (() => {
  const configured =
    process.env.EXPECTED_COMMIT_SHA ?? process.env.GITHUB_SHA ?? process.env.VITE_COMMIT_SHA;
  if (configured) return configured.toLowerCase();
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' })
      .trim()
      .toLowerCase();
  } catch {
    return 'dev';
  }
})();
const releaseMode = process.env.CI === 'true' || process.env.VITE_RELEASE_BUILD === 'true';
if (releaseMode && expectedCommit === 'dev') {
  throw new Error('Release verification rejects a dev build identity.');
}
if (expectedCommit !== 'dev' && !/^[0-9a-f]{40}$/.test(expectedCommit)) {
  throw new Error('Expected commit identity must be an exact 40-character Git SHA.');
}

const expectedSizes = new Map([
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-192.png', 192],
  ['maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]);

for (const [file, size] of expectedSizes) {
  const imagePath = join(dist, 'icons', file);
  const metadata = await sharp(imagePath).metadata();
  if (metadata.width !== size || metadata.height !== size) {
    throw new Error(`${file} must be exactly ${size}x${size}.`);
  }
  if (file.startsWith('maskable-')) {
    const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    const inset = Math.floor(size * 0.1);
    const background = [...data.subarray(0, info.channels)];
    let safeZoneViolation = false;
    let meaningfulForeground = false;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const offset = (y * size + x) * info.channels;
        const pixel = [...data.subarray(offset, offset + info.channels)];
        const differs = pixel.some((value, channel) => value !== background[channel]);
        const inOuterRing = x < inset || x >= size - inset || y < inset || y >= size - inset;
        if (inOuterRing && differs) safeZoneViolation = true;
        if (!inOuterRing && differs) meaningfulForeground = true;
      }
    }
    if (safeZoneViolation || !meaningfulForeground) {
      throw new Error(`${file} foreground must stay inside a meaningful central safe zone.`);
    }
  }
}

const html = await readFile(join(dist, 'index.html'), 'utf8');
const cspTag = html.match(/<meta[^>]+http-equiv="Content-Security-Policy"[^>]*>/i)?.[0];
const csp = cspTag?.match(/content="([^"]+)"/i)?.[1];
if (!csp) throw new Error('Built HTML is missing the Content-Security-Policy.');
const directives = new Map(
  csp
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, ...values] = entry.split(/\s+/);
      return [name, values];
    }),
);
const requiredDirectives = new Map([
  ['default-src', ["'self'"]],
  ['base-uri', ["'self'"]],
  ['connect-src', ["'self'"]],
  ['font-src', ["'self'"]],
  ['form-action', ["'self'"]],
  ['frame-src', ["'none'"]],
  ['img-src', ["'self'", 'data:', 'blob:']],
  ['manifest-src', ["'self'"]],
  ['object-src', ["'none'"]],
  ['script-src', ["'self'"]],
  ['style-src', ["'self'"]],
  ['worker-src', ["'self'"]],
]);
for (const [name, expectedValues] of requiredDirectives) {
  if (JSON.stringify(directives.get(name)) !== JSON.stringify(expectedValues)) {
    throw new Error(`CSP ${name} must be exactly: ${expectedValues.join(' ')}.`);
  }
}
if (/unsafe-(?:inline|eval)|https?:/i.test(csp)) {
  throw new Error('CSP must not permit unsafe execution or external network origins.');
}
if (!html.includes(`href="${base}manifest.webmanifest"`)) {
  throw new Error(`Built HTML is missing the manifest reference for base ${base}.`);
}

const manifest = JSON.parse(await readFile(join(dist, 'manifest.webmanifest'), 'utf8'));
if (manifest.id !== base || manifest.start_url !== base || manifest.scope !== base) {
  throw new Error('Manifest id, start_url, and scope must use the exact Pages base.');
}
const expectedManifestIcons = [
  ['icons/icon-192.png', '192x192', 'any'],
  ['icons/icon-512.png', '512x512', 'any'],
  ['icons/maskable-192.png', '192x192', 'maskable'],
  ['icons/maskable-512.png', '512x512', 'maskable'],
];
for (const [src, sizes, purpose] of expectedManifestIcons) {
  if (
    !manifest.icons.some(
      (icon) => icon.src === src && icon.sizes === sizes && icon.purpose === purpose,
    )
  ) {
    throw new Error(`Manifest is missing exact icon metadata for ${src}.`);
  }
}

const files = (await readdir(dist, { recursive: true })).map((file) => String(file));
if (files.some((file) => file.endsWith('.map'))) {
  throw new Error('Release output must not contain source maps.');
}
const assetFiles = files.filter((file) => /^assets[\\/].+\.(?:css|js)$/.test(file));
if (
  assetFiles.length === 0 ||
  assetFiles.some((file) => !/-[A-Za-z0-9_-]{8,}\.(?:css|js)$/.test(file))
) {
  throw new Error('Every JavaScript and CSS asset must have a content hash.');
}

const initialFiles = new Set(['index.html', 'theme-init.js']);
const references = [...html.matchAll(/(?:src|href)="([^"]+\.(?:css|js))"/g)].map(
  ([, reference]) => reference,
);
for (const reference of references) {
  if (!reference.startsWith(base)) {
    throw new Error(`Initial asset reference ${reference} is outside expected base ${base}.`);
  }
  initialFiles.add(reference.slice(base.length).replaceAll('\\', '/'));
}
const pending = [...initialFiles].filter((file) => file.endsWith('.js'));
while (pending.length > 0) {
  const file = pending.pop();
  const source = await readFile(join(dist, file), 'utf8');
  for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)["']([^"']+\.js)["']/g)) {
    const dependency = relative(dist, join(dirname(join(dist, file)), match[1])).replaceAll(
      '\\',
      '/',
    );
    if (!initialFiles.has(dependency)) {
      initialFiles.add(dependency);
      pending.push(dependency);
    }
  }
}
const initialCompressedBytes = (
  await Promise.all(
    [...initialFiles].map(async (file) => gzipSync(await readFile(join(dist, file))).byteLength),
  )
).reduce((sum, size) => sum + size, 0);
if (initialCompressedBytes > initialBudget) {
  throw new Error(
    `Compressed initial shell is ${initialCompressedBytes} bytes; limit is ${initialBudget}.`,
  );
}

const serviceWorker = await readFile(join(dist, 'sw.js'), 'utf8');
if (!serviceWorker.includes('precacheAndRoute')) {
  throw new Error('Generated service worker is missing a precache manifest.');
}
for (const file of assetFiles) {
  const normalized = file.replaceAll('\\', '/');
  if (!serviceWorker.includes(normalized)) {
    throw new Error(`Precache manifest is missing hashed asset ${normalized}.`);
  }
}
if (!/revision:"[a-f0-9]{16,}"/.test(serviceWorker)) {
  throw new Error('Precache must revision unhashed app-shell resources.');
}
if (
  /indexedDB|localStorage|sessionStorage|net-worth-backup|\.nwvault|CacheFirst|NetworkFirst|StaleWhileRevalidate/i.test(
    serviceWorker,
  )
) {
  throw new Error('Service worker must not cache or reference vault/data runtime resources.');
}

const builtJavaScript = (
  await Promise.all(
    assetFiles
      .filter((file) => file.endsWith('.js'))
      .map((file) => readFile(join(dist, file), 'utf8')),
  )
).join('\n');
const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
if (!new RegExp(`["'\`]${escapedBase}sw\\.js["'\`]`).test(builtJavaScript)) {
  throw new Error(`Built application does not register the service worker from ${base}sw.js.`);
}
if (!new RegExp(`scope:\\s*["'\`]${escapedBase}["'\`]`).test(builtJavaScript)) {
  throw new Error(`Built application does not register the service worker with scope ${base}.`);
}
if (!builtJavaScript.includes(packageMetadata.version)) {
  throw new Error(`Built application is missing package version ${packageMetadata.version}.`);
}
if (!builtJavaScript.includes(expectedCommit)) {
  throw new Error(`Built application is missing exact commit identity ${expectedCommit}.`);
}
if (releaseMode && /["']dev["']/.test(builtJavaScript)) {
  throw new Error('Release output must not contain the dev build identity.');
}

console.log(
  `Build verified at ${base}: ${assetFiles.length} hashed assets, ${initialCompressedBytes} compressed initial bytes, ${packageMetadata.version}@${expectedCommit}.`,
);
