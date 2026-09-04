import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useTheme, ThemeProvider } from './ThemeProvider';

function ThemeHarness() {
  const { preference, effectiveTheme, setPreference } = useTheme();
  return (
    <>
      <output>
        {preference}:{effectiveTheme}
      </output>
      <button type="button" onClick={() => setPreference('dark')}>
        Dark
      </button>
      <button type="button" onClick={() => setPreference('system')}>
        System
      </button>
    </>
  );
}

describe('ThemeProvider', () => {
  it('persists explicit themes without vault access', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(screen.getByText('dark:dark')).toBeVisible();
    expect(localStorage.getItem('nwc-theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('uses the current system theme when System is selected', async () => {
    localStorage.setItem('nwc-theme', 'system');
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );
    expect(screen.getByText('system:light')).toBeVisible();
  });

  it('defaults invalid storage and responds live to system changes', async () => {
    let listener: ((event: MediaQueryListEvent) => void) | undefined;
    localStorage.setItem('nwc-theme', 'invalid');
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addEventListener: (_name: string, next: (event: MediaQueryListEvent) => void) => {
          listener = next;
        },
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );
    expect(screen.getByText('system:light')).toBeVisible();
    await act(() => {
      listener?.({ matches: true } as MediaQueryListEvent);
    });
    expect(screen.getByText('system:dark')).toBeVisible();
  });
});
