import { expect, test } from '@playwright/test';

import { PASSPHRASE } from '../helpers/app';
import { startTestServer, type TestServer } from '../helpers/server';

const projectPorts = new Map([
  ['chromium', 4191],
  ['firefox', 4192],
  ['webkit', 4193],
  ['mobile-chromium', 4194],
  ['mobile-webkit', 4195],
]);

test('reloads every route and query from app-only caches during a real origin outage', async ({
  page,
}, workerInfo) => {
  test.setTimeout(120_000);
  const port = projectPorts.get(workerInfo.project.name);
  if (!port) throw new Error(`No outage port configured for ${workerInfo.project.name}.`);
  let server: TestServer | undefined = await startTestServer('dist', port);
  const origin = server.origin;
  const base = `${origin}/net-worth-calculator/`;
  const marker = `OFFLINE-VAULT-${workerInfo.project.name}`;

  try {
    await page.goto(base);
    await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
    await page.getByLabel(/confirm passphrase/i).fill(PASSPHRASE);
    await page.getByRole('button', { name: /create empty vault/i }).click();
    await page.getByRole('link', { name: /^assets$/i }).click();
    await page.getByRole('button', { name: /add your first asset/i }).click();
    await page.getByLabel(/asset name/i).fill(marker);
    await page.getByLabel(/^amount$/i).fill('24680.13');
    await page.getByRole('button', { name: /save asset/i }).click();
    await expect(page.getByRole('heading', { name: marker })).toBeVisible();
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);

    await server.stop();
    server = undefined;

    const launches = [
      { url: `${base}?launch=root#/`, heading: /welcome back/i },
      { url: `${base}?launch=about#/about`, heading: /about this calculator/i },
      { url: `${base}?launch=settings#/settings`, heading: /^settings$/i },
      { url: `${base}?launch=assets#/assets`, heading: /welcome back/i },
      { url: `${base}?launch=liabilities#/liabilities`, heading: /welcome back/i },
      { url: `${base}?launch=backup#/backup`, heading: /encrypted backup/i },
      { url: `${base}?launch=unknown#/not-a-route`, heading: /welcome back/i },
    ];
    for (const launch of launches) {
      await page.goto(launch.url, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: launch.heading })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByRole('link', { name: /net worth calculator home/i })).toBeVisible();
    }

    await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
    await page.getByRole('button', { name: /unlock vault/i }).click();
    await expect(page.getByRole('heading', { name: /net worth dashboard/i })).toBeVisible();
    for (const [linkName, heading] of [
      [/^assets$/i, /^assets$/i],
      [/^liabilities$/i, /^liabilities$/i],
      [/^backup$/i, /encrypted backup/i],
      [/^settings$/i, /^settings$/i],
      [/^about$/i, /about this calculator/i],
    ] as const) {
      await page.getByRole('link', { name: linkName }).click();
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }

    const cacheAudit = await page.evaluate(async () => {
      const entries: { cache: string; url: string; method: string; body: string }[] = [];
      for (const cacheName of await caches.keys()) {
        const cache = await caches.open(cacheName);
        for (const request of await cache.keys()) {
          const response = await cache.match(request);
          entries.push({
            cache: cacheName,
            url: request.url,
            method: request.method,
            body: response ? await response.clone().text() : '',
          });
        }
      }
      return entries;
    });
    expect(cacheAudit.length).toBeGreaterThan(5);
    expect(cacheAudit.every(({ url }) => new URL(url).origin === origin)).toBe(true);
    expect(cacheAudit.every(({ method }) => method === 'GET')).toBe(true);
    expect(
      cacheAudit.every(({ url }) => {
        const path = new URL(url).pathname;
        return (
          path === '/net-worth-calculator/' ||
          /^\/net-worth-calculator\/(?:assets\/|icons\/).+\.(?:css|js|png)$/.test(path) ||
          /^\/net-worth-calculator\/(?:favicon\.svg|index\.html|manifest\.webmanifest|theme-init\.js|workbox-[\w-]+\.js)$/.test(
            path,
          )
        );
      }),
    ).toBe(true);
    expect(JSON.stringify(cacheAudit)).not.toContain(marker);
    expect(JSON.stringify(cacheAudit)).not.toContain('24680.13');
  } finally {
    await server?.stop();
  }
});
