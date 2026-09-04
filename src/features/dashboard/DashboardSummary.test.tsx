import { render, screen } from '@testing-library/react';

import { DashboardSummary } from './DashboardSummary';

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
});
