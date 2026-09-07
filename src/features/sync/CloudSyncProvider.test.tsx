import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createEmptyVault } from '@/domain/fixtures';
import type { CipherEnvelopeV1 } from '@/domain/model';
import { VaultProvider, useVault } from '@/features/vault/VaultProvider';
import type { CloudSyncClient } from '@/storage/cloudKitAdapter';
import {
  createCloudSyncBaseline,
  envelopeDigest,
  loadCloudSyncMetadata,
  opaqueIdentifierDigest,
  parseCloudSyncPayload,
  saveCloudSyncMetadata,
  serializeCloudSyncPayload,
  type RemoteVaultRecord,
} from '@/storage/cloudSync';
import { createEncryptedVault } from '@/storage/crypto';
import { deleteEnvelope, readEnvelope, writeEnvelope } from '@/storage/database';
import { createVault, saveVault, unlockVault } from '@/storage/vaultRepository';
import { vaultEventsContract } from '@/storage/vaultEvents';

import { CloudSyncProvider, useCloudSync } from './CloudSyncProvider';

const passphrase = 'correct horse battery staple';

function Harness() {
  const sync = useCloudSync();
  const vault = useVault();
  return (
    <>
      <output aria-label="sync">
        {String(sync.enabled)}:{sync.authentication}:{sync.phase}
      </output>
      <output aria-label="vault">{vault.status}</output>
      <output aria-label="conflict-sides">
        {String(sync.conflictHasLocal)}:{String(sync.conflictHasRemote)}
      </output>
      <button type="button" onClick={() => void sync.enable()}>
        Enable
      </button>
      <button type="button" onClick={() => void sync.syncNow()}>
        Sync
      </button>
      <button type="button" onClick={() => void sync.resolveWithLocal().catch(() => undefined)}>
        Local
      </button>
      <button
        type="button"
        onClick={() => void sync.resolveWithRemote(passphrase).catch(() => undefined)}
      >
        Remote
      </button>
      <button type="button" onClick={() => void sync.disable(true)}>
        Delete remote
      </button>
    </>
  );
}

async function encrypted(currency: string) {
  return (await createEncryptedVault(createEmptyVault(currency), passphrase)).envelope;
}

function remoteRecord(
  envelope: Awaited<ReturnType<typeof encrypted>>,
  changeTag: string,
): RemoteVaultRecord {
  return {
    changeTag,
    modifiedAt: '2026-09-06T20:00:00.000Z',
    payload: parseCloudSyncPayload(serializeCloudSyncPayload(envelope)),
  };
}

function fakeClient(initialRemote?: RemoteVaultRecord, userRecordName = 'private-user') {
  let remote = initialRemote;
  let counter = 1;
  const client: CloudSyncClient = {
    setUpAuth: vi.fn().mockResolvedValue(userRecordName),
    watchAuthentication: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    fetchVault: vi.fn(async () => remote),
    saveVault: vi.fn(async (envelope: CipherEnvelopeV1) => {
      remote = remoteRecord(envelope, `tag-${++counter}`);
      return remote;
    }),
    deleteVault: vi.fn(async () => {
      remote = undefined;
    }),
  };
  return client;
}

function renderProvider(client: CloudSyncClient) {
  const createClient = vi.fn(async () => client);
  render(
    <VaultProvider>
      <CloudSyncProvider createClient={createClient}>
        <Harness />
      </CloudSyncProvider>
    </VaultProvider>,
  );
  return createClient;
}

