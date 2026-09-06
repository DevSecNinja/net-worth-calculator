import { expect, test } from '@playwright/test';

import { createVault } from '../helpers/app';
import { expectNoPageOverflow } from '../helpers/standalone';

test('bounds the 4K dashboard and preserves keyboard, chart, and 200% reflow equivalents', async ({
  page,
}) => {
  await createVault(page, true);
  expect(
    await page.evaluate(() => ({
      height: innerHeight,
      screenHeight: screen.height,
      screenWidth: screen.width,
      width: innerWidth,
    })),
  ).toEqual({ height: 2160, screenHeight: 2160, screenWidth: 3840, width: 3840 });
  const pageBox = await page.locator('main.page').boundingBox();
  expect(pageBox).not.toBeNull();
  expect(pageBox!.width).toBeLessThanOrEqual(1181);
  expect(pageBox!.width).toBeGreaterThan(1000);

  const chartWidths = await page
    .locator('.chart-card')
    .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().width));
  expect(chartWidths.length).toBe(6);
  expect(Math.max(...chartWidths)).toBeLessThan(1200);
  await page.locator('.chart-card summary').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.chart-card table').first()).toBeVisible();
  await expectNoPageOverflow(page);

  await page.setViewportSize({ width: 1920, height: 1080 });
  const reflowPageBox = await page.locator('main.page').boundingBox();
  expect(reflowPageBox).not.toBeNull();
  expect(reflowPageBox!.width).toBeLessThanOrEqual(1181);
  await expectNoPageOverflow(page);
});
