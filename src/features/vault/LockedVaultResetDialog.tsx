import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { Field } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useLocale } from '@/features/locale/LocaleProvider';
import { LockedVaultChangedError, LockedVaultLeaseLostError } from '@/storage/vaultRepository';

import { useVault, VaultLeaseUnavailableError } from './VaultProvider';

export function LockedVaultResetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { busy, cancelLockedVaultReset, resetLockedVault, status } = useVault();
  const { t } = useLocale();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();
  const confirmationWord = t('vault.resetConfirmation');

  const close = useCallback(() => {
    if (busy) return;
    setConfirmation('');
    setError(undefined);
    cancelLockedVaultReset();
    onClose();
  }, [busy, cancelLockedVaultReset, onClose]);

  useEffect(() => {
    if (open && status !== 'locked') close();
  }, [close, open, status]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (confirmation !== confirmationWord) {
      setError(t('vault.resetConfirmationError', { confirmation: confirmationWord }));
      return;
    }
    setError(undefined);
    try {
      await resetLockedVault();
    } catch (caught) {
      if (caught instanceof VaultLeaseUnavailableError) {
        setError(t('vault.resetOtherTab'));
      } else if (
        caught instanceof LockedVaultChangedError ||
        caught instanceof LockedVaultLeaseLostError
      ) {
        setError(t('vault.resetChanged'));
      } else {
        setError(t('vault.resetFailed'));
      }
    }
  }

  return (
    <Dialog open={open} title={t('vault.resetTitle')} onClose={close}>
      <form className="form-stack" onSubmit={(event) => void submit(event)}>
        <div className="danger-zone">
          <strong>{t('vault.resetWarning')}</strong>
          <ul>
            <li>{t('vault.resetCannotRecover')}</li>
            <li>{t('vault.resetLocalDeletion')}</li>
            <li>{t('vault.resetBackupRecovery')}</li>
            <li>{t('vault.resetBackupsRemain')}</li>
            <li>{t('vault.resetOtherProfiles')}</li>
          </ul>
        </div>
        {error ? (
          <div className="error-summary" role="alert" tabIndex={-1}>
            <strong>{t('form.check')}</strong>
            <p>{error}</p>
          </div>
        ) : null}
        <Field
          label={t('vault.resetPrompt', { confirmation: confirmationWord })}
          name="locked-reset-confirmation"
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.currentTarget.value);
            setError(undefined);
          }}
          autoComplete="off"
          required
        />
        <div className="button-row">
          <Button
            type="submit"
            variant="danger"
            disabled={busy || status !== 'locked' || confirmation !== confirmationWord}
          >
            {busy ? t('vault.resetting') : t('vault.resetForever')}
          </Button>
          <Button type="button" variant="secondary" onClick={close} disabled={busy}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
