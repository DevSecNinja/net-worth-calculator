import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { PassphraseFields } from '@/components/forms/PassphraseFields';
import { Button } from '@/components/ui/Button';
import { useVault } from '@/features/vault/useVault';
import { useLocale } from '@/features/locale/LocaleProvider';
import { validatePassphrasePair } from '@/features/vault/passphrase';
import { useDirtyState } from '@/hooks/useDirtyState';

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK'];

export function OnboardingPage() {
  const { create, busy, error } = useVault();
  const { setDirty } = useDirtyState();
  const { t } = useLocale();
  const dirtyLabel = t('dirty.vaultSetup');
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [validationError, setValidationError] = useState<string>();

  useEffect(() => {
    setDirty(dirtyLabel, Boolean(passphrase || confirmation || currency !== 'USD'));
    return () => setDirty(dirtyLabel, false);
  }, [confirmation, currency, dirtyLabel, passphrase, setDirty]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const validation = validatePassphrasePair(passphrase, confirmation);
    if (!validation.valid) {
      setValidationError(validation.message);
      return;
    }
    setValidationError(undefined);
    await create(passphrase, currency, action?.value === 'sample').catch(() => undefined);
  }

  const errors = [validationError, error].filter((value): value is string => Boolean(value));

  return (
    <main id="main-content" className="page page--onboarding">
      <section className="hero">
        <p className="eyebrow">{t('onboarding.eyebrow')}</p>
        <h1>{t('onboarding.title')}</h1>
        <p className="hero__lede">{t('onboarding.lede')}</p>
      </section>

      <div className="onboarding-grid">
        <section className="panel">
          <h2>{t('onboarding.before')}</h2>
          <ul className="feature-list">
            <li>
              <strong>{t('onboarding.localTitle')}</strong> {t('onboarding.localText')}
            </li>
            <li>
              <strong>{t('onboarding.encryptedTitle')}</strong> {t('onboarding.encryptedText')}
            </li>
            <li>
              <strong>{t('onboarding.recoveryTitle')}</strong> {t('onboarding.recoveryText')}
            </li>
            <li>
              <strong>{t('onboarding.offlineTitle')}</strong> {t('onboarding.offlineText')}
            </li>
          </ul>
        </section>

        <form className="panel form-stack" onSubmit={(event) => void submit(event)} noValidate>
          <div>
            <p className="eyebrow">{t('onboarding.step')}</p>
            <h2>{t('onboarding.createTitle')}</h2>
          </div>
          <ErrorSummary errors={errors} />
          <label className="field">
            <span>{t('onboarding.baseCurrency')}</span>
            <select value={currency} onChange={(event) => setCurrency(event.currentTarget.value)}>
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <span className="field__description">{t('onboarding.currencyHelp')}</span>
          </label>
          <PassphraseFields
            passphrase={passphrase}
            confirmation={confirmation}
            onPassphraseChange={setPassphrase}
            onConfirmationChange={setConfirmation}
            error={validationError}
          />
          <div className="button-row">
            <Button type="submit" value="empty" disabled={busy}>
              {busy ? t('onboarding.encrypting') : t('onboarding.createEmpty')}
            </Button>
            <Button type="submit" value="sample" variant="secondary" disabled={busy}>
              {t('onboarding.createSample')}
            </Button>
          </div>
          <p className="fine-print">{t('onboarding.sampleHelp')}</p>
          <p className="fine-print">
            {t('onboarding.restorePrompt')} <Link to="/backup">{t('onboarding.restoreLink')}</Link>.
          </p>
        </form>
      </div>
    </main>
  );
}
