import { vault } from '../../tests/fixtures/vault';
import {
  createEncryptedVault,
  encryptVault,
  unlockEncryptedVault,
  VaultAuthenticationError,
} from './crypto';

describe('encrypted vault envelope', () => {
  const passphrase = 'correct horse battery staple';

  it('round-trips with only versioned cipher metadata at rest', async () => {
    const original = vault({
      assets: [],
      liabilities: [],
      settings: { baseCurrency: 'EUR', locale: 'nl-NL', createdWithSampleData: false },
    });
    const { envelope } = await createEncryptedVault(original, passphrase);
    expect(Object.keys(envelope).sort()).toEqual([
      'cipher',
      'ciphertext',
      'format',
      'formatVersion',
      'kdf',
      'vaultSchemaVersion',
    ]);
    expect(JSON.stringify(envelope)).not.toContain('EUR');
    expect((await unlockEncryptedVault(envelope, passphrase)).vault).toEqual(original);
  });

  it('uses a fresh IV for every encryption', async () => {
    const original = vault();
    const { envelope, material } = await createEncryptedVault(original, passphrase);
    const second = await encryptVault(original, material);
    expect(second.cipher.iv).not.toBe(envelope.cipher.iv);
    expect(second.ciphertext).not.toBe(envelope.ciphertext);
  });

  it('rejects a wrong passphrase and tampering without plaintext fallback', async () => {
    const { envelope } = await createEncryptedVault(vault(), passphrase);
    await expect(unlockEncryptedVault(envelope, 'wrong passphrase that is long')).rejects.toThrow(
      VaultAuthenticationError,
    );
    const tampered = {
      ...envelope,
      ciphertext: `${envelope.ciphertext.startsWith('A') ? 'B' : 'A'}${envelope.ciphertext.slice(1)}`,
    };
    await expect(unlockEncryptedVault(tampered, passphrase)).rejects.toThrow(
      VaultAuthenticationError,
    );
  });
});
