import { buildDashboardData } from './aggregation';
import { addSampleData, createEmptyVault } from './fixtures';
import { vaultSchema } from './validation';

function allDates(vault: ReturnType<typeof addSampleData>): string[] {
  return [
    ...vault.assets.flatMap(({ values }) => values.map(({ date }) => date)),
    ...vault.liabilities.flatMap(({ manualBalances }) => manualBalances.map(({ date }) => date)),
  ];
}

describe('sample household fixture', () => {
  const reference = new Date('2026-01-15T12:00:00.000Z');
  const sample = addSampleData(createEmptyVault('JPY'), 'en-US', reference);

  it('creates a valid diversified and densely ordered portfolio only by explicit action', () => {
    const empty = createEmptyVault('JPY');
    expect(empty).toMatchObject({
      settings: { baseCurrency: 'JPY', createdWithSampleData: false },
      assets: [],
      liabilities: [],
    });
    expect(sample.assets).toHaveLength(5);
    expect(sample.liabilities).toHaveLength(3);
    expect(sample.assets.map(({ order }) => order)).toEqual([0, 1, 2, 3, 4]);
    expect(sample.liabilities.map(({ order }) => order)).toEqual([0, 1, 2]);
    expect(new Set(sample.assets.map(({ type }) => type))).toEqual(
      new Set(['checking', 'savings', 'fund', 'retirement', 'property']),
    );
    expect(new Set(sample.assets.map(({ classification }) => classification))).toEqual(
      new Set(['current', 'long-term']),
    );
    expect(sample.liabilities.map(({ type }) => type)).toEqual([
      'mortgage',
      'vehicle-loan',
      'student-loan',
    ]);
    expect(sample.settings.createdWithSampleData).toBe(true);
    expect(vaultSchema.safeParse(sample).success).toBe(true);
    expect(() => addSampleData(sample, 'en-US', reference)).toThrow('empty vault');
  });

  it('covers four prior year ends, a prior mid-year date, and the exact current date', () => {
    const dates = allDates(sample);
    for (const year of [2022, 2023, 2024, 2025]) {
      expect(dates).toContain(`${year}-12-31`);
    }
    expect(dates).toContain('2025-07-15');
    expect(dates).toContain('2026-01-15');
    expect(dates.every((date) => date <= '2026-01-15')).toBe(true);
    for (const item of [...sample.assets, ...sample.liabilities]) {
      const values = 'values' in item ? item.values : item.manualBalances;
      expect(values.map(({ date }) => date)).toEqual(values.map(({ date }) => date).toSorted());
      expect(new Set(values.map(({ date }) => date)).size).toBe(values.length);
    }
  });

  it('uses plausible asset trends and strictly declining actual debt balances', () => {
    const checking = sample.assets.find(({ type }) => type === 'checking')!;
    const savings = sample.assets.find(({ type }) => type === 'savings')!;
    const fund = sample.assets.find(({ type }) => type === 'fund')!;
    const property = sample.assets.find(({ type }) => type === 'property')!;
    expect(checking.values.map(({ amount }) => Number(amount))).toEqual([
      3500, 4200, 4800, 5200, 5600,
    ]);
    expect(savings.values.map(({ amount }) => Number(amount))).toEqual([
      10000, 13000, 16000, 19000, 21000,
    ]);
    expect(Number(fund.values.at(-1)!.amount)).toBeGreaterThan(Number(fund.values[0]!.amount));
    expect(Number(fund.values[2]!.amount)).toBeLessThan(Number(fund.values[1]!.amount));
    expect(Number(property.values.at(-1)!.amount)).toBeGreaterThan(
      Number(property.values[0]!.amount),
    );
    for (const debt of sample.liabilities) {
      const balances = debt.manualBalances.map(({ amount }) => Number(amount));
      expect(
        balances.every((balance, index) => index === 0 || balance < balances[index - 1]!),
      ).toBe(true);
      expect(Number(debt.monthlyPayment)).toBeGreaterThan(0);
    }
  });

  it('produces useful annual, timeline, allocation, carry-forward, and payoff data', () => {
    const dashboard = buildDashboardData(sample, 2022, 2026, '2026-01-15');
    expect(dashboard.snapshots).toHaveLength(5);
    expect(dashboard.timeline.map(({ asOfDate }) => asOfDate)).toEqual(
      expect.arrayContaining(['2025-07-15', '2026-01-15']),
    );
    expect(dashboard.asOfSnapshot).toMatchObject({
      completeness: 'complete',
      assetSource: 'mixed',
      liabilitySource: 'mixed',
    });
    expect(dashboard.allocation).toHaveLength(5);
    expect(dashboard.projections.size).toBe(3);
    expect([...dashboard.fullProjections.values()].every((series) => series.length > 0)).toBe(true);
  });

  it.each([
    ['January', new Date('2026-01-02T12:00:00.000Z'), '2026-01-02'],
    ['MAX_YEAR', new Date('2200-12-30T12:00:00.000Z'), '2200-12-30'],
  ] as const)(
    'never creates future or out-of-range dates near %s',
    (_label, date, expectedToday) => {
      const bounded = addSampleData(createEmptyVault('EUR'), 'en-GB', date);
      expect(vaultSchema.safeParse(bounded).success).toBe(true);
      expect(allDates(bounded).every((value) => value <= expectedToday)).toBe(true);
    },
  );

  it('localizes names at creation without changing financial values', () => {
    const us = addSampleData(createEmptyVault('EUR'), 'en-US', reference);
    const uk = addSampleData(createEmptyVault('EUR'), 'en-GB', reference);
    const nl = addSampleData(createEmptyVault('EUR'), 'nl-NL', reference);
    expect(us.assets[0]?.name).toBe('Everyday checking');
    expect(uk.assets[0]?.name).toBe('Everyday current account');
    expect(nl.assets[0]?.name).toBe('Dagelijkse betaalrekening');
    expect(nl.liabilities.map(({ name }) => name)).toEqual([
      'Hypotheek',
      'Autolening',
      'Studieschuld',
    ]);
    expect(nl.assets.map(({ values }) => values.map(({ amount }) => amount))).toEqual(
      us.assets.map(({ values }) => values.map(({ amount }) => amount)),
    );
  });
});
