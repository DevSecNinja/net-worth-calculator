import { expect, test } from '@playwright/test';

import { addAsset, createVault, PASSPHRASE } from '../helpers/app';

test('creates a vault, manages financial items, and unlocks after reload', async ({ page }) => {
  await createVault(page);
  await addAsset(page, 'Emergency fund', '25000', 2025);

  await page.getByRole('link', { name: /^liabilities$/i }).click();
  await page.getByRole('button', { name: /add your first liability/i }).click();
  await page.getByLabel(/liability name/i).fill('Student loan');
  await page.getByLabel(/current or principal/i).fill('12000');
  await page.getByLabel(/annual interest/i).fill('4.5');
  await page.getByLabel(/monthly payment/i).fill('250');
  await page.getByRole('button', { name: /save liability/i }).click();
  await expect(page.getByRole('heading', { name: 'Student loan' })).toBeVisible();

  await page.getByRole('link', { name: /^dashboard$/i }).click();
  await expect(page.getByRole('heading', { name: /net worth dashboard/i })).toBeVisible();
  await expect(page.getByRole('table', { name: /net worth trend/i })).toContainText('2025');

  await page.getByRole('button', { name: /lock vault/i }).click();
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
  await page.getByRole('button', { name: /unlock vault/i }).click();
  await expect(page.getByRole('heading', { name: /net worth dashboard/i })).toBeVisible();
});

test('changes currency only after no-conversion confirmation', async ({ page }) => {
  await createVault(page);
  await page.getByRole('link', { name: /settings/i }).click();
  await page.getByLabel(/^currency$/i).selectOption('EUR');
  await expect(page.getByRole('button', { name: /apply currency/i })).toBeDisabled();
  await page.getByLabel(/existing numbers will be reinterpreted/i).check();
  await page.getByRole('button', { name: /apply currency/i }).click();
  await expect(page.getByText(/base currency changed to EUR/i)).toBeAttached();
});

test('exports and imports through portable fallback file controls', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
    Object.defineProperty(window, 'showOpenFilePicker', { value: undefined, configurable: true });
  });
  await createVault(page);
  await addAsset(page, 'Portable marker', '4321', 2026);
  await page.getByRole('link', { name: /backup/i }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /save encrypted backup/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^net-worth-backup-\d{4}-\d{2}-\d{2}\.nwvault$/);
  const path = await download.path();
  if (!path) throw new Error('Playwright did not provide the downloaded backup path.');

  await page.getByLabel(/backup passphrase/i).fill(PASSPHRASE);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /choose encrypted backup/i }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(path);
  await expect(page.getByRole('dialog', { name: /replace current vault/i })).toBeVisible();
  await page.getByLabel(/type replace/i).fill('REPLACE');
  await page.getByRole('button', { name: /replace vault/i }).click();
  await expect(page.getByText(/encrypted backup restored/i)).toBeVisible();
});
