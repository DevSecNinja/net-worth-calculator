import { expect, test } from '@playwright/test';

import { addAsset, createVault } from '../helpers/app';
import {
  captureSafeBrowserDiagnostics,
  emulateInstalledStandalone,
  expectNoFatalBoundary,
  expectNoPageOverflow,
  expectStandaloneSignals,
  inspectSensitivePersistence,
} from '../helpers/standalone';

test.beforeEach(async ({ context }) => {
  await emulateInstalledStandalone(context);
});

test('keeps sample, backup, charts, privacy, and touch usable in both iPad orientations', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const marker = `IPAD-PRIVATE-${crypto.randomUUID()}`;
  const diagnostics = captureSafeBrowserDiagnostics(page);
  const externalRequests: string[] = [];
  const allowedOrigin = new URL(String(testInfo.project.use.baseURL)).origin;

  page.on('request', (request) => {
    if (new URL(request.url()).origin !== allowedOrigin) {
      externalRequests.push(request.resourceType());
    }
  });
  await page.goto('./');
  await expectStandaloneSignals(page);
  const profile = await page.evaluate(() => ({
    dpr: devicePixelRatio,
    height: innerHeight,
    screenHeight: screen.height,
    screenWidth: screen.width,
    userAgent: navigator.userAgent,
    width: innerWidth,
  }));
  expect(profile).toMatchObject({
    dpr: 2,
    height: 1366,
    screenHeight: 1366,
    screenWidth: 1024,
    width: 1024,
  });
  expect(profile.userAgent).toContain('iPad');
  await page.evaluate(() => {
    document.addEventListener(
      'touchstart',
      () => {
        document.body.dataset.touchObserved = 'true';
      },
      { once: true },
    );
  });
  await page.touchscreen.tap(20, 300);
  await expect(page.locator('body')).toHaveAttribute('data-touch-observed', 'true');
  await createVault(page, true);
  await addAsset(page, marker, '123456.78', 2026);
  await page.getByRole('link', { name: /^dashboard$/i }).click();
  await expect(page.getByRole('heading', { name: /net worth dashboard/i })).toBeVisible();
  await expect(page.locator('.chart-card')).toHaveCount(6);
  await page.locator('.chart-card summary').first().click();
  await expect(page.locator('.chart-card table').first()).toBeVisible();
  await expectNoPageOverflow(page);

  await page.getByRole('link', { name: /^backup$/i }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /save encrypted backup/i }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.nwvault$/);

  await page.setViewportSize({ width: 1366, height: 1024 });
  await expectNoPageOverflow(page);
  await expect(page.getByRole('heading', { name: /encrypted backup/i })).toBeVisible();

  const persistence = await inspectSensitivePersistence(page, [marker]);
  expect(persistence.cacheMarkerFound).toBe(false);
  expect(persistence.envelopeMarkerFound).toBe(false);
  expect(persistence.urlMarkerFound).toBe(false);
  expect(persistence.webStorageMarkerFound).toBe(false);
  expect(externalRequests).toEqual([]);
  await expectNoFatalBoundary(page, diagnostics);
});
