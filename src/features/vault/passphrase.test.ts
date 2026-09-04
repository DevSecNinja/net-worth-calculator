import { validatePassphrase, validatePassphrasePair } from './passphrase';

describe('passphrase validation', () => {
  it('enforces minimum and maximum lengths', () => {
    expect(validatePassphrase('short')).toMatchObject({ valid: false });
    expect(validatePassphrase('x'.repeat(1025))).toMatchObject({ valid: false });
    expect(validatePassphrase('correct horse battery staple')).toEqual({ valid: true });
  });

  it('requires exact confirmation', () => {
    expect(
      validatePassphrasePair('correct horse battery staple', 'different phrase entirely'),
    ).toMatchObject({
      valid: false,
      message: 'Passphrases do not match.',
    });
    expect(
      validatePassphrasePair('correct horse battery staple', 'correct horse battery staple'),
    ).toEqual({ valid: true });
  });
});
