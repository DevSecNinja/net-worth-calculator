import { expect, test } from '@playwright/test';

import { PASSPHRASE } from '../helpers/app';

test('negotiates Dutch, persists language, parses localized money, and preserves value', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      value: ['nl-BE', 'en-US'],
    });
  });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl-NL');
  await expect(page.getByRole('heading', { name: /maak je versleutelde kluis/i })).toBeVisible();
  await page.getByLabel(/^wachtzin$/i).fill(PASSPHRASE);
  await page.getByLabel(/bevestig wachtzin/i).fill(PASSPHRASE);
  await page.getByRole('button', { name: /lege kluis maken/i }).click();
  await page.getByRole('link', { name: /^bezittingen$/i }).click();
  await page.getByRole('button', { name: /eerste bezit toevoegen/i }).click();
  await page.getByLabel(/naam bezit/i).fill('Nederlandse spaarrekening');
  await page.getByLabel(/^datum$/i).fill('2026-07-15');
  await page.getByLabel(/^bedrag$/i).fill('1.234,56');
  await page.getByLabel(/^bedrag$/i).blur();
  await expect(page.getByText('USD', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /bezit opslaan/i }).click();
  await expect(page.getByText(/1\.234,56/)).toBeVisible();
  const currentYear = await page.evaluate(() => new Date().getFullYear());
  await page.getByRole('link', { name: /^dashboard$/i }).click();
  await expect(page.getByRole('region', { name: `Overzicht ${currentYear}` })).toBeVisible();

  await page.getByRole('link', { name: /instellingen/i }).click();
  await page.getByRole('combobox', { name: 'Taal', exact: true }).selectOption('en-US');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  expect(await page.evaluate(() => localStorage.getItem('nwc-locale'))).toBe('en-US');
  await page.getByRole('link', { name: /^assets$/i }).click();
  await expect(page.getByText(/1,234\.56/)).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
});

test('negotiates UK English and falls back unsupported languages to US English', async ({
  browser,
}) => {
  const uk = await browser.newContext({ locale: 'en-GB' });
  const ukPage = await uk.newPage();
  await ukPage.goto('./');
  await expect(ukPage.locator('html')).toHaveAttribute('lang', 'en-GB');
  await uk.close();

  const fallback = await browser.newContext({ locale: 'fr-FR' });
  const fallbackPage = await fallback.newPage();
  await fallbackPage.goto('./');
  await expect(fallbackPage.locator('html')).toHaveAttribute('lang', 'en-US');
  await fallback.close();
});
