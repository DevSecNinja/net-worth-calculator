import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatMoney } from '@/domain/currency';
import type { DashboardSnapshot } from '@/domain/model';

import { ChartFrame } from './ChartFrame';

export function BalanceChart({
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
    assets: Number(snapshot.assets),
    liabilities: Number(snapshot.liabilities),
  }));
  return (
    <ChartFrame
      title="Assets and liabilities"
      summary="Compare what you own with actual or projected year-end debt."
      table={
        <table>
          <caption>Assets and liabilities by calendar year</caption>
          <thead>
            <tr>
              <th>Year</th>
              <th>Assets</th>
              <th>Liabilities</th>
              <th>Debt source</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr key={snapshot.year}>
                <th>{snapshot.year}</th>
                <td>{formatMoney(snapshot.assets, currency, locale)}</td>
                <td>{formatMoney(snapshot.liabilities, currency, locale)}</td>
                <td>{snapshot.liabilitySource}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="4 4" />
          <XAxis dataKey="year" />
          <YAxis width={72} />
          <Tooltip formatter={(value) => formatMoney(String(value), currency, locale)} />
          <Bar
            dataKey="assets"
            stackId="balance"
            fill="var(--chart-positive)"
            isAnimationActive={false}
          />
          <Bar
            dataKey="liabilities"
            stackId="balance"
            fill="var(--chart-negative)"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
