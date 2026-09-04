import { formatEditableMoney, parseLocalizedMoney } from './localizedMoney';

describe('localized money', () => {
  it.each([
    ['en-US', '1,234.56'],
    ['en-GB', '1 234.56'],
    ['nl-NL', '1.234,56'],
    ['nl-NL', '1\u202f234,56'],
  ] as const)('parses %s input %s to one canonical value', (locale, input) => {
    expect(parseLocalizedMoney(input, locale, 'EUR')).toBe('1234.56');
  });

  it('rejects malformed or ambiguous magnitude', () => {
    expect(() => parseLocalizedMoney('12,34.56', 'en-US', 'USD')).toThrow('malformed');
    expect(() => parseLocalizedMoney('12.34,56', 'nl-NL', 'EUR')).toThrow('malformed');
    expect(() => parseLocalizedMoney('1,2,3', 'en-US', 'USD')).toThrow();
    expect(() => parseLocalizedMoney('12 34.56', 'en-US', 'USD')).toThrow('malformed');
  });

  it('enforces currency fraction digits including JPY', () => {
    expect(parseLocalizedMoney('1,234', 'en-US', 'JPY')).toBe('1234');
    expect(() => parseLocalizedMoney('1234.50', 'en-US', 'JPY')).toThrow(
      'at most 0 fraction digits',
    );
  });

  it('formats equivalent canonical values for each locale', () => {
    expect(formatEditableMoney('1234.56', 'en-US', 'USD')).toBe('1,234.56');
    expect(formatEditableMoney('1234.56', 'en-GB', 'GBP')).toBe('1,234.56');
    expect(formatEditableMoney('1234.56', 'nl-NL', 'EUR')).toBe('1.234,56');
  });
});
