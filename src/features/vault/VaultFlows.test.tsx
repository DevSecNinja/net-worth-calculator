import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import { createEmptyVault } from '@/domain/fixtures';
import { createEncryptedVault } from '@/storage/crypto';
import { deleteEnvelope, readEnvelope, writeEnvelope } from '@/storage/database';
import { VaultSessionLease } from '@/storage/sessionLease';
import { createVault } from '@/storage/vaultRepository';

describe('vault lifecycle', () => {
  beforeEach(async () => {
    window.location.hash = '#/';
    localStorage.clear();
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
    expect(await screen.findByRole('heading', { name: /everyday checking/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /emergency savings/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /broad-market index fund/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /retirement account/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /^home$/i })).toBeVisible();
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

  it('clears passphrases and destructive confirmation whenever dialogs close', async () => {
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

    await user.click(screen.getByRole('button', { name: /^change passphrase$/i }));
    await user.type(screen.getByLabelText(/current passphrase/i), 'sensitive current phrase');
    await user.type(screen.getByLabelText(/new passphrase/i), 'sensitive replacement phrase');
    await user.click(screen.getByRole('button', { name: /close change passphrase/i }));
    await user.click(screen.getByRole('button', { name: /^change passphrase$/i }));
    expect(screen.getByLabelText(/current passphrase/i)).toHaveValue('');
    expect(screen.getByLabelText(/new passphrase/i)).toHaveValue('');
    await user.click(screen.getByRole('button', { name: /close change passphrase/i }));

    await user.click(screen.getByRole('button', { name: /delete vault/i }));
    await user.type(screen.getByLabelText(/type delete/i), 'DELETE');
    await user.click(screen.getByRole('button', { name: /close delete encrypted vault/i }));
    await user.click(screen.getByRole('button', { name: /delete vault/i }));
    expect(screen.getByLabelText(/type delete/i)).toHaveValue('');
  });

  it('shows locked reset only for an existing vault and clears it on Escape', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );
    await screen.findByRole('heading', { name: /create your encrypted vault/i });
    expect(
      screen.queryByRole('button', { name: /delete local vault and start over/i }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/^passphrase$/i), 'correct horse battery staple');
    await user.type(screen.getByLabelText(/confirm passphrase/i), 'correct horse battery staple');
    await user.click(screen.getByRole('button', { name: /create empty vault/i }));
    await screen.findByRole('heading', { name: /build your first net worth snapshot/i });
    await user.click(screen.getByRole('button', { name: /lock vault/i }));
    const resetAction = await screen.findByRole('button', {
      name: /delete local vault and start over/i,
    });
    await user.click(resetAction);
    const dialog = await screen.findByRole('dialog', {
      name: /delete local vault and start over/i,
    });
    expect(dialog).toHaveTextContent(/passphrases cannot be recovered/i);
    expect(dialog).toHaveTextContent(/financial data will become inaccessible/i);
    expect(dialog).toHaveTextContent(/encrypted backup and the passphrase/i);
    expect(dialog).toHaveTextContent(/backup files are not deleted/i);
    expect(dialog).toHaveTextContent(/other devices or browser profiles are not affected/i);
    expect(
      within(dialog).getByRole('button', { name: /delete local vault forever/i }),
    ).toBeDisabled();

    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: /delete local vault and start over/i }),
      ).not.toBeInTheDocument(),
    );
    expect(resetAction).toHaveFocus();
    expect(await readEnvelope()).toBeDefined();
  });

  it('resets a locked vault without a passphrase and preserves non-sensitive preferences', async () => {
    localStorage.setItem('nwc-theme', 'dark');
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
    await user.click(screen.getByRole('button', { name: /lock vault/i }));
    await user.click(
      await screen.findByRole('button', { name: /delete local vault and start over/i }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: /delete local vault and start over/i,
    });
    expect(within(dialog).queryByLabelText(/^passphrase$/i)).not.toBeInTheDocument();
    const confirmation = within(dialog).getByLabelText(/type DELETE/i);
    await user.type(confirmation, 'wrong');
    expect(
      within(dialog).getByRole('button', { name: /delete local vault forever/i }),
    ).toBeDisabled();
    await user.clear(confirmation);
    await user.type(confirmation, 'DELETE');
    await user.click(within(dialog).getByRole('button', { name: /delete local vault forever/i }));

    await screen.findByRole('heading', { name: /create your encrypted vault/i });
    expect(localStorage.getItem('nwc-theme')).toBe('dark');
    expect(await readEnvelope()).toBeUndefined();

    await user.type(screen.getByLabelText(/^passphrase$/i), 'replacement horse battery staple');
    await user.type(
      screen.getByLabelText(/confirm passphrase/i),
      'replacement horse battery staple',
    );
    await user.click(screen.getByRole('button', { name: /create empty vault/i }));
    expect(
      await screen.findByRole('heading', { name: /build your first net worth snapshot/i }),
    ).toBeVisible();
  });

  it('refuses reset while another writer owns the lease and preserves the vault', async () => {
    await createVault(createEmptyVault('USD'), 'correct horse battery staple');
    const otherTab = new VaultSessionLease();
    expect(otherTab.acquire()).toBe(true);
    const user = userEvent.setup();
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );
    await screen.findByRole('heading', { name: /welcome back/i });
    await user.click(screen.getByRole('button', { name: /delete local vault and start over/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /delete local vault and start over/i,
    });
    await user.type(within(dialog).getByLabelText(/type DELETE/i), 'DELETE');
    await user.click(within(dialog).getByRole('button', { name: /delete local vault forever/i }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /lock or close that tab, then try again/i,
    );
    expect(await readEnvelope()).toBeDefined();
    otherTab.release();
  });

  it('refuses a stale locked reset without deleting the replacement vault', async () => {
    await createVault(createEmptyVault('USD'), 'correct horse battery staple');
    const user = userEvent.setup();
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );
    await screen.findByRole('heading', { name: /welcome back/i });
    await user.click(screen.getByRole('button', { name: /delete local vault and start over/i }));
    const replacement = await createEncryptedVault(
      createEmptyVault('EUR'),
      'replacement horse battery staple',
    );
    await writeEnvelope(replacement.envelope);
    const dialog = await screen.findByRole('dialog', {
      name: /delete local vault and start over/i,
    });
    await user.type(within(dialog).getByLabelText(/type DELETE/i), 'DELETE');
    await user.click(within(dialog).getByRole('button', { name: /delete local vault forever/i }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /vault changed after this confirmation opened/i,
    );
    expect(await readEnvelope()).toEqual(replacement.envelope);
  });

  it('localizes the complete locked reset flow in Dutch', async () => {
    localStorage.setItem('nwc-locale', 'nl-NL');
    await createVault(createEmptyVault('EUR'), 'correct horse battery staple');
    const user = userEvent.setup();
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );
    await screen.findByRole('heading', { name: /welkom terug/i });
    await user.click(
      screen.getByRole('button', { name: /lokale kluis verwijderen en opnieuw beginnen/i }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: /lokale kluis verwijderen en opnieuw beginnen/i,
    });
    expect(dialog).toHaveTextContent(/wachtzinnen kunnen niet worden hersteld/i);
    expect(dialog).toHaveTextContent(/andere apparaten of in andere browserprofielen/i);
    expect(within(dialog).getByLabelText(/typ VERWIJDEREN/i)).toBeVisible();
    expect(within(dialog).getByRole('button', { name: /definitief verwijderen/i })).toBeDisabled();
  });
});
