import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Liability, LiabilityProjection } from '@/domain/model';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LineChart: ({
    data,
    children,
    onClick,
  }: {
    data: unknown;
    children: ReactNode;
    onClick?: (state: { activeTooltipIndex: number }) => void;
  }) => (
    <div
      data-testid="payoff-chart"
      data-series={JSON.stringify(data)}
      onClick={() => onClick?.({ activeTooltipIndex: 0 })}
    >
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
      { date: '2026-12-31', year: 2026, amount: '190000', source: 'actual', status: 'actual' },
      {
        date: '2027-12-31',
        year: 2027,
        amount: '178000',
        source: 'projected',
        status: 'projected',
      },
    ],
  ],
  [
    'loan',
    [
      {
        date: '2027-12-31',
        year: 2027,
        amount: '4000',
        source: 'projected',
        status: 'projected',
      },
    ],
  ],
]);

describe('PayoffChart', () => {
  it('uses null chart gaps for missing balances and exposes exactly equivalent table values', async () => {
    const user = userEvent.setup();
    render(
      <PayoffChart
        liabilities={liabilities}
        projections={projections}
        currency="USD"
        locale="en-US"
      />,
    );

    expect(JSON.parse(screen.getByTestId('payoff-chart').dataset.series ?? '')).toEqual([
      {
        details: {
          mortgage: {
            amount: '190000',
            date: '2026-12-31',
            name: 'Mortgage',
            source: 'actual',
            status: 'actual',
          },
        },
        year: 2026,
        mortgage: 190000,
        loan: null,
      },
      {
        details: {
          mortgage: {
            amount: '178000',
            date: '2027-12-31',
            name: 'Mortgage',
            source: 'projected',
            status: 'projected',
          },
          loan: {
            amount: '4000',
            date: '2027-12-31',
            name: 'Personal loan',
            source: 'projected',
            status: 'projected',
          },
        },
        year: 2027,
        mortgage: 178000,
        loan: 4000,
      },
    ]);
    await user.click(screen.getByTestId('payoff-chart'));
    expect(screen.getByTestId('chart-selected-detail')).toHaveTextContent('Mortgage');
    expect(screen.getByTestId('chart-selected-detail')).toHaveTextContent('$190,000.00');
    expect(screen.getByTestId('chart-selected-detail')).toHaveTextContent('Actual');

    await user.click(screen.getByText(/view liability payoff data table/i));
    const rows = within(
      screen.getByRole('table', { name: /liability payoff balances by calendar year/i }),
    ).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('2026');
    expect(rows[1]).toHaveTextContent('$190,000.00 (Actual, Actual)');
    expect(rows[1]).toHaveTextContent('Unavailable');
    expect(rows[1]).not.toHaveTextContent('$0.00');
    expect(rows[2]).toHaveTextContent('$178,000.00 (Projected, Projected)');
    expect(rows[2]).toHaveTextContent('$4,000.00 (Projected, Projected)');
  });
});
