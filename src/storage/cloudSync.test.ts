import { createEmptyVault } from '@/domain/fixtures';

import { createEncryptedVault } from './crypto';
import {
  clearCloudSyncMetadata,
  createCloudSyncBaseline,
  decideCloudSync,
  envelopeDigest,
  loadCloudSyncMetadata,
  parseCloudSyncPayload,
  saveCloudSyncMetadata,
  serializeCloudSyncPayload,
  type RemoteVaultRecord,
} from './cloudSync';

const passphrase = 'correct horse battery staple';

async function encrypted(currency = 'USD') {
  return (await createEncryptedVault(createEmptyVault(currency), passphrase)).envelope;
}

async function remote(currency: string, changeTag: string): Promise<RemoteVaultRecord> {
  return {
    changeTag,
    modifiedAt: '2026-09-06T20:00:00.000Z',
    payload: parseCloudSyncPayload(serializeCloudSyncPayload(await encrypted(currency))),
  };
}

describe('cloud sync protocol', () => {
  it('round-trips only the encrypted envelope in a versioned payload', async () => {
    const envelope = await encrypted();
    const serialized = serializeCloudSyncPayload(envelope);

    expect(serialized).not.toContain('correct horse battery staple');
    expect(parseCloudSyncPayload(serialized)).toEqual({
      protocolVersion: 1,
      envelope,
    });
  });

  it('rejects malformed, oversized, and unknown-field payloads', async () => {
    const envelope = await encrypted();

    expect(() => parseCloudSyncPayload('{')).toThrow('not valid JSON');
    expect(() => parseCloudSyncPayload('x'.repeat(10 * 1024 * 1024 + 1))).toThrow(
      'exceeds the supported size',
    );
    expect(() =>
      parseCloudSyncPayload(
        JSON.stringify({ protocolVersion: 1, envelope, plaintextHint: 'Savings' }),
      ),
    ).toThrow();
    expect(() =>
      serializeCloudSyncPayload({ ...envelope, ciphertext: 'A'.repeat(900 * 1024) }),
    ).toThrow('exceeds the supported cloud sync size');
  });

  it('selects safe first-sync actions', async () => {
    const local = await encrypted('USD');
    const stored = await remote('EUR', 'remote-1');

    await expect(decideCloudSync(undefined, undefined, undefined)).resolves.toEqual({
      action: 'none',
    });
    await expect(decideCloudSync(local, undefined, undefined)).resolves.toEqual({
      action: 'upload',
    });
    await expect(decideCloudSync(undefined, stored, undefined)).resolves.toEqual({
      action: 'download',
      remote: stored,
    });
    await expect(decideCloudSync(local, stored, undefined)).resolves.toEqual({
      action: 'conflict',
      kind: 'diverged',
      remote: stored,
    });
  });

  it('detects local-only, remote-only, and divergent changes from the last baseline', async () => {
    const original = await encrypted('USD');
    const originalDigest = await envelopeDigest(original);
    const baseline = createCloudSyncBaseline(
      'remote-1',
      originalDigest,
      '2026-09-06T20:00:00.000Z',
    );
    const unchangedRemote: RemoteVaultRecord = {
      changeTag: 'remote-1',
      payload: parseCloudSyncPayload(serializeCloudSyncPayload(original)),
    };
    const changedRemote = await remote('GBP', 'remote-2');
    const changedLocal = await encrypted('EUR');

    await expect(decideCloudSync(changedLocal, unchangedRemote, baseline)).resolves.toEqual({
      action: 'upload',
      expectedChangeTag: 'remote-1',
    });
    await expect(decideCloudSync(original, changedRemote, baseline)).resolves.toEqual({
      action: 'download',
      remote: changedRemote,
    });
    await expect(decideCloudSync(changedLocal, changedRemote, baseline)).resolves.toEqual({
      action: 'conflict',
      kind: 'diverged',
      remote: changedRemote,
    });
  });

  it('does not silently undo local or remote deletion after an earlier sync', async () => {
    const local = await encrypted('USD');
    const stored = await remote('USD', 'remote-1');
    const baseline = createCloudSyncBaseline(
      'remote-1',
      await envelopeDigest(local),
      '2026-09-06T20:00:00.000Z',
    );

    await expect(decideCloudSync(undefined, stored, baseline)).resolves.toEqual({
      action: 'conflict',
      kind: 'local-deleted',
      remote: stored,
    });
    await expect(decideCloudSync(local, undefined, baseline)).resolves.toEqual({
      action: 'conflict',
      kind: 'remote-deleted',
    });
  });

  it('treats re-encryption of the same plaintext as a local change', async () => {
    const first = await encrypted();
    const second = await encrypted();
    expect(await envelopeDigest(first)).not.toBe(await envelopeDigest(second));
  });

  it('persists only opt-in state and opaque sync metadata', () => {
    const metadata = {
      enabled: true,
      accountDigest: 'b'.repeat(43),
      baseline: createCloudSyncBaseline(
        'opaque-change-tag',
        'a'.repeat(43),
        '2026-09-06T20:00:00.000Z',
      ),
    };
    saveCloudSyncMetadata(metadata);

    expect(loadCloudSyncMetadata()).toEqual(metadata);
    expect(localStorage.getItem('nwc-cloud-sync')).not.toContain('Savings');
    clearCloudSyncMetadata();
    expect(loadCloudSyncMetadata()).toEqual({ enabled: false });
  });

  it('fails closed for corrupted or inaccessible metadata', () => {
    localStorage.setItem('nwc-cloud-sync', '{"enabled":true,"baseline":{"changeTag":"bad"}}');
    expect(loadCloudSyncMetadata()).toEqual({ enabled: false });

    const blocked = {
      getItem: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    } as unknown as Storage;
    expect(loadCloudSyncMetadata(blocked)).toEqual({ enabled: false });
  });
});
