import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DatedSnapshot } from '@/domain/aggregation';
import { formatMoney } from '@/domain/currency';
import { formatObservationDate } from '@/domain/observations';
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartFrame } from './ChartFrame';
import { exactTooltipValue } from './tooltip';

export function TimelineChart({
  snapshots,
  currency,
  locale,
}: {
  snapshots: DatedSnapshot[];
  currency: string;
  locale: string;
}) {
  const { t } = useLocale();
  const sourceLabel = (source: string) =>
    source === 'actual'
      ? t('common.actual')
      : source === 'carry-forward'
        ? t('common.carryForward')
        : source === 'unavailable'
          ? t('common.unavailable')
          : source === 'mixed'
            ? t('common.mixed')
            : t('common.projected');
  const data = snapshots.map((snapshot) => ({
    date: snapshot.asOfDate,
    netWorth: Number(snapshot.netWorth),
    netWorthExact: snapshot.netWorth,
  }));
  return (
    <ChartFrame
      title={t('chart.timelineTitle')}
      summary={t('chart.timelineSummary')}
      table={() => (
        <table>
          <caption>{t('chart.timelineCaption')}</caption>
          <thead>
            <tr>
              <th>{t('chart.date')}</th>
              <th>{t('dashboard.netWorth')}</th>
              <th>{t('chart.assetSource')}</th>
              <th>{t('chart.liabilitySource')}</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr key={snapshot.asOfDate}>
                <th>
                  <time dateTime={snapshot.asOfDate}>
                    {formatObservationDate(snapshot.asOfDate, locale)}
                  </time>
                </th>
                <td>{formatMoney(snapshot.netWorth, currency, locale)}</td>
                <td>{sourceLabel(snapshot.assetSource)}</td>
                <td>{sourceLabel(snapshot.liabilitySource)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    >
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="4 4" />
          <XAxis dataKey="date" />
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
            fill="var(--primary-soft)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
