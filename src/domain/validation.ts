import Decimal from 'decimal.js';
import { z } from 'zod';

import {
  BACKUP_FORMAT_VERSION,
  ENVELOPE_FORMAT_VERSION,
  MAX_ITEMS,
  MAX_YEAR,
  MIN_YEAR,
  VAULT_SCHEMA_VERSION,
  assetTypes,
  liabilityTypes,
} from './model';

const isoDateTime = z.iso.datetime({ offset: true });
const isoDate = z.iso.date();
const boundedIsoDate = isoDate.refine((value) => {
  const year = Number(value.slice(0, 4));
  return year >= MIN_YEAR && year <= MAX_YEAR;
}, `Date year must be between ${MIN_YEAR} and ${MAX_YEAR}.`);
const uuid = z.uuid();
const moneyPattern = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
const ratePattern = /^(?:0|[1-9]\d?)(?:\.\d{1,4})?$|^100(?:\.0{1,4})?$/;

export const moneyStringSchema = z
  .string()
  .regex(moneyPattern, 'Enter an amount from 0 to 999,999,999,999.99.')
  .refine((value) => new Decimal(value).lte('999999999999.99'), 'Amount is too large.');

export const rateStringSchema = z
  .string()
  .regex(ratePattern, 'Enter an annual rate from 0 to 100.');

