import { expect, test } from '@playwright/test';

import { createVault } from '../helpers/app';
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

test('keeps the sample dashboard within a 320px viewport at 200% text zoom', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('./');
  await createVault(page, true);
  await expect(page.locator('.chart-card')).toHaveCount(6);

  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expectNoPageOverflow(page);

  const chartVisual = page.locator('.chart-card__visual').first();
  await expect(chartVisual).toHaveCSS('overflow-x', 'auto');
  const chartScroll = await chartVisual.evaluate((element) => {
    const svg = element.querySelector('svg');
    if (!svg) throw new Error('Expected the chart visual to contain an SVG.');
    svg.style.minWidth = '40rem';
    element.scrollLeft = element.scrollWidth;
    const containerBounds = element.getBoundingClientRect();
    const svgBounds = svg.getBoundingClientRect();
    return {
      clientWidth: element.clientWidth,
      scrollLeft: element.scrollLeft,
      scrollWidth: element.scrollWidth,
      svgRight: svgBounds.right,
      visualRight: containerBounds.right,
    };
  });
  expect(chartScroll.scrollWidth).toBeGreaterThan(chartScroll.clientWidth);
  expect(chartScroll.scrollLeft).toBeGreaterThan(0);
  expect(chartScroll.svgRight).toBeLessThanOrEqual(chartScroll.visualRight + 1);
  await expectNoPageOverflow(page);

  await page.locator('.chart-card summary').first().click();
  const tableScroll = page.locator('.chart-card .table-scroll').first();
  await expect(tableScroll.locator('table')).toBeVisible();
  const tableReachability = await tableScroll.evaluate((element) => {
    const lastCell = element.querySelector('tbody tr:last-child td:last-child');
    if (!lastCell) throw new Error('Expected the chart data table to contain a final cell.');
    element.scrollLeft = element.scrollWidth;
    const containerBounds = element.getBoundingClientRect();
    const cellBounds = lastCell.getBoundingClientRect();
    return {
      cellRight: cellBounds.right,
      scrollLeft: element.scrollLeft,
      visualRight: containerBounds.right,
    };
  });
  expect(tableReachability.scrollLeft).toBeGreaterThan(0);
  expect(tableReachability.cellRight).toBeLessThanOrEqual(tableReachability.visualRight + 1);

  await page.evaluate(() => {
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
