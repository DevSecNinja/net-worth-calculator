import { expect, type Page } from '@playwright/test';

export const PASSPHRASE = 'correct horse battery staple';

export async function createVault(page: Page, sample = false): Promise<void> {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /create your encrypted vault/i })).toBeVisible();
  await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
  await page.getByLabel(/confirm passphrase/i).fill(PASSPHRASE);
  const updateConfirmation = page.getByRole('dialog', { name: /unsaved edits/i });
  if (await updateConfirmation.isVisible()) {
    await updateConfirmation.getByRole('button', { name: /keep editing/i }).click();
  }
  await page
    .getByRole('button', { name: sample ? /create with sample data/i : /create empty vault/i })
    .click();
  await expect(
    page.getByRole('heading', {
      name: sample ? /net worth dashboard/i : /build your first net worth snapshot/i,
    }),
  ).toBeVisible();
}

export async function addAsset(
  page: Page,
  name: string,
  amount: string,
  year = new Date().getFullYear(),
): Promise<void> {
  await page.getByRole('link', { name: /^assets$/i }).click();
  const add = page.getByRole('button', { name: /^add (your first )?asset$/i }).first();
  await add.click();
  await page.getByLabel(/asset name/i).fill(name);
  await page.getByLabel(/^year$/i).fill(String(year));
  await page.getByLabel(/^amount$/i).fill(amount);
  await page.getByRole('button', { name: /save asset/i }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}
