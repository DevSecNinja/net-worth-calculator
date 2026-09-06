import { expect, test } from '@playwright/test';

import { createVault } from '../helpers/app';

test('shows exact-date yearly change for sample data and unavailable history honestly', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await createVault(page, true);
  const currentYear = await page.evaluate(() => new Date().getFullYear());
  const yearlyChange = page.locator('article').filter({ hasText: /^Yearly change/ });

  await expect(yearlyChange).not.toContainText('Not defined');
  await expect(yearlyChange).toContainText(/\$-?[\d,]+\.\d{2}/);
  await expect(yearlyChange).toContainText(/-?\d+(?:\.\d+)?%/);

  await page.getByLabel(/as of/i).fill(`${currentYear - 3}-12-31`);
  await expect(yearlyChange).not.toContainText('Not defined');
  await expect(yearlyChange).toContainText(/-?\d+(?:\.\d+)?%/);

  await page.getByLabel(/as of/i).fill(`${currentYear - 4}-12-31`);
  await expect(yearlyChange).toContainText('Not defined');
  await expect(yearlyChange).not.toContainText('%');
});

test('uses July observations for exact and December forecasts without future leakage', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await createVault(page);
  await page.getByRole('link', { name: /^assets$/i }).click();
  await page.getByRole('button', { name: /add your first asset/i }).click();
  await page.getByLabel(/asset name/i).fill('Dated savings');
  await page.getByLabel(/^date$/i).fill('2026-07-15');
  await page.getByLabel(/^amount$/i).fill('1000');
  await page.getByLabel(/^amount$/i).blur();
  await page.getByRole('button', { name: /add observation/i }).click();
  await page
    .getByLabel(/^date$/i)
    .nth(1)
    .fill('2027-01-01');
  await page
    .getByLabel(/^amount$/i)
    .nth(1)
    .fill('9000');
  await page
    .getByLabel(/^amount$/i)
    .nth(1)
    .blur();
  await page.getByRole('button', { name: /save asset/i }).click();

  await page.getByRole('link', { name: /^liabilities$/i }).click();
  await page.getByRole('button', { name: /add your first liability/i }).click();
  await page.getByLabel(/liability name/i).fill('Dated loan');
  await page.getByLabel(/current or principal/i).fill('5000');
  await page.getByLabel(/current or principal/i).blur();
  await page.getByLabel(/annual interest/i).fill('0');
  await page.getByLabel(/monthly payment/i).fill('100');
  await page.getByLabel(/monthly payment/i).blur();
  await page.getByLabel(/start date/i).fill('2026-01-01');
  await page.getByRole('button', { name: /add observation/i }).click();
  await page.getByLabel(/^date$/i).fill('2026-07-15');
  await page.getByLabel(/^amount$/i).fill('1000');
  await page.getByLabel(/^amount$/i).blur();
  await page.getByRole('button', { name: /save liability/i }).click();

  await page.getByRole('link', { name: /^dashboard$/i }).click();
  await page.getByLabel(/as of/i).fill('2026-12-31');
  const summary = page.getByRole('region', { name: /2026 summary/i });
  await expect(summary).toContainText('$1,000.00');
  await expect(summary).toContainText('$400.00');
  await page
    .locator('details')
    .filter({ hasText: /observation sources/i })
    .evaluate((details: HTMLDetailsElement) => {
      details.open = true;
    });
  await expect(page.getByText(/Dated savings: Carried forward/i)).toBeVisible();
  await expect(page.getByText(/9,000/)).toHaveCount(0);

  await page.getByText(/view exact net worth timeline data table/i).click();
  const timeline = page.getByRole('table', { name: /exact net worth timeline/i });
  await expect(timeline.locator('time[datetime="2026-07-15"]')).toBeVisible();
  await expect(timeline.locator('time[datetime="2026-12-31"]')).toBeVisible();
  await expect(timeline).toContainText('Carried forward');
  await expect(timeline).toContainText('Projected');

  await page.getByLabel(/as of/i).fill('');
  await expect(page.getByRole('alert')).toContainText(/complete As of date/i);
  await expect(page.getByRole('heading', { name: /net worth dashboard/i })).toBeVisible();
});
