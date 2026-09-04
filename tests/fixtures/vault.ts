import type { Asset, Liability, Vault } from '@/domain/model';
import { createEmptyVault } from '@/domain/fixtures';

const timestamp = '2026-01-01T00:00:00.000Z';

export function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: crypto.randomUUID(),
    order: 0,
    classification: 'current',
    type: 'savings',
    name: 'Savings',
    notes: '',
    values: [{ year: 2026, amount: '1000', updatedAt: timestamp }],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

export function liability(overrides: Partial<Liability> = {}): Liability {
  return {
    id: crypto.randomUUID(),
    order: 0,
    type: 'mortgage',
    name: 'Mortgage',
    principal: '1200',
    annualInterestRate: '0',
    monthlyPayment: '100',
    startDate: '2026-01-01',
    notes: '',
    manualBalances: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

export function vault(overrides: Partial<Vault> = {}): Vault {
  return {
    ...createEmptyVault('USD'),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}
