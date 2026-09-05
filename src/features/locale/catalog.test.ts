import { catalogs, supportedLocales } from './catalog';

describe('locale catalog', () => {
  it('has exactly the same complete key set in every locale', () => {
    const expected = Object.keys(catalogs['en-US']).sort();
    for (const locale of supportedLocales) {
      expect(Object.keys(catalogs[locale]).sort()).toEqual(expected);
      expect(Object.values(catalogs[locale]).every((message) => message.trim().length > 0)).toBe(
        true,
      );
    }
  });

  it('does not leave English phrases in the Dutch catalog', () => {
    const allowedIdenticalKeys = new Set([
      'language.nl-NL',
      'common.type',
      'nav.dashboard',
      'about.buildTitle',
      'pwa.later',
      'assetType.crypto',
      'assetType.business',
    ]);
    for (const key of Object.keys(catalogs['en-US']) as (keyof (typeof catalogs)['en-US'])[]) {
      if (allowedIdenticalKeys.has(key)) continue;
      expect(catalogs['nl-NL'][key]).not.toBe(catalogs['en-US'][key]);
    }
  });
});
