import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { AllocationSlice } from '@/domain/aggregation';
import { formatMoney } from '@/domain/currency';
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartFrame } from './ChartFrame';
import { exactTooltipValue } from './tooltip';

const colors = ['#16a34a', '#0d9488', '#2563eb', '#7c3aed', '#ca8a04', '#dc2626'];

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
  const data = allocation.map((slice) => ({ ...slice, numericValue: Number(slice.value) }));
  return (
    <ChartFrame
      title={t('chart.allocationTitle')}
      summary={t('chart.allocationSummary', { date })}
      table={() => (
        <table>
          <caption>{t('chart.allocationCaption', { date })}</caption>
          <thead>
            <tr>
              <th>{t('chart.category')}</th>
              <th>{t('chart.value')}</th>
            </tr>
          </thead>
          <tbody>
            {allocation.map((slice) => (
              <tr key={slice.name}>
                <th>{slice.name}</th>
                <td>{formatMoney(slice.value, currency, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    >
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="numericValue"
            nameKey="name"
            innerRadius="48%"
            outerRadius="78%"
            isAnimationActive={false}
          >
            {data.map((slice, index) => (
              <Cell key={slice.name} fill={colors[index % colors.length] ?? '#16a34a'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) =>
              formatMoney(exactTooltipValue(item, 'value', value), currency, locale)
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
