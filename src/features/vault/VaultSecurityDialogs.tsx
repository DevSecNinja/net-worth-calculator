import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { Field } from '@/components/forms/Field';
import { PassphraseFields } from '@/components/forms/PassphraseFields';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useDirtyState } from '@/hooks/useDirtyState';

import { validatePassphrasePair } from './passphrase';
import { useVault } from './useVault';

export function ChangePassphraseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changePassphrase, busy } = useVault();
  const { setDirty } = useDirtyState();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();

  useEffect(() => {
    setDirty('Change passphrase', open && Boolean(current || next || confirmation));
    return () => setDirty('Change passphrase', false);
  }, [confirmation, current, next, open, setDirty]);

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
      setDirty('Change passphrase', false);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Passphrase change failed.');
    }
  }

  return (
    <Dialog open={open} title="Change passphrase" onClose={onClose}>
      <form className="form-stack" onSubmit={(event) => void submit(event)}>
        <p>Re-encrypt the complete vault. The old passphrase will stop working.</p>
        <ErrorSummary errors={error ? [error] : []} />
        <Field
          label="Current passphrase"
          name="current-passphrase"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.currentTarget.value)}
          required
        />
        <PassphraseFields
          current
          passphrase={next}
          confirmation={confirmation}
          onPassphraseChange={setNext}
          onConfirmationChange={setConfirmation}
          error={error}
        />
        <div className="button-row">
          <Button type="submit" disabled={busy}>
            Change passphrase
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function DeleteVaultDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { deleteVault, busy } = useVault();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();

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
    <Dialog open={open} title="Delete encrypted vault" onClose={onClose}>
      <form className="form-stack" onSubmit={(event) => void submit(event)}>
        <div className="danger-zone">
          <strong>This cannot be undone.</strong>
          <p>Export a backup first. No server or support team can restore this vault.</p>
        </div>
        <ErrorSummary errors={error ? [error] : []} />
        <Field
          label="Type DELETE to confirm"
          name="delete-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.currentTarget.value)}
          autoComplete="off"
          required
        />
        <div className="button-row">
          <Button type="submit" variant="danger" disabled={busy}>
            Delete vault forever
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
