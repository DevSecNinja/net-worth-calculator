import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LocaleProvider, localeStorageKey, negotiateLocale, useLocale } from './LocaleProvider';

function Harness() {
  const { locale, setLocale, t, translateError } = useLocale();
  return (
    <>
      <output>{locale}</output>
      <p>{t('nav.assets')}</p>
      <p>{translateError('Each asset observation date must be unique.')}</p>
      <p>{translateError('Each manual balance date must be unique.')}</p>
      <p>
        {translateError('The decrypted vault document is larger than the 7 MiB local size limit.')}
      </p>
      <button type="button" onClick={() => setLocale('nl-NL')}>
        Nederlands
      </button>
    </>
  );
}

describe('LocaleProvider', () => {
  it.each([
    [['nl-BE', 'en-US'], 'nl-NL'],
    [['en-GB', 'en-US'], 'en-GB'],
    [['en-AU'], 'en-US'],
    [['fr-FR'], 'en-US'],
  ] as const)('negotiates %s as %s', (languages, expected) => {
    expect(negotiateLocale(languages)).toBe(expected);
  });

  it('persists an explicit override and updates document language', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <Harness />
      </LocaleProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Nederlands' }));
    expect(screen.getByText('nl-NL')).toBeVisible();
    expect(screen.getByText('Bezittingen')).toBeVisible();
    expect(screen.getAllByText('Elke observatiedatum moet uniek zijn.')).toHaveLength(2);
    expect(
      screen.getByText('Het ontsleutelde kluisdocument is groter dan de lokale limiet van 7 MiB.'),
    ).toBeVisible();
    expect(localStorage.getItem(localeStorageKey)).toBe('nl-NL');
    expect(document.documentElement.lang).toBe('nl-NL');
  });

  it('keeps canonical financial strings independent from language selection', async () => {
    const user = userEvent.setup();
    localStorage.setItem('financial-test-value', '100000');
    render(
      <LocaleProvider>
        <Harness />
      </LocaleProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Nederlands' }));
    expect(localStorage.getItem('financial-test-value')).toBe('100000');
  });

  it('falls back to negotiated and in-memory locale when preference storage is blocked', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'QuotaExceededError');
    });
    const user = userEvent.setup();

    render(
      <LocaleProvider>
        <Harness />
      </LocaleProvider>,
    );
    expect(screen.getByText('en-US')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Nederlands' }));
    expect(screen.getByText('nl-NL')).toBeVisible();
    expect(document.documentElement.lang).toBe('nl-NL');
    expect(getItem).toHaveBeenCalledWith(localeStorageKey);
    expect(setItem).toHaveBeenCalledWith(localeStorageKey, 'nl-NL');
  });
});
