import { expect, test } from '@playwright/test';

const deploymentUrl = new URL(process.env.DEPLOYMENT_BASE_URL ?? 'https://invalid.example/');
const origin = deploymentUrl.origin;
const oldBase = '/net-worth-calculator/';

type WebManifest = {
  id?: unknown;
  scope?: unknown;
  start_url?: unknown;
};

function isWebManifest(value: unknown): value is WebManifest {
  return typeof value === 'object' && value !== null;
}

function requestViolations(
  request: { body: string | null; method: string; url: string },
  markers: string[],
): string[] {
  const requestUrl = new URL(request.url);
  const violations: string[] = [];
  if (requestUrl.origin !== origin) violations.push(`external:${request.url}`);
  if (!['GET', 'HEAD'].includes(request.method)) violations.push(`method:${request.method}`);
  if (markers.some((marker) => request.body?.includes(marker) || request.url.includes(marker))) {
    violations.push(`marker:${request.url}`);
  }
  if (requestUrl.pathname.startsWith(oldBase)) violations.push(`old-base:${request.url}`);
  return violations;
}

test('marks sensitive or mutating requests for blocking before network routing', async (_fixtures, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'One request-policy contract check is sufficient.',
  );

  const marker = 'DO-NOT-TRANSMIT';
  expect(
    requestViolations(
      {
        body: marker,
        method: 'POST',
        url: new URL('/privacy-probe', deploymentUrl).href,
      },
      [marker],
    ),
  ).toEqual(['method:POST', `marker:${new URL('/privacy-probe', deploymentUrl).href}`]);
});

test('serves the verified root PWA contract and security headers', async ({
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One HTTP contract check is sufficient.');

  const root = await request.get(deploymentUrl.href);
  expect(root.status()).toBe(200);
  const html = await root.text();
  expect(html).toContain('http-equiv="Content-Security-Policy"');
  expect(html).not.toContain(oldBase);

  const headers = root.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');

  const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].flatMap((match) => {
    const reference = match[1];
    return reference?.startsWith('/') ? [reference] : [];
  });
  expect(references.length).toBeGreaterThan(2);
  for (const reference of references) {
    const response = await request.get(new URL(reference, deploymentUrl).href);
    expect(response.status(), reference).toBe(200);
  }

  const manifestResponse = await request.get(new URL('/manifest.webmanifest', deploymentUrl).href);
  expect(manifestResponse.status()).toBe(200);
  const manifest: unknown = await manifestResponse.json();
  if (!isWebManifest(manifest)) throw new Error('Deployment manifest is not a JSON object.');
  expect({ id: manifest.id, scope: manifest.scope, start_url: manifest.start_url }).toEqual({
    id: '/',
    scope: '/',
    start_url: '/',
  });

  const serviceWorkerResponse = await request.get(new URL('/sw.js', deploymentUrl).href);
  expect(serviceWorkerResponse.status()).toBe(200);
  expect(serviceWorkerResponse.headers()['cache-control']).toContain('no-cache');
  expect(serviceWorkerResponse.headers()['cache-control']).toContain('no-store');
  const serviceWorker = await serviceWorkerResponse.text();
  expect(serviceWorker).toContain('precacheAndRoute');
  expect(serviceWorker).not.toContain(oldBase);

  const deepRoute = await request.get(new URL('/deployment-check#/about', deploymentUrl).href);
  expect(deepRoute.status()).toBe(200);
  expect(await deepRoute.text()).toContain('id="root"');
});

test('keeps financial markers local across deployed browsers', async ({ context, page }) => {
  const markers = {
    amount: '87654321.23',
    name: `CLOUDFLARE-PRIVATE-${crypto.randomUUID()}`,
    passphrase: `CLOUDFLARE-PASSPHRASE-${crypto.randomUUID()}`,
  };
  const requests: string[] = [];
  const violations: string[] = [];

  await context.route('**/*', async (route) => {
    const request = route.request();
    const requestSummary = {
      body: request.postData(),
      method: request.method(),
      url: request.url(),
    };
    requests.push(JSON.stringify({ method: requestSummary.method, url: requestSummary.url }));
    const blockedReasons = requestViolations(requestSummary, Object.values(markers));
    violations.push(...blockedReasons);
    if (blockedReasons.length > 0) {
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });

  await page.goto(deploymentUrl.href);
  await page.getByLabel(/^passphrase$/i).fill(markers.passphrase);
  await page.getByLabel(/confirm passphrase/i).fill(markers.passphrase);
  await page.getByRole('button', { name: /create empty vault/i }).click();
  await page.getByRole('link', { name: /^assets$/i }).click();
  await page.getByRole('button', { name: /add your first asset/i }).click();
  await page.getByLabel(/asset name/i).fill(markers.name);
  await page.getByLabel(/^date$/i).fill('2026-12-31');
  await page.getByLabel(/^amount$/i).fill(markers.amount);
  await page.getByRole('button', { name: /save asset/i }).click();
  await expect(page.getByRole('heading', { name: markers.name })).toBeVisible();

  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await page.goto(new URL('/deployment-check#/about', deploymentUrl).href);
  await expect(page.getByRole('heading', { name: /about this calculator/i })).toBeVisible();

  const persisted = await page.evaluate(async () => {
    const cacheEntries: { body: string; method: string; url: string }[] = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        cacheEntries.push({
          body: response ? await response.clone().text() : '',
          method: request.method,
          url: request.url,
        });
      }
    }

    const indexedDbValues: unknown[] = [];
    for (const { name } of await indexedDB.databases()) {
      if (!name) continue;
      const openRequest = indexedDB.open(name);
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        openRequest.onsuccess = () => resolve(openRequest.result);
        openRequest.onerror = () => reject(openRequest.error);
      });
      for (const storeName of database.objectStoreNames) {
        const transaction = database.transaction(storeName, 'readonly');
        const values = await new Promise<unknown[]>((resolve, reject) => {
          const getAll = transaction.objectStore(storeName).getAll();
          getAll.onsuccess = () => resolve(getAll.result as unknown[]);
          getAll.onerror = () => reject(getAll.error);
        });
        indexedDbValues.push(...values);
      }
      database.close();
    }
    return { cacheEntries, indexedDbValues, localStorage: { ...localStorage } };
  });

  expect(violations).toEqual([]);
  expect(requests.length).toBeGreaterThan(0);
  expect(persisted.indexedDbValues).toHaveLength(1);
  expect(persisted.cacheEntries.length).toBeGreaterThan(5);
  expect(
    persisted.cacheEntries.every(
      ({ method, url }) => method === 'GET' && new URL(url).origin === origin,
    ),
  ).toBe(true);
  expect(await context.cookies()).toEqual([]);
  const publicSurfaces = JSON.stringify({
    cacheEntries: persisted.cacheEntries,
    localStorage: persisted.localStorage,
    requests,
  });
  for (const marker of Object.values(markers)) {
    expect(publicSurfaces).not.toContain(marker);
  }
  expect(JSON.stringify(persisted.indexedDbValues)).not.toContain(markers.name);
  expect(JSON.stringify(persisted.indexedDbValues)).not.toContain(markers.amount);
});

test('reloads a deployed deep route from the service-worker cache while offline', async ({
  context,
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'Chromium provides deterministic offline emulation.',
  );

  await page.goto(new URL('/offline-check#/about', deploymentUrl).href);
  await expect(page.getByRole('heading', { name: /about this calculator/i })).toBeVisible();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole('heading', { name: /about this calculator/i })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
