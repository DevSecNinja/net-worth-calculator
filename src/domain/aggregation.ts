import Decimal from 'decimal.js';

import type { AssetType, DashboardSnapshot, LiabilityProjection, Vault } from './model';
import { MAX_YEAR, MIN_YEAR } from './model';
import {
  projectLiability,
  projectLiabilityAtDate,
  projectLiabilityAtDates,
  projectionHorizon,
} from './amortization';
import { canonicalMoney, canonicalSignedMoney, toDecimal } from './currency';
import {
  observationAtDate,
  observationsAtDates,
  previousYearComparisonDate,
  type ObservationValue,
} from './observations';

export type AllocationSlice = {
  name: string;
  type: AssetType;
  value: string;
};

export type DatedSnapshot = DashboardSnapshot & {
  assetSources: {
    itemId: string;
    sourceDate?: string;
    status: 'actual' | 'carry-forward' | 'unavailable';
    staleDays?: number;
  }[];
};

export type DashboardData = {
  snapshots: DashboardSnapshot[];
  timeline: DatedSnapshot[];
  asOfSnapshot: DatedSnapshot;
  allocation: AllocationSlice[];
  projections: Map<string, LiabilityProjection[]>;
  fullProjections: Map<string, LiabilityProjection[]>;
};

export function availableYears(
  vault: Vault,
  projectionHorizons?: ReadonlyMap<string, number>,
): number[] {
  const years = new Set<number>();
  for (const asset of vault.assets) {
    for (const value of asset.values) years.add(Number(value.date.slice(0, 4)));
  }
  for (const liability of vault.liabilities) {
    for (const value of liability.manualBalances) years.add(Number(value.date.slice(0, 4)));
    const startYear = Number((liability.startDate ?? liability.createdAt).slice(0, 4));
    if (startYear >= MIN_YEAR && startYear <= MAX_YEAR) years.add(startYear);
    years.add(projectionHorizons?.get(liability.id) ?? projectionHorizon(liability));
  }

  if (years.size === 0) years.add(new Date().getFullYear());
  return [...years].sort((left, right) => left - right);
}

function cagr(first: Decimal, last: Decimal, years: number): string | undefined {
  if (years <= 0 || first.lte(0) || last.lte(0)) return undefined;
  return last.div(first).pow(new Decimal(1).div(years)).minus(1).mul(100).toFixed(2);
}

function applyYearlyChange(
  current: DashboardSnapshot,
  previous: DashboardSnapshot | undefined,
): void {
  if (
    previous === undefined ||
    current.completeness !== 'complete' ||
    previous.completeness !== 'complete'
  ) {
    return;
  }
  const previousNetWorth = toDecimal(previous.netWorth);
  const change = toDecimal(current.netWorth).minus(previousNetWorth);
  current.yearlyChange = canonicalSignedMoney(change);
  if (!previousNetWorth.eq(0)) {
    current.yearlyChangePercent = change.div(previousNetWorth.abs()).mul(100).toFixed(2);
  }
}

function buildSnapshot(
  vault: Vault,
  asOfDate: string,
  eligibleThrough: string,
  liabilityValues: LiabilityProjection[],
  preparedAssetValues?: (ObservationValue | undefined)[],
): DatedSnapshot {
  const year = Number(asOfDate.slice(0, 4));
  if (year < MIN_YEAR || year > MAX_YEAR) throw new Error('Dashboard date is invalid.');
  const assetValues = vault.assets.map((asset, index) => {
    const observed =
      preparedAssetValues === undefined
        ? observationAtDate(asset.values, asOfDate, eligibleThrough)
        : preparedAssetValues[index];
    return {
      observed,
      source: {
        itemId: asset.id,
        ...(observed
          ? {
              sourceDate: observed.sourceDate,
              status: observed.status,
              staleDays: observed.staleDays,
            }
          : { status: 'unavailable' as const }),
      },
    };
  });
  const assets = assetValues.reduce(
    (sum, { observed }) => (observed ? sum.plus(observed.amount) : sum),
    new Decimal(0),
  );
  const liabilities = liabilityValues.reduce(
    (sum, value) => sum.plus(value.amount),
    new Decimal(0),
  );
  const assetSources = assetValues.map(({ source }) => source);
  const assetStatuses = new Set(assetSources.map(({ status }) => status));
  const liabilitySources = new Set(liabilityValues.map(({ source }) => source));
  return {
    asOfDate,
    year,
    assets: canonicalMoney(assets),
    liabilities: canonicalMoney(liabilities),
    netWorth: canonicalSignedMoney(assets.minus(liabilities)),
    completeness: assetValues.every(({ observed }) => Boolean(observed))
      ? 'complete'
      : 'incomplete',
    assetSource:
      assetStatuses.size > 1
        ? 'mixed'
        : assetStatuses.has('actual')
          ? 'actual'
          : assetStatuses.has('carry-forward')
            ? 'carry-forward'
            : 'unavailable',
    liabilitySource:
      liabilitySources.size > 1 ? 'mixed' : liabilitySources.has('actual') ? 'actual' : 'projected',
    assetSources,
  };
}

