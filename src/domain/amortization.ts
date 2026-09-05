import Decimal from 'decimal.js';

import type { Liability, LiabilityProjection } from './model';
import { MAX_YEAR, MIN_YEAR } from './model';
import { canonicalMoney, toDecimal } from './currency';
import { endOfMonth, parseIsoDate, sortObservations, toIsoDate } from './observations';

export type ProjectionOptions = {
  startYear: number;
  endYear: number;
  manualCutoff?: string;
};

type ProjectionEvent =
  | { date: string; type: 'payment'; paymentNumber: number }
  | { date: string; type: 'manual'; amount: string };

type ProjectionState = {
  balance: Decimal;
  nonAmortizing: boolean;
  termExhausted: boolean;
};

function scheduleStart(liability: Liability): string {
  return liability.startDate ?? liability.createdAt.slice(0, 10);
}

function paymentEvents(liability: Liability, targetDate: string): ProjectionEvent[] {
  const start = parseIsoDate(scheduleStart(liability));
  const target = parseIsoDate(targetDate);
  const events: ProjectionEvent[] = [];
  let paymentDate = endOfMonth(start);
  let paymentNumber = 1;
  while (paymentDate <= target && paymentNumber <= (liability.termMonths ?? 1200)) {
    events.push({ date: toIsoDate(paymentDate), type: 'payment', paymentNumber });
    paymentDate = endOfMonth(
      new Date(Date.UTC(paymentDate.getUTCFullYear(), paymentDate.getUTCMonth() + 1, 1)),
    );
    paymentNumber += 1;
  }
  return events;
}

export function projectLiabilityAtDate(
  liability: Liability,
  targetDate: string,
  manualCutoff = targetDate,
): LiabilityProjection {
  const target = parseIsoDate(targetDate);
  const startDate = scheduleStart(liability);
  const start = parseIsoDate(startDate);
  const manualBalances = sortObservations(liability.manualBalances).filter(
    ({ date }) => date <= targetDate && date <= manualCutoff,
  );
  const exactManual = manualBalances.findLast(({ date }) => date === targetDate);
  if (exactManual) {
    const balance = toDecimal(exactManual.amount);
    return {
      date: targetDate,
      year: target.getUTCFullYear(),
      amount: canonicalMoney(balance),
      source: 'actual',
      status: balance.eq(0) ? 'paid-off' : 'actual',
    };
  }
  if (target < start && manualBalances.length === 0) {
    return {
      date: targetDate,
      year: target.getUTCFullYear(),
      amount: '0',
      source: 'projected',
      status: 'projected',
    };
  }

  let balance = toDecimal(liability.principal);
  const rate = toDecimal(liability.annualInterestRate).div(100).div(12);
  const payment = toDecimal(liability.monthlyPayment);
  let nonAmortizing = false;
  let termExhausted = false;
  const events: ProjectionEvent[] = [
    ...paymentEvents(liability, targetDate),
    ...manualBalances.map(({ date, amount }) => ({ date, amount, type: 'manual' as const })),
  ].toSorted((left, right) => {
    const dateOrder = left.date.localeCompare(right.date);
    if (dateOrder !== 0) return dateOrder;
    return left.type === 'payment' ? -1 : 1;
  });

  for (const event of events) {
    if (event.date < startDate && event.type === 'payment') continue;
    if (event.type === 'manual') {
      balance = toDecimal(event.amount);
      nonAmortizing = false;
      continue;
    }
    if (balance.lte(0)) continue;
    const interest = balance.mul(rate);
    if (payment.lte(interest)) nonAmortizing = true;
    balance = Decimal.max(0, balance.plus(interest).minus(payment)).toDecimalPlaces(
      4,
      Decimal.ROUND_HALF_UP,
    );
    if (
      liability.termMonths !== undefined &&
      event.paymentNumber >= liability.termMonths &&
      balance.gt(0)
    ) {
      termExhausted = true;
    }
  }

  const status = termExhausted
    ? 'invalid'
    : balance.eq(0)
      ? 'paid-off'
      : nonAmortizing
        ? 'non-amortizing'
        : 'projected';
  return {
    date: targetDate,
    year: target.getUTCFullYear(),
    amount: canonicalMoney(balance),
    source: 'projected',
    status,
  };
}

function applyProjectionEvent(
  liability: Liability,
  state: ProjectionState,
  event: ProjectionEvent,
  rate: Decimal,
  payment: Decimal,
): void {
  if (event.type === 'manual') {
    state.balance = toDecimal(event.amount);
    state.nonAmortizing = false;
    return;
  }
  if (state.balance.lte(0)) return;
  const interest = state.balance.mul(rate);
  if (payment.lte(interest)) state.nonAmortizing = true;
  state.balance = Decimal.max(0, state.balance.plus(interest).minus(payment)).toDecimalPlaces(
    4,
    Decimal.ROUND_HALF_UP,
  );
  if (
    liability.termMonths !== undefined &&
    event.paymentNumber >= liability.termMonths &&
    state.balance.gt(0)
  ) {
    state.termExhausted = true;
  }
}

