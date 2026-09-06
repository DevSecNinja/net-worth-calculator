import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AppFooter } from '@/components/ui/AppFooter';
import { LocaleProvider, localeStorageKey } from '@/features/locale/LocaleProvider';
import { buildLabel, packageVersion } from '../../../tests/helpers/packageMetadata';

import { AboutPage } from './AboutPage';

const testCommit = '0123456789abcdef0123456789abcdef01234567';

describe('AboutPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('states the local-only privacy boundaries and exact package/build identity', () => {
    render(
      <LocaleProvider>
        <MemoryRouter initialEntries={['/about']}>
          <AboutPage />
          <AppFooter />
        </MemoryRouter>
      </LocaleProvider>,
    );

    expect(screen.getByText(/no account system, database server/i)).toHaveTextContent(
      /analytics, advertising, telemetry, remote fonts, or runtime third-party requests/i,
    );
    expect(screen.getByText(/complete vault is authenticated and encrypted/i)).toHaveTextContent(
      /Cache Storage contains the app shell, never vault data/i,
    );
    expect(screen.getByText(new RegExp(`Version v${packageVersion}`))).toBeVisible();

    const buildLinks = screen.getAllByRole('link', {
      name: new RegExp(`${packageVersion}|${testCommit.slice(0, 7)}`),
    });
    expect(buildLinks).toHaveLength(2);
    for (const link of buildLinks) {
      expect(link).toHaveAttribute(
        'href',
        `https://github.com/DevSecNinja/net-worth-calculator/commit/${testCommit}`,
      );
    }
    expect(screen.getByText(buildLabel(testCommit))).toBeVisible();
  });

  it.each([
    [
      'en-US',
      'How this calculator defines net worth',
      '$500,000.00',
      'Expenses are not automatically liabilities',
    ],
    [
      'en-GB',
      'How this calculator defines net worth',
      '£500,000.00',
      'Expenses are not automatically liabilities',
    ],
    [
      'nl-NL',
      'Zo definieert deze calculator nettovermogen',
      '€ 500.000,00',
      'Uitgaven zijn niet automatisch schulden',
    ],
  ] as const)(
    'explains the complete balance-sheet methodology in %s',
    (locale, heading, home, expenses) => {
      localStorage.setItem(localeStorageKey, locale);
      render(
        <LocaleProvider>
          <MemoryRouter initialEntries={['/about']}>
            <AboutPage />
          </MemoryRouter>
        </LocaleProvider>,
      );

      expect(screen.getByRole('heading', { name: heading })).toBeVisible();
      expect(
        screen.getByText(new RegExp(home.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))),
      ).toHaveTextContent(/250/);
      expect(screen.getByRole('heading', { name: expenses })).toBeVisible();
      expect(screen.getByText(/Rich Dad|Rich Dad-omschrijving/)).toHaveTextContent(
        /cash-flow heuristic|kasstroomheuristiek/,
      );
    },
  );

  it('formats the example with a supplied vault currency', () => {
    localStorage.setItem(localeStorageKey, 'en-GB');
    render(
      <LocaleProvider>
        <MemoryRouter initialEntries={['/about']}>
          <AboutPage currency="EUR" />
        </MemoryRouter>
      </LocaleProvider>,
    );

    expect(screen.getByText(/home asset minus/i)).toHaveTextContent(/€500,000\.00/);
  });
});
