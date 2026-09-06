import {
  addMonths,
  latestObservation,
  observationAtDate,
  observationsAtDates,
  previousYearComparisonDate,
  sortObservations,
  toIsoDate,
} from './observations';

const updatedAt = '2026-01-01T00:00:00.000Z';
const values = [
  { date: '2026-12-31', amount: '150', updatedAt },
  { date: '2026-07-15', amount: '100', updatedAt },
];

describe('dated observations', () => {
  it('sorts multiple observations in one year and selects the latest eligible value', () => {
    expect(sortObservations(values).map(({ date }) => date)).toEqual(['2026-07-15', '2026-12-31']);
    expect(latestObservation(values, '2026-10-01')?.amount).toBe('100');
  });

  it('never leaks future observations and reports carry-forward staleness', () => {
    expect(observationAtDate(values, '2026-01-01')).toBeUndefined();
    expect(observationAtDate(values, '2026-07-15')).toMatchObject({
      amount: '100',
      sourceDate: '2026-07-15',
      status: 'actual',
      staleDays: 0,
    });

    expect(observationAtDate(values, '2026-07-20')).toMatchObject({
      amount: '100',
      status: 'carry-forward',
      staleDays: 5,
    });
  });

  it('derives multiple target dates in one pass without changing the requested order', () => {
    const targets = ['2026-12-31', '2026-01-01', '2026-07-15'];
    expect(observationsAtDates(values, targets, '2026-10-01')).toEqual(
      targets.map((date) => observationAtDate(values, date, '2026-10-01')),
    );
  });

  it('clamps leap-day month arithmetic to a valid month end', () => {
    expect(toIsoDate(addMonths(new Date('2024-02-29T00:00:00.000Z'), 12))).toBe('2025-02-28');
  });

  it('uses the same prior-year date or the last valid day for leap day', () => {
    expect(previousYearComparisonDate('2026-09-06')).toBe('2025-09-06');
    expect(previousYearComparisonDate('2024-02-29')).toBe('2023-02-28');
  });
});
