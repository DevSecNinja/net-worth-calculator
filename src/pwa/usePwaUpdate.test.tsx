import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  registrationUpdate,
  setPwaNeedRefresh,
  setPwaRegistrationDelay,
} from '@/test/pwaRegisterMock';

import { usePwaUpdate } from './usePwaUpdate';

function Harness() {
  const update = usePwaUpdate();
  return (
    <>
      <button type="button" onClick={() => void update.checkForUpdate()}>
        {update.needRefresh ? 'Refresh available' : 'Check'}
      </button>
      <button type="button" onClick={update.dismissRefresh}>
        Later
      </button>
      <output>{update.registrationError ?? 'healthy'}</output>
    </>
  );
}

describe('usePwaUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPwaRegistrationDelay(0);
    setPwaNeedRefresh(false);
  });

  it('checks registration at startup and on explicit user request', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await waitFor(() => expect(registrationUpdate).toHaveBeenCalledTimes(1));
    const initialCalls = registrationUpdate.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await waitFor(() => expect(registrationUpdate.mock.calls.length).toBeGreaterThan(initialCalls));
  });

  it('checks a delayed asynchronous registration when it becomes available', async () => {
    setPwaRegistrationDelay(50);
    render(<Harness />);
    expect(registrationUpdate).not.toHaveBeenCalled();
    await waitFor(() => expect(registrationUpdate).toHaveBeenCalledOnce());
  });

  it('throttles lifecycle checks for an hour and preserves the timestamp when dismissed', async () => {
    const user = userEvent.setup();
    const now = 1_000_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    render(<Harness />);
    await waitFor(() => expect(registrationUpdate).toHaveBeenCalledOnce());
    await user.click(screen.getByRole('button', { name: 'Later' }));
    await act(() => {
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new PageTransitionEvent('pageshow'));
    });
    expect(registrationUpdate).toHaveBeenCalledOnce();

    clock.mockReturnValue(now + 60 * 60 * 1000 + 1);
    await act(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow'));
    });
    expect(registrationUpdate).toHaveBeenCalledTimes(2);
  });

  it('surfaces a delayed registration update failure without retrying in a render loop', async () => {
    registrationUpdate.mockRejectedValueOnce(new Error('network unavailable'));
    render(<Harness />);
    expect(await screen.findByText('Service worker update check failed.')).toBeVisible();
    expect(registrationUpdate).toHaveBeenCalledTimes(1);
  });

  it('does not present a first installation as an update', async () => {
    setPwaNeedRefresh(true);
    render(<Harness />);
    await waitFor(() => expect(registrationUpdate).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Check' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Refresh available' })).not.toBeInTheDocument();
  });
});
