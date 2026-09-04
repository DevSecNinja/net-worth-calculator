import { expect, test } from '@playwright/test';

import { PASSPHRASE } from '../helpers/app';
import { startTestServer, type TestServer } from '../helpers/server';

test('reloads the app shell, routes, and calculations during a real origin outage', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Real process outage is serialized in Chromium.');
  let server: TestServer | undefined = await startTestServer('dist', 4191);
  const base = `${server.origin}/net-worth-calculator/`;
  try {
    await page.goto(base);
    await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
    await page.getByLabel(/confirm passphrase/i).fill(PASSPHRASE);
    await page.getByRole('button', { name: /create with sample data/i }).click();
    await expect(page.getByRole('heading', { name: /net worth dashboard/i })).toBeVisible();
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
    await page.getByRole('button', { name: /unlock vault/i }).click();
    await expect(page.getByRole('heading', { name: /net worth dashboard/i })).toBeVisible();

    await server.stop();
    server = undefined;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
    await page.getByRole('button', { name: /unlock vault/i }).click();
    await expect(page.getByRole('heading', { name: /net worth dashboard/i })).toBeVisible();

    await page.goto(`${base}?offline-resume=1#/about`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /about this calculator/i })).toBeVisible();
    const cacheAudit = await page.evaluate(async () => {
      const entries: string[] = [];
      for (const cacheName of await caches.keys()) {
        const cache = await caches.open(cacheName);
        entries.push(...(await cache.keys()).map((request) => request.url));
      }
      return entries;
    });
    expect(cacheAudit.length).toBeGreaterThan(0);
    expect(
      cacheAudit.every((url) => url.startsWith(server?.origin ?? 'http://127.0.0.1:4191')),
    ).toBe(true);
    expect(JSON.stringify(cacheAudit)).not.toContain('Sample emergency fund');
  } finally {
    await server?.stop();
  }
});
