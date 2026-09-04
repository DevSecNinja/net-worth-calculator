import { useState, type FormEvent } from 'react';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { Field } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';

import { useVault } from './useVault';
import { validatePassphrase } from './passphrase';

export function UnlockPage() {
  const { unlock, busy, error, clearError } = useVault();
  const [passphrase, setPassphrase] = useState('');
  const [validationError, setValidationError] = useState<string>();

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
          <p className="eyebrow">Encrypted vault</p>
          <h1>Welcome back</h1>
          <p>Enter your passphrase to decrypt this vault for the current session.</p>
        </div>
        <ErrorSummary
          errors={[validationError, error].filter((value): value is string => Boolean(value))}
        />
        <Field
          label="Passphrase"
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
          {busy ? 'Unlocking...' : 'Unlock vault'}
        </Button>
        <p className="fine-print">
          There is no password reset. Restore an encrypted backup if needed.
        </p>
      </form>
    </main>
  );
}
