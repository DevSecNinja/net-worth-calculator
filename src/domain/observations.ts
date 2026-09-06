import Decimal from 'decimal.js';

import type { MoneyString, ValueObservation } from './model';

export type ObservationValue = {
  amount: MoneyString;
  sourceDate: string;
  status: 'actual' | 'carry-forward';
  staleDays: number;
};

export function parseIsoDate(date: string): Date {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('Date must be a valid ISO calendar date.');
  }
  return parsed;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayLocalIso(date = new Date()): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function formatObservationDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parseIsoDate(date));
}

export function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

export function addMonths(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const maximumDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, maximumDay));
  return target;
}

export function previousYearComparisonDate(date: string): string {
  return toIsoDate(addMonths(parseIsoDate(date), -12));
}

export function daysBetween(start: string, end: string): number {
  return Math.max(
    0,
    Math.floor((parseIsoDate(end).getTime() - parseIsoDate(start).getTime()) / 86_400_000),
  );
}

export function sortObservations(values: readonly ValueObservation[]): ValueObservation[] {
  return values.toSorted((left, right) => left.date.localeCompare(right.date));
}

export function latestObservation(
  values: readonly ValueObservation[],
  asOfDate: string,
): ValueObservation | undefined {
  return sortObservations(values).findLast(({ date }) => date <= asOfDate);
}

export function observationAtDate(
  values: readonly ValueObservation[],
  asOfDate: string,
  eligibleThrough = asOfDate,
): ObservationValue | undefined {
  parseIsoDate(asOfDate);
  parseIsoDate(eligibleThrough);
  const observation = latestObservation(
    values,
    eligibleThrough < asOfDate ? eligibleThrough : asOfDate,
  );
  if (!observation) return undefined;
  return {
    amount: new Decimal(observation.amount).toFixed().replace(/\.0+$/, ''),
    sourceDate: observation.date,
    status: observation.date === asOfDate ? 'actual' : 'carry-forward',
    staleDays: daysBetween(observation.date, asOfDate),
  };
}

export function observationsAtDates(
  values: readonly ValueObservation[],
  targetDates: readonly string[],
  eligibleThrough?: string,
): (ObservationValue | undefined)[] {
  const targets = [...new Set(targetDates)].toSorted();
  const observations = sortObservations(values);
  const results = new Map<string, ObservationValue | undefined>();
  let observationIndex = 0;
  let latest: ValueObservation | undefined;

  for (const targetDate of targets) {
    parseIsoDate(targetDate);
    const cutoff =
      eligibleThrough !== undefined && eligibleThrough < targetDate ? eligibleThrough : targetDate;
    while (
      observationIndex < observations.length &&
      observations[observationIndex]!.date <= cutoff
    ) {
      latest = observations[observationIndex];
      observationIndex += 1;
    }
    results.set(
      targetDate,
      latest
        ? {
            amount: new Decimal(latest.amount).toFixed().replace(/\.0+$/, ''),
            sourceDate: latest.date,
            status: latest.date === targetDate ? 'actual' : 'carry-forward',
            staleDays: daysBetween(latest.date, targetDate),
          }
        : undefined,
    );
  }

  return targetDates.map((targetDate) => results.get(targetDate));
}
