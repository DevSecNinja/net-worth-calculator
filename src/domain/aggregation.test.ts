import { asset, liability, vault } from '../../tests/fixtures/vault';
import { availableYears, buildDashboardData, buildSnapshotAtDate } from './aggregation';

const updatedAt = '2026-01-01T00:00:00.000Z';

describe('buildDashboardData', () => {
  it('aggregates complete yearly snapshots, change, CAGR, and allocation', () => {
    const first = asset({
      name: 'Savings',
      values: [
        { date: '2024-12-31', amount: '100', updatedAt },
        { date: '2025-12-31', amount: '150', updatedAt },
      ],
    });
    const second = asset({
      order: 1,
      type: 'stocks',
      name: 'Stocks',
      values: [
        { date: '2024-12-31', amount: '40', updatedAt },
        { date: '2025-12-31', amount: '50', updatedAt },
      ],
    });
    const debt = liability({
      principal: '0',
      monthlyPayment: '0',
      manualBalances: [
        { date: '2024-12-31', amount: '25', updatedAt },
        { date: '2025-12-31', amount: '20', updatedAt },
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
      values: [{ date: '2025-12-31', amount: '50', updatedAt }],
    });
    const data = buildDashboardData(vault({ assets: [holding] }), 2024, 2025);
    expect(data.snapshots[0]).toMatchObject({ assets: '0', completeness: 'incomplete' });
    expect(data.snapshots[1]).toMatchObject({ assets: '50', completeness: 'complete' });
    expect(data.snapshots[1]?.yearlyChange).toBeUndefined();
  });

  it('retains zero yearly change and zero percent as defined values', () => {
    const holding = asset({
      values: [
        { date: '2024-12-31', amount: '100', updatedAt },
        { date: '2025-12-31', amount: '100', updatedAt },
      ],
    });
    const data = buildDashboardData(vault({ assets: [holding] }), 2024, 2025);

    expect(data.snapshots[1]).toMatchObject({
      yearlyChange: '0',
      yearlyChangePercent: '0.00',
    });
  });

  it('keeps CAGR undefined for non-positive endpoints', () => {
    const holding = asset({
      values: [
        { date: '2024-12-31', amount: '0', updatedAt },
        { date: '2025-12-31', amount: '10', updatedAt },
      ],
    });
    const data = buildDashboardData(vault({ assets: [holding] }), 2024, 2025);
    expect(data.snapshots[1]?.cagr).toBeUndefined();
  });

  it('keeps the full liability payoff horizon when asset years are shorter', () => {
    const holding = asset({
      values: [{ date: '2026-12-31', amount: '5000', updatedAt }],
    });
    const debt = liability({
      principal: '2400',
      monthlyPayment: '100',
      startDate: '2026-01-01',
      termMonths: 24,
    });
    const data = buildDashboardData(vault({ assets: [holding], liabilities: [debt] }), 2026, 2026);
    expect(data.snapshots).toHaveLength(1);
    expect(data.projections.get(debt.id)?.map(({ year }) => year)).toEqual([2026]);
    expect(data.fullProjections.get(debt.id)?.at(-1)).toMatchObject({
      year: 2027,
      amount: '0',
      status: 'paid-off',
    });
  });

  it('filters payoff chart series to the same selected dashboard years', () => {
    const debt = liability({
      principal: '3600',
      monthlyPayment: '100',
      startDate: '2025-01-01',
      termMonths: 36,
    });
    const data = buildDashboardData(vault({ liabilities: [debt] }), 2026, 2026);
    expect(data.projections.get(debt.id)?.map(({ year }) => year)).toEqual([2026]);
    expect(data.fullProjections.get(debt.id)?.map(({ year }) => year)).toEqual([2026, 2027]);
  });

  it('includes liability start and payoff years alongside asset years', () => {
    const holding = asset({
      values: [{ date: '2025-12-31', amount: '5000', updatedAt }],
    });
    const debt = liability({
      principal: '2400',
      monthlyPayment: '100',
      startDate: '2026-01-01',
      termMonths: 24,
    });
    expect(availableYears(vault({ assets: [holding], liabilities: [debt] }))).toEqual([
      2025, 2026, 2027,
    ]);
  });

  it('prevents future leakage and carries a July asset observation to year end', () => {
    const holding = asset({
      values: [
        { date: '2026-07-15', amount: '1000', updatedAt },
        { date: '2027-01-01', amount: '9000', updatedAt },
      ],
    });
    const july = buildSnapshotAtDate(vault({ assets: [holding] }), '2026-07-15');
    const december = buildSnapshotAtDate(vault({ assets: [holding] }), '2026-12-31');
    expect(july).toMatchObject({ assets: '1000', assetSource: 'actual' });
    expect(december).toMatchObject({ assets: '1000', assetSource: 'carry-forward' });
    expect(december.assetSources[0]).toMatchObject({
      sourceDate: '2026-07-15',
      status: 'carry-forward',
    });
  });

  it('keeps same-year future observations out of annual forecasts', () => {
    const holding = asset({
      values: [
        { date: '2026-07-15', amount: '1000', updatedAt },
        { date: '2026-10-01', amount: '9000', updatedAt },
      ],
    });
    const debt = liability({
      principal: '5000',
      monthlyPayment: '100',
      annualInterestRate: '0',
      startDate: '2026-01-01',
      manualBalances: [
        { date: '2026-07-15', amount: '1000', updatedAt },
        { date: '2026-10-01', amount: '9000', updatedAt },
      ],
    });
    const data = buildDashboardData(
      vault({ assets: [holding], liabilities: [debt] }),
      2026,
      2026,
      '2026-09-01',
    );
    expect(data.asOfSnapshot.assets).toBe('1000');
    expect(data.snapshots[0]?.assets).toBe('1000');
    expect(Number(data.snapshots[0]?.liabilities)).toBeLessThan(1000);
  });

  it('amortizes a July manual liability seed to the December 31 annual snapshot', () => {
    const debt = liability({
      principal: '5000',
      monthlyPayment: '100',
      annualInterestRate: '0',
      startDate: '2026-01-01',
      manualBalances: [{ date: '2026-07-15', amount: '1000', updatedAt }],
    });
    const data = buildDashboardData(vault({ liabilities: [debt] }), 2026, 2026, '2026-12-31');
    expect(data.asOfSnapshot.liabilities).toBe('400');
    expect(data.snapshots[0]?.liabilities).toBe('400');
    expect(data.timeline.map(({ asOfDate }) => asOfDate)).toEqual(['2026-07-15', '2026-12-31']);
  });
});
