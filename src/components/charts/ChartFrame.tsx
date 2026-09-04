import type { ReactNode } from 'react';

export function ChartFrame({
  title,
  summary,
  children,
  table,
}: {
  title: string;
  summary: string;
  children: ReactNode;
  table: ReactNode;
}) {
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
      <details className="chart-card__table">
        <summary>View {title.toLowerCase()} data table</summary>
        <div className="table-scroll" id={tableId}>
          {table}
        </div>
      </details>
    </section>
  );
}
