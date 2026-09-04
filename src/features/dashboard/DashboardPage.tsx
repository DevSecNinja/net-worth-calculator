import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { AllocationChart } from '@/components/charts/AllocationChart';
import { AnnualChangeChart } from '@/components/charts/AnnualChangeChart';
import { BalanceChart } from '@/components/charts/BalanceChart';
import { PayoffChart } from '@/components/charts/PayoffChart';
import { TrendChart } from '@/components/charts/TrendChart';
import { TimelineChart } from '@/components/charts/TimelineChart';
import { buildDashboardData, availableYears } from '@/domain/aggregation';
import { formatObservationDate, todayLocalIso } from '@/domain/observations';
import { useVault } from '@/features/vault/useVault';
import { useLocale } from '@/features/locale/LocaleProvider';

import { DashboardSummary } from './DashboardSummary';
import { RangeFilter } from './RangeFilter';

export function DashboardPage() {
  const { vault } = useVault();
  const { locale, t } = useLocale();
  const knownYears = useMemo(() => (vault ? availableYears(vault) : []), [vault]);
  const fallbackYear = new Date().getFullYear();
  const [range, setRange] = useState(() => ({
    start: knownYears[0] ?? fallbackYear,
    end: knownYears.at(-1) ?? fallbackYear,
  }));
  const [asOfDate, setAsOfDate] = useState(todayLocalIso);
  const [asOfDraft, setAsOfDraft] = useState(todayLocalIso);

  if (!vault) return null;
  if (vault.assets.length === 0 && vault.liabilities.length === 0) {
    return (
      <main id="main-content" className="page">
        <section className="hero hero--compact">
          <p className="eyebrow">{t('dashboard.eyebrow')}</p>
          <h1>{t('dashboard.emptyTitle')}</h1>
          <p>{t('dashboard.emptyText')}</p>
          <div className="button-row">
            <Link className="button button--primary" to="/assets">
              {t('dashboard.addAsset')}
            </Link>
            <Link className="button button--secondary" to="/liabilities">
              {t('dashboard.addLiability')}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const minYear = knownYears[0] ?? fallbackYear;
  const maxKnown = knownYears.at(-1) ?? fallbackYear;
  const asOfYear = Number(asOfDate.slice(0, 4));
  const years = Array.from(
    { length: Math.max(1, maxKnown - minYear + 1) },
    (_, index) => minYear + index,
  );
  const end = Math.min(range.end, maxKnown, asOfYear);
  const start = Math.min(end, Math.max(minYear, Math.min(range.start, maxKnown)));
  const data = buildDashboardData(vault, start, end, asOfDate);
  const latest = data.snapshots.at(-1);
  if (!latest) return null;

  return (
    <main id="main-content" className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('dashboard.eyebrow')}</p>
          <h1>{t('dashboard.title')}</h1>
          <p>
            {data.asOfSnapshot.completeness === 'complete'
              ? t('dashboard.complete', { date: asOfDate })
              : t('dashboard.incomplete', { date: asOfDate })}
          </p>
        </div>
        <div className="form-stack">
          <label className="field">
            <span>{t('dashboard.asOf')}</span>
            <input
              type="date"
              min="1900-01-01"
              max="2200-12-31"
              value={asOfDraft}
              onChange={(event) => {
                const next = event.currentTarget.value;
                setAsOfDraft(next);
                if (/^\d{4}-\d{2}-\d{2}$/.test(next)) setAsOfDate(next);
              }}
              required
            />
            {!/^\d{4}-\d{2}-\d{2}$/.test(asOfDraft) ? (
              <span className="field__error" role="alert">
                {t('dashboard.invalidAsOf')}
              </span>
            ) : null}
          </label>
          <RangeFilter
            years={years}
            startYear={start}
            endYear={end}
            onChange={(nextStart, nextEnd) => setRange({ start: nextStart, end: nextEnd })}
          />
        </div>
      </div>
      <DashboardSummary
        snapshot={data.asOfSnapshot}
        currency={vault.settings.baseCurrency}
        locale={locale}
      />
      <details className="panel">
        <summary>{t('dashboard.observationSources')}</summary>
        <ul>
          {data.asOfSnapshot.assetSources.map((source) => {
            const item = vault.assets.find(({ id }) => id === source.itemId);
            return (
              <li key={source.itemId}>
                {item?.name}:{' '}
                {source.status === 'actual'
                  ? t('common.actual')
                  : source.status === 'carry-forward'
                    ? t('common.carryForward')
                    : t('common.unavailable')}
                {source.sourceDate ? ` (${formatObservationDate(source.sourceDate, locale)})` : ''}
                {source.staleDays
                  ? `, ${t('dashboard.staleDays', { count: source.staleDays })}`
                  : ''}
              </li>
            );
          })}
        </ul>
      </details>
      {latest.cagr ? (
        <p className="insight-callout">{t('dashboard.cagr', { value: latest.cagr })}</p>
      ) : null}
      <div className="chart-grid">
        <TrendChart
          snapshots={data.snapshots}
          currency={vault.settings.baseCurrency}
          locale={locale}
        />
        <BalanceChart
          snapshots={data.snapshots}
          currency={vault.settings.baseCurrency}
          locale={locale}
        />
        <AllocationChart
          allocation={data.allocation}
          currency={vault.settings.baseCurrency}
          locale={locale}
          date={asOfDate}
        />
        <AnnualChangeChart
          snapshots={data.snapshots}
          currency={vault.settings.baseCurrency}
          locale={locale}
        />
        {vault.liabilities.length > 0 ? (
          <PayoffChart
            liabilities={vault.liabilities}
            projections={data.projections}
            currency={vault.settings.baseCurrency}
            locale={locale}
          />
        ) : null}
        <TimelineChart
          snapshots={data.timeline}
          currency={vault.settings.baseCurrency}
          locale={locale}
        />
      </div>
    </main>
  );
}
