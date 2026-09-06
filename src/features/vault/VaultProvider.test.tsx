import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createEmptyVault } from '@/domain/fixtures';
import { createEncryptedVault } from '@/storage/crypto';
import { deleteEnvelope, readEnvelope, writeEnvelope } from '@/storage/database';
import { vaultEventsContract } from '@/storage/vaultEvents';
import { createVault, unlockVault } from '@/storage/vaultRepository';

import { type ImportedVault, VaultProvider, useVault } from './VaultProvider';

const passphrase = 'correct horse battery staple';

function Harness({ imported }: { imported?: ImportedVault }) {
  const vault = useVault();
  const [operationError, setOperationError] = useState('');
  return (
    <>
      <output>
        {vault.status}:{vault.vault?.settings.baseCurrency ?? 'sealed'}
      </output>
      <output aria-label="Capability issue">{vault.capabilityIssue ?? 'available'}</output>
      <button type="button" onClick={() => void vault.create(passphrase, 'USD', false)}>
        Create
      </button>
      <button
        type="button"
        onClick={() =>
          void vault
            .mutate((current) => ({
              ...current,
              settings: { ...current.settings, baseCurrency: 'EUR' },
            }))
            .catch((error: unknown) => {
              setOperationError(error instanceof Error ? error.message : 'Mutation failed');
            })
        }
      >
        Mutate
      </button>
      <button type="button" onClick={vault.lock}>
        Lock
      </button>
      <button type="button" onClick={() => void vault.retryCapabilities()}>
        Retry capabilities
      </button>
      <button
        type="button"
        onClick={() =>
          void vault.prepareLockedVaultReset().catch((error: unknown) => {
            setOperationError(error instanceof Error ? error.message : 'Prepare failed');
          })
        }
      >
        Prepare reset
      </button>
      <button
        type="button"
        onClick={() =>
          void vault.resetLockedVault().catch((error: unknown) => {
            setOperationError(error instanceof Error ? error.message : 'Reset failed');
          })
        }
      >
        Reset locked
      </button>
      {imported ? (
        <button
          type="button"
          onClick={() =>
            void vault.replaceImportedVault(imported).catch((error: unknown) => {
              setOperationError(error instanceof Error ? error.message : 'Restore failed');
            })
          }
        >
          Restore
        </button>
      ) : null}
      <output aria-label="Operation error">{operationError}</output>
    </>
  );
}

