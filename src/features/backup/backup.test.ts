import { createEmptyVault } from '@/domain/fixtures';
import { createEncryptedVault } from '@/storage/crypto';
import { deleteEnvelope, writeEnvelope } from '@/storage/database';
import { unlockVault } from '@/storage/vaultRepository';
import { legacyVaultEnvelope } from '../../../tests/fixtures/legacy';

import { backupFilename, createBackupJson, prepareBackupImport } from './backup';

describe('encrypted backups', () => {
  const passphrase = 'correct horse battery staple';

  beforeEach(async () => {
    await deleteEnvelope();
  });

  it('exports a generic versioned file without plaintext vault content', async () => {
    const original = createEmptyVault('EUR');
    const encrypted = await createEncryptedVault(original, passphrase);
    await writeEnvelope(encrypted.envelope);
    const contents = await createBackupJson();
    expect(contents).not.toContain(original.id);
    expect(contents).not.toContain('EUR');
    expect(JSON.parse(contents)).toMatchObject({ format: 'net-worth-backup', formatVersion: 1 });
    expect(backupFilename(new Date('2026-09-03T12:00:00Z'))).toBe(
      'net-worth-backup-2026-09-03.nwvault',
    );
  });

  it('validates, authenticates, and restores all fields', async () => {
    const original = createEmptyVault('GBP');
    const encrypted = await createEncryptedVault(original, passphrase);
    const contents = JSON.stringify({
      format: 'net-worth-backup',
      formatVersion: 1,
      exportedAt: '2026-09-03T12:00:00.000Z',
      payload: encrypted.envelope,
    });
    expect((await prepareBackupImport(contents, passphrase)).vault).toEqual(original);
    await expect(prepareBackupImport(contents, 'incorrect passphrase!')).rejects.toThrow();
    await expect(prepareBackupImport('{', passphrase)).rejects.toThrow('not valid JSON');
  });

  it('re-encrypts a migrated legacy vault before it can replace storage', async () => {
    const legacyEnvelope = await legacyVaultEnvelope(passphrase);
    const imported = await prepareBackupImport(
      JSON.stringify({
        format: 'net-worth-backup',
        formatVersion: 1,
        exportedAt: '2026-09-03T12:00:00.000Z',
        payload: legacyEnvelope,
      }),
      passphrase,
    );
    expect(imported.vault.schemaVersion).toBe(1);
    expect(imported.envelope.vaultSchemaVersion).toBe(1);
    expect(imported.envelope.cipher.iv).not.toBe(legacyEnvelope.cipher.iv);
    await writeEnvelope(imported.envelope);
    expect((await unlockVault(passphrase)).vault).toMatchObject({
      schemaVersion: 1,
      settings: { baseCurrency: 'EUR' },
    });
  });

  it('enforces the size bound inside the import pipeline', async () => {
    await expect(prepareBackupImport('x'.repeat(10 * 1024 * 1024 + 1), passphrase)).rejects.toThrow(
      '10 MiB',
    );
  });
});
