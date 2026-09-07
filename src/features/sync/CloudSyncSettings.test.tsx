import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LocaleProvider } from '@/features/locale/LocaleProvider';

const sync = vi.hoisted(() => ({
  configured: true,
  enabled: true,
  authentication: 'signed-in' as const,
  phase: 'conflict' as const,
  lastSyncedAt: '2026-09-06T19:00:00.000Z',
  remoteModifiedAt: '2026-09-06T20:00:00.000Z',
  conflictHasLocal: true,
  conflictHasRemote: true,
  enable: vi.fn(),
  prepareAuthentication: vi.fn().mockResolvedValue(undefined),
  syncNow: vi.fn(),
  resolveWithLocal: vi.fn().mockResolvedValue(undefined),
  resolveWithRemote: vi.fn().mockResolvedValue(undefined),
  disable: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn(),
}));

vi.mock('./CloudSyncProvider', () => ({ useCloudSync: () => sync }));

import { CloudSyncSettings } from './CloudSyncSettings';

describe('CloudSyncSettings', () => {
  it('presents an explicit accessible conflict choice and authenticates remote replacement', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <CloudSyncSettings />
      </LocaleProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Nothing has been overwritten');
    await user.click(screen.getByRole('button', { name: 'Use iCloud vault' }));
    const dialog = screen.getByRole('dialog', { name: 'Replace local vault from iCloud' });
    const replace = screen.getByRole('button', { name: 'Replace local vault' });
    expect(replace).toBeDisabled();
    await user.type(screen.getByLabelText('Passphrase'), 'correct horse battery staple');
    await user.click(replace);

    expect(sync.resolveWithRemote).toHaveBeenCalledWith('correct horse battery staple');
    expect(dialog).not.toHaveAttribute('open');
  });

  it('requires a separate choice before deleting the remote copy', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <CloudSyncSettings />
      </LocaleProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Disable sync' }));
    const dialog = screen.getByRole('dialog', { name: 'Disable iCloud sync' });
    await user.click(screen.getByRole('button', { name: 'Delete cloud copy and disable' }));
    expect(sync.disable).toHaveBeenCalledWith(true);
    expect(dialog).not.toHaveAttribute('open');
  });
});
