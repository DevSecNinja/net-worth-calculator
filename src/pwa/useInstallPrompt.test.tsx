import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useInstallPrompt } from './useInstallPrompt';

function Harness() {
  const install = useInstallPrompt();
  return (
    <>
      <output>
        {install.canInstall ? 'available' : install.installed ? 'installed' : 'unavailable'}
      </output>
      <button type="button" onClick={() => void install.install()}>
        Install
      </button>
    </>
  );
}

describe('useInstallPrompt', () => {
  it('captures a supported prompt and invokes it only after user action', async () => {
    const user = userEvent.setup();
    const prompt = vi.fn(async () => undefined);
    render(<Harness />);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    });
    await act(() => {
      window.dispatchEvent(event);
    });
    expect(await screen.findByText('available')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Install' }));
    expect(prompt).toHaveBeenCalledOnce();
    expect(await screen.findByText('unavailable')).toBeVisible();
  });

  it('records app installation', async () => {
    render(<Harness />);
    await act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(await screen.findByText('installed')).toBeVisible();
  });
});
