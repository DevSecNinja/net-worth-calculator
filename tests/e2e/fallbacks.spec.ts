import { expect, test } from '@playwright/test';

import { createVault, PASSPHRASE } from '../helpers/app';

test('keeps installation hidden when unsupported and completes a supported prompt', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: /install app/i })).toHaveCount(0);
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: () => {
        Reflect.set(window, '__installPromptCalled', true);
        return Promise.resolve();
      },
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'test' }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole('button', { name: /install app/i }).click();
  expect(
    await page.evaluate<boolean>(() => Boolean(Reflect.get(window, '__installPromptCalled'))),
  ).toBe(true);
  await expect(page.getByRole('button', { name: /install app/i })).toHaveCount(0);
});

test('uses native file capabilities and reports a cancelled save without mutating the vault', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Reflect.set(window, 'showSaveFilePicker', async () => ({
      createWritable: async () => ({
        write: async (blob: Blob) => {
          Reflect.set(window, '__nativeBackupBytes', blob.size);
        },
        close: async () => undefined,
      }),
    }));
    Reflect.set(window, 'showOpenFilePicker', async () => {
      throw new DOMException('cancelled', 'AbortError');
    });
  });
  await createVault(page);
  await page.getByRole('link', { name: /backup/i }).click();
  await page.getByRole('button', { name: /save encrypted backup/i }).click();
  await expect(page.getByText(/encrypted backup saved/i)).toBeVisible();
  expect(
    await page.evaluate<number>(() => Number(Reflect.get(window, '__nativeBackupBytes'))),
  ).toBeGreaterThan(0);

  await page.getByLabel(/backup passphrase/i).fill(PASSPHRASE);
  await page.getByRole('button', { name: /choose encrypted backup/i }).click();
  await expect(page.getByRole('dialog', { name: /replace current vault/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /^dashboard$/i })).toBeVisible();
});

test('surfaces native save cancellation and keeps the fallback app usable', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.set(window, 'showSaveFilePicker', async () => {
      throw new DOMException('cancelled', 'AbortError');
    });
  });
  await createVault(page);
  await page.getByRole('link', { name: /backup/i }).click();
  await page.getByRole('button', { name: /save encrypted backup/i }).click();
  await expect(page.getByRole('alert')).toContainText(/file operation was cancelled/i);
  await expect(page.getByRole('heading', { name: /encrypted backup/i })).toBeVisible();
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
