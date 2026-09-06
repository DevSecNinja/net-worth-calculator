import { useId, useState, type ReactNode } from 'react';
import { useLocale } from '@/features/locale/LocaleProvider';

import { ChartDetailSurface, type ChartTooltipDetail } from './tooltip';

export function ChartFrame({
  title,
  summary,
  children,
  table,
  selectedDetail,
}: {
  title: string;
  summary: string;
  children: ReactNode;
  table: () => ReactNode;
  selectedDetail?: ChartTooltipDetail | null;
}) {
  const { t } = useLocale();
  const [tableLoaded, setTableLoaded] = useState(false);
  const id = useId();
  const tableId = `${id}-table`;
  const instructionsId = `${id}-instructions`;
  return (
    <section className="chart-card" aria-labelledby={`${tableId}-heading`}>
      <div className="chart-card__header">
        <h2 id={`${tableId}-heading`}>{title}</h2>
        <p>{summary}</p>
      </div>
      <p className="chart-card__instructions" id={instructionsId}>
        {t('chart.interactionHint')}
      </p>
      <div className="chart-card__visual" aria-hidden="true">
        {children}
      </div>
      {selectedDetail ? (
        <div className="chart-card__selected" aria-live="polite" aria-atomic="true">
          <span className="chart-card__selected-label">{t('chart.selectedDetails')}</span>
          <ChartDetailSurface detail={selectedDetail} selected />
        </div>
      ) : null}
      <details
        className="chart-card__table"
        onToggle={(event) => {
          if (event.currentTarget.open) setTableLoaded(true);
        }}
      >
        <summary>{t('chart.viewTable', { title: title.toLowerCase() })}</summary>
        {tableLoaded ? (
          <div className="table-scroll" id={tableId}>
            {table()}
          </div>
        ) : null}
      </details>
    </section>
  );
}