describe('CloudSyncProvider', () => {
  beforeEach(async () => {
    await deleteEnvelope();
    localStorage.clear();
  });

  it('does not load CloudKit or access the network before explicit opt-in', async () => {
    const client = fakeClient();
    const createClient = renderProvider(client);

    await screen.findByText('false:signed-out:idle');
    expect(createClient).not.toHaveBeenCalled();
    expect(client.fetchVault).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Enable' }));
    await waitFor(() => expect(createClient).toHaveBeenCalledOnce());
    await screen.findByText('true:signed-in:synced');
  });

  it('uploads the local encrypted envelope and records an opaque baseline', async () => {
    await createVault(createEmptyVault('USD'), passphrase);
    const client = fakeClient();
    saveCloudSyncMetadata({ enabled: true });
    renderProvider(client);

    await screen.findByText('true:signed-in:synced');
    expect(client.saveVault).toHaveBeenCalledOnce();
    const serialized = JSON.stringify(vi.mocked(client.saveVault).mock.calls);
    expect(serialized).not.toContain(passphrase);
    expect(loadCloudSyncMetadata().baseline?.changeTag).toBe('tag-2');
  });

  it('downloads a first remote vault without decrypting it and leaves it locked', async () => {
    const remoteEnvelope = await encrypted('EUR');
    const client = fakeClient(remoteRecord(remoteEnvelope, 'remote-1'));
    saveCloudSyncMetadata({ enabled: true });
    renderProvider(client);

    await screen.findByText('true:signed-in:synced');
    expect(screen.getByRole('status', { name: 'vault' })).toHaveTextContent('locked');
    expect(await readEnvelope()).toEqual(remoteEnvelope);
    expect((await unlockVault(passphrase)).vault.settings.baseCurrency).toBe('EUR');
  });

  it('pauses without contacting CloudKit while offline', async () => {
    await createVault(createEmptyVault('USD'), passphrase);
    const client = fakeClient();
    saveCloudSyncMetadata({ enabled: true });
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    renderProvider(client);

    await screen.findByText('true:signed-out:offline');
    expect(client.setUpAuth).not.toHaveBeenCalled();
    expect(client.fetchVault).not.toHaveBeenCalled();
    expect(await readEnvelope()).toBeDefined();
  });

  it('waits for authentication without attempting a vault request', async () => {
    const client = fakeClient();
    vi.mocked(client.setUpAuth).mockResolvedValue(undefined);
    saveCloudSyncMetadata({ enabled: true });
    renderProvider(client);

    await screen.findByText('true:signed-out:idle');
    expect(client.fetchVault).not.toHaveBeenCalled();
  });

  it('does not persist an old account baseline when sign-out races an upload', async () => {
    await createVault(createEmptyVault('USD'), passphrase);
    let signedOut: () => void = () => undefined;
    let releaseUpload: () => void = () => undefined;
    const uploadGate = new Promise<void>((resolve) => {
      releaseUpload = resolve;
    });
    const client = fakeClient();
    client.watchAuthentication = vi.fn(
      (
        _onSignIn: (userRecordName: string) => void,
        onSignOut: () => void,
        _onError: (error: Error) => void,
      ) => {
        signedOut = onSignOut;
      },
    );
    client.saveVault = vi.fn(async (envelope: CipherEnvelopeV1) => {
      await uploadGate;
      return remoteRecord(envelope, 'tag-2');
    });
    saveCloudSyncMetadata({ enabled: true });
    renderProvider(client);
    await waitFor(() => expect(client.saveVault).toHaveBeenCalledOnce());

    signedOut();
    releaseUpload();

    await screen.findByText('true:signed-out:idle');
    expect(loadCloudSyncMetadata().baseline).toBeUndefined();
  });

  it('schedules synchronization after a data-free cross-tab vault change', async () => {
    await createVault(createEmptyVault('USD'), passphrase);
    const client = fakeClient();
    saveCloudSyncMetadata({ enabled: true });
    renderProvider(client);
    await screen.findByText('true:signed-in:synced');
    vi.mocked(client.saveVault).mockClear();
    await writeEnvelope(await encrypted('EUR'));

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: vaultEventsContract.storageKey,
        newValue: JSON.stringify({
          event: vaultEventsContract.changedEvent,
          source: 'other-tab',
        }),
      }),
    );

    await waitFor(() => expect(client.saveVault).toHaveBeenCalledOnce());
  });

  it('detects divergent revisions without replacing either copy', async () => {
    const original = await createVault(createEmptyVault('USD'), passphrase);
    const originalEnvelope = await readEnvelope();
    const changedLocal = await saveVault(
      {
        ...original.vault,
        settings: { ...original.vault.settings, baseCurrency: 'EUR' },
      },
      original.material,
    );
    const localEnvelope = await readEnvelope();
    const remoteEnvelope = await encrypted('GBP');
    saveCloudSyncMetadata({
      enabled: true,
      accountDigest: await opaqueIdentifierDigest('private-user'),
      baseline: createCloudSyncBaseline(
        'remote-1',
        await envelopeDigest(originalEnvelope!),
        '2026-09-06T19:00:00.000Z',
      ),
    });
    const client = fakeClient(remoteRecord(remoteEnvelope, 'remote-2'));
    renderProvider(client);

    await screen.findByText('true:signed-in:conflict');
    expect(await readEnvelope()).toEqual(localEnvelope);
    expect(changedLocal.settings.baseCurrency).toBe('EUR');
    expect(client.saveVault).not.toHaveBeenCalled();
  });

  it('treats remote deletion as a conflict instead of recreating it silently', async () => {
    await createVault(createEmptyVault('USD'), passphrase);
    const localEnvelope = await readEnvelope();
    saveCloudSyncMetadata({
      enabled: true,
      accountDigest: await opaqueIdentifierDigest('private-user'),
      baseline: createCloudSyncBaseline(
        'remote-1',
        await envelopeDigest(localEnvelope!),
        '2026-09-06T19:00:00.000Z',
      ),
    });
    const client = fakeClient();
    renderProvider(client);

    await screen.findByText('true:signed-in:conflict');
    expect(screen.getByRole('status', { name: 'conflict-sides' })).toHaveTextContent('true:false');
    expect(client.saveVault).not.toHaveBeenCalled();
  });

  it('requires explicit resolution before replacing an existing locked vault', async () => {
    await createVault(createEmptyVault('USD'), passphrase);
    const localEnvelope = await readEnvelope();
    const remoteEnvelope = await encrypted('EUR');
    saveCloudSyncMetadata({
      enabled: true,
      accountDigest: await opaqueIdentifierDigest('private-user'),
      baseline: createCloudSyncBaseline(
        'remote-1',
        await envelopeDigest(localEnvelope!),
        '2026-09-06T19:00:00.000Z',
      ),
    });
    renderProvider(fakeClient(remoteRecord(remoteEnvelope, 'remote-2')));

    await screen.findByText('true:signed-in:conflict');
    expect(await readEnvelope()).toEqual(localEnvelope);
  });

  it('invalidates the baseline when a different iCloud account signs in', async () => {
    await createVault(createEmptyVault('USD'), passphrase);
    const localEnvelope = await readEnvelope();
    const remoteEnvelope = await encrypted('EUR');
    saveCloudSyncMetadata({
      enabled: true,
      accountDigest: await opaqueIdentifierDigest('previous-user'),
      baseline: createCloudSyncBaseline(
        'remote-1',
        await envelopeDigest(localEnvelope!),
        '2026-09-06T19:00:00.000Z',
      ),
    });
    const client = fakeClient(remoteRecord(remoteEnvelope, 'remote-1'), 'new-user');
    renderProvider(client);

    await screen.findByText('true:signed-in:conflict');
    expect(client.saveVault).not.toHaveBeenCalled();
    expect(loadCloudSyncMetadata().accountDigest).toBe(await opaqueIdentifierDigest('new-user'));
    expect(loadCloudSyncMetadata().baseline).toBeUndefined();
  });

  it('treats local deletion as a conflict instead of restoring it silently', async () => {
    const remoteEnvelope = await encrypted('USD');
    saveCloudSyncMetadata({
      enabled: true,
      accountDigest: await opaqueIdentifierDigest('private-user'),
      baseline: createCloudSyncBaseline(
        'remote-1',
        await envelopeDigest(remoteEnvelope),
        '2026-09-06T19:00:00.000Z',
      ),
    });
    const client = fakeClient(remoteRecord(remoteEnvelope, 'remote-1'));
    renderProvider(client);

    await screen.findByText('true:signed-in:conflict');
    expect(screen.getByRole('status', { name: 'conflict-sides' })).toHaveTextContent('false:true');
    expect(await readEnvelope()).toBeUndefined();
  });

  it('resolves a conflict only after authenticating the chosen remote vault', async () => {
    const local = await createVault(createEmptyVault('USD'), passphrase);
    const baselineEnvelope = await readEnvelope();
    await saveVault(
      { ...local.vault, settings: { ...local.vault.settings, baseCurrency: 'EUR' } },
      local.material,
    );
    const remoteEnvelope = await encrypted('GBP');
    saveCloudSyncMetadata({
      enabled: true,
      accountDigest: await opaqueIdentifierDigest('private-user'),
      baseline: createCloudSyncBaseline(
        'remote-1',
        await envelopeDigest(baselineEnvelope!),
        '2026-09-06T19:00:00.000Z',
      ),
    });
    renderProvider(fakeClient(remoteRecord(remoteEnvelope, 'remote-2')));
    await screen.findByText('true:signed-in:conflict');

    await userEvent.click(screen.getByRole('button', { name: 'Remote' }));
    await screen.findByText('true:signed-in:synced');
    expect((await unlockVault(passphrase)).vault.settings.baseCurrency).toBe('GBP');
  });

  it('preserves a newer local write when remote conflict confirmation is stale', async () => {
    const local = await createVault(createEmptyVault('USD'), passphrase);
    const baselineEnvelope = await readEnvelope();
    await saveVault(
      { ...local.vault, settings: { ...local.vault.settings, baseCurrency: 'EUR' } },
      local.material,
    );
    const remoteEnvelope = await encrypted('GBP');
    saveCloudSyncMetadata({
      enabled: true,
      accountDigest: await opaqueIdentifierDigest('private-user'),
      baseline: createCloudSyncBaseline(
        'remote-1',
        await envelopeDigest(baselineEnvelope!),
        '2026-09-06T19:00:00.000Z',
      ),
    });
    renderProvider(fakeClient(remoteRecord(remoteEnvelope, 'remote-2')));
    await screen.findByText('true:signed-in:conflict');
    const newerLocal = await encrypted('CAD');
    await writeEnvelope(newerLocal);

    await userEvent.click(screen.getByRole('button', { name: 'Remote' }));

    await screen.findByText('true:signed-in:conflict');
    expect(await readEnvelope()).toEqual(newerLocal);
  });

  it('deletes the latest remote revision before disabling sync', async () => {
    const remoteEnvelope = await encrypted('USD');
    const client = fakeClient(remoteRecord(remoteEnvelope, 'remote-1'));
    saveCloudSyncMetadata({ enabled: true });
    renderProvider(client);
    await screen.findByText('true:signed-in:synced');

    await userEvent.click(screen.getByRole('button', { name: 'Delete remote' }));
    await screen.findByText('false:signed-in:idle');
    expect(client.deleteVault).toHaveBeenCalledWith('remote-1');
    expect(loadCloudSyncMetadata()).toEqual({ enabled: false });
  });
});
