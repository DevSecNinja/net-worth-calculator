import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import { formatMoney, formatPercent } from '@/domain/currency';
import type { DashboardSnapshot } from '@/domain/model';
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartFrame } from './ChartFrame';
import { ChartTooltip, chartDatumAtIndex, type ChartTooltipDetail } from './tooltip';

type AnnualChangeDatum = {
  year: number;
  change: number;
  changeExact: string;
  percentExact?: string | undefined;
};

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
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const data: AnnualChangeDatum[] = snapshots
    .filter(
      (
        snapshot,
      ): snapshot is DashboardSnapshot & {
        yearlyChange: string;
      } => snapshot.yearlyChange !== undefined,
    )
    .map((snapshot) => ({
      year: snapshot.year,
      change: Number(snapshot.yearlyChange),
      changeExact: snapshot.yearlyChange,
      percentExact: snapshot.yearlyChangePercent,
    }));
  const detailFor = (datum: AnnualChangeDatum): ChartTooltipDetail => ({
    title: String(datum.year),
    rows: [
      {
        label: t('chart.change'),
        value: formatMoney(datum.changeExact, currency, locale),
      },
      {
        label: t('chart.percentage'),
        value:
          datum.percentExact === undefined
            ? t('dashboard.notDefined')
            : formatPercent(datum.percentExact, locale),
      },
    ],
  });
  const selectedDatum = data.find(({ year }) => year === selectedYear);
  return (
    <ChartFrame
      title={t('chart.changeTitle')}
      summary={t('chart.changeSummary')}
      selectedDetail={selectedDatum ? detailFor(selectedDatum) : null}
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
                    ? formatPercent(snapshot.yearlyChangePercent, locale)
                    : t('dashboard.notDefined')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    >
      <ResponsiveContainer width="100%" height={240}>
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
          <ChartTooltip<AnnualChangeDatum> buildDetail={(datum) => detailFor(datum)} />
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
import { useState } from 'react';
