import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatMoney } from '@/domain/currency';
import type { DashboardSnapshot } from '@/domain/model';

import { ChartFrame } from './ChartFrame';

export function AnnualChangeChart({
  snapshots,
  currency,
  locale,
}: {
  snapshots: DashboardSnapshot[];
  currency: string;
  locale: string;
}) {
  const data = snapshots
    .filter((snapshot) => snapshot.yearlyChange !== undefined)
    .map((snapshot) => ({ year: snapshot.year, change: Number(snapshot.yearlyChange) }));
  return (
    <ChartFrame
      title="Annual net worth change"
      summary="Change is shown only when adjacent years have complete asset values."
      table={
        <table>
          <caption>Annual net worth change by calendar year</caption>
          <thead>
            <tr>
              <th>Year</th>
              <th>Change</th>
              <th>Percent</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr key={snapshot.year}>
                <th>{snapshot.year}</th>
                <td>
                  {snapshot.yearlyChange !== undefined
                    ? formatMoney(snapshot.yearlyChange, currency, locale)
                    : 'Not defined'}
                </td>
                <td>
                  {snapshot.yearlyChangePercent !== undefined
                    ? `${snapshot.yearlyChangePercent}%`
                    : 'Not defined'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="4 4" />
          <XAxis dataKey="year" />
          <YAxis width={72} />
          <Tooltip formatter={(value) => formatMoney(String(value), currency, locale)} />
          <Bar dataKey="change" isAnimationActive={false}>
            {data.map((point) => (
              <Cell
                key={point.year}
                fill={point.change >= 0 ? 'var(--chart-positive)' : 'var(--chart-negative)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
