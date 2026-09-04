import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Dialog } from './Dialog';

function DialogHarness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      title="Test dialog"
      onClose={() => {
        onClose();
        setOpen(false);
      }}
    >
      Dialog content
    </Dialog>
  );
}

describe('Dialog', () => {
  beforeEach(() => {
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function close(
      this: HTMLDialogElement,
    ) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    });
  });

  it('calls onClose once when the close button is used', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<DialogHarness onClose={onClose} />);
    const dialog = screen.getByRole('dialog');

    await user.click(screen.getByRole('button', { name: /close test dialog/i }));

    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose once when cancellation is requested', async () => {
    const onClose = vi.fn();
    render(<DialogHarness onClose={onClose} />);
    const dialog = screen.getByRole('dialog');

    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));

    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
