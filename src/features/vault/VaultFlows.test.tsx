import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import { deleteEnvelope } from '@/storage/database';

describe('vault lifecycle', () => {
  beforeEach(async () => {
    window.location.hash = '#/';
    await deleteEnvelope();
  });

  it('creates, locks, rejects a wrong passphrase, changes passphrase, and deletes', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    expect(
      await screen.findByRole('heading', { name: /create your encrypted vault/i }),
    ).toBeVisible();
    await user.type(screen.getByLabelText(/^passphrase$/i), 'correct horse battery staple');
    await user.type(screen.getByLabelText(/confirm passphrase/i), 'correct horse battery staple');
    await user.click(screen.getByRole('button', { name: /create empty vault/i }));
    expect(
      await screen.findByRole('heading', { name: /build your first net worth snapshot/i }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: /lock vault/i }));
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeVisible();
    await user.type(screen.getByLabelText(/^passphrase$/i), 'wrong passphrase that is long');
    await user.click(screen.getByRole('button', { name: /unlock vault/i }));
    expect(
      await screen.findByText(/incorrect or the vault cannot be authenticated/i),
    ).toBeVisible();

    await user.clear(screen.getByLabelText(/^passphrase$/i));
    await user.type(screen.getByLabelText(/^passphrase$/i), 'correct horse battery staple');
    await user.click(screen.getByRole('button', { name: /unlock vault/i }));
    expect(
      await screen.findByRole('heading', { name: /build your first net worth snapshot/i }),
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /^change passphrase$/i }));
    const passphraseDialog = screen.getByRole('dialog', { name: /change passphrase/i });
    await user.type(screen.getByLabelText(/current passphrase/i), 'correct horse battery staple');
    await user.type(screen.getByLabelText(/new passphrase/i), 'another horse battery staple');
    await user.type(screen.getByLabelText(/confirm passphrase/i), 'another horse battery staple');
    await user.click(
      within(passphraseDialog).getByRole('button', { name: /^change passphrase$/i }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /change passphrase/i })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /delete vault/i }));
    await user.type(screen.getByLabelText(/type delete/i), 'DELETE');
    await user.click(screen.getByRole('button', { name: /delete vault forever/i }));
    expect(
      await screen.findByRole('heading', { name: /create your encrypted vault/i }),
    ).toBeVisible();
  });

  it('creates sample data only through the explicit sample action', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );
    await screen.findByRole('heading', { name: /create your encrypted vault/i });
    await user.type(screen.getByLabelText(/^passphrase$/i), 'correct horse battery staple');
    await user.type(screen.getByLabelText(/confirm passphrase/i), 'correct horse battery staple');
    await user.click(screen.getByRole('button', { name: /create with sample data/i }));
    expect(await screen.findByRole('heading', { name: /net worth dashboard/i })).toBeVisible();
    await user.click(screen.getByRole('link', { name: /assets/i }));
    expect(await screen.findByRole('heading', { name: /sample emergency fund/i })).toBeVisible();
  });

  it('closes destructive confirmation when the writable lease is lost', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );
    await screen.findByRole('heading', { name: /create your encrypted vault/i });
    await user.type(screen.getByLabelText(/^passphrase$/i), 'correct horse battery staple');
    await user.type(screen.getByLabelText(/confirm passphrase/i), 'correct horse battery staple');
    await user.click(screen.getByRole('button', { name: /create empty vault/i }));
    await screen.findByRole('heading', { name: /build your first net worth snapshot/i });
    await user.click(screen.getByRole('link', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /delete vault/i }));
    expect(screen.getByRole('dialog', { name: /delete encrypted vault/i })).toBeVisible();

    await act(() => {
      localStorage.setItem(
        'nwc-vault-lease',
        JSON.stringify({ owner: 'different-tab', expiresAt: Date.now() + 20_000 }),
      );
      window.dispatchEvent(new StorageEvent('storage', { key: 'nwc-vault-lease' }));
    });

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: /delete encrypted vault/i }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: /vault settings are locked/i })).toBeVisible();
  });
});
