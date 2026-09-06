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
import { AppErrorBoundary } from './AppErrorBoundary';

function BrokenScreen(): never {
  throw new Error('internal-only diagnostic detail');
}

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

describe('AppErrorBoundary', () => {
  it('renders localized recovery guidance without exposing the internal error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <LocaleProvider>
        <AppErrorBoundary>
          <BrokenScreen />
        </AppErrorBoundary>
      </LocaleProvider>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The app could not continue safely.');
    expect(alert).toHaveTextContent('Reload to return to the locked vault.');
    expect(alert).not.toHaveTextContent('internal-only diagnostic detail');
  });
});
