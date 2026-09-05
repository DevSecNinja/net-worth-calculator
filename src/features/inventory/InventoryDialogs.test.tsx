import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LocaleProvider, localeStorageKey } from '@/features/locale/LocaleProvider';
import { DirtyStateProvider } from '@/hooks/useDirtyState';

import { AssetDialog } from './AssetDialog';
import { LiabilityDialog } from './LiabilityDialog';

function renderDialog(dialog: ReactNode) {
  localStorage.setItem(localeStorageKey, 'nl-NL');
  return render(
    <LocaleProvider>
      <DirtyStateProvider>{dialog}</DirtyStateProvider>
    </LocaleProvider>,
  );
}

describe('localized inventory dialog failures', () => {
  it('localizes a non-Error asset save failure', async () => {
    const user = userEvent.setup();
    renderDialog(
      <AssetDialog
        open
        order={0}
        currency="EUR"
        busy={false}
        onClose={vi.fn()}
        onSave={() => Promise.reject('save failed')}
      />,
    );

    await user.type(screen.getByLabelText(/naam bezit/i), 'Spaarrekening');
    await user.click(screen.getByRole('button', { name: /bezit opslaan/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Het bezit kon niet worden opgeslagen.',
    );
  });

  it('localizes a non-Error liability save failure', async () => {
    const user = userEvent.setup();
    renderDialog(
      <LiabilityDialog
        open
        order={0}
        currency="EUR"
        busy={false}
        onClose={vi.fn()}
        onSave={() => Promise.reject('save failed')}
      />,
    );

    await user.type(screen.getByLabelText(/naam schuld/i), 'Hypotheek');
    await user.click(screen.getByRole('button', { name: /schuld opslaan/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'De schuld kon niet worden opgeslagen.',
    );
  });
});
