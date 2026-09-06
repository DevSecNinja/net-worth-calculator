import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import type { DatedSnapshot } from '@/domain/aggregation';
import { formatMoney } from '@/domain/currency';
import { formatObservationDate } from '@/domain/observations';
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartFrame } from './ChartFrame';
import {
  ChartTooltip,
  chartDatumAtIndex,
  localizedCompletenessLabel,
  localizedSourceLabel,
  type ChartTooltipDetail,
} from './tooltip';

type TimelineDatum = {
  date: string;
  assets: number;
  assetsExact: string;
  liabilities: number;
  liabilitiesExact: string;
  netWorth: number;
  netWorthExact: string;
  completeness: DatedSnapshot['completeness'];
  assetSource: DatedSnapshot['assetSource'];
  liabilitySource: DatedSnapshot['liabilitySource'];
  staleDays?: number | undefined;
};

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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const data: TimelineDatum[] = snapshots.map((snapshot) => ({
    date: snapshot.asOfDate,
    assets: Number(snapshot.assets),
    assetsExact: snapshot.assets,
    liabilities: Number(snapshot.liabilities),
    liabilitiesExact: snapshot.liabilities,
    netWorth: Number(snapshot.netWorth),
    netWorthExact: snapshot.netWorth,
    completeness: snapshot.completeness,
    assetSource: snapshot.assetSource,
    liabilitySource: snapshot.liabilitySource,
    staleDays: Math.max(0, ...snapshot.assetSources.map(({ staleDays }) => staleDays ?? 0)),
  }));
  const detailFor = (datum: TimelineDatum): ChartTooltipDetail => ({
    title: formatObservationDate(datum.date, locale),
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
      ...(datum.staleDays
        ? [
            {
              label: t('chart.staleness'),
              value: t('dashboard.staleDays', { count: datum.staleDays }),
            },
          ]
        : []),
    ],
  });
  const selectedDatum = data.find(({ date }) => date === selectedDate);
  return (
    <ChartFrame
      title={t('chart.timelineTitle')}
      summary={t('chart.timelineSummary')}
      selectedDetail={selectedDatum ? detailFor(selectedDatum) : null}
      table={() => (
        <table>
          <caption>{t('chart.timelineCaption')}</caption>
          <thead>
            <tr>
              <th>{t('chart.date')}</th>
              <th>{t('dashboard.netWorth')}</th>
              <th>{t('dashboard.assets')}</th>
              <th>{t('dashboard.liabilities')}</th>
              <th>{t('chart.completeness')}</th>
              <th>{t('chart.assetSource')}</th>
              <th>{t('chart.liabilitySource')}</th>
              <th>{t('chart.staleness')}</th>
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
                <td>{formatMoney(snapshot.assets, currency, locale)}</td>
                <td>{formatMoney(snapshot.liabilities, currency, locale)}</td>
                <td>
                  {snapshot.completeness === 'complete'
                    ? t('common.complete')
                    : t('common.incomplete')}
                </td>
                <td>{localizedSourceLabel(snapshot.assetSource, t)}</td>
                <td>{localizedSourceLabel(snapshot.liabilitySource, t)}</td>
                <td>
                  {Math.max(0, ...snapshot.assetSources.map(({ staleDays }) => staleDays ?? 0)) > 0
                    ? t('dashboard.staleDays', {
                        count: Math.max(
                          0,
                          ...snapshot.assetSources.map(({ staleDays }) => staleDays ?? 0),
                        ),
                      })
                    : t('common.notApplicable')}
                </td>
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
            if (datum) setSelectedDate(datum.date);
          }}
        >
          <CartesianGrid strokeDasharray="4 4" />
          <XAxis dataKey="date" />
          <YAxis width={72} />
          <ChartTooltip<TimelineDatum> buildDetail={(datum) => detailFor(datum)} />
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
