import Decimal from 'decimal.js';

import type { DashboardSnapshot, LiabilityProjection, Vault } from './model';
import { MAX_YEAR, MIN_YEAR } from './model';
import { projectLiability, projectionHorizon } from './amortization';
import { canonicalMoney, canonicalSignedMoney, toDecimal } from './currency';

export type AllocationSlice = {
  name: string;
  value: string;
};

export type DashboardData = {
  snapshots: DashboardSnapshot[];
  allocation: AllocationSlice[];
  projections: Map<string, LiabilityProjection[]>;
  fullProjections: Map<string, LiabilityProjection[]>;
};

export function availableYears(vault: Vault): number[] {
  const years = new Set<number>();
  for (const asset of vault.assets) for (const value of asset.values) years.add(value.year);
  for (const liability of vault.liabilities) {
    for (const value of liability.manualBalances) years.add(value.year);
  }

  if (years.size === 0 && vault.liabilities.length > 0) {
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    years.add(Math.min(MAX_YEAR, currentYear + 10));
  }

  return [...years].sort((left, right) => left - right);
}

function cagr(first: Decimal, last: Decimal, years: number): string | undefined {
  if (years <= 0 || first.lte(0) || last.lte(0)) return undefined;
  return last.div(first).pow(new Decimal(1).div(years)).minus(1).mul(100).toFixed(2);
}

export function buildDashboardData(
  vault: Vault,
  startYear?: number,
  endYear?: number,
): DashboardData {
  const knownYears = availableYears(vault);
  const firstYear = startYear ?? knownYears[0] ?? new Date().getFullYear();
  const lastYear = endYear ?? knownYears.at(-1) ?? firstYear;
  if (
    firstYear < MIN_YEAR ||
    lastYear > MAX_YEAR ||
    firstYear > lastYear ||
    !Number.isInteger(firstYear) ||
    !Number.isInteger(lastYear)
  ) {
    throw new Error('Dashboard range is invalid.');
  }

  const fullProjections = new Map(
    vault.liabilities.map((liability) => [
      liability.id,
      projectLiability(liability, {
        startYear: firstYear,
        endYear: Math.max(lastYear, projectionHorizon(liability)),
      }),
    ]),
  );
  const projections = new Map(
    [...fullProjections].map(([id, values]) => [
      id,
      values.filter(({ year }) => year >= firstYear && year <= lastYear),
    ]),
  );
  const snapshots: DashboardSnapshot[] = [];

  for (let year = firstYear; year <= lastYear; year += 1) {
    const assetValues = vault.assets.map((asset) =>
      asset.values.find((value) => value.year === year),
    );
    const complete = assetValues.every(Boolean);
    const assets = assetValues.reduce(
      (sum, value) => (value ? sum.plus(value.amount) : sum),
      new Decimal(0),
    );
    const liabilityValues = vault.liabilities.map((liability) =>
      projections.get(liability.id)?.find((value) => value.year === year),
    );
    const liabilities = liabilityValues.reduce(
      (sum, value) => (value ? sum.plus(value.amount) : sum),
      new Decimal(0),
    );
    const netWorth = assets.minus(liabilities);
    const previous = snapshots.at(-1);
    const yearlyChange =
      previous && previous.completeness === 'complete' && complete
        ? netWorth.minus(previous.netWorth)
        : undefined;
    const previousNetWorth = previous ? toDecimal(previous.netWorth) : undefined;
    const yearlyChangePercent =
      yearlyChange && previousNetWorth && !previousNetWorth.eq(0)
        ? yearlyChange.div(previousNetWorth.abs()).mul(100).toFixed(2)
        : undefined;
    const sources = new Set(liabilityValues.filter(Boolean).map((value) => value?.source));
    const liabilitySource =
      sources.size > 1 ? 'mixed' : sources.has('actual') ? 'actual' : 'projected';

    snapshots.push({
      year,
      assets: canonicalMoney(assets),
      liabilities: canonicalMoney(liabilities),
      netWorth: canonicalSignedMoney(netWorth),
      ...(yearlyChange ? { yearlyChange: canonicalSignedMoney(yearlyChange) } : {}),
      ...(yearlyChangePercent ? { yearlyChangePercent } : {}),
      completeness: complete ? 'complete' : 'incomplete',
      liabilitySource,
    });
  }

  const completeSnapshots = snapshots.filter(({ completeness }) => completeness === 'complete');
  const firstComplete = completeSnapshots[0];
  const lastComplete = completeSnapshots.at(-1);
  if (firstComplete && lastComplete && firstComplete !== lastComplete) {
    const value = cagr(
      toDecimal(firstComplete.netWorth),
      toDecimal(lastComplete.netWorth),
      lastComplete.year - firstComplete.year,
    );
    if (value) lastComplete.cagr = value;
  }

  const allocationYear = lastYear;
  const allocationMap = new Map<string, Decimal>();
  for (const asset of vault.assets) {
    const value = asset.values.find((entry) => entry.year === allocationYear);
    if (!value) continue;
    const category = asset.type === 'custom' ? (asset.customType ?? 'Custom') : asset.type;
    allocationMap.set(category, (allocationMap.get(category) ?? new Decimal(0)).plus(value.amount));
  }

  return {
    snapshots,
    allocation: [...allocationMap.entries()]
      .map(([name, value]) => ({ name, value: canonicalMoney(value) }))
      .sort((left, right) => toDecimal(right.value).cmp(left.value)),
    projections,
    fullProjections,
  };
}
