import type { DashboardSnapshot } from '@/domain/model';
import { formatMoney, formatPercent } from '@/domain/currency';

export function DashboardSummary({
  snapshot,
  currency,
  locale,
}: {
  snapshot: DashboardSnapshot;
  currency: string;
  locale: string;
}) {
  const cards = [
    { label: 'Assets', value: formatMoney(snapshot.assets, currency, locale), tone: 'positive' },
    {
      label: 'Liabilities',
      value: formatMoney(snapshot.liabilities, currency, locale),
      tone: 'negative',
    },
    {
      label: 'Net worth',
      value: formatMoney(snapshot.netWorth, currency, locale),
      tone: Number(snapshot.netWorth) >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Yearly change',
      value:
        snapshot.yearlyChange !== undefined
          ? formatMoney(snapshot.yearlyChange, currency, locale)
          : 'Not defined',
      detail:
        snapshot.yearlyChangePercent !== undefined
          ? formatPercent(snapshot.yearlyChangePercent, locale)
          : undefined,
      tone:
        snapshot.yearlyChange !== undefined && Number(snapshot.yearlyChange) >= 0
          ? 'positive'
          : 'neutral',
    },
  ];

  return (
    <section className="metric-grid" aria-label={`${snapshot.year} summary`}>
      {cards.map((card) => (
        <article className={`metric-card metric-card--${card.tone}`} key={card.label}>
          <p>{card.label}</p>
          <strong>{card.value}</strong>
          {card.detail ? <span>{card.detail}</span> : null}
        </article>
      ))}
    </section>
  );
}
