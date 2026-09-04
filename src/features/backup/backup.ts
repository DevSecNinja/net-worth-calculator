import type { BackupEnvelopeV1 } from '@/domain/model';
import { BACKUP_FORMAT_VERSION, nowIso } from '@/domain/model';
import { parseBackupEnvelope } from '@/domain/migrations';
import { encryptVault, unlockEncryptedVault } from '@/storage/crypto';
import { readEnvelope } from '@/storage/database';
import type { ImportedVault } from '@/features/vault/VaultProvider';
import { MAX_BACKUP_BYTES } from '@/storage/files';

export function backupFilename(date = new Date()): string {
  return `net-worth-backup-${date.toISOString().slice(0, 10)}.nwvault`;
}

export async function createBackupJson(): Promise<string> {
  const envelope = await readEnvelope();
  if (!envelope) throw new Error('No encrypted vault is available to export.');
  const backup: BackupEnvelopeV1 = {
    format: 'net-worth-backup',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: nowIso(),
    payload: envelope,
  };
  return JSON.stringify(backup);
}

export async function prepareBackupImport(
  contents: string,
  passphrase: string,
): Promise<ImportedVault> {
  if (new TextEncoder().encode(contents).byteLength > MAX_BACKUP_BYTES) {
    throw new Error('Backup is larger than the 10 MiB limit.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents) as unknown;
  } catch {
    throw new Error('Backup is not valid JSON.');
  }
  const backup = parseBackupEnvelope(parsed);
  const unlocked = await unlockEncryptedVault(backup.payload, passphrase);
  return {
    envelope: await encryptVault(unlocked.vault, unlocked.material),
    vault: unlocked.vault,
    material: unlocked.material,
  };
}
