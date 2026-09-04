import { MAX_BACKUP_BYTES, MAX_VAULT_PLAINTEXT_BYTES } from './model';

const MEBIBYTE_BYTES = 1024 * 1024;

function formatMebibytes(bytes: number): string {
  const mebibytes = bytes / MEBIBYTE_BYTES;
  return `${Number.isInteger(mebibytes) ? mebibytes : mebibytes.toFixed(1)} MiB`;
}

export function backupSizeErrorMessage(): string {
  return `Backup is larger than the ${formatMebibytes(MAX_BACKUP_BYTES)} limit.`;
}

export function vaultSizeErrorMessage(): string {
  return `The decrypted vault document is larger than the ${formatMebibytes(MAX_VAULT_PLAINTEXT_BYTES)} local size limit.`;
}
