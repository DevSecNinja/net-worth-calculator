import { useId } from 'react';

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
  const yearlyChangeDescriptionId = useId();
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
      description: t('dashboard.yearlyChangeDetail'),
      descriptionId: yearlyChangeDescriptionId,
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
        <article
          className={`metric-card metric-card--${card.tone}`}
          key={card.label}
          aria-describedby={card.description ? card.descriptionId : undefined}
        >
          <p>{card.label}</p>
          <strong>{card.value}</strong>
          {card.detail ? <span>{card.detail}</span> : null}
          {card.description ? (
            <span className="visually-hidden" id={card.descriptionId}>
              {card.description}
            </span>
          ) : null}
        </article>
      ))}
    </section>
  );
}
