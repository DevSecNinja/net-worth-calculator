import { createEmptyVault } from '@/domain/fixtures';

import { deriveVaultKey } from './crypto';
import { deleteEnvelope, readEnvelope } from './database';
import {
  createVault,
  changeVaultPassphrase,
  hasVault,
  removeVault,
  replaceVaultEnvelope,
  saveVault,
  unlockVault,
  VaultAlreadyExistsError,
  VaultConflictError,
} from './vaultRepository';

describe('vault repository', () => {
  const passphrase = 'correct horse battery staple';

  beforeEach(async () => {
    await deleteEnvelope();
  });

  it('creates, unlocks, saves, and deletes only an encrypted envelope', async () => {
    const original = createEmptyVault('USD');
    const created = await createVault(original, passphrase);
    expect(await hasVault()).toBe(true);
    expect(JSON.stringify(await readEnvelope())).not.toContain(original.id);
    const saved = await saveVault(
      { ...created.vault, settings: { ...created.vault.settings, baseCurrency: 'EUR' } },
      created.material,
    );
    expect(saved.revision).toBe(2);
    expect((await unlockVault(passphrase)).vault.settings.baseCurrency).toBe('EUR');
    await removeVault(saved, created.material);
    expect(await hasVault()).toBe(false);
  });

  it('prevents duplicate creation and stale revision writes', async () => {
    const created = await createVault(createEmptyVault('USD'), passphrase);
    await expect(createVault(createEmptyVault('EUR'), passphrase)).rejects.toThrow(
      VaultAlreadyExistsError,
    );
    const stale = await unlockVault(passphrase);
    await saveVault(created.vault, created.material);
    await expect(saveVault(stale.vault, stale.material)).rejects.toThrow(VaultConflictError);
  });

  it('atomically allows only one concurrent save from the same revision', async () => {
    const created = await createVault(createEmptyVault('USD'), passphrase);
    const left = {
      ...created.vault,
      settings: { ...created.vault.settings, baseCurrency: 'EUR' },
    };
    const right = {
      ...created.vault,
      settings: { ...created.vault.settings, baseCurrency: 'GBP' },
    };
    const results = await Promise.allSettled([
      saveVault(left, created.material),
      saveVault(right, created.material),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
    const unlocked = await unlockVault(passphrase);
    expect(unlocked.vault.revision).toBe(2);
    expect(['EUR', 'GBP']).toContain(unlocked.vault.settings.baseCurrency);
  });

  it('keeps the old envelope usable if passphrase re-encryption is interrupted', async () => {
    const created = await createVault(createEmptyVault('USD'), passphrase);
    const encrypt = vi
      .spyOn(crypto.subtle, 'encrypt')
      .mockRejectedValueOnce(
        new DOMException('simulated encryption interruption', 'OperationError'),
      );
    await expect(
      changeVaultPassphrase(created.vault, created.material, 'another horse battery staple'),
    ).rejects.toThrow('simulated encryption interruption');
    encrypt.mockRestore();
    await expect(unlockVault(passphrase)).resolves.toMatchObject({
      vault: { revision: 1 },
    });
    await expect(unlockVault('another horse battery staple')).rejects.toThrow();
  });

  it('rejects absent storage and key mismatches without creating data', async () => {
    await expect(unlockVault(passphrase)).rejects.toThrow('No vault exists');
    const empty = createEmptyVault('USD');
    const unrelatedMaterial = await deriveVaultKey('another horse battery staple');
    await expect(saveVault(empty, unrelatedMaterial)).rejects.toThrow('no longer exists');

    const created = await createVault(empty, passphrase);
    await expect(saveVault(created.vault, unrelatedMaterial)).rejects.toThrow(VaultConflictError);
  });

  it('rejects stale passphrase changes and compare-and-swap replacements', async () => {
    const created = await createVault(createEmptyVault('USD'), passphrase);
    const staleEnvelope = await readEnvelope();
    await saveVault(created.vault, created.material);
    await expect(
      changeVaultPassphrase(created.vault, created.material, 'another horse battery staple'),
    ).rejects.toThrow(VaultConflictError);
    expect(staleEnvelope).toBeDefined();
    await expect(replaceVaultEnvelope(staleEnvelope!, staleEnvelope)).rejects.toThrow(
      VaultConflictError,
    );
  });

  it('atomically rejects stale deletion while preserving the current vault', async () => {
    const created = await createVault(createEmptyVault('USD'), passphrase);
    const stale = await unlockVault(passphrase);
    const saved = await saveVault(
      { ...created.vault, settings: { ...created.vault.settings, baseCurrency: 'EUR' } },
      created.material,
    );

    await expect(removeVault(stale.vault, stale.material)).rejects.toThrow(VaultConflictError);
    await expect(unlockVault(passphrase)).resolves.toMatchObject({
      vault: { revision: 2, settings: { baseCurrency: 'EUR' } },
    });
    await removeVault(saved, created.material);
    expect(await hasVault()).toBe(false);
  });

  it('rejects deletion with unrelated key material', async () => {
    const created = await createVault(createEmptyVault('USD'), passphrase);
    const unrelatedMaterial = await deriveVaultKey('another horse battery staple');
    await expect(removeVault(created.vault, unrelatedMaterial)).rejects.toThrow(VaultConflictError);
    expect(await hasVault()).toBe(true);
  });

  it('rejects deletion if the persisted envelope disappeared', async () => {
    const created = await createVault(createEmptyVault('USD'), passphrase);
    await deleteEnvelope();
    await expect(removeVault(created.vault, created.material)).rejects.toThrow('no longer exists');
  });
});
