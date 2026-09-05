import { createEncryptedVault } from '@/storage/crypto';

import { vault } from '../../tests/fixtures/vault';
import { migrateVault, parseBackupEnvelope, UnsupportedVersionError } from './migrations';
import { backupEnvelopeSchema } from './validation';

describe('initial production schema boundaries', () => {
  it('accepts the current strict dated vault schema', () => {
    expect(migrateVault(vault()).schemaVersion).toBe(2);
  });

  it('rejects unsupported and missing vault versions safely', () => {
    expect(() => migrateVault({ ...vault(), schemaVersion: 1 })).toThrow(UnsupportedVersionError);
    expect(() => migrateVault({})).toThrow('Vault schema version is missing');
  });

  it('validates current backup envelopes and rejects unsupported or unknown fields', async () => {
    const encrypted = await createEncryptedVault(vault(), 'correct horse battery staple');
    const backup = {
      format: 'net-worth-backup',
      formatVersion: 2,
      exportedAt: '2026-01-01T00:00:00.000Z',
      payload: encrypted.envelope,
    };
    expect(parseBackupEnvelope(backup)).toEqual(backupEnvelopeSchema.parse(backup));
    expect(() => parseBackupEnvelope({ ...backup, extra: true })).toThrow();
    expect(() => parseBackupEnvelope({ ...backup, formatVersion: 1 })).toThrow(
      UnsupportedVersionError,
    );
  });
});
