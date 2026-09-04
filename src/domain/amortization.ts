import Decimal from 'decimal.js';

import type { Liability, LiabilityProjection } from './model';
import { MAX_YEAR, MIN_YEAR } from './model';
import { canonicalMoney, toDecimal } from './currency';

export type ProjectionOptions = {
  startYear: number;
  endYear: number;
};

function startMonth(liability: Liability): { year: number; month: number } {
  const date = liability.startDate ?? liability.createdAt.slice(0, 10);
  const [yearText, monthText] = date.split('-');
  return {
    year: Number(yearText),
    month: Math.max(0, Number(monthText) - 1),
  };
}

export function projectLiability(
  liability: Liability,
  { startYear, endYear }: ProjectionOptions,
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

  let balance = toDecimal(liability.principal);
  const rate = toDecimal(liability.annualInterestRate).div(100).div(12);
  const payment = toDecimal(liability.monthlyPayment);
  const begins = startMonth(liability);
  const manual = new Map(
    liability.manualBalances.map((value) => [value.year, toDecimal(value.amount)]),
  );
  const projections: LiabilityProjection[] = [];
  let elapsedMonths = 0;
  let nonAmortizing = false;
  let invalid = false;
  const earliestManualYear = liability.manualBalances.reduce(
    (earliest, value) => Math.min(earliest, value.year),
    begins.year,
  );
  const simulationStartYear = Math.min(begins.year, earliestManualYear);

  for (let year = simulationStartYear; year <= endYear; year += 1) {
    if (year < begins.year) {
      const historical = manual.get(year);
      if (historical) {
        projections.push({
          year,
          amount: canonicalMoney(historical),
          source: 'actual',
          status: historical.eq(0) ? 'paid-off' : 'actual',
        });
      }
      continue;
    }

    for (let month = 0; month < 12; month += 1) {
      if (year < begins.year || (year === begins.year && month < begins.month)) continue;
      if (balance.lte(0)) break;
      if (liability.termMonths !== undefined && elapsedMonths >= liability.termMonths) {
        invalid = balance.gt(0);
        break;
      }

      const interest = balance.mul(rate);
      if (payment.lte(interest) && balance.gt(0)) nonAmortizing = true;
      balance = Decimal.max(0, balance.plus(interest).minus(payment)).toDecimalPlaces(
        4,
        Decimal.ROUND_HALF_UP,
      );
      elapsedMonths += 1;
    }

    const actual = manual.get(year);
    if (actual) {
      balance = actual;
      projections.push({
        year,
        amount: canonicalMoney(balance),
        source: 'actual',
        status: balance.eq(0) ? 'paid-off' : 'actual',
      });
      nonAmortizing = false;
      invalid = false;
      continue;
    }

    const status = invalid
      ? 'invalid'
      : balance.eq(0)
        ? 'paid-off'
        : nonAmortizing
          ? 'non-amortizing'
          : 'projected';
    projections.push({
      year,
      amount: canonicalMoney(balance),
      source: 'projected',
      status,
    });
  }

  return projections.filter(({ year }) => year >= startYear);
}

export function projectionHorizon(liability: Liability): number {
  const begins = startMonth(liability);
  if (liability.termMonths !== undefined) {
    return Math.min(
      MAX_YEAR,
      begins.year + Math.floor((begins.month + liability.termMonths - 1) / 12),
    );
  }
  const maximum = Math.min(MAX_YEAR, begins.year + 50);
  const payoff = projectLiability(liability, {
    startYear: begins.year,
    endYear: maximum,
  }).find(({ status }) => status === 'paid-off');
  return payoff?.year ?? maximum;
}
