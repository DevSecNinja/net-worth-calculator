import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AppStatusProvider } from '@/components/ui/AppStatus';
import { DirtyStateProvider, useDirtyState } from '@/hooks/useDirtyState';

const mocks = vi.hoisted(() => ({
  update: {
    needRefresh: true,
    offlineReady: true,
    registrationError: undefined as string | undefined,
    dismissRefresh: vi.fn(),
    dismissOfflineReady: vi.fn(),
    activateUpdate: vi.fn(async () => undefined),
    checkForUpdate: vi.fn(async () => undefined),
  },
  install: {
    canInstall: true,
    installed: false,
    install: vi.fn(async () => undefined),
  },
}));

vi.mock('./usePwaUpdate', () => ({ usePwaUpdate: () => mocks.update }));
vi.mock('./useInstallPrompt', () => ({ useInstallPrompt: () => mocks.install }));

import { PwaStatus } from './PwaStatus';

function DirtyHarness() {
  const { setDirty } = useDirtyState();
  return (
    <button type="button" onClick={() => setDirty('Asset editor', true)}>
      Make dirty
    </button>
  );
}

function renderStatus() {
  return render(
    <AppStatusProvider>
      <DirtyStateProvider>
        <DirtyHarness />
        <PwaStatus />
      </DirtyStateProvider>
    </AppStatusProvider>,
  );
}

describe('PwaStatus', () => {
  it('shows install, offline-ready, and explicit update actions', async () => {
    const user = userEvent.setup();
    renderStatus();
    await user.click(screen.getByRole('button', { name: /install app/i }));
    expect(mocks.install.install).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(mocks.update.dismissOfflineReady).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: /update now/i }));
    await waitFor(() => expect(mocks.update.activateUpdate).toHaveBeenCalledOnce());
  });

  it('requires explicit resolution before discarding dirty edits', async () => {
    const user = userEvent.setup();
    renderStatus();
    await user.click(screen.getByRole('button', { name: /make dirty/i }));
    await user.click(screen.getByRole('button', { name: /update now/i }));
    expect(await screen.findByRole('dialog', { name: /unsaved edits/i })).toBeVisible();
    expect(screen.getByText('Asset editor')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /discard drafts and update/i }));
    expect(mocks.update.activateUpdate).toHaveBeenCalled();
  });

  it('announces real offline and online events', async () => {
    renderStatus();
    await act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/offline - encrypted local data/i)).toBeVisible();
    await act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(/offline - encrypted local data/i)).not.toBeInTheDocument();
  });
});
