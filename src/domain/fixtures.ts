import type { Asset, Liability, Vault } from './model';
import { VAULT_SCHEMA_VERSION, createId, nowIso } from './model';

export function createEmptyVault(baseCurrency = 'USD'): Vault {
  const timestamp = nowIso();
  return {
    schemaVersion: VAULT_SCHEMA_VERSION,
    id: createId(),
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    settings: {
      baseCurrency,
      createdWithSampleData: false,
    },
    assets: [],
    liabilities: [],
  };
}

export function addSampleData(vault: Vault, currentYear = new Date().getFullYear()): Vault {
  if (vault.assets.length > 0 || vault.liabilities.length > 0) {
    throw new Error('Sample data can only be added to an empty vault.');
  }
  const timestamp = nowIso();
  const asset: Asset = {
    id: createId(),
    order: 0,
    classification: 'current',
    type: 'savings',
    name: 'Sample emergency fund',
    notes: 'Demo data - replace or remove it.',
    values: [
      { date: `${currentYear - 1}-12-31`, amount: '18000', updatedAt: timestamp },
      { date: `${currentYear}-12-31`, amount: '22500', updatedAt: timestamp },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const liability: Liability = {
    id: createId(),
    order: 0,
    type: 'student-loan',
    name: 'Sample student loan',
    principal: '12000',
    annualInterestRate: '4.5',
    monthlyPayment: '250',
    startDate: `${currentYear - 1}-01-01`,
    termMonths: 60,
    notes: 'Demo data - replace or remove it.',
    manualBalances: [{ date: `${currentYear - 1}-12-31`, amount: '9500', updatedAt: timestamp }],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return {
    ...vault,
    updatedAt: timestamp,
    settings: { ...vault.settings, createdWithSampleData: true },
    assets: [asset],
    liabilities: [liability],
  };
}
