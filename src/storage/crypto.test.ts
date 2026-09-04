import { asset, vault } from '../../tests/fixtures/vault';
import { MAX_ITEMS, MAX_YEAR, MIN_YEAR } from '@/domain/model';
import { vaultSchema } from '@/domain/validation';
import {
  createEncryptedVault,
  encryptVault,
  unlockEncryptedVault,
  VaultAuthenticationError,
  VaultSizeError,
} from './crypto';

describe('encrypted vault envelope', () => {
  const passphrase = 'correct horse battery staple';

  it('round-trips with only versioned cipher metadata at rest', async () => {
    const original = vault({
      assets: [],
      liabilities: [],
      settings: { baseCurrency: 'EUR', createdWithSampleData: false },
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
    const { ciphertext: _ciphertext, ...publicMetadata } = envelope;
    expect(JSON.stringify(publicMetadata)).not.toContain('EUR');
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

  it('rejects a schema-valid vault before generating an unreadable oversized envelope', async () => {
    const updatedAt = '2026-01-01T00:00:00.000Z';
    const values = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, index) => ({
      date: `${MIN_YEAR + index}-12-31`,
      amount: '999999999999.99',
      updatedAt,
    }));
    const largeVault = vault({
      assets: Array.from({ length: MAX_ITEMS }, (_, order) =>
        asset({
          id: crypto.randomUUID(),
          order,
          notes: 'x'.repeat(2000),
          values,
        }),
      ),
    });
    expect(vaultSchema.safeParse(largeVault).success).toBe(true);
    const { material } = await createEncryptedVault(vault(), passphrase);
    await expect(encryptVault(largeVault, material)).rejects.toThrow(VaultSizeError);
  });
});
