import type { ReactNode } from 'react';
import { Tooltip, type TooltipContentProps, type TooltipPayloadEntry } from 'recharts';

import { formatPercent, toDecimal } from '@/domain/currency';
import type { ProjectionStatus } from '@/domain/model';
import type { MessageKey } from '@/features/locale/catalog';

export type ChartTranslate = (
  key: MessageKey,
  variables?: Record<string, string | number>,
) => string;

export type ChartDetailRow = {
  label: string;
  value: string;
  meta?: string | undefined;
  color?: string | undefined;
};

export type ChartTooltipDetail = {
  title: string;
  rows: ChartDetailRow[];
};

type ChartTooltipProps<TDatum extends object> = {
  buildDetail: (datum: TDatum, payload: ReadonlyArray<TooltipPayloadEntry>) => ChartTooltipDetail;
};

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

export function tooltipDatum<TDatum extends object>(
  payload: ReadonlyArray<TooltipPayloadEntry>,
): TDatum | undefined {
  const datum: unknown = payload[0]?.payload;
  return isObject(datum) ? (datum as TDatum) : undefined;
}

export function chartDatumAtIndex<TDatum>(
  data: readonly TDatum[],
  index: string | number | null | undefined,
): TDatum | undefined {
  if (index === null || index === undefined) return undefined;
  const numericIndex = typeof index === 'number' ? index : Number(index);
  return Number.isInteger(numericIndex) ? data[numericIndex] : undefined;
}

export function formatAllocationPercent(value: string, total: string, locale: string): string {
  const denominator = toDecimal(total);
  if (denominator.isZero()) return formatPercent('0', locale);
  return formatPercent(toDecimal(value).div(denominator).mul(100), locale);
}

export function localizedSourceLabel(source: string, t: ChartTranslate): string {
  if (source === 'actual') return t('common.actual');
  if (source === 'carry-forward') return t('common.carryForward');
  if (source === 'unavailable') return t('common.unavailable');
  if (source === 'mixed') return t('common.mixed');
  return t('common.projected');
}

export function localizedCompletenessLabel(
  completeness: 'complete' | 'incomplete',
  t: ChartTranslate,
): string {
  return completeness === 'complete' ? t('common.complete') : t('common.incomplete');
}

export function localizedProjectionStatusLabel(
  status: ProjectionStatus,
  t: ChartTranslate,
): string {
  if (status === 'actual') return t('common.actual');
  if (status === 'paid-off') return t('common.paidOff');
  if (status === 'non-amortizing') return t('common.nonAmortizing');
  if (status === 'invalid') return t('common.invalid');
  return t('common.projected');
}

export function ChartDetailSurface({
  detail,
  selected = false,
}: {
  detail: ChartTooltipDetail;
  selected?: boolean;
}) {
  return (
    <div
      className={selected ? 'chart-tooltip chart-tooltip--selected' : 'chart-tooltip'}
      data-testid={selected ? 'chart-selected-detail' : 'chart-tooltip'}
    >
      <p className="chart-tooltip__title">{detail.title}</p>
      <dl className="chart-tooltip__grid">
        {detail.rows.map((row, index) => (
          <div className="chart-tooltip__row" key={`${row.label}-${index}`}>
            <dt>
              {row.color ? (
                <span
                  aria-hidden="true"
                  className="chart-tooltip__marker"
                  style={{ backgroundColor: row.color }}
                />
              ) : null}
              {row.label}
            </dt>
            <dd>
              <span>{row.value}</span>
              {row.meta ? <small>{row.meta}</small> : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ChartTooltip<TDatum extends object>({
  buildDetail,
}: ChartTooltipProps<TDatum>): ReactNode {
  const content = ({ active, payload }: TooltipContentProps): ReactNode => {
    if (!active) return null;
    const datum = tooltipDatum<TDatum>(payload);
    return datum ? <ChartDetailSurface detail={buildDetail(datum, payload)} /> : null;
  };

  return (
    <Tooltip
      content={content}
      isAnimationActive={false}
      wrapperStyle={{ pointerEvents: 'none', zIndex: 10 }}
    />
  );
}
