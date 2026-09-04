import { asset, liability, vault } from '../../tests/fixtures/vault';
import { assetSchema, liabilitySchema, vaultSchema } from './validation';

describe('vault validation boundaries', () => {
  it('enforces the declared maximum and two-decimal input boundary', () => {
    expect(
      assetSchema.safeParse(
        asset({
          values: [
            {
              year: 2026,
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
              year: 2026,
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
              year: 2026,
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
          settings: { baseCurrency: 'USD', locale: 'en-US', createdWithSampleData: false },
          assets: [{ ...holding, values: [{ ...holding.values[0]!, amount: '1.23' }] }],
        }),
      ).success,
    ).toBe(true);
    expect(
      vaultSchema.safeParse(
        vault({
          settings: { baseCurrency: 'JPY', locale: 'ja-JP', createdWithSampleData: false },
          assets: [{ ...holding, values: [{ ...holding.values[0]!, amount: '1.23' }] }],
        }),
      ).success,
    ).toBe(false);
  });

  it('rejects invalid locales and non-dense collection order', () => {
    expect(
      vaultSchema.safeParse(
        vault({
          settings: {
            baseCurrency: 'USD',
            locale: 'not a locale!',
            createdWithSampleData: false,
          },
        }),
      ).success,
    ).toBe(false);
    expect(vaultSchema.safeParse(vault({ assets: [asset({ order: 2 })] })).success).toBe(false);
  });

  it('enforces custom types and unique asset years', () => {
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
  });

  it('enforces liability custom types, unique balances, and positive payments', () => {
    expect(
      liabilitySchema.safeParse(liability({ type: 'custom', customType: undefined })).success,
    ).toBe(false);
    expect(
      liabilitySchema.safeParse(liability({ type: 'mortgage', customType: 'Unexpected' })).success,
    ).toBe(false);
    const debt = liability({
      manualBalances: [{ year: 2026, amount: '100', updatedAt: '2026-01-01T00:00:00.000Z' }],
    });
    expect(liabilitySchema.safeParse(debt).success).toBe(true);
    expect(
      liabilitySchema.safeParse({
        ...debt,
        manualBalances: [debt.manualBalances[0], debt.manualBalances[0]],
      }).success,
    ).toBe(false);
    expect(
      liabilitySchema.safeParse(liability({ principal: '10', monthlyPayment: '0' })).success,
    ).toBe(false);
    expect(
      liabilitySchema.safeParse(liability({ principal: '0', monthlyPayment: '0' })).success,
    ).toBe(true);
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
