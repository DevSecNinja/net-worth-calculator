import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import { deleteEnvelope } from '@/storage/database';

describe('dashboard integration', () => {
  beforeEach(async () => {
    window.location.hash = '#/';
    await deleteEnvelope();
  });

  it('renders shared chart data and accessible tables from explicit sample values', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );
    await screen.findByRole('heading', { name: /create your encrypted vault/i });
    await user.type(screen.getByLabelText(/^passphrase$/i), 'correct horse battery staple');
    await user.type(screen.getByLabelText(/confirm passphrase/i), 'correct horse battery staple');
    await user.click(screen.getByRole('button', { name: /create with sample data/i }));

    expect(await screen.findByRole('heading', { name: /net worth dashboard/i })).toBeVisible();
    const methodologyLink = screen.getByRole('link', { name: /how net worth is calculated/i });
    expect(methodologyLink).toHaveAttribute('href', '#/about#methodology');
    await user.click(methodologyLink);
    expect(
      await screen.findByRole('heading', { name: /how this calculator defines net worth/i }),
    ).toBeVisible();
    await user.click(screen.getByRole('link', { name: /^dashboard$/i }));
    expect(screen.getByRole('heading', { name: /net worth trend/i })).toBeVisible();
    await user.click(screen.getByText(/view net worth trend data table/i));
    await user.click(screen.getByText(/view assets and liabilities data table/i));
    await user.click(screen.getByText(/view asset allocation data table/i));
    await user.click(screen.getByText(/view liability payoff data table/i));
    expect(
      screen.getByRole('table', { name: /net worth trend by calendar year/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: /assets and liabilities by calendar year/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /asset allocation/i })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /liability payoff/i })).toBeInTheDocument();
  });
});
