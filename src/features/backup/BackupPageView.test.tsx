import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LocaleProvider, localeStorageKey } from '@/features/locale/LocaleProvider';

const mocks = vi.hoisted(() => ({
  saveBackupFile: vi.fn(),
}));

vi.mock('@/features/vault/useVault', () => ({
  useVault: () => ({
    replaceImportedVault: vi.fn(),
    busy: false,
    status: 'unlocked',
  }),
}));

vi.mock('@/storage/files', () => ({
  openBackupFile: vi.fn(),
  saveBackupFile: mocks.saveBackupFile,
}));

vi.mock('./backup', () => ({
  backupFilename: () => 'net-worth-backup.nwvault',
  createBackupJson: () => Promise.resolve('{}'),
  prepareBackupImport: vi.fn(),
}));

import { BackupPage } from './BackupPage';

describe('BackupPage operation failures', () => {
  it('shows a specific localized export failure for a non-Error rejection', async () => {
    mocks.saveBackupFile.mockRejectedValue('export failed');
    localStorage.setItem(localeStorageKey, 'nl-NL');
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <BackupPage />
      </LocaleProvider>,
    );

    await user.click(screen.getByRole('button', { name: /versleutelde back-up opslaan/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'De versleutelde back-up kon niet worden geëxporteerd.',
    );
  });
});
