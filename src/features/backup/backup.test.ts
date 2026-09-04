import { createEmptyVault } from '@/domain/fixtures';
import { createEncryptedVault } from '@/storage/crypto';
import { deleteEnvelope, writeEnvelope } from '@/storage/database';

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
    expect(JSON.parse(contents)).toMatchObject({ format: 'net-worth-backup', formatVersion: 2 });
    expect(backupFilename(new Date('2026-09-03T12:00:00Z'))).toBe(
      'net-worth-backup-2026-09-03.nwvault',
    );
  });

  it('validates, authenticates, and restores all fields', async () => {
    const original = createEmptyVault('GBP');
    const encrypted = await createEncryptedVault(original, passphrase);
    const contents = JSON.stringify({
      format: 'net-worth-backup',
      formatVersion: 2,
      exportedAt: '2026-09-03T12:00:00.000Z',
      payload: encrypted.envelope,
    });
    expect((await prepareBackupImport(contents, passphrase)).vault).toEqual(original);
    await expect(prepareBackupImport(contents, 'incorrect passphrase!')).rejects.toThrow();
    await expect(prepareBackupImport('{', passphrase)).rejects.toThrow('not valid JSON');
  });

  it('round-trips current dated observations without changing canonical values', async () => {
    const original = createEmptyVault('EUR');
    original.assets = [
      {
        id: crypto.randomUUID(),
        order: 0,
        classification: 'current',
        type: 'savings',
        name: 'Dated savings',
        notes: '',
        values: [
          {
            date: '2026-07-15',
            amount: '100000',
            updatedAt: '2026-07-15T00:00:00.000Z',
          },
        ],
        createdAt: '2026-07-15T00:00:00.000Z',
        updatedAt: '2026-07-15T00:00:00.000Z',
      },
    ];
    const encrypted = await createEncryptedVault(original, passphrase);
    const imported = await prepareBackupImport(
      JSON.stringify({
        format: 'net-worth-backup',
        formatVersion: 2,
        exportedAt: '2026-09-03T12:00:00.000Z',
        payload: encrypted.envelope,
      }),
      passphrase,
    );
    expect(imported.vault.assets[0]?.values[0]).toMatchObject({
      date: '2026-07-15',
      amount: '100000',
    });
    expect(imported.envelope.vaultSchemaVersion).toBe(2);
  });

  it('enforces the size bound inside the import pipeline', async () => {
    await expect(prepareBackupImport('x'.repeat(10 * 1024 * 1024 + 1), passphrase)).rejects.toThrow(
      '10 MiB',
    );
  });
});
