import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import { useDirtyState } from '@/hooks/useDirtyState';
import { deleteEnvelope } from '@/storage/database';

function DirtyStateProbe() {
  const { dirtyNames } = useDirtyState();
  return <output aria-label="Unsaved forms">{dirtyNames.join(', ')}</output>;
}

describe('SettingsPage', () => {
  beforeEach(async () => {
    window.location.hash = '#/';
    await deleteEnvelope();
  });

  it('requires an explicit no-conversion confirmation and resets it when the choice changes', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <>
          <App />
          <DirtyStateProbe />
        </>
      </AppProviders>,
    );

    await user.type(await screen.findByLabelText(/^passphrase$/i), 'correct horse battery staple');
    expect(screen.getByRole('status', { name: /unsaved forms/i })).toHaveTextContent('Vault setup');
    await user.type(screen.getByLabelText(/confirm passphrase/i), 'correct horse battery staple');
    await user.click(screen.getByRole('button', { name: /create with sample data/i }));
    await screen.findByRole('heading', { name: /net worth dashboard/i });
    await user.click(await screen.findByRole('link', { name: /settings/i }));

    const currency = screen.getByLabelText(/^currency$/i);
    const apply = screen.getByRole('button', { name: /apply currency/i });
    await user.selectOptions(currency, 'EUR');
    expect(screen.getByRole('status', { name: /unsaved forms/i })).toHaveTextContent(
      'Currency settings',
    );
    expect(apply).toBeDisabled();
    await user.click(screen.getByLabelText(/reinterpreted as EUR, not converted/i));
    expect(apply).toBeEnabled();

    await user.selectOptions(currency, 'GBP');
    expect(apply).toBeDisabled();
    expect(screen.getByLabelText(/reinterpreted as GBP, not converted/i)).not.toBeChecked();
    await user.click(screen.getByLabelText(/reinterpreted as GBP, not converted/i));
    await user.click(apply);

    expect(
      await screen.findByText(/base currency changed to GBP. existing numbers were not converted/i),
    ).toBeInTheDocument();
    expect(apply).toBeDisabled();
    expect(screen.getByRole('status', { name: /unsaved forms/i })).toBeEmptyDOMElement();
  });
});
