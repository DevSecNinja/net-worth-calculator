import { asset, liability, vault } from '../../tests/fixtures/vault';
import { buildDashboardData } from './aggregation';

const updatedAt = '2026-01-01T00:00:00.000Z';

describe('buildDashboardData', () => {
  it('aggregates complete yearly snapshots, change, CAGR, and allocation', () => {
    const first = asset({
      name: 'Savings',
      values: [
        { year: 2024, amount: '100', updatedAt },
        { year: 2025, amount: '150', updatedAt },
      ],
    });
    const second = asset({
      order: 1,
      type: 'stocks',
      name: 'Stocks',
      values: [
        { year: 2024, amount: '40', updatedAt },
        { year: 2025, amount: '50', updatedAt },
      ],
    });
    const debt = liability({
      principal: '0',
      monthlyPayment: '0',
      manualBalances: [
        { year: 2024, amount: '25', updatedAt },
        { year: 2025, amount: '20', updatedAt },
      ],
    });
    const data = buildDashboardData(
      vault({ assets: [first, second], liabilities: [debt] }),
      2024,
      2025,
    );

    expect(data.snapshots[0]).toMatchObject({
      assets: '140',
      liabilities: '25',
      netWorth: '115',
      completeness: 'complete',
    });
    expect(data.snapshots[1]).toMatchObject({
      assets: '200',
      liabilities: '20',
      netWorth: '180',
      yearlyChange: '65',
      yearlyChangePercent: '56.52',
      cagr: '56.52',
      liabilitySource: 'actual',
    });
    expect(data.allocation).toEqual([
      { name: 'savings', value: '150' },
      { name: 'stocks', value: '50' },
    ]);
  });

  it('does not carry a missing asset year forward', () => {
    const holding = asset({
      values: [{ year: 2025, amount: '50', updatedAt }],
    });
    const data = buildDashboardData(vault({ assets: [holding] }), 2024, 2025);
    expect(data.snapshots[0]).toMatchObject({ assets: '0', completeness: 'incomplete' });
    expect(data.snapshots[1]).toMatchObject({ assets: '50', completeness: 'complete' });
    expect(data.snapshots[1]?.yearlyChange).toBeUndefined();
  });

  it('keeps CAGR undefined for non-positive endpoints', () => {
    const holding = asset({
      values: [
        { year: 2024, amount: '0', updatedAt },
        { year: 2025, amount: '10', updatedAt },
      ],
    });
    const data = buildDashboardData(vault({ assets: [holding] }), 2024, 2025);
    expect(data.snapshots[1]?.cagr).toBeUndefined();
  });

  it('keeps the full liability payoff horizon when asset years are shorter', () => {
    const holding = asset({
      values: [{ year: 2026, amount: '5000', updatedAt }],
    });
    const debt = liability({
      principal: '2400',
      monthlyPayment: '100',
      startDate: '2026-01-01',
      termMonths: 24,
    });
    const data = buildDashboardData(vault({ assets: [holding], liabilities: [debt] }), 2026, 2026);
    expect(data.snapshots).toHaveLength(1);
    expect(data.projections.get(debt.id)?.at(-1)).toMatchObject({
      year: 2027,
      amount: '0',
      status: 'paid-off',
    });
  });
});
