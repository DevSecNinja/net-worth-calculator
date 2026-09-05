import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DashboardSnapshot } from '@/domain/model';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ data, children }: { data: unknown; children: ReactNode }) => (
    <div data-testid="annual-change-chart" data-series={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Cell: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

import { AnnualChangeChart } from './AnnualChangeChart';

const snapshots: DashboardSnapshot[] = [
  {
    asOfDate: '2024-12-31',
    year: 2024,
    assets: '100',
    liabilities: '0',
    netWorth: '100',
    completeness: 'complete',
    assetSource: 'actual',
    liabilitySource: 'projected',
  },
  {
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
  },
];

describe('AnnualChangeChart', () => {
  it('renders and charts defined zero change values', async () => {
    const user = userEvent.setup();
    render(<AnnualChangeChart snapshots={snapshots} currency="USD" locale="en-US" />);

    expect(JSON.parse(screen.getByTestId('annual-change-chart').dataset.series ?? '')).toEqual([
      { year: 2025, change: 0, changeExact: '0' },
    ]);
    await user.click(screen.getByText(/view annual net worth change data table/i));
    const rows = within(
      screen.getByRole('table', { name: /annual net worth change by calendar year/i }),
    ).getAllByRole('row');
    expect(rows[2]).toHaveTextContent('$0.00');
    expect(rows[2]).toHaveTextContent('0.00%');
    expect(rows[2]).not.toHaveTextContent('Not defined');
  });
});
