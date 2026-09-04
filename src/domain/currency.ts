import Decimal from 'decimal.js';

import { moneyStringSchema } from './validation';

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 30,
});

export function toDecimal(value: string | number | Decimal): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function canonicalMoney(value: string | number | Decimal, decimalPlaces = 4): string {
  const rounded = toDecimal(value).toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
  if (rounded.isNegative()) throw new Error('Money amount cannot be negative.');
  return rounded.toFixed(decimalPlaces).replace(/(?:\.0+|(\.\d+?)0+)$/, '$1');
}

export function canonicalSignedMoney(value: string | number | Decimal, decimalPlaces = 4): string {
  return toDecimal(value)
    .toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP)
    .toFixed(decimalPlaces)
    .replace(/(?:\.0+|(\.\d+?)0+)$/, '$1');
}

export function parseUserMoney(value: string): string {
  const normalized = value.trim().replaceAll(',', '');
  const parsed = moneyStringSchema.safeParse(normalized);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid amount.');
  return canonicalMoney(parsed.data);
}

export function formatMoney(
  value: string | Decimal,
  currency: string,
  locale: string = 'system',
): string {
  const formatter = new Intl.NumberFormat(locale === 'system' ? undefined : locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  });
  return formatter.format(toDecimal(value).toNumber());
}

export function formatPercent(value: string | Decimal, locale: string = 'system'): string {
  return new Intl.NumberFormat(locale === 'system' ? undefined : locale, {
    style: 'percent',
    maximumFractionDigits: 2,
  }).format(toDecimal(value).div(100).toNumber());
}