describe('VaultProvider operation generation', () => {
  beforeEach(async () => {
    localStorage.clear();
    await deleteEnvelope();
  });

  it('does not restore plaintext state when locked during an async mutation', async () => {
    const user = userEvent.setup();
    render(
      <VaultProvider>
        <Harness />
      </VaultProvider>,
    );
    await screen.findByText('absent:sealed');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByText('unlocked:USD');

    let release!: () => void;
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });

    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const originalEncrypt = crypto.subtle.encrypt.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, 'encrypt').mockImplementation(async (algorithm, key, data) => {
      signalStarted();
      await gate;
      return originalEncrypt(algorithm, key, data);
    });

    await user.click(screen.getByRole('button', { name: 'Mutate' }));
    await started;
    await user.click(screen.getByRole('button', { name: 'Lock' }));
    release();
    await waitFor(() => expect(screen.getByText('locked:sealed')).toBeVisible());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByText('locked:sealed')).toBeVisible();
  });

  it('does not publish an unlocked session before the encrypted create commit finishes', async () => {
    const user = userEvent.setup();
    render(
      <VaultProvider>
        <Harness />
      </VaultProvider>,
    );
    await screen.findByText('absent:sealed');

    let release!: () => void;
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const originalEncrypt = crypto.subtle.encrypt.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, 'encrypt').mockImplementation(async (algorithm, key, data) => {
      signalStarted();
      await gate;
      return originalEncrypt(algorithm, key, data);
    });

    await user.click(screen.getByRole('button', { name: 'Create' }));
    await started;
    expect(screen.getByText('absent:sealed')).toBeVisible();
    expect(await readEnvelope()).toBeUndefined();

    release();
    await screen.findByText('unlocked:USD');
    expect(await readEnvelope()).toBeDefined();
  });

  it('clears a transient capability issue when the user retries', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Restricted for this context.', 'SecurityError');
    });
    const user = userEvent.setup();
    render(
      <VaultProvider>
        <Harness />
      </VaultProvider>,
    );
    await screen.findByText('absent:sealed');
    expect(screen.getByRole('status', { name: 'Capability issue' })).toHaveTextContent(
      'local-storage',
    );

    setItem.mockRestore();
    await user.click(screen.getByRole('button', { name: 'Retry capabilities' }));
    expect(screen.getByRole('status', { name: 'Capability issue' })).toHaveTextContent('available');

    await user.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByText('unlocked:USD');
  });

  it('locks and clears in-memory material synchronously when the page is hidden', async () => {
    const user = userEvent.setup();
    render(
      <VaultProvider>
        <Harness />
      </VaultProvider>,
    );
    await screen.findByText('absent:sealed');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByText('unlocked:USD');

    await act(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    });
    expect(screen.getByText('locked:sealed')).toBeVisible();
  });

  it('rejects an overlapping mutation without suppressing the committed state', async () => {
    const user = userEvent.setup();
    render(
      <VaultProvider>
        <Harness />
      </VaultProvider>,
    );
    await screen.findByText('absent:sealed');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByText('unlocked:USD');

    let release!: () => void;
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const originalEncrypt = crypto.subtle.encrypt.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, 'encrypt').mockImplementation(async (algorithm, key, data) => {
      signalStarted();
      await gate;
      return originalEncrypt(algorithm, key, data);
    });

    await user.click(screen.getByRole('button', { name: 'Mutate' }));
    await started;
    await user.click(screen.getByRole('button', { name: 'Mutate' }));
    expect(screen.getByRole('status', { name: 'Operation error' })).toHaveTextContent(
      'Another vault change is still being saved.',
    );
    release();
    await screen.findByText('unlocked:EUR');
  });

  it('restores an encrypted backup when no vault exists', async () => {
    const restoredVault = createEmptyVault('EUR');
    const encrypted = await createEncryptedVault(restoredVault, passphrase);
    const imported = {
      envelope: encrypted.envelope,
      vault: restoredVault,
      material: encrypted.material,
    };
    const user = userEvent.setup();
    render(
      <VaultProvider>
        <Harness imported={imported} />
      </VaultProvider>,
    );
    await screen.findByText('absent:sealed');
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    await screen.findByText('unlocked:EUR');
    expect((await unlockVault(passphrase)).vault.settings.baseCurrency).toBe('EUR');
  });

  it('moves a locked tab to absent after a confirmed deletion event', async () => {
    await createVault(createEmptyVault('USD'), passphrase);
    render(
      <VaultProvider>
        <Harness />
      </VaultProvider>,
    );
    await screen.findByText('locked:sealed');
    await deleteEnvelope();

    await act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: vaultEventsContract.storageKey,
          newValue: vaultEventsContract.deletedEvent,
        }),
      );
    });

    await screen.findByText('absent:sealed');
  });

  it('keeps a replacement vault locked after a delayed deletion event', async () => {
    await createVault(createEmptyVault('USD'), passphrase);
    render(
      <VaultProvider>
        <Harness />
      </VaultProvider>,
    );
    await screen.findByText('locked:sealed');
    const replacement = await createEncryptedVault(createEmptyVault('EUR'), passphrase);
    await writeEnvelope(replacement.envelope);

    await act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: vaultEventsContract.storageKey,
          newValue: vaultEventsContract.deletedEvent,
        }),
      );
    });

    await waitFor(() => expect(screen.getByText('locked:sealed')).toBeVisible());
    expect(await readEnvelope()).toEqual(replacement.envelope);
  });

  it('does not invalidate an active operation for a stale deletion event', async () => {
    const user = userEvent.setup();
    render(
      <VaultProvider>
        <Harness />
      </VaultProvider>,
    );
    await screen.findByText('absent:sealed');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByText('unlocked:USD');

    await act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: vaultEventsContract.storageKey,
          newValue: vaultEventsContract.deletedEvent,
        }),
      );
    });
    await user.click(screen.getByRole('button', { name: 'Mutate' }));

    await screen.findByText('unlocked:EUR');
  });
});
