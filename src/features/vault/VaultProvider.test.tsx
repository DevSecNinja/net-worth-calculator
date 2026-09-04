import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { deleteEnvelope } from '@/storage/database';

import { VaultProvider, useVault } from './VaultProvider';

const passphrase = 'correct horse battery staple';

function Harness() {
  const vault = useVault();
  return (
    <>
      <output>
        {vault.status}:{vault.vault?.settings.baseCurrency ?? 'sealed'}
      </output>
      <button type="button" onClick={() => void vault.create(passphrase, 'USD', false)}>
        Create
      </button>
      <button
        type="button"
        onClick={() =>
          void vault.mutate((current) => ({
            ...current,
            settings: { ...current.settings, baseCurrency: 'EUR' },
          }))
        }
      >
        Mutate
      </button>
      <button type="button" onClick={vault.lock}>
        Lock
      </button>
    </>
  );
}

describe('VaultProvider operation generation', () => {
  beforeEach(async () => {
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
});
