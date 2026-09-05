import { asset, liability, vault } from '../../tests/fixtures/vault';
import { assetSchema, liabilitySchema, vaultSchema } from './validation';

describe('vault validation boundaries', () => {
  it('enforces the declared maximum and two-decimal input boundary', () => {
    expect(
      assetSchema.safeParse(
        asset({
          values: [
            {
              date: '2026-12-31',
              amount: '999999999999.99',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      ).success,
    ).toBe(true);
    expect(
      assetSchema.safeParse(
        asset({
          values: [
            {
              date: '2026-12-31',
              amount: '1000000000000',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      assetSchema.safeParse(
        asset({
          values: [
            {
              date: '2026-12-31',
              amount: '1.234',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      ).success,
    ).toBe(false);
  });

  it('enforces currency precision for USD and JPY', () => {
    const holding = asset();
    expect(
      vaultSchema.safeParse(
        vault({
          settings: { baseCurrency: 'USD', createdWithSampleData: false },
          assets: [{ ...holding, values: [{ ...holding.values[0]!, amount: '1.23' }] }],
        }),
      ).success,
    ).toBe(true);
    expect(
      vaultSchema.safeParse(
        vault({
          settings: { baseCurrency: 'JPY', createdWithSampleData: false },
          assets: [{ ...holding, values: [{ ...holding.values[0]!, amount: '1.23' }] }],
        }),
      ).success,
    ).toBe(false);
  });

  it('rejects non-dense collection order', () => {
    expect(vaultSchema.safeParse(vault({ assets: [asset({ order: 2 })] })).success).toBe(false);
  });

  it('enforces custom types and unique, chronological asset observations', () => {
    expect(assetSchema.safeParse(asset({ type: 'custom', customType: undefined })).success).toBe(
      false,
    );
    expect(
      assetSchema.safeParse(asset({ type: 'savings', customType: 'Unexpected' })).success,
    ).toBe(false);
    const holding = asset();
    expect(assetSchema.safeParse(holding).success).toBe(true);
    expect(
      assetSchema.safeParse({ ...holding, values: [holding.values[0], holding.values[0]] }).success,
    ).toBe(false);
    expect(
      assetSchema.safeParse({
        ...holding,
        values: [holding.values[0], { ...holding.values[0]!, date: '2026-07-15' }],
      }).success,
    ).toBe(false);
  });

  it('enforces liability custom types, sorted unique balances, and positive payments', () => {
    expect(
      liabilitySchema.safeParse(liability({ type: 'custom', customType: undefined })).success,
    ).toBe(false);
    expect(
      liabilitySchema.safeParse(liability({ type: 'mortgage', customType: 'Unexpected' })).success,
    ).toBe(false);
    const debt = liability({
      manualBalances: [
        { date: '2026-12-31', amount: '100', updatedAt: '2026-01-01T00:00:00.000Z' },
      ],
    });
    expect(liabilitySchema.safeParse(debt).success).toBe(true);
    expect(
      liabilitySchema.safeParse({
        ...debt,
        manualBalances: [debt.manualBalances[0], debt.manualBalances[0]],
      }).success,
    ).toBe(false);
    expect(
      liabilitySchema.safeParse({
        ...debt,
        manualBalances: [
          debt.manualBalances[0],
          { ...debt.manualBalances[0]!, date: '2026-07-15' },
        ],
      }).success,
    ).toBe(false);
    expect(
      liabilitySchema.safeParse(liability({ principal: '10', monthlyPayment: '0' })).success,
    ).toBe(false);
    expect(
      liabilitySchema.safeParse(liability({ principal: '0', monthlyPayment: '0' })).success,
    ).toBe(true);
    expect(liabilitySchema.safeParse(liability({ termMonths: 0 })).success).toBe(false);
    expect(liabilitySchema.safeParse(liability({ startDate: '1800-01-01' })).success).toBe(false);
    expect(liabilitySchema.safeParse(liability({ startDate: '2300-01-01' })).success).toBe(false);
  });

  it('rejects duplicate item identities and excessive vault size', () => {
    const holding = asset();
    const debt = liability({ id: holding.id });
    expect(vaultSchema.safeParse(vault({ assets: [holding], liabilities: [debt] })).success).toBe(
      false,
    );
    const assets = Array.from({ length: 501 }, (_, order) =>
      asset({ id: crypto.randomUUID(), order }),
    );
    expect(vaultSchema.safeParse(vault({ assets })).success).toBe(false);
  });
});
