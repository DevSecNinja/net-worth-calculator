import { liability } from '../../tests/fixtures/vault';
import { projectLiability } from './amortization';

describe('projectLiability', () => {
  it('handles a zero rate and stops exactly at zero', () => {
    const [point] = projectLiability(liability(), { startYear: 2026, endYear: 2026 });
    expect(point).toEqual({ year: 2026, amount: '0', source: 'projected', status: 'paid-off' });
  });

  it('marks negative amortization explicitly', () => {
    const [point] = projectLiability(
      liability({ annualInterestRate: '12', monthlyPayment: '5', principal: '1000' }),
      { startYear: 2026, endYear: 2026 },
    );
    expect(Number(point?.amount)).toBeGreaterThan(1000);
    expect(point?.status).toBe('non-amortizing');
  });

  it('handles overpayment without a negative balance', () => {
    const [point] = projectLiability(liability({ principal: '1000', monthlyPayment: '2000' }), {
      startYear: 2026,
      endYear: 2026,
    });
    expect(point?.amount).toBe('0');
    expect(point?.status).toBe('paid-off');
  });

  it('uses a manual year-end balance to seed the next year', () => {
    const points = projectLiability(
      liability({
        principal: '1200',
        monthlyPayment: '100',
        manualBalances: [{ year: 2026, amount: '600', updatedAt: '2026-12-31T00:00:00.000Z' }],
      }),
      { startYear: 2026, endYear: 2027 },
    );
    expect(points[0]).toMatchObject({ amount: '600', source: 'actual', status: 'actual' });
    expect(points[1]).toMatchObject({ amount: '0', status: 'paid-off' });
  });

  it('handles future starts and expired terms', () => {
    expect(
      projectLiability(liability({ startDate: '2026-07-01' }), {
        startYear: 2026,
        endYear: 2026,
      })[0]?.amount,
    ).toBe('600');
    expect(
      projectLiability(liability({ principal: '1000', termMonths: 3 }), {
        startYear: 2026,
        endYear: 2026,
      })[0],
    ).toMatchObject({ amount: '700', status: 'invalid' });
  });

  it('rejects invalid ranges', () => {
    expect(() => projectLiability(liability(), { startYear: 2027, endYear: 2026 })).toThrow(
      'Projection range is invalid',
    );
  });

  it('keeps a year invariant when dashboard filters start later', () => {
    const fixed = liability({
      principal: '10000',
      annualInterestRate: '5',
      monthlyPayment: '150',
      startDate: '2020-01-01',
      termMonths: 120,
    });
    const complete = projectLiability(fixed, { startYear: 2020, endYear: 2026 });
    const filtered = projectLiability(fixed, { startYear: 2026, endYear: 2026 });
    expect(filtered[0]).toEqual(complete.find(({ year }) => year === 2026));
  });

  it('applies manual balances before the selected range', () => {
    const fixed = liability({
      principal: '5000',
      monthlyPayment: '100',
      startDate: '2020-01-01',
      manualBalances: [{ year: 2024, amount: '2400', updatedAt: '2024-12-31T00:00:00.000Z' }],
    });
    expect(projectLiability(fixed, { startYear: 2025, endYear: 2025 })[0]).toMatchObject({
      amount: '1200',
      source: 'projected',
    });
  });

  it('uses createdAt as a stable baseline when start date is absent', () => {
    const fixed = liability({
      principal: '2400',
      monthlyPayment: '100',
      startDate: undefined,
      createdAt: '2026-01-15T00:00:00.000Z',
    });
    const full = projectLiability(fixed, { startYear: 2026, endYear: 2027 });
    const filtered = projectLiability(fixed, { startYear: 2027, endYear: 2027 });
    expect(filtered[0]).toEqual(full.find(({ year }) => year === 2027));
  });
});
