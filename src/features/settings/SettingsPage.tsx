import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { useAppStatus } from '@/components/ui/AppStatus';
import type { ThemePreference } from '@/domain/model';
import { moneyPrecisionError } from '@/domain/validation';
import { ChangePassphraseDialog, DeleteVaultDialog } from '@/features/vault/VaultSecurityDialogs';
import { useVault } from '@/features/vault/useVault';
import { useDirtyState } from '@/hooks/useDirtyState';
import { supportedLocales } from '@/features/locale/catalog';
import { useLocale } from '@/features/locale/LocaleProvider';

import { useTheme } from './ThemeProvider';

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK'];

export function SettingsPage() {
  const { vault, mutate, status } = useVault();
  const { preference, effectiveTheme, setPreference } = useTheme();
  const { announce } = useAppStatus();
  const { locale, setLocale, t } = useLocale();
  const { setDirty } = useDirtyState();
  const [currency, setCurrency] = useState(vault?.settings.baseCurrency ?? 'USD');
  const [confirmed, setConfirmed] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const currencyCompatibilityError = useMemo(() => {
    if (!vault || currency === vault.settings.baseCurrency) return undefined;
    const amounts = [
      ...vault.assets.flatMap(({ values }) => values.map(({ amount }) => amount)),
      ...vault.liabilities.flatMap(({ principal, monthlyPayment, manualBalances }) => [
        principal,
        monthlyPayment,
        ...manualBalances.map(({ amount }) => amount),
      ]),
    ];
    return amounts.map((amount) => moneyPrecisionError(amount, currency)).find(Boolean);
  }, [currency, vault]);
  const dirtyLabel = t('dirty.currency');

  useEffect(() => {
    const changed = Boolean(vault && currency !== vault.settings.baseCurrency);
    setDirty(dirtyLabel, changed);
    return () => setDirty(dirtyLabel, false);
  }, [currency, dirtyLabel, setDirty, vault]);

  function changeTheme(theme: ThemePreference) {
    setPreference(theme);
    announce(
      t('settings.themeChanged', {
        theme: t(`settings.${theme}`),
        effectiveTheme: t(`settings.${theme === 'system' ? effectiveTheme : theme}`),
      }),
    );
  }

  async function applyCurrency(event: FormEvent) {
    event.preventDefault();
    if (
      !vault ||
      !confirmed ||
      currency === vault.settings.baseCurrency ||
      currencyCompatibilityError
    ) {
      return;
    }
    await mutate((current) => ({
      ...current,
      settings: { ...current.settings, baseCurrency: currency },
    }));
    setDirty(dirtyLabel, false);
    setConfirmed(false);
    announce(t('settings.currencyChanged', { currency }));
  }

  return (
    <main id="main-content" className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('settings.eyebrow')}</p>
          <h1>{t('settings.title')}</h1>
          <p>{t('settings.help')}</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel form-stack">
          <h2>{t('settings.appearance')}</h2>
          <label className="field">
            <span>{t('settings.language')}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.currentTarget.value as typeof locale)}
            >
              {supportedLocales.map((supported) => (
                <option key={supported} value={supported}>
                  {t(`language.${supported}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('settings.theme')}</span>
            <select
              value={preference}
              onChange={(event) => changeTheme(event.currentTarget.value as ThemePreference)}
            >
              <option value="system">{t('settings.system')}</option>
              <option value="light">{t('settings.light')}</option>
              <option value="dark">{t('settings.dark')}</option>
            </select>
            <span className="field__description">
              {t('settings.currentAppearance', { theme: t(`settings.${effectiveTheme}`) })}
            </span>
          </label>
        </section>

        {status === 'unlocked' && vault ? (
          <>
            <form className="panel form-stack" onSubmit={(event) => void applyCurrency(event)}>
              <h2>{t('settings.baseCurrency')}</h2>
              <label className="field">
                <span>{t('settings.currency')}</span>
                <select
                  value={currency}
                  onChange={(event) => {
                    setCurrency(event.currentTarget.value);
                    setConfirmed(false);
                  }}
                >
                  {currencies.map((code) => (
                    <option key={code}>{code}</option>
                  ))}
                </select>
              </label>
              {currency !== vault.settings.baseCurrency ? (
                <>
                  {currencyCompatibilityError ? (
                    <p className="field__error" role="alert">
                      {t('settings.currencyPrecisionError')}
                    </p>
                  ) : (
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.currentTarget.checked)}
                      />
                      <span>{t('settings.currencyConfirm', { currency })}</span>
                    </label>
                  )}
                </>
              ) : null}
              <Button
                type="submit"
                disabled={
                  !confirmed ||
                  currency === vault.settings.baseCurrency ||
                  Boolean(currencyCompatibilityError)
                }
              >
                {t('settings.applyCurrency')}
              </Button>
            </form>
            <section className="panel form-stack">
              <h2>{t('settings.security')}</h2>
              <p>{t('settings.securityHelp')}</p>
              <Button type="button" variant="secondary" onClick={() => setChangeOpen(true)}>
                {t('vault.changePassphrase')}
              </Button>
              <div className="danger-zone">
                <h3>{t('settings.danger')}</h3>
                <p>{t('settings.dangerHelp')}</p>
                <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
                  {t('settings.delete')}
                </Button>
              </div>
            </section>
          </>
        ) : (
          <section className="panel">
            <h2>{t('settings.locked')}</h2>
            <p>{t('settings.lockedHelp')}</p>
          </section>
        )}
      </div>
      <ChangePassphraseDialog open={changeOpen} onClose={() => setChangeOpen(false)} />
      <DeleteVaultDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </main>
  );
}
