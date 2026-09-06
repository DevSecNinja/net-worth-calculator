import {
  canonicalMoney,
  canonicalSignedMoney,
  formatMoney,
  formatPercent,
  parseUserMoney,
} from './currency';

describe('currency helpers', () => {
  it('normalizes entered amounts without binary floating point drift', () => {
    expect(parseUserMoney(' 1,234.50 ')).toBe('1234.5');
    expect(canonicalMoney('0.105', 2)).toBe('0.11');
    expect(canonicalSignedMoney('-12.345', 2)).toBe('-12.35');
  });

  it('rejects negative, exponential, and oversized input', () => {
    expect(() => parseUserMoney('-1')).toThrow('Enter an amount');
    expect(() => parseUserMoney('1e3')).toThrow('Enter an amount');
    expect(() => parseUserMoney('1000000000000')).toThrow('999,999,999,999.99');
  });

  it('uses locale-aware currency formatting', () => {
    expect(formatMoney('1234.5', 'EUR', 'de-DE')).toMatch(/1\.234,50\s?€/);
    expect(formatMoney('1234.5', 'JPY', 'ja-JP')).toContain('1,235');
    expect(formatMoney('498999999999995.01', 'USD', 'en-US')).toBe('$498,999,999,999,995.01');
  });

  it('formats percentages from exact decimals without binary floating point artifacts', () => {
    expect(formatPercent('23.445', 'en-US')).toBe('23.45%');
    expect(formatPercent('23.445', 'nl-NL')).toBe('23,45%');
    expect(formatPercent('0', 'en-GB')).toBe('0%');
    expect(formatPercent('-1.5', 'en-US')).toBe('-1.5%');
  });
});
