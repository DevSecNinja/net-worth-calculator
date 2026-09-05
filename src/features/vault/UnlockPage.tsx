import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { Field } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';

import { useVault } from './useVault';
import { validatePassphrase } from './passphrase';
import { useLocale } from '@/features/locale/LocaleProvider';

export function UnlockPage() {
  const { unlock, busy, error, clearError } = useVault();
  const [passphrase, setPassphrase] = useState('');
  const [validationError, setValidationError] = useState<string>();
  const { t } = useLocale();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validatePassphrase(passphrase);
    if (!validation.valid) {
      setValidationError(validation.message);
      return;
    }
    setValidationError(undefined);
    clearError();
    await unlock(passphrase).catch(() => undefined);
  }

  return (
    <main id="main-content" className="page centered-page">
      <form className="panel unlock-card form-stack" onSubmit={(event) => void submit(event)}>
        <div className="vault-mark" aria-hidden="true">
          NW
        </div>
        <div>
          <p className="eyebrow">{t('vault.unlockEyebrow')}</p>
          <h1>{t('vault.unlockTitle')}</h1>
          <p>{t('vault.unlockHelp')}</p>
        </div>
        <ErrorSummary
          errors={[validationError, error].filter((value): value is string => Boolean(value))}
        />
        <Field
          label={t('vault.passphrase')}
          name="unlock-passphrase"
          type="password"
          autoComplete="current-password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.currentTarget.value)}
          error={validationError}
          required
          autoFocus
        />
        <Button type="submit" disabled={busy}>
          {busy ? t('vault.unlocking') : t('vault.unlock')}
        </Button>
        <p className="fine-print">
          {t('vault.noReset')} <Link to="/backup">{t('onboarding.restoreLink')}</Link>.
        </p>
      </form>
    </main>
  );
}
