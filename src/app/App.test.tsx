import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LocaleProvider, localeStorageKey } from '@/features/locale/LocaleProvider';

const mocks = vi.hoisted(() => ({
  clearError: vi.fn(),
}));

vi.mock('@/features/vault/useVault', () => ({
  useVault: () => ({
    clearError: mocks.clearError,
    error: 'The vault changed elsewhere. Lock and unlock before trying again.',
    status: 'unlocked',
  }),
}));

import { VaultErrorBanner } from './App';

describe('VaultErrorBanner', () => {
  it('localizes the operation error and dismiss action', async () => {
    localStorage.setItem(localeStorageKey, 'nl-NL');
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <VaultErrorBanner />
      </LocaleProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'De kluis is elders gewijzigd. Vergrendel en ontgrendel opnieuw.',
    );
    await user.click(screen.getByRole('button', { name: 'Negeren' }));
    expect(mocks.clearError).toHaveBeenCalledOnce();
  });
});
