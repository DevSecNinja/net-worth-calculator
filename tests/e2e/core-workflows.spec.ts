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
  await page.getByText(/view net worth trend data table/i).click();
  await expect(page.getByRole('table', { name: /net worth trend/i })).toContainText('2025');

  await page.getByRole('button', { name: /lock vault/i }).click();
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
  await page.getByRole('button', { name: /unlock vault/i }).click();
  await expect(page.getByRole('heading', { name: /net worth dashboard/i })).toBeVisible();
});

test('changes currency only after no-conversion confirmation', async ({ page }) => {
  await createVault(page);
  await page.getByRole('link', { name: /settings/i }).click();
  await page.getByRole('combobox', { name: 'Currency', exact: true }).selectOption('EUR');
  await expect(page.getByRole('button', { name: /apply currency/i })).toBeDisabled();
  await page.getByLabel(/existing numbers will be reinterpreted/i).check();
  await page.getByRole('button', { name: /apply currency/i }).click();
  await expect(page.getByText(/base currency changed to EUR/i)).toBeAttached();
});

test('exports and imports through portable fallback file controls', async ({ browser, page }) => {
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

  const restoredContext = await browser.newContext();
  const restoredPage = await restoredContext.newPage();
  await restoredPage.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
    Object.defineProperty(window, 'showOpenFilePicker', { value: undefined, configurable: true });
  });
  await restoredPage.goto(`${page.url().split('#')[0]}#/backup`);
  await expect(
    restoredPage.getByRole('heading', { name: /restore without unlocking/i }),
  ).toBeVisible();
  await restoredPage.getByLabel(/backup passphrase/i).fill(PASSPHRASE);
  const restoreChooserPromise = restoredPage.waitForEvent('filechooser');
  await restoredPage.getByRole('button', { name: /choose encrypted backup/i }).click();
  await (await restoreChooserPromise).setFiles(path);
  await expect(
    restoredPage.getByRole('dialog', { name: /restore encrypted vault/i }),
  ).toBeVisible();
  await restoredPage.getByRole('button', { name: /^restore vault$/i }).focus();
  await restoredPage.keyboard.press('Enter');
  await expect(restoredPage.getByText(/encrypted backup restored/i)).toBeVisible();
  await restoredPage.getByRole('link', { name: /^assets$/i }).click();
  await expect(restoredPage.getByRole('heading', { name: 'Portable marker' })).toBeVisible();
  await restoredContext.close();

  await page.getByLabel(/backup passphrase/i).fill(PASSPHRASE);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /choose encrypted backup/i }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(path);
  await expect(page.getByRole('dialog', { name: /replace current vault/i })).toBeVisible();
  await page.getByLabel(/type replace/i).fill('REPLACE');
  await page.getByRole('button', { name: /replace vault/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/encrypted backup restored/i)).toBeVisible();
});

test('deletes the encrypted vault only after typed confirmation', async ({ page }) => {
  await createVault(page);
  await page.getByRole('link', { name: /settings/i }).click();
  await page.getByRole('button', { name: /delete vault/i }).click();
  const dialog = page.getByRole('dialog', { name: /delete encrypted vault/i });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/type DELETE/i).fill('wrong');
  await dialog.getByRole('button', { name: /delete vault forever/i }).click();
  await expect(dialog.getByRole('alert')).toContainText(/type DELETE exactly/i);
  await dialog.getByLabel(/type DELETE/i).fill('DELETE');
  await dialog.getByRole('button', { name: /delete vault forever/i }).click();
  await expect(page.getByRole('heading', { name: /create your encrypted vault/i })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /create your encrypted vault/i })).toBeVisible();
});
