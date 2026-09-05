import { expect, test } from '@playwright/test';

import {
  BACKUP_FORMAT_VERSION,
  type Asset,
  type BackupEnvelopeV2,
  type Liability,
  type ValueObservation,
  type Vault,
} from '../../src/domain/model';
import { createEncryptedVault } from '../../src/storage/crypto';
import { PASSPHRASE } from '../helpers/app';

const performanceYear = 2049;
const performanceNow = `${performanceYear}-12-31T12:00:00.000Z`;
const timestamp = performanceNow;

function observations(years: readonly number[], offset: number): ValueObservation[] {
  return years.map((year, index) => ({
    date: `${year}-12-31`,
    amount: String(10_000 + offset * 100 + index),
    updatedAt: timestamp,
  }));
}

function representativeVault(): Vault {
  const years = Array.from({ length: 50 }, (_, index) => performanceYear - 49 + index);
  const assets: Asset[] = Array.from({ length: 50 }, (_, index) => ({
    id: crypto.randomUUID(),
    order: index,
    classification: index % 2 === 0 ? 'current' : 'long-term',
    type: 'savings',
    name: `Performance asset ${index + 1}`,
    notes: '',
    values: observations(years, index),
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  const liabilities: Liability[] = Array.from({ length: 50 }, (_, index) => ({
    id: crypto.randomUUID(),
    order: index,
    type: 'mortgage',
    name: `Performance liability ${index + 1}`,
    principal: String(25_000 + index * 100),
    annualInterestRate: '0',
    monthlyPayment: '100',
    startDate: `${years[0]}-01-01`,
    notes: '',
    manualBalances: observations(years, index),
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    settings: { baseCurrency: 'USD', createdWithSampleData: false },
    assets,
    liabilities,
  };
}

test('unlocks and renders a 100-item, 50-year dashboard within two seconds', async ({ page }) => {
  test.setTimeout(60_000);

  await page.clock.setFixedTime(new Date(performanceNow));
  const { envelope } = await createEncryptedVault(representativeVault(), PASSPHRASE);
  const backup: BackupEnvelopeV2 = {
    format: 'net-worth-backup',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: timestamp,
    payload: envelope,
  };

  await page.addInitScript(() => {
    Object.defineProperty(window, 'showOpenFilePicker', { value: undefined, configurable: true });
  });
  await page.goto('./#/backup');
  await expect(page.getByRole('heading', { name: /restore without unlocking/i })).toBeVisible();
  await page.getByLabel(/backup passphrase/i).fill(PASSPHRASE);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /choose encrypted backup/i }).click();
  await (
    await chooserPromise
  ).setFiles({
    name: 'net-worth-backup-performance.nwvault',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole('button', { name: /^restore vault$/i }).click();
  await expect(page.getByText(/encrypted backup restored/i)).toBeVisible();

  await page.getByRole('link', { name: /^dashboard$/i }).click();
  await expect(page.getByRole('heading', { name: /net worth dashboard/i })).toBeVisible();
  await page.getByRole('button', { name: /lock vault/i }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);

  await page.evaluate(() => performance.mark('dashboard-unlock-start'));
  await page.getByRole('button', { name: /unlock vault/i }).click();
  await expect(page.getByRole('region', { name: `${performanceYear} summary` })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('heading', { name: /net worth trend/i })).toBeVisible();
  const duration = await page.evaluate(() => {
    performance.mark('dashboard-unlock-end');
    return performance.measure('dashboard-unlock', 'dashboard-unlock-start', 'dashboard-unlock-end')
      .duration;
  });

  expect(duration).toBeLessThan(2_000);
});
