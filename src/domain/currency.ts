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
  const resolvedLocale = locale === 'system' ? undefined : locale;
  const formatter = new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  const rounded = toDecimal(value).toDecimalPlaces(fractionDigits, Decimal.ROUND_HALF_UP);
  const negative = rounded.isNegative() && !rounded.isZero();
  const [integer = '0', fraction = ''] = rounded.abs().toFixed(fractionDigits).split('.');
  const groupedInteger = new Intl.NumberFormat(resolvedLocale, {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(BigInt(integer));
  const localizedFraction =
    fractionDigits > 0
      ? new Intl.NumberFormat(resolvedLocale, {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
          useGrouping: false,
        })
          .formatToParts(Number(`0.${fraction}`))
          .find(({ type }) => type === 'fraction')?.value
      : undefined;
  const decimalSeparator =
    fractionDigits > 0
      ? new Intl.NumberFormat(resolvedLocale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
          useGrouping: false,
        })
          .formatToParts(1.1)
          .find(({ type }) => type === 'decimal')?.value
      : undefined;
  const exactNumber =
    fractionDigits > 0
      ? `${groupedInteger}${decimalSeparator ?? '.'}${localizedFraction ?? fraction}`
      : groupedInteger;
  let insertedNumber = false;

  return formatter
    .formatToParts(negative ? -1 : 1)
    .map((part) => {
      if (['integer', 'group', 'decimal', 'fraction'].includes(part.type)) {
        if (insertedNumber) return '';
        insertedNumber = true;
        return exactNumber;
      }
      return part.value;
    })
    .join('');
}

export function formatPercent(value: string | Decimal, locale: string = 'system'): string {
  const resolvedLocale = locale === 'system' ? undefined : locale;
  const formatter = new Intl.NumberFormat(resolvedLocale, {
    style: 'percent',
    maximumFractionDigits: 2,
  });
  const rounded = toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const negative = rounded.isNegative() && !rounded.isZero();
  const [integer = '0', fraction = ''] = rounded
    .abs()
    .toFixed(2)
    .replace(/(?:\.0+|(\.\d+?)0+)$/, '$1')
    .split('.');
  const groupedInteger = new Intl.NumberFormat(resolvedLocale, {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(BigInt(integer));
  const decimalSeparator =
    fraction.length > 0
      ? new Intl.NumberFormat(resolvedLocale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
          useGrouping: false,
        })
          .formatToParts(1.1)
          .find(({ type }) => type === 'decimal')?.value
      : undefined;
  const exactNumber =
    fraction.length > 0 ? `${groupedInteger}${decimalSeparator ?? '.'}${fraction}` : groupedInteger;
  let insertedNumber = false;

  return formatter
    .formatToParts(negative ? -1 : 1)
    .map((part) => {
      if (['integer', 'group', 'decimal', 'fraction'].includes(part.type)) {
        if (insertedNumber) return '';
        insertedNumber = true;
        return exactNumber;
      }
      return part.value;
    })
    .join('');
}
