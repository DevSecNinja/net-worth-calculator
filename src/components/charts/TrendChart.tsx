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
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartFrame } from './ChartFrame';
import { exactTooltipValue } from './tooltip';

export function TrendChart({
  snapshots,
  currency,
  locale,
}: {
  snapshots: DashboardSnapshot[];
  currency: string;
  locale: string;
}) {
  const { t } = useLocale();
  const data = snapshots.map((snapshot) => ({
    year: snapshot.year,
    netWorth: Number(snapshot.netWorth),
    netWorthExact: snapshot.netWorth,
    completeness: snapshot.completeness,
  }));
  return (
    <ChartFrame
      title={t('chart.trendTitle')}
      summary={t('chart.trendSummary')}
      table={() => (
        <table>
          <caption>{t('chart.trendCaption')}</caption>
          <thead>
            <tr>
              <th>{t('chart.year')}</th>
              <th>{t('dashboard.netWorth')}</th>
              <th>{t('chart.completeness')}</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr key={snapshot.year}>
                <th>{snapshot.year}</th>
                <td>{formatMoney(snapshot.netWorth, currency, locale)}</td>
                <td>
                  {snapshot.completeness === 'complete'
                    ? t('dashboard.complete', { date: snapshot.asOfDate })
                    : t('common.incomplete')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
          <Tooltip
            formatter={(value, _name, item) =>
              formatMoney(exactTooltipValue(item, 'netWorthExact', value), currency, locale)
            }
          />
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
