export const VAULT_SCHEMA_VERSION = 2 as const;
export const ENVELOPE_FORMAT_VERSION = 1 as const;
export const BACKUP_FORMAT_VERSION = 2 as const;
export const MIN_YEAR = 1900;
export const MAX_YEAR = 2200;
export const MAX_ITEMS = 500;
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
export const MAX_VAULT_PLAINTEXT_BYTES = 7 * 1024 * 1024;

export const assetTypes = [
  'checking',
  'savings',
  'cash',
  'stocks',
  'bonds',
  'fund',
  'retirement',
  'property',
  'vehicle',
  'business',
  'crypto',
  'valuables',
  'custom',
] as const;

export const liabilityTypes = [
  'mortgage',
  'personal-loan',
  'student-loan',
  'credit-card',
  'vehicle-loan',
  'tax-debt',
  'custom',
] as const;

export type AssetType = (typeof assetTypes)[number];
export type LiabilityType = (typeof liabilityTypes)[number];
export type ThemePreference = 'light' | 'dark' | 'system';
export type MoneyString = string;
export type RateString = string;

export type ValueObservation = {
  date: string;
  amount: MoneyString;
  updatedAt: string;
};

export type Asset = {
  id: string;
  order: number;
  classification: 'current' | 'long-term';
  type: AssetType;
  customType?: string | undefined;
  name: string;
  notes: string;
  values: ValueObservation[];
  createdAt: string;
  updatedAt: string;
};

export type Liability = {
  id: string;
  order: number;
  type: LiabilityType;
  customType?: string | undefined;
  name: string;
  principal: MoneyString;
  annualInterestRate: RateString;
  monthlyPayment: MoneyString;
  startDate?: string | undefined;
  termMonths?: number | undefined;
  notes: string;
  manualBalances: ValueObservation[];
  createdAt: string;
  updatedAt: string;
};

export type VaultSettings = {
  baseCurrency: string;
  createdWithSampleData: boolean;
};

export type Vault = {
  schemaVersion: typeof VAULT_SCHEMA_VERSION;
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  settings: VaultSettings;
  assets: Asset[];
  liabilities: Liability[];
};

export type CipherEnvelopeV1 = {
  format: 'net-worth-vault';
  formatVersion: typeof ENVELOPE_FORMAT_VERSION;
  vaultSchemaVersion: typeof VAULT_SCHEMA_VERSION;
  kdf: {
    name: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string;
  };
  cipher: {
    name: 'AES-GCM';
    iv: string;
    tagLength: 128;
  };
  ciphertext: string;
};

export type BackupEnvelopeV2 = {
  format: 'net-worth-backup';
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  payload: CipherEnvelopeV1;
};

export type ProjectionStatus = 'actual' | 'projected' | 'paid-off' | 'non-amortizing' | 'invalid';

export type LiabilityProjection = {
  date: string;
  year: number;
  amount: MoneyString;
  source: 'actual' | 'projected';
  status: ProjectionStatus;
};

export type DashboardSnapshot = {
  asOfDate: string;
  year: number;
  assets: MoneyString;
  liabilities: MoneyString;
  netWorth: MoneyString;
  yearlyChange?: MoneyString | undefined;
  yearlyChangePercent?: string | undefined;
  cagr?: string | undefined;
  completeness: 'complete' | 'incomplete';
  assetSource: 'actual' | 'carry-forward' | 'mixed' | 'unavailable';
  liabilitySource: 'actual' | 'projected' | 'mixed';
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(): string {
  return crypto.randomUUID();
}
