import { canonicalMoney, canonicalSignedMoney, formatMoney, parseUserMoney } from './currency';

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
  });
});
