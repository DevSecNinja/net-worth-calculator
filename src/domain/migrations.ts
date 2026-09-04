import type { BackupEnvelopeV2, Vault } from './model';
import { BACKUP_FORMAT_VERSION, VAULT_SCHEMA_VERSION } from './model';
import { backupEnvelopeSchema, vaultSchema } from './validation';

export class UnsupportedVersionError extends Error {
  constructor(kind: 'vault' | 'backup') {
    super(`This ${kind} uses an unsupported version.`);
    this.name = 'UnsupportedVersionError';
  }
}

export function migrateVault(input: unknown): Vault {
  if (typeof input !== 'object' || input === null || !('schemaVersion' in input)) {
    throw new Error('Vault schema version is missing.');
  }
  if (input.schemaVersion !== VAULT_SCHEMA_VERSION) throw new UnsupportedVersionError('vault');
  return vaultSchema.parse(input);
}

export function parseBackupEnvelope(input: unknown): BackupEnvelopeV2 {
  if (typeof input !== 'object' || input === null || !('formatVersion' in input)) {
    throw new Error('Backup format version is missing.');
  }
  if (input.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new UnsupportedVersionError('backup');
  }
  return backupEnvelopeSchema.parse(input);
}
