import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatMoney } from '@/domain/currency';
import type { DashboardSnapshot } from '@/domain/model';

import { ChartFrame } from './ChartFrame';

export function TrendChart({
  snapshots,
  currency,
  locale,
}: {
  snapshots: DashboardSnapshot[];
  currency: string;
  locale: string;
}) {
  const data = snapshots.map((snapshot) => ({
    year: snapshot.year,
    netWorth: Number(snapshot.netWorth),
    completeness: snapshot.completeness,
  }));
  return (
    <ChartFrame
      title="Net worth trend"
      summary="Net worth is assets minus liabilities. Incomplete years exclude missing asset values."
      table={
        <table>
          <caption>Net worth trend by calendar year</caption>
          <thead>
            <tr>
              <th>Year</th>
              <th>Net worth</th>
              <th>Completeness</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr key={snapshot.year}>
                <th>{snapshot.year}</th>
                <td>{formatMoney(snapshot.netWorth, currency, locale)}</td>
                <td>{snapshot.completeness}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="net-worth-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-positive)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--chart-positive)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" />
          <XAxis dataKey="year" />
          <YAxis width={72} />
          <Tooltip formatter={(value) => formatMoney(String(value), currency, locale)} />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="var(--chart-positive)"
            fill="url(#net-worth-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
