import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { AllocationChart } from '@/components/charts/AllocationChart';
import { AnnualChangeChart } from '@/components/charts/AnnualChangeChart';
import { BalanceChart } from '@/components/charts/BalanceChart';
import { PayoffChart } from '@/components/charts/PayoffChart';
import { TrendChart } from '@/components/charts/TrendChart';
import { buildDashboardData, availableYears } from '@/domain/aggregation';
import { useVault } from '@/features/vault/useVault';

import { DashboardSummary } from './DashboardSummary';
import { RangeFilter } from './RangeFilter';

export function DashboardPage() {
  const { vault } = useVault();
  const knownYears = useMemo(() => (vault ? availableYears(vault) : []), [vault]);
  const fallbackYear = new Date().getFullYear();
  const [range, setRange] = useState(() => ({
    start: knownYears[0] ?? fallbackYear,
    end: knownYears.at(-1) ?? fallbackYear,
  }));

  if (!vault) return null;
  if (vault.assets.length === 0 && vault.liabilities.length === 0) {
    return (
      <main id="main-content" className="page">
        <section className="hero hero--compact">
          <p className="eyebrow">Your private dashboard</p>
          <h1>Build your first net worth snapshot.</h1>
          <p>Add an asset or liability. Your values stay encrypted in this browser.</p>
          <div className="button-row">
            <Link className="button button--primary" to="/assets">
              Add an asset
            </Link>
            <Link className="button button--secondary" to="/liabilities">
              Add a liability
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const minYear = knownYears[0] ?? fallbackYear;
  const maxKnown = knownYears.at(-1) ?? fallbackYear;
  const years = Array.from(
    { length: Math.max(1, maxKnown - minYear + 1) },
    (_, index) => minYear + index,
  );
  const start = Math.max(minYear, Math.min(range.start, maxKnown));
  const end = Math.max(start, Math.min(range.end, maxKnown));
  const data = buildDashboardData(vault, start, end);
  const latest = data.snapshots.at(-1);
  if (!latest) return null;

  return (
    <main id="main-content" className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Encrypted and local</p>
          <h1>Net worth dashboard</h1>
          <p>
            {latest.completeness === 'complete'
              ? `Complete explicit asset values for ${latest.year}.`
              : `${latest.year} is incomplete because at least one asset has no explicit value.`}
          </p>
        </div>
        <RangeFilter
          years={years}
          startYear={start}
          endYear={end}
          onChange={(nextStart, nextEnd) => setRange({ start: nextStart, end: nextEnd })}
        />
      </div>
      <DashboardSummary
        snapshot={latest}
        currency={vault.settings.baseCurrency}
        locale={vault.settings.locale}
      />
      {latest.cagr ? (
        <p className="insight-callout">CAGR: {latest.cagr}% across complete years.</p>
      ) : null}
      <div className="chart-grid">
        <TrendChart
          snapshots={data.snapshots}
          currency={vault.settings.baseCurrency}
          locale={vault.settings.locale}
        />
        <BalanceChart
          snapshots={data.snapshots}
          currency={vault.settings.baseCurrency}
          locale={vault.settings.locale}
        />
        <AllocationChart
          allocation={data.allocation}
          currency={vault.settings.baseCurrency}
          locale={vault.settings.locale}
          year={end}
        />
        <AnnualChangeChart
          snapshots={data.snapshots}
          currency={vault.settings.baseCurrency}
          locale={vault.settings.locale}
        />
        {vault.liabilities.length > 0 ? (
          <PayoffChart
            liabilities={vault.liabilities}
            projections={data.projections}
            currency={vault.settings.baseCurrency}
            locale={vault.settings.locale}
          />
        ) : null}
      </div>
    </main>
  );
}
