import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import { formatMoney } from '@/domain/currency';
import type { DashboardSnapshot } from '@/domain/model';
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartFrame } from './ChartFrame';
import {
  ChartTooltip,
  chartDatumAtIndex,
  localizedCompletenessLabel,
  localizedSourceLabel,
  type ChartTooltipDetail,
} from './tooltip';

type TrendDatum = {
  year: number;
  assets: number;
  assetsExact: string;
  liabilities: number;
  liabilitiesExact: string;
  netWorth: number;
  netWorthExact: string;
  completeness: DashboardSnapshot['completeness'];
  assetSource: DashboardSnapshot['assetSource'];
  liabilitySource: DashboardSnapshot['liabilitySource'];
};

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
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const data: TrendDatum[] = snapshots.map((snapshot) => ({
    year: snapshot.year,
    assets: Number(snapshot.assets),
    assetsExact: snapshot.assets,
    liabilities: Number(snapshot.liabilities),
    liabilitiesExact: snapshot.liabilities,
    netWorth: Number(snapshot.netWorth),
    netWorthExact: snapshot.netWorth,
    completeness: snapshot.completeness,
    assetSource: snapshot.assetSource,
    liabilitySource: snapshot.liabilitySource,
  }));
  const detailFor = (datum: TrendDatum): ChartTooltipDetail => ({
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
      {
        label: t('chart.completeness'),
        value: localizedCompletenessLabel(datum.completeness, t),
      },
      { label: t('chart.assetSource'), value: localizedSourceLabel(datum.assetSource, t) },
      {
        label: t('chart.liabilitySource'),
        value: localizedSourceLabel(datum.liabilitySource, t),
      },
    ],
  });
  const selectedDatum = data.find(({ year }) => year === selectedYear);
  return (
    <ChartFrame
      title={t('chart.trendTitle')}
      summary={t('chart.trendSummary')}
      selectedDetail={selectedDatum ? detailFor(selectedDatum) : null}
      table={() => (
        <table>
          <caption>{t('chart.trendCaption')}</caption>
          <thead>
            <tr>
              <th>{t('chart.year')}</th>
              <th>{t('dashboard.assets')}</th>
              <th>{t('dashboard.liabilities')}</th>
              <th>{t('dashboard.netWorth')}</th>
              <th>{t('chart.completeness')}</th>
              <th>{t('chart.assetSource')}</th>
              <th>{t('chart.liabilitySource')}</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr key={snapshot.year}>
                <th>{snapshot.year}</th>
                <td>{formatMoney(snapshot.assets, currency, locale)}</td>
                <td>{formatMoney(snapshot.liabilities, currency, locale)}</td>
                <td>{formatMoney(snapshot.netWorth, currency, locale)}</td>
                <td>
                  {snapshot.completeness === 'complete'
                    ? t('dashboard.complete', { date: snapshot.asOfDate })
                    : t('common.incomplete')}
                </td>
                <td>{localizedSourceLabel(snapshot.assetSource, t)}</td>
                <td>{localizedSourceLabel(snapshot.liabilitySource, t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    >
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart
          accessibilityLayer={false}
          data={data}
          onClick={({ activeTooltipIndex }) => {
            const datum = chartDatumAtIndex(data, activeTooltipIndex);
            if (datum) setSelectedYear(datum.year);
          }}
        >
          <defs>
            <linearGradient id="net-worth-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-positive)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--chart-positive)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" />
          <XAxis dataKey="year" />
          <YAxis width={72} />
          <ChartTooltip<TrendDatum> buildDetail={(datum) => detailFor(datum)} />
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
