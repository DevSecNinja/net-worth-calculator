import type { DashboardSnapshot } from '@/domain/model';
import { formatMoney, formatPercent } from '@/domain/currency';
import { useLocale } from '@/features/locale/LocaleProvider';

export function DashboardSummary({
  snapshot,
  currency,
  locale,
}: {
  snapshot: DashboardSnapshot;
  currency: string;
  locale: string;
}) {
  const { t } = useLocale();
  const cards = [
    {
      label: t('dashboard.assets'),
      value: formatMoney(snapshot.assets, currency, locale),
      tone: 'positive',
    },
    {
      label: t('dashboard.liabilities'),
      value: formatMoney(snapshot.liabilities, currency, locale),
      tone: 'negative',
    },
    {
      label: t('dashboard.netWorth'),
      value: formatMoney(snapshot.netWorth, currency, locale),
      tone: Number(snapshot.netWorth) >= 0 ? 'positive' : 'negative',
    },
    {
      label: t('dashboard.yearlyChange'),
      value:
        snapshot.yearlyChange !== undefined
          ? formatMoney(snapshot.yearlyChange, currency, locale)
          : t('dashboard.notDefined'),
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
    <section
      className="metric-grid"
      aria-label={t('dashboard.summaryRegion', { year: snapshot.year })}
    >
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
