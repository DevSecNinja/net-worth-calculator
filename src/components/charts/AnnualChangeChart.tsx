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
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartFrame } from './ChartFrame';
import { exactTooltipValue } from './tooltip';

export function AnnualChangeChart({
  snapshots,
  currency,
  locale,
}: {
  snapshots: DashboardSnapshot[];
  currency: string;
  locale: string;
}) {
  const { t } = useLocale();
  const data = snapshots
    .filter((snapshot) => snapshot.yearlyChange !== undefined)
    .map((snapshot) => ({
      year: snapshot.year,
      change: Number(snapshot.yearlyChange),
      changeExact: snapshot.yearlyChange,
    }));
  return (
    <ChartFrame
      title={t('chart.changeTitle')}
      summary={t('chart.changeSummary')}
      table={() => (
        <table>
          <caption>{t('chart.changeCaption')}</caption>
          <thead>
            <tr>
              <th>{t('chart.year')}</th>
              <th>{t('chart.change')}</th>
              <th>{t('chart.percent')}</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr key={snapshot.year}>
                <th>{snapshot.year}</th>
                <td>
                  {snapshot.yearlyChange !== undefined
                    ? formatMoney(snapshot.yearlyChange, currency, locale)
                    : t('dashboard.notDefined')}
                </td>
                <td>
                  {snapshot.yearlyChangePercent !== undefined
                    ? `${snapshot.yearlyChangePercent}%`
                    : t('dashboard.notDefined')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="4 4" />
          <XAxis dataKey="year" />
          <YAxis width={72} />
          <Tooltip
            formatter={(value, _name, item) =>
              formatMoney(exactTooltipValue(item, 'changeExact', value), currency, locale)
            }
          />
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