export function projectLiabilityAtDates(
  liability: Liability,
  targetDates: readonly string[],
  manualCutoff?: string,
): LiabilityProjection[] {
  const targets = [...new Set(targetDates)].toSorted();
  const finalTarget = targets.at(-1);
  if (!finalTarget) return [];
  for (const target of targets) parseIsoDate(target);
  const startDate = scheduleStart(liability);
  const start = parseIsoDate(startDate);
  const rate = toDecimal(liability.annualInterestRate).div(100).div(12);
  const payment = toDecimal(liability.monthlyPayment);
  const eligibleManuals = sortObservations(liability.manualBalances).filter(
    ({ date }) => date <= finalTarget && (manualCutoff === undefined || date <= manualCutoff),
  );
  const events: ProjectionEvent[] = [
    ...paymentEvents(liability, finalTarget),
    ...eligibleManuals.map(({ date, amount }) => ({ date, amount, type: 'manual' as const })),
  ].toSorted((left, right) => {
    const dateOrder = left.date.localeCompare(right.date);
    if (dateOrder !== 0) return dateOrder;
    return left.type === 'payment' ? -1 : 1;
  });
  const exactManuals = new Map(eligibleManuals.map((value) => [value.date, value]));
  const state: ProjectionState = {
    balance: toDecimal(liability.principal),
    nonAmortizing: false,
    termExhausted: false,
  };
  let eventIndex = 0;
  let hasManual = false;
  const results = new Map<string, LiabilityProjection>();

  for (const targetDate of targets) {
    while (eventIndex < events.length && events[eventIndex]!.date <= targetDate) {
      const event = events[eventIndex]!;
      if (event.type === 'payment' && event.date < startDate) {
        eventIndex += 1;
        continue;
      }
      applyProjectionEvent(liability, state, event, rate, payment);
      if (event.type === 'manual') hasManual = true;
      eventIndex += 1;
    }

    const target = parseIsoDate(targetDate);
    const exactManual = exactManuals.get(targetDate);
    if (target < start && !hasManual) {
      results.set(targetDate, {
        date: targetDate,
        year: target.getUTCFullYear(),
        amount: '0',
        source: 'projected',
        status: 'projected',
      });
      continue;
    }
    const status = exactManual
      ? state.balance.eq(0)
        ? 'paid-off'
        : 'actual'
      : state.termExhausted
        ? 'invalid'
        : state.balance.eq(0)
          ? 'paid-off'
          : state.nonAmortizing
            ? 'non-amortizing'
            : 'projected';
    results.set(targetDate, {
      date: targetDate,
      year: target.getUTCFullYear(),
      amount: canonicalMoney(state.balance),
      source: exactManual ? 'actual' : 'projected',
      status,
    });
  }
  return targetDates.map((targetDate) => results.get(targetDate)!);
}

export function projectLiability(
  liability: Liability,
  { startYear, endYear, manualCutoff }: ProjectionOptions,
): LiabilityProjection[] {
  if (
    startYear < MIN_YEAR ||
    endYear > MAX_YEAR ||
    startYear > endYear ||
    !Number.isInteger(startYear) ||
    !Number.isInteger(endYear)
  ) {
    throw new Error('Projection range is invalid.');
  }
  return projectLiabilityAtDates(
    liability,
    Array.from(
      { length: endYear - startYear + 1 },
      (_, index) => `${String(startYear + index).padStart(4, '0')}-12-31`,
    ),
    manualCutoff,
  );
}

export function projectionHorizon(liability: Liability): number {
  const startYear = Number(scheduleStart(liability).slice(0, 4));
  if (startYear < MIN_YEAR || startYear > MAX_YEAR) throw new Error('Projection range is invalid.');
  const latestManualYear = liability.manualBalances.reduce(
    (latest, { date }) => Math.max(latest, Number(date.slice(0, 4))),
    startYear,
  );
  const maximum = Math.min(
    MAX_YEAR,
    Math.max(
      startYear + 50,
      latestManualYear + 50,
      liability.termMonths === undefined
        ? startYear
        : startYear + Math.ceil(liability.termMonths / 12),
    ),
  );
  const projections = projectLiability(liability, { startYear, endYear: maximum });
  return (
    projections.find(({ year, status }) => year >= latestManualYear && status === 'paid-off')
      ?.year ??
    projections.findLast(({ year }) => year >= latestManualYear)?.year ??
    latestManualYear
  );
}
