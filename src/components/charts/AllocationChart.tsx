import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { AllocationSlice } from '@/domain/aggregation';
import { formatMoney } from '@/domain/currency';

import { ChartFrame } from './ChartFrame';

const colors = ['#16a34a', '#0d9488', '#2563eb', '#7c3aed', '#ca8a04', '#dc2626'];

export function AllocationChart({
  allocation,
  currency,
  locale,
  year,
}: {
  allocation: AllocationSlice[];
  currency: string;
  locale: string;
  year: number;
}) {
  const data = allocation.map((slice) => ({ ...slice, numericValue: Number(slice.value) }));
  return (
    <ChartFrame
      title="Asset allocation"
      summary={`Explicit asset values by category for ${year}.`}
      table={
        <table>
          <caption>Asset allocation for {year}</caption>
          <thead>
            <tr>
              <th>Category</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {allocation.map((slice) => (
              <tr key={slice.name}>
                <th>{slice.name}</th>
                <td>{formatMoney(slice.value, currency, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="numericValue"
            nameKey="name"
            innerRadius="48%"
            outerRadius="78%"
            isAnimationActive={false}
          >
            {data.map((slice, index) => (
              <Cell key={slice.name} fill={colors[index % colors.length] ?? '#16a34a'} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatMoney(String(value), currency, locale)} />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
