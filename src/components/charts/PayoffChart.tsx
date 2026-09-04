import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { Liability, LiabilityProjection } from '@/domain/model';
import { formatMoney } from '@/domain/currency';
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartFrame } from './ChartFrame';
import { exactTooltipValue } from './tooltip';

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
  const { t } = useLocale();
  const sourceLabel = (source: LiabilityProjection['source']) =>
    source === 'actual' ? t('common.actual') : t('common.projected');
  const statusLabel = (status: LiabilityProjection['status']) =>
    status === 'actual'
      ? t('common.actual')
      : status === 'paid-off'
        ? t('common.paidOff')
        : status === 'non-amortizing'
          ? t('common.nonAmortizing')
          : status === 'invalid'
            ? t('common.invalid')
            : t('common.projected');
  const years = [
    ...new Set([...projections.values()].flatMap((series) => series.map(({ year }) => year))),
  ].sort((left, right) => left - right);
  const data = years.map((year) => {
    const point: Record<string, number | string | null> & { year: number } = { year };
    for (const liability of liabilities) {
      const amount = projections.get(liability.id)?.find((entry) => entry.year === year)?.amount;
      point[liability.id] = amount === undefined ? null : Number(amount);
      point[`${liability.id}Exact`] = amount ?? null;
    }
    return point;
  });

  return (
    <ChartFrame
      title={t('chart.payoffTitle')}
      summary={t('chart.payoffSummary')}
      table={() => (
        <table>
          <caption>{t('chart.payoffCaption')}</caption>
          <thead>
            <tr>
              <th>{t('chart.year')}</th>
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
                      {entry
                        ? formatMoney(entry.amount, currency, locale)
                        : t('common.unavailable')}
                      {entry ? ` (${sourceLabel(entry.source)}, ${statusLabel(entry.status)})` : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <XAxis dataKey="year" />
          <YAxis width={72} />
          <Tooltip
            formatter={(value, name, item) =>
              formatMoney(exactTooltipValue(item, `${String(name)}Exact`, value), currency, locale)
            }
          />
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
