import { expect, test } from '@playwright/test';

import {
  emulateInstalledStandalone,
  expectNoPageOverflow,
  expectStandaloneSignals,
} from '../helpers/standalone';

test.beforeEach(async ({ context }) => {
  await emulateInstalledStandalone(context);
});

test('reflows onboarding for iPhone portrait, landscape, touch, safe areas, and large text', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expectStandaloneSignals(page);
  await expectNoPageOverflow(page);

  const passphrase = page.getByLabel(/^passphrase$/i);
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
  await passphrase.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel(/confirm passphrase/i)).toBeFocused();

  const viewportContract = await page.evaluate(() => ({
    dpr: devicePixelRatio,
    height: innerHeight,
    safeAreaRules: [...document.styleSheets].some((sheet) =>
      [...sheet.cssRules].some((rule) => rule.cssText.includes('safe-area-inset')),
    ),
    screenHeight: screen.height,
    screenWidth: screen.width,
    userAgent: navigator.userAgent,
    viewportFit: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
    width: innerWidth,
  }));
  expect(viewportContract).toMatchObject({
    dpr: 3,
    height: 932,
    safeAreaRules: true,
    screenHeight: 932,
    screenWidth: 430,
    viewportFit: 'width=device-width, initial-scale=1, viewport-fit=cover',
    width: 430,
  });
  expect(viewportContract.userAgent).toContain('iPhone');

  for (const width of [430, 480]) {
    await page.setViewportSize({ width, height: 932 });
    await expectNoPageOverflow(page);
  }
  await page.setViewportSize({ width: 932, height: 430 });
  await expectNoPageOverflow(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
    window.dispatchEvent(new Event('offline'));
  });
  await expect(page.getByText(/^Offline - encrypted local data remains available$/i)).toBeVisible();
  await expectNoPageOverflow(page);

  const statusLayout = await page.evaluate(() => {
    const footer = document.querySelector('.app-footer')?.getBoundingClientRect();
    const connection = document.querySelector('.connection-status')?.getBoundingClientRect();
    const actions = document.querySelector('.pwa-actions')?.getBoundingClientRect();
    return {
      actionsBottom: actions && actions.height > 0 ? actions.bottom : undefined,
      connectionBottom: connection?.bottom,
      footerTop: footer?.top,
    };
  });
  expect(statusLayout.footerTop).toBeDefined();
  expect(statusLayout.connectionBottom).toBeLessThanOrEqual(statusLayout.footerTop!);
  if (statusLayout.actionsBottom !== undefined) {
    expect(statusLayout.actionsBottom).toBeLessThanOrEqual(statusLayout.footerTop!);
  }
});
