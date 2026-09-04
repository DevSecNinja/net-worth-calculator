import { useEffect, useState, type FormEvent } from 'react';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { PassphraseFields } from '@/components/forms/PassphraseFields';
import { Button } from '@/components/ui/Button';
import { useVault } from '@/features/vault/useVault';
import { validatePassphrasePair } from '@/features/vault/passphrase';
import { useDirtyState } from '@/hooks/useDirtyState';

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK'];

export function OnboardingPage() {
  const { create, busy, error } = useVault();
  const { setDirty } = useDirtyState();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [validationError, setValidationError] = useState<string>();

  useEffect(() => {
    setDirty('Vault setup', Boolean(passphrase || confirmation || currency !== 'USD'));
    return () => setDirty('Vault setup', false);
  }, [confirmation, currency, passphrase, setDirty]);

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
        <p className="eyebrow">Private by design</p>
        <h1>See your whole financial picture without sending it anywhere.</h1>
        <p className="hero__lede">
          Your vault is encrypted in this browser. There are no accounts, trackers, servers, or
          password resets.
        </p>
      </section>

      <div className="onboarding-grid">
        <section className="panel">
          <h2>Before you start</h2>
          <ul className="feature-list">
            <li>
              <strong>Local only.</strong> Financial data never leaves this browser.
            </li>
            <li>
              <strong>Encrypted at rest.</strong> Your passphrase unlocks the vault in memory.
            </li>
            <li>
              <strong>You own recovery.</strong> Keep the passphrase and an encrypted backup safe.
            </li>
            <li>
              <strong>Offline ready.</strong> After the first load, the app shell works offline.
            </li>
          </ul>
        </section>

        <form className="panel form-stack" onSubmit={(event) => void submit(event)} noValidate>
          <div>
            <p className="eyebrow">Step 1 of 1</p>
            <h2>Create your encrypted vault</h2>
          </div>
          <ErrorSummary errors={errors} />
          <label className="field">
            <span>Base currency</span>
            <select value={currency} onChange={(event) => setCurrency(event.currentTarget.value)}>
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <span className="field__description">
              All amounts use this currency. The app never fetches exchange rates.
            </span>
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
              {busy ? 'Encrypting...' : 'Create empty vault'}
            </Button>
            <Button type="submit" value="sample" variant="secondary" disabled={busy}>
              Create with sample data
            </Button>
          </div>
          <p className="fine-print">
            Sample data is created only when you choose the sample button and can be deleted.
          </p>
        </form>
      </div>
    </main>
  );
}
