import { createEmptyVault } from '@/domain/fixtures';

import { createEncryptedVault } from './crypto';
import {
  compareAndDeleteEnvelope,
  compareAndSwapEnvelope,
  deleteEnvelope,
  EnvelopeConflictError,
  readEnvelope,
} from './database';

describe('encrypted envelope transactions', () => {
  const passphrase = 'correct horse battery staple';

  beforeEach(async () => {
    await deleteEnvelope();
  });

  it('compares exact ciphertext before an atomic delete', async () => {
    const first = await createEncryptedVault(createEmptyVault('USD'), passphrase);
    const other = await createEncryptedVault(createEmptyVault('EUR'), passphrase);
    await compareAndSwapEnvelope(undefined, first.envelope);

    await expect(compareAndDeleteEnvelope(other.envelope)).rejects.toThrow(EnvelopeConflictError);
    expect(await readEnvelope()).toEqual(first.envelope);

    await compareAndDeleteEnvelope(first.envelope);
    expect(await readEnvelope()).toBeUndefined();
  });

  it('rejects create-style compare-and-swap when an envelope already exists', async () => {
    const first = await createEncryptedVault(createEmptyVault('USD'), passphrase);
    const other = await createEncryptedVault(createEmptyVault('EUR'), passphrase);
    await compareAndSwapEnvelope(undefined, first.envelope);
    await expect(compareAndSwapEnvelope(undefined, other.envelope)).rejects.toThrow(
      EnvelopeConflictError,
    );
    expect(await readEnvelope()).toEqual(first.envelope);
  });

  it('aborts a replacement when its external authorization is invalidated', async () => {
    const first = await createEncryptedVault(createEmptyVault('USD'), passphrase);
    const other = await createEncryptedVault(createEmptyVault('EUR'), passphrase);
    await compareAndSwapEnvelope(undefined, first.envelope);

    await expect(
      compareAndSwapEnvelope(first.envelope, other.envelope, () => false),
    ).rejects.toThrow(EnvelopeConflictError);
    expect(await readEnvelope()).toEqual(first.envelope);
  });
});
