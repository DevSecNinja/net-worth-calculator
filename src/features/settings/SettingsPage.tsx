import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { useAppStatus } from '@/components/ui/AppStatus';
import type { ThemePreference } from '@/domain/model';
import { ChangePassphraseDialog, DeleteVaultDialog } from '@/features/vault/VaultSecurityDialogs';
import { useVault } from '@/features/vault/useVault';
import { useDirtyState } from '@/hooks/useDirtyState';

import { useTheme } from './ThemeProvider';

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK'];

export function SettingsPage() {
  const { vault, mutate, status } = useVault();
  const { preference, effectiveTheme, setPreference } = useTheme();
  const { announce } = useAppStatus();
  const { setDirty } = useDirtyState();
  const [currency, setCurrency] = useState(vault?.settings.baseCurrency ?? 'USD');
  const [confirmed, setConfirmed] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const changed = Boolean(vault && currency !== vault.settings.baseCurrency);
    setDirty('Currency settings', changed);
    return () => setDirty('Currency settings', false);
  }, [currency, setDirty, vault]);

  function changeTheme(theme: ThemePreference) {
    setPreference(theme);
    announce(
      `Theme set to ${theme}. Effective theme is ${theme === 'system' ? effectiveTheme : theme}.`,
    );
  }

  async function applyCurrency(event: FormEvent) {
    event.preventDefault();
    if (!vault || !confirmed || currency === vault.settings.baseCurrency) return;
    await mutate((current) => ({
      ...current,
      settings: { ...current.settings, baseCurrency: currency },
    }));
    setDirty('Currency settings', false);
    setConfirmed(false);
    announce(`Base currency changed to ${currency}. Existing numbers were not converted.`);
  }

  return (
    <main id="main-content" className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Preferences and security</p>
          <h1>Settings</h1>
          <p>Theme is non-sensitive and available while locked. Vault settings remain encrypted.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel form-stack">
          <h2>Appearance</h2>
          <label className="field">
            <span>Theme</span>
            <select
              value={preference}
              onChange={(event) => changeTheme(event.currentTarget.value as ThemePreference)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <span className="field__description">Current appearance: {effectiveTheme}.</span>
          </label>
        </section>

        {status === 'unlocked' && vault ? (
          <>
            <form className="panel form-stack" onSubmit={(event) => void applyCurrency(event)}>
              <h2>Base currency</h2>
              <label className="field">
                <span>Currency</span>
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
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.currentTarget.checked)}
                  />
                  <span>
                    I understand existing numbers will be reinterpreted as {currency}, not
                    converted.
                  </span>
                </label>
              ) : null}
              <Button
                type="submit"
                disabled={!confirmed || currency === vault.settings.baseCurrency}
              >
                Apply currency
              </Button>
            </form>
            <section className="panel form-stack">
              <h2>Vault security</h2>
              <p>Change the passphrase by re-encrypting the complete local vault.</p>
              <Button type="button" variant="secondary" onClick={() => setChangeOpen(true)}>
                Change passphrase
              </Button>
              <div className="danger-zone">
                <h3>Danger zone</h3>
                <p>Deleting the vault cannot be undone. Export a backup first.</p>
                <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
                  Delete vault
                </Button>
              </div>
            </section>
          </>
        ) : (
          <section className="panel">
            <h2>Vault settings are locked</h2>
            <p>Unlock the vault to change currency, passphrase, or delete local financial data.</p>
          </section>
        )}
      </div>
      <ChangePassphraseDialog open={changeOpen} onClose={() => setChangeOpen(false)} />
      <DeleteVaultDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </main>
  );
}
