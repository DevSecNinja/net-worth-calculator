import Decimal from 'decimal.js';

import type { SupportedLocale } from '@/features/locale/catalog';

import { canonicalMoney } from './currency';
import { currencyFractionDigits, moneyStringSchema } from './validation';

const spaces = /[\s\u00a0\u202f]/g;
const normalizedSpaces = /[\s\u00a0\u202f]+/g;

export function parseLocalizedMoney(
  input: string,
  locale: SupportedLocale,
  currency: string,
): string {
  const decimal = locale === 'nl-NL' ? ',' : '.';
  const group = locale === 'nl-NL' ? '.' : ',';
  const trimmed = input.trim();
  if (!trimmed || /[-+eE]/.test(trimmed)) throw new Error('Enter a valid positive amount.');
  const spaced = trimmed.replace(normalizedSpaces, ' ');
  if (spaced.includes(' ')) {
    const [spacedInteger = '', spacedFraction] = spaced.split(decimal);
    if (
      spaced.split(decimal).length > 2 ||
      !/^\d{1,3}(?: \d{3})+$/.test(spacedInteger) ||
      spacedInteger.includes(group) ||
      (spacedFraction !== undefined && !/^\d+$/.test(spacedFraction))
    ) {
      throw new Error('Grouping separators are malformed or ambiguous.');
    }
  }
  const compact = trimmed.replace(spaces, '');
  const parts = compact.split(decimal);
  if (parts.length > 2) throw new Error('Enter a valid decimal amount.');
  const [integerPart = '', fractionPart] = parts;
  if (fractionPart !== undefined && fractionPart.includes(group)) {
    throw new Error('Grouping separators are not valid in the fraction.');
  }
  const integerGroups = integerPart.split(group);
  if (
    integerGroups.length > 1 &&
    (!/^\d{1,3}$/.test(integerGroups[0] ?? '') ||
      integerGroups.slice(1).some((part) => !/^\d{3}$/.test(part)))
  ) {
    throw new Error('Grouping separators are malformed or ambiguous.');
  }
  const integer = integerGroups.join('');
  if (!/^\d+$/.test(integer) || (fractionPart !== undefined && !/^\d+$/.test(fractionPart))) {
    throw new Error('Enter a valid decimal amount.');
  }
  const digits = currencyFractionDigits(currency);
  if ((fractionPart?.length ?? 0) > digits) {
    throw new Error(`${currency} amounts support at most ${digits} fraction digits.`);
  }
  const canonical = fractionPart === undefined ? integer : `${integer}.${fractionPart}`;
  const parsed = moneyStringSchema.safeParse(canonical.replace(/^0+(?=\d)/, ''));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid amount.');
  return canonicalMoney(new Decimal(parsed.data), digits);
}

export function formatEditableMoney(
  canonical: string,
  locale: SupportedLocale,
  currency: string,
): string {
  const digits = currencyFractionDigits(currency);
  const [integer = '0', fraction = ''] = new Decimal(canonical).toFixed(digits).split('.');
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: true,
  });
  const groupedInteger = formatter.format(BigInt(integer));
  if (digits === 0) return groupedInteger;
  const decimalSeparator =
    new Intl.NumberFormat(locale).formatToParts(1.1).find(({ type }) => type === 'decimal')
      ?.value ?? '.';
  return `${groupedInteger}${decimalSeparator}${fraction}`;
}
