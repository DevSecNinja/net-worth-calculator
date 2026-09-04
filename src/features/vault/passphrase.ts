export type PassphraseValidation = {
  valid: boolean;
  message?: string;
};

export function validatePassphrase(passphrase: string): PassphraseValidation {
  if (passphrase.length < 12) {
    return { valid: false, message: 'Use at least 12 characters.' };
  }
  if (passphrase.length > 1024) {
    return { valid: false, message: 'Passphrase is too long.' };
  }
  return { valid: true };
}

export function validatePassphrasePair(
  passphrase: string,
  confirmation: string,
): PassphraseValidation {
  const validation = validatePassphrase(passphrase);
  if (!validation.valid) return validation;
  if (passphrase !== confirmation) {
    return { valid: false, message: 'Passphrases do not match.' };
  }
  return { valid: true };
}
