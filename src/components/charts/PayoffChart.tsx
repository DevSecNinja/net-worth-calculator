import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { Liability, LiabilityProjection } from '@/domain/model';
import { formatMoney } from '@/domain/currency';

import { ChartFrame } from './ChartFrame';

export function PayoffChart({
  liabilities,
  projections,
  currency,
  locale,
}: {
  liabilities: Liability[];
  projections: Map<string, LiabilityProjection[]>;
  currency: string;
  locale: string;
}) {
  const years = [
    ...new Set([...projections.values()].flatMap((series) => series.map(({ year }) => year))),
  ].sort((left, right) => left - right);
  const data = years.map((year) => {
    const point: Record<string, number | null> & { year: number } = { year };
    for (const liability of liabilities) {
      const amount = projections.get(liability.id)?.find((entry) => entry.year === year)?.amount;
      point[liability.id] = amount === undefined ? null : Number(amount);
    }
    return point;
  });

  return (
    <ChartFrame
      title="Liability payoff"
      summary="Monthly amortization projected to each December 31; manual balances are actual."
      table={
        <table>
          <caption>Liability payoff balances by calendar year</caption>
          <thead>
            <tr>
              <th>Year</th>
              {liabilities.map((liability) => (
                <th key={liability.id}>{liability.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year}>
                <th>{year}</th>
                {liabilities.map((liability) => {
                  const entry = projections
                    .get(liability.id)
                    ?.find((projection) => projection.year === year);
                  return (
                    <td key={liability.id}>
                      {entry ? formatMoney(entry.amount, currency, locale) : 'Not available'}
                      {entry ? ` (${entry.source}, ${entry.status})` : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <XAxis dataKey="year" />
          <YAxis width={72} />
          <Tooltip formatter={(value) => formatMoney(String(value), currency, locale)} />
          {liabilities.map((liability, index) => (
            <Line
              key={liability.id}
              type="monotone"
              dataKey={liability.id}
              name={liability.name}
              stroke={['#dc2626', '#ea580c', '#7c3aed', '#2563eb'][index % 4] ?? '#dc2626'}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
