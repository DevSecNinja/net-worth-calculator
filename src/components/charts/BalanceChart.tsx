import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import { formatMoney } from '@/domain/currency';
import type { DashboardSnapshot } from '@/domain/model';
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartFrame } from './ChartFrame';
import {
  ChartTooltip,
  chartDatumAtIndex,
  localizedSourceLabel,
  type ChartTooltipDetail,
} from './tooltip';

type BalanceDatum = {
  year: number;
  assets: number;
  assetsExact: string;
  liabilities: number;
  liabilitiesExact: string;
  netWorthExact: string;
  liabilitySource: DashboardSnapshot['liabilitySource'];
};

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
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const data: BalanceDatum[] = snapshots.map((snapshot) => ({
    year: snapshot.year,
    assets: Number(snapshot.assets),
    assetsExact: snapshot.assets,
    liabilities: Number(snapshot.liabilities),
    liabilitiesExact: snapshot.liabilities,
    netWorthExact: snapshot.netWorth,
    liabilitySource: snapshot.liabilitySource,
  }));
  const detailFor = (datum: BalanceDatum): ChartTooltipDetail => ({
    title: String(datum.year),
    rows: [
      { label: t('dashboard.assets'), value: formatMoney(datum.assetsExact, currency, locale) },
      {
        label: t('dashboard.liabilities'),
        value: formatMoney(datum.liabilitiesExact, currency, locale),
      },
      {
        label: t('dashboard.netWorth'),
        value: formatMoney(datum.netWorthExact, currency, locale),
      },
      { label: t('chart.debtSource'), value: localizedSourceLabel(datum.liabilitySource, t) },
    ],
  });
  const selectedDatum = data.find(({ year }) => year === selectedYear);
  return (
    <ChartFrame
      title={t('chart.balanceTitle')}
      summary={t('chart.balanceSummary')}
      selectedDetail={selectedDatum ? detailFor(selectedDatum) : null}
      table={() => (
        <table>
          <caption>{t('chart.balanceCaption')}</caption>
          <thead>
            <tr>
              <th>{t('chart.year')}</th>
              <th>{t('dashboard.assets')}</th>
              <th>{t('dashboard.liabilities')}</th>
              <th>{t('dashboard.netWorth')}</th>
              <th>{t('chart.debtSource')}</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr key={snapshot.year}>
                <th>{snapshot.year}</th>
                <td>{formatMoney(snapshot.assets, currency, locale)}</td>
                <td>{formatMoney(snapshot.liabilities, currency, locale)}</td>
                <td>{formatMoney(snapshot.netWorth, currency, locale)}</td>
                <td>{localizedSourceLabel(snapshot.liabilitySource, t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          accessibilityLayer={false}
          data={data}
          onClick={({ activeTooltipIndex }) => {
            const datum = chartDatumAtIndex(data, activeTooltipIndex);
            if (datum) setSelectedYear(datum.year);
          }}
        >
          <CartesianGrid strokeDasharray="4 4" />
          <XAxis dataKey="year" />
          <YAxis width={72} />
          <ChartTooltip<BalanceDatum> buildDetail={(datum) => detailFor(datum)} />
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
