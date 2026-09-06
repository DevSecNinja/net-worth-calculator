import { render, screen } from '@testing-library/react';

import { LocaleProvider, localeStorageKey } from '@/features/locale/LocaleProvider';

import { DashboardSummary } from './DashboardSummary';

const snapshot = {
  asOfDate: '2025-12-31',
  year: 2025,
  assets: '2000',
  liabilities: '765.44',
  netWorth: '1234.56',
  yearlyChange: '1234.56',
  yearlyChangePercent: '12.34',
  completeness: 'complete' as const,
  assetSource: 'actual' as const,
  liabilitySource: 'projected' as const,
};

function renderSummary(locale: 'en-US' | 'en-GB' | 'nl-NL', currency: string) {
  localStorage.setItem(localeStorageKey, locale);
  return render(
    <LocaleProvider>
      <DashboardSummary snapshot={snapshot} currency={currency} locale={locale} />
    </LocaleProvider>,
  );
}

describe('DashboardSummary', () => {
  it('renders defined zero yearly change and percentage with a positive tone', () => {
    render(
      <DashboardSummary
        snapshot={{
          asOfDate: '2025-12-31',
          year: 2025,
          assets: '100',
          liabilities: '0',
          netWorth: '100',
          yearlyChange: '0',
          yearlyChangePercent: '0.00',
          completeness: 'complete',
          assetSource: 'actual',
          liabilitySource: 'projected',
        }}
        currency="USD"
        locale="en-US"
      />,
    );

    const yearlyChange = screen.getByText('Yearly change').closest('article');
    expect(yearlyChange).toHaveTextContent('$0.00');
    expect(yearlyChange).toHaveTextContent('0%');
    expect(yearlyChange).not.toHaveTextContent('Not defined');
    expect(yearlyChange).toHaveClass('metric-card--positive');
  });

  it.each([
    ['en-US', 'USD', '$1,234.56', '12.34%', 'Versus the same date last year.'],
    ['en-GB', 'GBP', '£1,234.56', '12.34%', 'Versus the same date last year.'],
    ['nl-NL', 'EUR', '€ 1.234,56', '12,34%', 'Ten opzichte van dezelfde datum vorig jaar.'],
  ] as const)(
    'renders localized exact As of change in %s',
    (locale, currency, amount, percent, description) => {
      renderSummary(locale, currency);

      const yearlyChange = screen
        .getByText(locale === 'nl-NL' ? 'Jaarlijkse wijziging' : 'Yearly change')
        .closest('article');
      expect(yearlyChange).toHaveTextContent(amount);
      expect(yearlyChange).toHaveTextContent(percent);
      expect(yearlyChange).toHaveAccessibleDescription(description);
    },
  );

  it('renders undefined only when the exact comparison is unavailable', () => {
    render(
      <DashboardSummary
        snapshot={{
          ...snapshot,
          yearlyChange: undefined,
          yearlyChangePercent: undefined,
        }}
        currency="USD"
        locale="en-US"
      />,
    );

    const yearlyChange = screen.getByText('Yearly change').closest('article');
    expect(yearlyChange).toHaveTextContent('Not defined');
    expect(yearlyChange).not.toHaveTextContent('%');
  });
});