export function currencyFractionDigits(currency: string): number {
  return (
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

export function moneyPrecisionError(value: string, currency: string): string | undefined {
  if (!moneyStringSchema.safeParse(value).success) return undefined;
  const digits = currencyFractionDigits(currency);
  return new Decimal(value).decimalPlaces() > digits
    ? `${currency} amounts support at most ${digits} fraction digits.`
    : undefined;
}

export const yearSchema = z
  .number()
  .int()
  .min(MIN_YEAR, `Year must be ${MIN_YEAR} or later.`)
  .max(MAX_YEAR, `Year must be ${MAX_YEAR} or earlier.`);

export const valueObservationSchema = z
  .object({
    date: boundedIsoDate,
    amount: moneyStringSchema,
    updatedAt: isoDateTime,
  })
  .strict();

function hasUniqueDates(values: readonly { date: string }[]): boolean {
  return new Set(values.map(({ date }) => date)).size === values.length;
}

function hasChronologicalDates(values: readonly { date: string }[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1]!.date < value.date);
}

export const assetSchema = z
  .object({
    id: uuid,
    order: z.number().int().nonnegative(),
    classification: z.enum(['current', 'long-term']),
    type: z.enum(assetTypes),
    customType: z.string().trim().min(1).max(100).optional(),
    name: z.string().trim().min(1, 'Name is required.').max(100),
    notes: z.string().max(2000),
    values: z.array(valueObservationSchema).max((MAX_YEAR - MIN_YEAR + 1) * 366),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
  .strict()
  .superRefine((asset, context) => {
    if (asset.type === 'custom' && !asset.customType) {
      context.addIssue({
        code: 'custom',
        path: ['customType'],
        message: 'Custom type is required.',
      });
    }
    if (asset.type !== 'custom' && asset.customType) {
      context.addIssue({
        code: 'custom',
        path: ['customType'],
        message: 'Custom type is only valid for custom assets.',
      });
    }
    if (!hasUniqueDates(asset.values)) {
      context.addIssue({
        code: 'custom',
        path: ['values'],
        message: 'Each asset observation date must be unique.',
      });
    }
    if (!hasChronologicalDates(asset.values)) {
      context.addIssue({
        code: 'custom',
        path: ['values'],
        message: 'Asset observations must be in chronological order.',
      });
    }
  });

export const liabilitySchema = z
  .object({
    id: uuid,
    order: z.number().int().nonnegative(),
    type: z.enum(liabilityTypes),
    customType: z.string().trim().min(1).max(100).optional(),
    name: z.string().trim().min(1, 'Name is required.').max(100),
    principal: moneyStringSchema,
    annualInterestRate: rateStringSchema,
    monthlyPayment: moneyStringSchema,
    startDate: boundedIsoDate.optional(),
    termMonths: z.number().int().min(1).max(1200).optional(),
    notes: z.string().max(2000),
    manualBalances: z.array(valueObservationSchema).max((MAX_YEAR - MIN_YEAR + 1) * 366),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
  .strict()
  .superRefine((liability, context) => {
    if (liability.type === 'custom' && !liability.customType) {
      context.addIssue({
        code: 'custom',
        path: ['customType'],
        message: 'Custom type is required.',
      });
    }
    if (liability.type !== 'custom' && liability.customType) {
      context.addIssue({
        code: 'custom',
        path: ['customType'],
        message: 'Custom type is only valid for custom liabilities.',
      });
    }
    if (!hasUniqueDates(liability.manualBalances)) {
      context.addIssue({
        code: 'custom',
        path: ['manualBalances'],
        message: 'Each manual balance date must be unique.',
      });
    }
    if (!hasChronologicalDates(liability.manualBalances)) {
      context.addIssue({
        code: 'custom',
        path: ['manualBalances'],
        message: 'Manual balances must be in chronological order.',
      });
    }
    if (new Decimal(liability.principal).gt(0) && new Decimal(liability.monthlyPayment).eq(0)) {
      context.addIssue({
        code: 'custom',
        path: ['monthlyPayment'],
        message: 'Monthly payment must be greater than zero while a balance remains.',
      });
    }
  });

export const vaultSettingsSchema = z
  .object({
    baseCurrency: z
      .string()
      .regex(/^[A-Z]{3}$/, 'Choose a valid three-letter currency.')
      .refine((currency) => {
        try {
          new Intl.NumberFormat('en', { style: 'currency', currency }).format(0);
          return true;
        } catch {
          return false;
        }
      }, 'Choose a supported currency.'),
    createdWithSampleData: z.boolean(),
  })
  .strict();

export const vaultSchema = z
  .object({
    schemaVersion: z.literal(VAULT_SCHEMA_VERSION),
    id: uuid,
    revision: z.number().int().positive(),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
    settings: vaultSettingsSchema,
    assets: z.array(assetSchema),
    liabilities: z.array(liabilitySchema),
  })
  .strict()
  .superRefine((vault, context) => {
    const allItems = [...vault.assets, ...vault.liabilities];
    if (allItems.length > MAX_ITEMS) {
      context.addIssue({
        code: 'too_big',
        origin: 'array',
        maximum: MAX_ITEMS,
        inclusive: true,
        path: ['assets'],
        message: `A vault can contain at most ${MAX_ITEMS} items.`,
      });
    }
    if (new Set(allItems.map(({ id }) => id)).size !== allItems.length) {
      context.addIssue({
        code: 'custom',
        path: ['assets'],
        message: 'Every item identifier must be unique.',
      });
    }
    for (const [collectionName, items] of [
      ['assets', vault.assets],
      ['liabilities', vault.liabilities],
    ] as const) {
      const orders = items.map(({ order }) => order).toSorted((left, right) => left - right);
      if (orders.some((order, index) => order !== index)) {
        context.addIssue({
          code: 'custom',
          path: [collectionName],
          message: `${collectionName} must have unique, dense ordering.`,
        });
      }
    }
    const currencyDigits = currencyFractionDigits(vault.settings.baseCurrency);
    const amounts = [
      ...vault.assets.flatMap(({ values }) => values.map(({ amount }) => amount)),
      ...vault.liabilities.flatMap(({ principal, monthlyPayment, manualBalances }) => [
        principal,
        monthlyPayment,
        ...manualBalances.map(({ amount }) => amount),
      ]),
    ];
    if (amounts.some((amount) => new Decimal(amount).decimalPlaces() > currencyDigits)) {
      context.addIssue({
        code: 'custom',
        path: ['settings', 'baseCurrency'],
        message: `${vault.settings.baseCurrency} amounts support at most ${currencyDigits} fraction digits.`,
      });
    }
  });

const base64Url = z.string().regex(/^[A-Za-z0-9_-]+$/);

export const cipherEnvelopeSchema = z
  .object({
    format: z.literal('net-worth-vault'),
    formatVersion: z.literal(ENVELOPE_FORMAT_VERSION),
    vaultSchemaVersion: z.literal(VAULT_SCHEMA_VERSION),
    kdf: z
      .object({
        name: z.literal('PBKDF2'),
        hash: z.literal('SHA-256'),
        iterations: z.number().int().min(600_000).max(2_000_000),
        salt: base64Url.length(22),
      })
      .strict(),
    cipher: z
      .object({
        name: z.literal('AES-GCM'),
        iv: base64Url.length(16),
        tagLength: z.literal(128),
      })
      .strict(),
    ciphertext: base64Url.min(22).max(13_981_014),
  })
  .strict();

export const backupEnvelopeSchema = z
  .object({
    format: z.literal('net-worth-backup'),
    formatVersion: z.literal(BACKUP_FORMAT_VERSION),
    exportedAt: isoDateTime,
    payload: cipherEnvelopeSchema,
  })
  .strict();
