import type { CipherEnvelopeV1, Vault } from '@/domain/model';
import { nowIso } from '@/domain/model';
import { vaultSchema } from '@/domain/validation';

import {
  decryptVault,
  deriveVaultKey,
  encryptVault,
  unlockEncryptedVault,
  type VaultKeyMaterial,
} from './crypto';
import {
  compareAndDeleteEnvelope,
  compareAndSwapEnvelope,
  EnvelopeConflictError,
  readEnvelope,
} from './database';

export class VaultAlreadyExistsError extends Error {
  constructor() {
    super('A vault already exists in this browser.');
    this.name = 'VaultAlreadyExistsError';
  }
}

export class VaultConflictError extends Error {
  constructor() {
    super('The vault changed in another session. Lock and unlock before trying again.');
    this.name = 'VaultConflictError';
  }
}

export class LockedVaultChangedError extends Error {
  constructor() {
    super('The locked vault changed before deletion could commit.');
    this.name = 'LockedVaultChangedError';
  }
}

export class LockedVaultLeaseLostError extends Error {
  constructor() {
    super('The deletion lease was lost before the locked vault could be removed.');
    this.name = 'LockedVaultLeaseLostError';
  }
}

export async function hasVault(): Promise<boolean> {
  return (await readEnvelope()) !== undefined;
}

export async function captureLockedVault(): Promise<CipherEnvelopeV1 | undefined> {
  return readEnvelope();
}

export async function removeLockedVault(
  expected: CipherEnvelopeV1,
  ownsLease: () => boolean,
): Promise<void> {
  try {
    await compareAndDeleteEnvelope(expected, ownsLease);
  } catch (error) {
    if (error instanceof EnvelopeConflictError) {
      if (!ownsLease()) throw new LockedVaultLeaseLostError();
      throw new LockedVaultChangedError();
    }
    throw error;
  }
}

export async function createVault(
  vaultInput: Vault,
  passphrase: string,
): Promise<{ vault: Vault; material: VaultKeyMaterial }> {
  if (await hasVault()) throw new VaultAlreadyExistsError();
  const vault = vaultSchema.parse(vaultInput);
  const material = await deriveVaultKey(passphrase);
  const envelope = await encryptVault(vault, material);
  try {
    await compareAndSwapEnvelope(undefined, envelope);
  } catch (error) {
    if (error instanceof EnvelopeConflictError) throw new VaultAlreadyExistsError();
    throw error;
  }
  return { vault, material };
}

export async function unlockVault(
  passphrase: string,
): Promise<{ vault: Vault; material: VaultKeyMaterial }> {
  const envelope = await readEnvelope();
  if (!envelope) throw new Error('No vault exists in this browser.');
  return unlockEncryptedVault(envelope, passphrase);
}

export async function saveVault(vaultInput: Vault, material: VaultKeyMaterial): Promise<Vault> {
  const vault = vaultSchema.parse(vaultInput);
  const currentEnvelope = await readEnvelope();
  if (!currentEnvelope) throw new Error('The stored vault no longer exists.');
  let current: Vault;
  try {
    current = await decryptVault(currentEnvelope, material);
  } catch {
    throw new VaultConflictError();
  }
  if (current.revision !== vault.revision) throw new VaultConflictError();

  const timestamp = nowIso();
  const next = vaultSchema.parse({
    ...vault,
    revision: vault.revision + 1,
    updatedAt: timestamp,
  });
  const replacement = await encryptVault(next, material);
  try {
    await compareAndSwapEnvelope(currentEnvelope, replacement);
  } catch (error) {
    if (error instanceof EnvelopeConflictError) throw new VaultConflictError();
    throw error;
  }
  return next;
}

export async function changeVaultPassphrase(
  vaultInput: Vault,
  currentMaterial: VaultKeyMaterial,
  newPassphrase: string,
): Promise<{ vault: Vault; material: VaultKeyMaterial }> {
  const vault = vaultSchema.parse(vaultInput);
  const currentEnvelope = await readEnvelope();
  if (!currentEnvelope) throw new Error('The stored vault no longer exists.');
  let current: Vault;
  try {
    current = await decryptVault(currentEnvelope, currentMaterial);
  } catch {
    throw new VaultConflictError();
  }
  if (current.revision !== vault.revision) throw new VaultConflictError();

  const saved = vaultSchema.parse({
    ...vault,
    revision: vault.revision + 1,
    updatedAt: nowIso(),
  });
  const material = await deriveVaultKey(newPassphrase);
  const replacement = await encryptVault(saved, material);
  try {
    await compareAndSwapEnvelope(currentEnvelope, replacement);
  } catch (error) {
    if (error instanceof EnvelopeConflictError) throw new VaultConflictError();
    throw error;
  }
  return { vault: saved, material };
}

export async function replaceVaultEnvelope(
  envelope: CipherEnvelopeV1,
  expected?: CipherEnvelopeV1,
): Promise<void> {
  try {
    await compareAndSwapEnvelope(expected ?? (await readEnvelope()), envelope);
  } catch (error) {
    if (error instanceof EnvelopeConflictError) throw new VaultConflictError();
    throw error;
  }
}

export async function removeVault(vaultInput: Vault, material: VaultKeyMaterial): Promise<void> {
  const vault = vaultSchema.parse(vaultInput);
  const currentEnvelope = await readEnvelope();
  if (!currentEnvelope) throw new Error('The stored vault no longer exists.');
  let current: Vault;
  try {
    current = await decryptVault(currentEnvelope, material);
  } catch {
    throw new VaultConflictError();
  }
  if (current.id !== vault.id || current.revision !== vault.revision) {
    throw new VaultConflictError();
  }
  try {
    await compareAndDeleteEnvelope(currentEnvelope);
  } catch (error) {
    if (error instanceof EnvelopeConflictError) throw new VaultConflictError();
    throw error;
  }
}
