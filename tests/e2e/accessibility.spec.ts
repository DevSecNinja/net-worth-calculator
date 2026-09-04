import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { createVault } from '../helpers/app';

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
  ).toEqual([]);
}

test('onboarding, dashboard, settings, and dialogs have no serious axe violations', async ({
  page,
}) => {
  await page.goto('./');
  await expectNoSeriousViolations(page);
  await createVault(page, true);
  await expectNoSeriousViolations(page);
  await page.getByRole('link', { name: /settings/i }).click();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: /delete vault/i }).click();
  await expect(page.getByRole('dialog', { name: /delete encrypted vault/i })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('supports keyboard error recovery, reduced motion, and 200 percent reflow', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await createVault(page);
  await page.getByRole('link', { name: /^assets$/i }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /add your first asset/i }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /save asset/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Name is required');

  await page.setViewportSize({ width: 640, height: 800 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
});
