import { useState, type ReactNode } from 'react';
import { useLocale } from '@/features/locale/LocaleProvider';

export function ChartFrame({
  title,
  summary,
  children,
  table,
}: {
  title: string;
  summary: string;
  children: ReactNode;
  table: () => ReactNode;
}) {
  const { t } = useLocale();
  const [tableLoaded, setTableLoaded] = useState(false);
  const tableId = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-table`;
  return (
    <section className="chart-card" aria-labelledby={`${tableId}-heading`}>
      <div className="chart-card__header">
        <h2 id={`${tableId}-heading`}>{title}</h2>
        <p>{summary}</p>
      </div>
      <div className="chart-card__visual" aria-hidden="true" inert>
        {children}
      </div>
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
