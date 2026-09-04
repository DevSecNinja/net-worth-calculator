import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatMoney } from '@/domain/currency';
import type { DashboardSnapshot } from '@/domain/model';
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartFrame } from './ChartFrame';
import { exactTooltipValue } from './tooltip';

export function BalanceChart({
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
    assets: Number(snapshot.assets),
    assetsExact: snapshot.assets,
    liabilities: Number(snapshot.liabilities),
    liabilitiesExact: snapshot.liabilities,
  }));
  return (
    <ChartFrame
      title={t('chart.balanceTitle')}
      summary={t('chart.balanceSummary')}
      table={() => (
        <table>
          <caption>{t('chart.balanceCaption')}</caption>
          <thead>
            <tr>
              <th>{t('chart.year')}</th>
              <th>{t('dashboard.assets')}</th>
              <th>{t('dashboard.liabilities')}</th>
              <th>{t('chart.debtSource')}</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr key={snapshot.year}>
                <th>{snapshot.year}</th>
                <td>{formatMoney(snapshot.assets, currency, locale)}</td>
                <td>{formatMoney(snapshot.liabilities, currency, locale)}</td>
                <td>
                  {snapshot.liabilitySource === 'actual'
                    ? t('common.actual')
                    : snapshot.liabilitySource === 'mixed'
                      ? `${t('common.actual')} / ${t('common.projected')}`
                      : t('common.projected')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="4 4" />
          <XAxis dataKey="year" />
          <YAxis width={72} />
          <Tooltip
            formatter={(value, name, item) =>
              formatMoney(exactTooltipValue(item, `${String(name)}Exact`, value), currency, locale)
            }
          />
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
