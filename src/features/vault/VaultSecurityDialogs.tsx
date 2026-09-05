import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { Field } from '@/components/forms/Field';
import { PassphraseFields } from '@/components/forms/PassphraseFields';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useDirtyState } from '@/hooks/useDirtyState';
import { useLocale } from '@/features/locale/LocaleProvider';

import { validatePassphrasePair } from './passphrase';
import { useVault } from './useVault';

export function ChangePassphraseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changePassphrase, busy, status } = useVault();
  const { setDirty } = useDirtyState();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();
  const { t } = useLocale();
  const dirtyLabel = t('vault.changePassphrase');

  const close = useCallback(() => {
    setCurrent('');
    setNext('');
    setConfirmation('');
    setError(undefined);
    setDirty(dirtyLabel, false);
    onClose();
  }, [dirtyLabel, onClose, setDirty]);

  useEffect(() => {
    setDirty(dirtyLabel, open && Boolean(current || next || confirmation));
    return () => setDirty(dirtyLabel, false);
  }, [confirmation, current, dirtyLabel, next, open, setDirty]);

  useEffect(() => {
    if (open && status !== 'unlocked') close();
  }, [close, open, status]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validatePassphrasePair(next, confirmation);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    try {
      await changePassphrase(current, next);
      setCurrent('');
      setNext('');
      setConfirmation('');
      setError(undefined);
      setDirty(dirtyLabel, false);
      close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Passphrase change failed.');
    }
  }

  return (
    <Dialog open={open} title={t('vault.changePassphrase')} onClose={close}>
      <form className="form-stack" onSubmit={(event) => void submit(event)}>
        <p>{t('vault.changeHelp')}</p>
        <ErrorSummary errors={error ? [error] : []} />
        <Field
          label={t('vault.currentPassphrase')}
          name="current-passphrase"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.currentTarget.value)}
          required
        />
        <PassphraseFields
          passphraseLabel={t('vault.newPassphrase')}
          passphrase={next}
          confirmation={confirmation}
          onPassphraseChange={setNext}
          onConfirmationChange={setConfirmation}
          error={error}
        />
        <div className="button-row">
          <Button type="submit" disabled={busy || status !== 'unlocked'}>
            {t('vault.changePassphrase')}
          </Button>
          <Button type="button" variant="secondary" onClick={close}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function DeleteVaultDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { deleteVault, busy, status } = useVault();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();
  const { t } = useLocale();

  const close = useCallback(() => {
    setConfirmation('');
    setError(undefined);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open && status !== 'unlocked') close();
  }, [close, open, status]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (confirmation !== 'DELETE') {
      setError('Type DELETE exactly to confirm.');
      return;
    }
    try {
      await deleteVault();
      void navigate('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Vault deletion failed.');
    }
  }

  return (
    <Dialog open={open} title={t('vault.deleteTitle')} onClose={close}>
      <form className="form-stack" onSubmit={(event) => void submit(event)}>
        <div className="danger-zone">
          <strong>{t('vault.deleteWarning')}</strong>
          <p>{t('vault.deleteHelp')}</p>
        </div>
        <ErrorSummary errors={error ? [error] : []} />
        <Field
          label={t('vault.deletePrompt')}
          name="delete-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.currentTarget.value)}
          autoComplete="off"
          required
        />
        <div className="button-row">
          <Button type="submit" variant="danger" disabled={busy || status !== 'unlocked'}>
            {t('vault.deleteForever')}
          </Button>
          <Button type="button" variant="secondary" onClick={close}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
