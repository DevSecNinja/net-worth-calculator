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

function ErrorHarness({ messages }: { messages: readonly string[] }) {
  const { translateError } = useLocale();
  return (
    <>
      {messages.map((message) => (
        <output key={message}>{translateError(message)}</output>
      ))}
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

  it('localizes every dated-schema validation category without leaking raw English', () => {
    localStorage.setItem(localeStorageKey, 'nl-NL');
    const messages = [
      'Date year must be between 1900 and 2200.',
      'Asset observations must be in chronological order.',
      'Custom type is required.',
      'Choose a supported currency.',
      'A vault can contain at most 500 items.',
      'assets must have unique, dense ordering.',
      'Too big: expected string to have <=100 characters.',
      'Unexpected validation failure.',
    ];
    render(
      <LocaleProvider>
        <ErrorHarness messages={messages} />
      </LocaleProvider>,
    );

    const translated = screen.getAllByRole('status').map(({ textContent }) => textContent);
    expect(translated).toEqual([
      'Voer een geldige datum van 1900 tot en met 2200 in.',
      'Zet observaties in chronologische volgorde.',
      'Voer alleen een aangepast type in wanneer Aangepast is geselecteerd.',
      'Kies een ondersteunde valuta met drie letters.',
      'Een kluis kan maximaal 500 items bevatten.',
      'De structuur van de kluis is ongeldig.',
      'Kort deze invoer in tot de toegestane lengte.',
      'De bewerking kon niet veilig worden voltooid.',
    ]);
    expect(translated).not.toEqual(expect.arrayContaining(messages));
  });
});
