import { useLayoutEffect, useRef, type ReactNode } from 'react';
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

type HorizontalBounds = {
  left: number;
  right: number;
};

export function horizontalTooltipShift(
  tooltip: HorizontalBounds,
  container: HorizontalBounds,
  viewport: HorizontalBounds,
): number {
  const visibleLeft = Math.max(container.left, viewport.left);
  const visibleRight = Math.min(container.right, viewport.right);
  if (visibleRight <= visibleLeft) return 0;
  if (tooltip.left < visibleLeft) return visibleLeft - tooltip.left;
  if (tooltip.right > visibleRight) return visibleRight - tooltip.right;
  return 0;
}

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

function ClampedChartTooltipContent<TDatum extends object>({
  active,
  payload,
  buildDetail,
  coordinate,
}: TooltipContentProps & ChartTooltipProps<TDatum>): ReactNode {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const datum = active ? tooltipDatum<TDatum>(payload) : undefined;
  const coordinateX = coordinate?.x;
  const coordinateY = coordinate?.y;

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const wrapper = surface?.closest<HTMLElement>('.recharts-tooltip-wrapper');
    const scrollport = surface?.closest<HTMLElement>('.chart-card__visual');
    if (!surface || !wrapper || !scrollport) return;

    const clamp = () => {
      wrapper.style.removeProperty('translate');
      const visualViewport = window.visualViewport;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportWidth = visualViewport?.width ?? document.documentElement.clientWidth;
      const scrollportBounds = scrollport.getBoundingClientRect();
      const visibleLeft = Math.max(scrollportBounds.left, viewportLeft);
      const visibleRight = Math.min(scrollportBounds.right, viewportLeft + viewportWidth);
      surface.style.setProperty(
        '--chart-tooltip-visible-width',
        `${Math.max(0, visibleRight - visibleLeft)}px`,
      );
      const shift = horizontalTooltipShift(surface.getBoundingClientRect(), scrollportBounds, {
        left: viewportLeft,
        right: viewportLeft + viewportWidth,
      });
      if (shift !== 0) wrapper.style.translate = `${shift}px 0`;
    };

    clamp();
    scrollport.addEventListener('scroll', clamp, { passive: true });
    window.addEventListener('resize', clamp);
    window.visualViewport?.addEventListener('resize', clamp);
    window.visualViewport?.addEventListener('scroll', clamp);
    const resizeObserver = new ResizeObserver(clamp);
    resizeObserver.observe(surface);
    resizeObserver.observe(scrollport);

    return () => {
      resizeObserver.disconnect();
      scrollport.removeEventListener('scroll', clamp);
      window.removeEventListener('resize', clamp);
      window.visualViewport?.removeEventListener('resize', clamp);
      window.visualViewport?.removeEventListener('scroll', clamp);
      wrapper.style.removeProperty('translate');
      surface.style.removeProperty('--chart-tooltip-visible-width');
    };
  }, [active, coordinateX, coordinateY, datum]);

  return datum ? (
    <div ref={surfaceRef}>
      <ChartDetailSurface detail={buildDetail(datum, payload)} />
    </div>
  ) : null;
}

export function ChartTooltip<TDatum extends object>({
  buildDetail,
}: ChartTooltipProps<TDatum>): ReactNode {
  return (
    <Tooltip
      content={(props) => (
        <ClampedChartTooltipContent<TDatum> {...props} buildDetail={buildDetail} />
      )}
      isAnimationActive={false}
      wrapperStyle={{ pointerEvents: 'none', zIndex: 10 }}
    />
  );
}
