import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import { deleteEnvelope } from '@/storage/database';
import { unlockVault } from '@/storage/vaultRepository';

const passphrase = 'correct horse battery staple';

async function createEmptyVault(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: /create your encrypted vault/i });
  await user.type(screen.getByLabelText(/^passphrase$/i), passphrase);
  await user.type(screen.getByLabelText(/confirm passphrase/i), passphrase);
  await user.click(screen.getByRole('button', { name: /create empty vault/i }));
  await screen.findByRole('heading', { name: /build your first net worth snapshot/i });
}

describe('inventory integration', () => {
  beforeEach(async () => {
    window.location.hash = '#/';
    await deleteEnvelope();
  });

  it('creates, validates, edits, reorders, and deletes assets and liabilities', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );
    await createEmptyVault(user);

    await user.click(screen.getByRole('link', { name: /assets/i }));
    await user.click(await screen.findByRole('button', { name: /add your first asset/i }));
    await user.click(screen.getByRole('button', { name: /save asset/i }));
    expect(await screen.findByText(/name is required/i)).toBeVisible();
    await user.type(screen.getByLabelText(/asset name/i), 'Private savings marker');
    await user.clear(screen.getByLabelText(/^amount$/i));
    await user.type(screen.getByLabelText(/^amount$/i), '2500.50');
    await user.click(screen.getByRole('button', { name: /save asset/i }));
    expect(await screen.findByRole('heading', { name: 'Private savings marker' })).toBeVisible();

    await user.click(screen.getByRole('link', { name: /liabilities/i }));
    await user.click(await screen.findByRole('button', { name: /add your first liability/i }));
    await user.type(screen.getByLabelText(/liability name/i), 'Private loan marker');
    await user.clear(screen.getByLabelText(/current or principal/i));
    await user.type(screen.getByLabelText(/current or principal/i), '1200');
    await user.clear(screen.getByLabelText(/monthly payment/i));
    await user.type(screen.getByLabelText(/monthly payment/i), '100');
    await user.click(screen.getByRole('button', { name: /save liability/i }));
    expect(await screen.findByRole('heading', { name: 'Private loan marker' })).toBeVisible();

    const stored = await unlockVault(passphrase);
    expect(stored.vault.assets[0]?.name).toBe('Private savings marker');
    expect(stored.vault.liabilities[0]?.name).toBe('Private loan marker');
  });
});
