import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LocaleProvider, localeStorageKey, negotiateLocale, useLocale } from './LocaleProvider';

function Harness() {
  const { locale, setLocale, t } = useLocale();
  return (
    <>
      <output>{locale}</output>
      <p>{t('nav.assets')}</p>
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
});
