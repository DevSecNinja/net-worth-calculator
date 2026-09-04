import { expect, test } from '@playwright/test';

import { createVault } from '../helpers/app';

test('does not expose a broken install control without browser support', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: /install app/i })).toHaveCount(0);
});

test('shows install only after a browser install prompt', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'test' }),
    });
    window.dispatchEvent(event);
  });
  await expect(page.getByRole('button', { name: /install app/i })).toBeVisible();
});

test('applies theme without unlocking and honors explicit dark mode', async ({ page }) => {
  await createVault(page);
  await page.getByRole('button', { name: /lock vault/i }).click();
  await page.getByRole('link', { name: /settings/i }).click();
  await page.getByLabel(/theme/i).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
