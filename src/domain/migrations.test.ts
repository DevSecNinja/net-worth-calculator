import { backupEnvelopeSchema } from './validation';
import { migrateVault, parseBackupEnvelope, UnsupportedVersionError } from './migrations';
import { vault } from '../../tests/fixtures/vault';
import { createEncryptedVault } from '@/storage/crypto';
import { legacyVault } from '../../tests/fixtures/legacy';

describe('schema migrations', () => {
  it('accepts the current strict vault schema', () => {
    expect(migrateVault(vault()).schemaVersion).toBe(1);
  });

  it('rejects future and missing vault versions', () => {
    expect(() => migrateVault({ ...vault(), schemaVersion: 2 })).toThrow(UnsupportedVersionError);
    expect(() => migrateVault({})).toThrow('Vault schema version is missing');
  });

  it('migrates a real version zero vault sequentially', () => {
    expect(migrateVault(legacyVault)).toMatchObject({
      schemaVersion: 1,
      id: legacyVault.id,
      revision: legacyVault.revision,
      settings: {
        baseCurrency: 'EUR',
        locale: 'system',
        createdWithSampleData: false,
      },
    });
  });

  it('validates current backup envelopes and rejects unknown fields', async () => {
    const encrypted = await createEncryptedVault(vault(), 'correct horse battery staple');
    const backup = {
      format: 'net-worth-backup',
      formatVersion: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      payload: encrypted.envelope,
    };
    expect(parseBackupEnvelope(backup)).toEqual(backupEnvelopeSchema.parse(backup));
    expect(() => parseBackupEnvelope({ ...backup, extra: true })).toThrow();
    expect(() => parseBackupEnvelope({ ...backup, formatVersion: 2 })).toThrow(
      UnsupportedVersionError,
    );
  });
});
