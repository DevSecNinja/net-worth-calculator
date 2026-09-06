import Decimal from 'decimal.js';
import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import type { AllocationSlice } from '@/domain/aggregation';
import { formatMoney } from '@/domain/currency';
import { formatObservationDate } from '@/domain/observations';
import type { MessageKey } from '@/features/locale/catalog';
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartFrame } from './ChartFrame';
import {
  ChartTooltip,
  chartDatumAtIndex,
  formatAllocationPercent,
  type ChartTooltipDetail,
} from './tooltip';

const colors = ['#16a34a', '#0d9488', '#2563eb', '#7c3aed', '#ca8a04', '#dc2626'];

type AllocationDatum = AllocationSlice & {
  label: string;
  numericValue: number;
  percentage: string;
  date: string;
};

export function AllocationChart({
  allocation,
  currency,
  locale,
  date,
}: {
  allocation: AllocationSlice[];
  currency: string;
  locale: string;
  date: string;
}) {
  const { t } = useLocale();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const total = allocation.reduce((sum, slice) => sum.plus(slice.value), new Decimal(0)).toFixed();
  const data: AllocationDatum[] = allocation.map((slice) => ({
    ...slice,
    label: slice.type === 'custom' ? slice.name : t(`assetType.${slice.type}` as MessageKey),
    numericValue: Number(slice.value),
    percentage: formatAllocationPercent(slice.value, total, locale),
    date,
  }));
  const detailFor = (datum: AllocationDatum): ChartTooltipDetail => ({
    title: datum.label,
    rows: [
      { label: t('chart.date'), value: formatObservationDate(datum.date, locale) },
      { label: t('chart.value'), value: formatMoney(datum.value, currency, locale) },
      { label: t('chart.percentage'), value: datum.percentage },
    ],
  });
  const selectedDatum = data.find((datum) => `${datum.type}:${datum.name}` === selectedKey);
  return (
    <ChartFrame
      title={t('chart.allocationTitle')}
      summary={t('chart.allocationSummary', { date })}
      selectedDetail={selectedDatum ? detailFor(selectedDatum) : null}
      table={() => (
        <table>
          <caption>{t('chart.allocationCaption', { date })}</caption>
          <thead>
            <tr>
              <th>{t('chart.category')}</th>
              <th>{t('chart.value')}</th>
              <th>{t('chart.percentage')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((slice) => (
              <tr key={slice.name}>
                <th>{slice.label}</th>
                <td>{formatMoney(slice.value, currency, locale)}</td>
                <td>{slice.percentage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    >
      <ResponsiveContainer width="100%" height={240}>
        <PieChart accessibilityLayer={false}>
          <Pie
            data={data}
            dataKey="numericValue"
            nameKey="label"
            innerRadius="48%"
            outerRadius="78%"
            rootTabIndex={-1}
            isAnimationActive={false}
            onClick={(_entry, index) => {
              const datum = chartDatumAtIndex(data, index);
              if (datum) setSelectedKey(`${datum.type}:${datum.name}`);
            }}
          >
            {data.map((slice, index) => (
              <Cell
                key={`${slice.type}:${slice.name}`}
                fill={colors[index % colors.length] ?? '#16a34a'}
              />
            ))}
          </Pie>
          <ChartTooltip<AllocationDatum> buildDetail={(datum) => detailFor(datum)} />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
