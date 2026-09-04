import type { BackupEnvelopeV1, Vault } from './model';
import { z } from 'zod';

import { assetSchema, backupEnvelopeSchema, liabilitySchema, vaultSchema } from './validation';

export class UnsupportedVersionError extends Error {
  constructor(kind: 'vault' | 'backup') {
    super(`This ${kind} uses an unsupported version.`);
    this.name = 'UnsupportedVersionError';
  }
}

const legacyVaultV0Schema = z
  .object({
    schemaVersion: z.literal(0),
    id: z.uuid(),
    revision: z.number().int().positive(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    currency: z.string().regex(/^[A-Z]{3}$/),
    assets: z.array(assetSchema),
    liabilities: z.array(liabilitySchema),
  })
  .strict();

export function migrateVault(input: unknown): Vault {
  if (typeof input !== 'object' || input === null || !('schemaVersion' in input)) {
    throw new Error('Vault schema version is missing.');
  }
  if (input.schemaVersion === 1) return vaultSchema.parse(input);
  if (input.schemaVersion === 0) {
    const legacy = legacyVaultV0Schema.parse(input);
    return vaultSchema.parse({
      schemaVersion: 1,
      id: legacy.id,
      revision: legacy.revision,
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
      settings: {
        baseCurrency: legacy.currency,
        locale: 'system',
        createdWithSampleData: false,
      },
      assets: legacy.assets,
      liabilities: legacy.liabilities,
    });
  }
  throw new UnsupportedVersionError('vault');
}

export function parseBackupEnvelope(input: unknown): BackupEnvelopeV1 {
  if (typeof input !== 'object' || input === null || !('formatVersion' in input)) {
    throw new Error('Backup format version is missing.');
  }
  if (input.formatVersion !== 1) {
    throw new UnsupportedVersionError('backup');
  }
  return backupEnvelopeSchema.parse(input);
}
