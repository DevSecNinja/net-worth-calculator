import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import type { Liability, LiabilityProjection } from '@/domain/model';
import { formatMoney } from '@/domain/currency';
import { formatObservationDate } from '@/domain/observations';
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartFrame } from './ChartFrame';
import {
  ChartTooltip,
  chartDatumAtIndex,
  localizedProjectionStatusLabel,
  localizedSourceLabel,
  type ChartTooltipDetail,
  type ChartDetailRow,
} from './tooltip';

type PayoffEntry = {
  name: string;
  amount: string;
  date: string;
  source: LiabilityProjection['source'];
  status: LiabilityProjection['status'];
};

type PayoffDatum = Record<string, number | string | null | Record<string, PayoffEntry>> & {
  year: number;
  details: Record<string, PayoffEntry>;
};

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
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const years = [
    ...new Set([...projections.values()].flatMap((series) => series.map(({ year }) => year))),
  ].sort((left, right) => left - right);
  const data: PayoffDatum[] = years.map((year) => {
    const point: PayoffDatum = { year, details: {} };
    for (const liability of liabilities) {
      const entry = projections.get(liability.id)?.find((projection) => projection.year === year);
      point[liability.id] = entry === undefined ? null : Number(entry.amount);
      if (entry) {
        point.details[liability.id] = {
          name: liability.name,
          amount: entry.amount,
          date: entry.date,
          source: entry.source,
          status: entry.status,
        };
      }
    }
    return point;
  });
  const detailFor = (datum: PayoffDatum, activeKeys?: ReadonlySet<string>): ChartTooltipDetail => {
    const entries = Object.entries(datum.details).filter(
      ([id]) => activeKeys === undefined || activeKeys.has(id),
    );
    const rows: ChartDetailRow[] = entries.map(([, entry]) => ({
      label: entry.name,
      value: formatMoney(entry.amount, currency, locale),
      meta: `${formatObservationDate(entry.date, locale)} | ${localizedSourceLabel(entry.source, t)} | ${localizedProjectionStatusLabel(entry.status, t)}`,
    }));
    return { title: String(datum.year), rows };
  };
  const selectedDatum = data.find(({ year }) => year === selectedYear);

  return (
    <ChartFrame
      title={t('chart.payoffTitle')}
      summary={t('chart.payoffSummary')}
      selectedDetail={selectedDatum ? detailFor(selectedDatum) : null}
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
                      {entry
                        ? ` (${localizedSourceLabel(entry.source, t)}, ${localizedProjectionStatusLabel(entry.status, t)})`
                        : ''}
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
        <LineChart
          accessibilityLayer={false}
          data={data}
          onClick={({ activeTooltipIndex }) => {
            const datum = chartDatumAtIndex(data, activeTooltipIndex);
            if (datum) setSelectedYear(datum.year);
          }}
        >
          <XAxis dataKey="year" />
          <YAxis width={72} />
          <ChartTooltip<PayoffDatum>
            buildDetail={(datum, payload) =>
              (() => {
                const activeKeys = new Set(
                  payload
                    .map(({ dataKey }) => (typeof dataKey === 'string' ? dataKey : undefined))
                    .filter((key): key is string => key !== undefined),
                );
                return detailFor(datum, activeKeys.size > 0 ? activeKeys : undefined);
              })()
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
import { useState } from 'react';
