import { expect, test } from '@playwright/test';

import { PASSPHRASE } from '../helpers/app';
import { startTestServer, type TestServer } from '../helpers/server';
import {
  captureSafeBrowserDiagnostics,
  emulateInstalledStandalone,
  expectNoFatalBoundary,
  expectStandaloneSignals,
  inspectSensitivePersistence,
  waitForServiceWorkerControl,
} from '../helpers/standalone';

const envelopeKeys = [
  'cipher',
  'ciphertext',
  'format',
  'formatVersion',
  'kdf',
  'vaultSchemaVersion',
];

async function openInstalledApp(
  page: Parameters<typeof captureSafeBrowserDiagnostics>[0],
  url = './',
) {
  const diagnostics = captureSafeBrowserDiagnostics(page);
  await page.goto(url);
  await expectStandaloneSignals(page);
  await expect(page.getByRole('heading', { name: /create your encrypted vault/i })).toBeVisible();
  return diagnostics;
}

async function submitVault(
  page: Parameters<typeof captureSafeBrowserDiagnostics>[0],
  sample: boolean,
  passphrase = PASSPHRASE,
) {
  await page.getByLabel(/^passphrase$/i).fill(passphrase);
  await page.getByLabel(/confirm passphrase/i).fill(passphrase);
  await page
    .getByRole('button', { name: sample ? /create with sample data/i : /create empty vault/i })
    .click();
}

test.beforeEach(async ({ context }) => {
  await emulateInstalledStandalone(context);
});

test('blocks creation before passphrase entry when required local storage is restricted', async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value: () => {
          throw new DOMException('Restricted for this context.', 'SecurityError');
        },
      });
    }
  });
  const diagnostics = captureSafeBrowserDiagnostics(page);

  await page.goto('./');
  await expectStandaloneSignals(page);
  await expect(page.getByRole('alert')).toContainText(/local session storage is blocked/i);
  await expect(page.getByLabel(/^passphrase$/i)).toBeDisabled();
  await expect(page.getByLabel(/confirm passphrase/i)).toBeDisabled();
  await expect(page.getByRole('button', { name: /create empty vault/i })).toBeDisabled();
  await expect(page.getByRole('button', { name: /create with sample data/i })).toBeDisabled();
  await expectNoFatalBoundary(page, diagnostics);
});

test('creates an empty vault when no module can be fetched after startup', async ({
  context,
  page,
}) => {
  const passphrase = `STANDALONE-PASSPHRASE-${crypto.randomUUID()}`;
  const diagnostics = await openInstalledApp(page);
  await waitForServiceWorkerControl(page);
  await expect(page.getByRole('heading', { name: /create your encrypted vault/i })).toBeVisible();

  const removedScripts = await page.evaluate(async () => {
    let removed = 0;
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) {
        if (new URL(request.url).pathname.endsWith('.js') && (await cache.delete(request)))
          removed += 1;
      }
    }
    return removed;
  });
  expect(removedScripts).toBeGreaterThan(0);
  await context.setOffline(true);

  await submitVault(page, false, passphrase);
  await expect(
    page.getByRole('heading', { name: /build your first net worth snapshot/i }),
  ).toBeVisible({ timeout: 30_000 });

  const persistence = await inspectSensitivePersistence(page, [passphrase]);
  expect(persistence).toEqual({
    cacheMarkerFound: false,
    envelopeKeys,
    envelopeMarkerFound: false,
    rowCount: 1,
    urlMarkerFound: false,
    webStorageMarkerFound: false,
  });
  await expectNoFatalBoundary(page, diagnostics);
});

test('creates sample data and survives pagehide, reload, unlock, backup, and offline launch', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const passphrase = `STANDALONE-PASSPHRASE-${crypto.randomUUID()}`;
  let server: TestServer | undefined = await startTestServer('dist', 4210);
  const base = `${server.origin}/net-worth-calculator/`;
  const allowedOrigin = server.origin;
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== allowedOrigin) {
      externalRequests.push(request.resourceType());
    }
  });
  const diagnostics = await openInstalledApp(page, base);

  try {
    await submitVault(page, true, passphrase);
    await expect(page.getByRole('heading', { name: /net worth dashboard/i })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('link', { name: /^backup$/i }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /save encrypted backup/i }).click();
    expect((await downloadPromise).suggestedFilename()).toMatch(
      /^net-worth-backup-\d{4}-\d{2}-\d{2}\.nwvault$/,
    );

    await page.getByRole('link', { name: /^dashboard$/i }).click();
    await page.evaluate(() =>
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })),
    );
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await waitForServiceWorkerControl(page);
    await server.stop();
    server = undefined;
    await page.goto(`${base}?launch=standalone-offline#/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await page.getByLabel(/^passphrase$/i).fill(passphrase);
    await page.getByRole('button', { name: /unlock vault/i }).click();
    await expect(page.getByRole('heading', { name: /net worth dashboard/i })).toBeVisible({
      timeout: 30_000,
    });

    const persistence = await inspectSensitivePersistence(page, [passphrase]);
    expect(persistence).toEqual({
      cacheMarkerFound: false,
      envelopeKeys,
      envelopeMarkerFound: false,
      rowCount: 1,
      urlMarkerFound: false,
      webStorageMarkerFound: false,
    });
    expect(externalRequests).toEqual([]);
    await expectNoFatalBoundary(page, diagnostics);
  } finally {
    await server?.stop();
  }
});
