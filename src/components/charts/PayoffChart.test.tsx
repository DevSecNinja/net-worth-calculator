import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';

import type { Liability, LiabilityProjection } from '@/domain/model';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LineChart: ({ data, children }: { data: unknown; children: ReactNode }) => (
    <div data-testid="payoff-chart" data-series={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

import { PayoffChart } from './PayoffChart';

const timestamp = '2026-01-01T00:00:00.000Z';
const liabilities: Liability[] = [
  {
    id: 'mortgage',
    order: 0,
    type: 'mortgage',
    name: 'Mortgage',
    principal: '200000',
    annualInterestRate: '3',
    monthlyPayment: '1000',
    notes: '',
    manualBalances: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: 'loan',
    order: 1,
    type: 'personal-loan',
    name: 'Personal loan',
    principal: '10000',
    annualInterestRate: '0',
    monthlyPayment: '500',
    notes: '',
    manualBalances: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

const projections = new Map<string, LiabilityProjection[]>([
  [
    'mortgage',
    [
      { year: 2026, amount: '190000', source: 'actual', status: 'actual' },
      { year: 2027, amount: '178000', source: 'projected', status: 'projected' },
    ],
  ],
  ['loan', [{ year: 2027, amount: '4000', source: 'projected', status: 'projected' }]],
]);

describe('PayoffChart', () => {
  it('uses null chart gaps for missing balances and exposes exactly equivalent table values', () => {
    render(
      <PayoffChart
        liabilities={liabilities}
        projections={projections}
        currency="USD"
        locale="en-US"
      />,
    );

    expect(JSON.parse(screen.getByTestId('payoff-chart').dataset.series ?? '')).toEqual([
      { year: 2026, mortgage: 190000, loan: null },
      { year: 2027, mortgage: 178000, loan: 4000 },
    ]);

    const rows = within(
      screen.getByRole('table', { name: /liability payoff balances by calendar year/i }),
    ).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('2026');
    expect(rows[1]).toHaveTextContent('$190,000.00 (actual, actual)');
    expect(rows[1]).toHaveTextContent('Not available');
    expect(rows[1]).not.toHaveTextContent('$0.00');
    expect(rows[2]).toHaveTextContent('$178,000.00 (projected, projected)');
    expect(rows[2]).toHaveTextContent('$4,000.00 (projected, projected)');
  });
});
