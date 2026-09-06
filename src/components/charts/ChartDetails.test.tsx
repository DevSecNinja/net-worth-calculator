import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AllocationSlice, DatedSnapshot } from '@/domain/aggregation';
import type { DashboardSnapshot } from '@/domain/model';
import { LocaleProvider } from '@/features/locale/LocaleProvider';

vi.mock('recharts', () => {
  type ChartProps = {
    data: unknown[];
    children: ReactNode;
    onClick?: (state: { activeTooltipIndex: number }) => void;
  };
  const CartesianChart = ({ data, children, onClick }: ChartProps) => (
    <div
      data-testid="mock-chart"
      data-series={JSON.stringify(data)}
      onClick={() => onClick?.({ activeTooltipIndex: 0 })}
    >
      {children}
    </div>
  );
  return {
    ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    AreaChart: CartesianChart,
    BarChart: CartesianChart,
    PieChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Area: () => null,
    Bar: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    CartesianGrid: () => null,
    Cell: () => null,
    Line: () => null,
    Pie: ({
      children,
      onClick,
    }: {
      children: ReactNode;
      onClick?: (entry: unknown, index: number) => void;
    }) => (
      <div data-testid="mock-chart" onClick={() => onClick?.({}, 0)}>
        {children}
      </div>
    ),
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});

import { AllocationChart } from './AllocationChart';
import { BalanceChart } from './BalanceChart';
import { TimelineChart } from './TimelineChart';
import { TrendChart } from './TrendChart';

const snapshot: DashboardSnapshot = {
  asOfDate: '2026-12-31',
  year: 2026,
  assets: '498999999999995.01',
  liabilities: '1234.5',
  netWorth: '498999999998760.51',
  completeness: 'incomplete',
  assetSource: 'carry-forward',
  liabilitySource: 'mixed',
};

function renderLocalized(child: ReactNode) {
  return render(<LocaleProvider>{child}</LocaleProvider>);
}

describe('chart selected details', () => {
  it('shows localized allocation category, exact value, percentage, and date', async () => {
    const user = userEvent.setup();
    const allocation: AllocationSlice[] = [
      { name: 'savings', type: 'savings', value: '1' },
      { name: 'stocks', type: 'stocks', value: '3' },
    ];
    renderLocalized(
      <AllocationChart allocation={allocation} currency="USD" locale="en-US" date="2026-09-05" />,
    );

    await user.click(screen.getByTestId('mock-chart'));
    const detail = screen.getByTestId('chart-selected-detail');
    expect(detail).toHaveTextContent('Savings');
    expect(detail).toHaveTextContent('$1.00');
    expect(detail).toHaveTextContent('25%');
    expect(detail).toHaveTextContent('Sep 5, 2026');
  });

  it('shows trend assets, liabilities, net worth, completeness, and sources', async () => {
    const user = userEvent.setup();
    const view = renderLocalized(
      <TrendChart snapshots={[snapshot]} currency="USD" locale="en-US" />,
    );

    await user.click(screen.getByTestId('mock-chart'));
    const detail = screen.getByTestId('chart-selected-detail');
    expect(detail).toHaveTextContent('2026');
    expect(detail).toHaveTextContent('$498,999,999,999,995.01');
    expect(detail).toHaveTextContent('$1,234.50');
    expect(detail).toHaveTextContent('$498,999,999,998,760.51');
    expect(detail).toHaveTextContent('Incomplete');
    expect(detail).toHaveTextContent('Carried forward');
    expect(detail).toHaveTextContent('Mixed');

    view.rerender(
      <LocaleProvider>
        <TrendChart
          snapshots={[{ ...snapshot, assets: '500000000000000', netWorth: '499999999998765.5' }]}
          currency="USD"
          locale="en-US"
        />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('chart-selected-detail')).toHaveTextContent(
      '$500,000,000,000,000.00',
    );
    expect(screen.getByTestId('chart-selected-detail')).not.toHaveTextContent(
      '$498,999,999,999,995.01',
    );
  });

  it('shows balance assets, liabilities, derived net worth, and source', async () => {
    const user = userEvent.setup();
    renderLocalized(<BalanceChart snapshots={[snapshot]} currency="GBP" locale="en-GB" />);

    await user.click(screen.getByTestId('mock-chart'));
    const detail = screen.getByTestId('chart-selected-detail');
    expect(detail).toHaveTextContent('£498,999,999,999,995.01');
    expect(detail).toHaveTextContent('£1,234.50');
    expect(detail).toHaveTextContent('£498,999,999,998,760.51');
    expect(detail).toHaveTextContent('Mixed');
  });

  it('shows exact timeline values, sources, completeness, and staleness', async () => {
    const user = userEvent.setup();
    const dated: DatedSnapshot = {
      ...snapshot,
      asOfDate: '2026-09-05',
      assetSources: [
        {
          itemId: 'savings',
          sourceDate: '2026-08-01',
          status: 'carry-forward',
          staleDays: 35,
        },
      ],
    };
    renderLocalized(<TimelineChart snapshots={[dated]} currency="USD" locale="en-US" />);

    await user.click(screen.getByTestId('mock-chart'));
    const detail = screen.getByTestId('chart-selected-detail');
    expect(detail).toHaveTextContent('Sep 5, 2026');
    expect(detail).toHaveTextContent('$498,999,999,999,995.01');
    expect(detail).toHaveTextContent('35 days old');
  });
});