export function buildSnapshotAtDate(
  vault: Vault,
  asOfDate: string,
  eligibleThrough = asOfDate,
): DatedSnapshot {
  return buildSnapshot(
    vault,
    asOfDate,
    eligibleThrough,
    vault.liabilities.map((liability) =>
      projectLiabilityAtDate(liability, asOfDate, eligibleThrough),
    ),
  );
}

function timelineDates(
  vault: Vault,
  asOfDate: string,
  startYear: number,
  endYear: number,
): string[] {
  const dates = new Set<string>([asOfDate]);
  for (const asset of vault.assets) {
    for (const value of asset.values) {
      const year = Number(value.date.slice(0, 4));
      if (year >= startYear && year <= endYear && value.date <= asOfDate) dates.add(value.date);
    }
  }
  for (const liability of vault.liabilities) {
    for (const value of liability.manualBalances) {
      const year = Number(value.date.slice(0, 4));
      if (year >= startYear && year <= endYear && value.date <= asOfDate) dates.add(value.date);
    }
  }
  return [...dates].sort();
}

export function buildDashboardData(
  vault: Vault,
  startYear?: number,
  endYear?: number,
  asOfDate = new Date().toISOString().slice(0, 10),
): DashboardData {
  const projectionHorizons = new Map(
    vault.liabilities.map((liability) => [liability.id, projectionHorizon(liability)]),
  );
  const knownYears = availableYears(vault, projectionHorizons);
  const asOfYear = Number(asOfDate.slice(0, 4));
  const requestedFirstYear = startYear ?? knownYears[0] ?? asOfYear;
  const lastYear = Math.min(endYear ?? knownYears.at(-1) ?? requestedFirstYear, asOfYear);
  const firstYear = Math.min(requestedFirstYear, lastYear);
  if (
    firstYear < MIN_YEAR ||
    lastYear > MAX_YEAR ||
    firstYear > lastYear ||
    !Number.isInteger(firstYear) ||
    !Number.isInteger(lastYear)
  ) {
    throw new Error('Dashboard range is invalid.');
  }

  const annualDates = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, index) => `${String(firstYear + index).padStart(4, '0')}-12-31`,
  );
  const exactDates = timelineDates(vault, asOfDate, firstYear, lastYear);
  const comparisonDate = previousYearComparisonDate(asOfDate);
  const comparisonDateIsSupported = Number(comparisonDate.slice(0, 4)) >= MIN_YEAR;
  const snapshotDates = [
    ...new Set([
      ...annualDates,
      ...exactDates,
      asOfDate,
      ...(comparisonDateIsSupported ? [comparisonDate] : []),
    ]),
  ].sort();
  const liabilitySnapshots = new Map(
    vault.liabilities.map((liability) => [
      liability.id,
      new Map(
        projectLiabilityAtDates(liability, snapshotDates, asOfDate).map((projection) => [
          projection.date,
          projection,
        ]),
      ),
    ]),
  );
  const assetSnapshots = vault.assets.map((asset) =>
    observationsAtDates(asset.values, snapshotDates, asOfDate),
  );
  const snapshotDateIndexes = new Map(snapshotDates.map((date, index) => [date, index]));
  const snapshotAt = (date: string) =>
    buildSnapshot(
      vault,
      date,
      date > asOfDate ? asOfDate : date,
      vault.liabilities.map((liability) => liabilitySnapshots.get(liability.id)!.get(date)!),
      assetSnapshots.map((values) => values[snapshotDateIndexes.get(date)!]),
    );
  const snapshots = annualDates.map(snapshotAt);
  for (let index = 1; index < snapshots.length; index += 1) {
    const current = snapshots[index];
    const previous = snapshots[index - 1];
    if (!current || !previous) continue;
    applyYearlyChange(current, previous);
  }
  const asOfSnapshot = snapshotAt(asOfDate);
  applyYearlyChange(
    asOfSnapshot,
    comparisonDateIsSupported ? snapshotAt(comparisonDate) : undefined,
  );
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

  const fullProjections = new Map(
    vault.liabilities.map((liability) => [
      liability.id,
      projectLiability(liability, {
        startYear: firstYear,
        endYear: Math.max(lastYear, projectionHorizons.get(liability.id)!),
        manualCutoff: asOfDate,
      }),
    ]),
  );
  const projections = new Map(
    [...fullProjections].map(([id, values]) => [
      id,
      values.filter(({ year }) => year >= firstYear && year <= lastYear),
    ]),
  );
  const allocationMap = new Map<string, { name: string; type: AssetType; value: Decimal }>();
  for (const asset of vault.assets) {
    const value = observationAtDate(asset.values, asOfDate);
    if (!value) continue;
    const name = asset.type === 'custom' ? (asset.customType ?? 'custom') : asset.type;
    const key = `${asset.type}:${name}`;
    const existing = allocationMap.get(key);
    allocationMap.set(key, {
      name,
      type: asset.type,
      value: (existing?.value ?? new Decimal(0)).plus(value.amount),
    });
  }

  return {
    snapshots,
    timeline: exactDates.map(snapshotAt),
    asOfSnapshot,
    allocation: [...allocationMap.values()]
      .map(({ name, type, value }) => ({ name, type, value: canonicalMoney(value) }))
      .sort((left, right) => toDecimal(right.value).cmp(left.value)),
    projections,
    fullProjections,
  };
}
