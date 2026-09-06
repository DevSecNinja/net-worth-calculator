import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { LocaleProvider } from '@/features/locale/LocaleProvider';

const { retryCapabilities } = vi.hoisted(() => ({
  retryCapabilities: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/vault/useVault', () => ({
  useVault: () => ({
    busy: false,
    capabilityIssue: 'web-crypto',
    create: vi.fn(),
    retryCapabilities,
  }),
}));
vi.mock('@/hooks/useDirtyState', () => ({
  useDirtyState: () => ({ setDirty: vi.fn() }),
}));

import { OnboardingPage } from './OnboardingPage';

describe('OnboardingPage browser capabilities', () => {
  it('blocks passphrase submission before use when secure cryptography is unavailable', () => {
    render(
      <LocaleProvider>
        <MemoryRouter>
          <OnboardingPage />
        </MemoryRouter>
      </LocaleProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Secure browser cryptography is unavailable.',
    );
    expect(screen.getByLabelText(/^passphrase$/i)).toBeDisabled();
    expect(screen.getByLabelText(/confirm passphrase/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /create empty vault/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /create with sample data/i })).toBeDisabled();
    const retry = screen.getByRole('button', { name: /check again/i });
    expect(retry).toBeEnabled();
    fireEvent.click(retry);
    expect(retryCapabilities).toHaveBeenCalledOnce();
  });
});
