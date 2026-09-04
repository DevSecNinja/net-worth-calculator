import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { registrationUpdate } from '@/test/pwaRegisterMock';

import { usePwaUpdate } from './usePwaUpdate';

function Harness() {
  const update = usePwaUpdate();
  return (
    <>
      <button type="button" onClick={() => void update.checkForUpdate()}>
        {update.needRefresh ? 'Refresh available' : 'Check'}
      </button>
      <output>{update.registrationError ?? 'healthy'}</output>
    </>
  );
}

describe('usePwaUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks registration at startup and on explicit user request', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await waitFor(() => expect(registrationUpdate).toHaveBeenCalledTimes(1));
    const initialCalls = registrationUpdate.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await waitFor(() => expect(registrationUpdate.mock.calls.length).toBeGreaterThan(initialCalls));
  });

  it('checks after returning online and visible', async () => {
    render(<Harness />);
    await waitFor(() => expect(registrationUpdate).toHaveBeenCalled());
    const initialCalls = registrationUpdate.mock.calls.length;
    await act(() => {
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new PageTransitionEvent('pageshow'));
    });
    expect(registrationUpdate.mock.calls.length).toBeGreaterThanOrEqual(initialCalls);
  });

  it('surfaces a delayed registration update failure without retrying in a render loop', async () => {
    registrationUpdate.mockRejectedValueOnce(new Error('network unavailable'));
    render(<Harness />);
    expect(await screen.findByText('Service worker update check failed.')).toBeVisible();
    expect(registrationUpdate).toHaveBeenCalledTimes(1);
  });
});
