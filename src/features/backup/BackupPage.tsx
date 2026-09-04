import { useState, type FormEvent } from 'react';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { Field } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { openBackupFile, saveBackupFile } from '@/storage/files';
import { useVault } from '@/features/vault/useVault';
import type { ImportedVault } from '@/features/vault/VaultProvider';

import { backupFilename, createBackupJson, prepareBackupImport } from './backup';

export function BackupPage() {
  const { replaceImportedVault, busy } = useVault();
  const [passphrase, setPassphrase] = useState('');
  const [candidate, setCandidate] = useState<ImportedVault>();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();

  async function exportBackup() {
    setError(undefined);
    try {
      const mode = await saveBackupFile(await createBackupJson(), backupFilename());
      setStatus(mode === 'native' ? 'Encrypted backup saved.' : 'Encrypted backup downloaded.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Backup export failed.');
    }
  }

  async function chooseBackup() {
    setError(undefined);
    setStatus(undefined);
    try {
      const contents = await openBackupFile();
      if (contents === null) return;
      const imported = await prepareBackupImport(contents, passphrase);
      setCandidate(imported);
      setConfirmation('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Backup import failed.');
    }
  }

  async function confirmOverwrite(event: FormEvent) {
    event.preventDefault();
    if (!candidate) return;
    if (confirmation !== 'REPLACE') {
      setError('Type REPLACE exactly to confirm.');
      return;
    }
    try {
      await replaceImportedVault(candidate);
      setCandidate(undefined);
      setPassphrase('');
      setConfirmation('');
      setStatus('Encrypted backup restored.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Backup restore failed.');
    }
  }

  return (
    <main id="main-content" className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Portable and private</p>
          <h1>Encrypted backup</h1>
          <p>
            The generic backup file contains authenticated ciphertext, not account names or values.
          </p>
        </div>
      </div>
      {status ? (
        <p className="status-banner" role="status">
          {status}
        </p>
      ) : null}
      <ErrorSummary errors={error ? [error] : []} />
      <div className="settings-grid">
        <section className="panel form-stack">
          <h2>Save a backup</h2>
          <p>
            The backup uses your current vault passphrase. Keep both somewhere safe; neither can be
            recovered by this project.
          </p>
          <Button type="button" onClick={() => void exportBackup()} disabled={busy}>
            Save encrypted backup
          </Button>
        </section>
        <section className="panel form-stack">
          <h2>Restore a backup</h2>
          <p>Validation and decryption happen before your current vault can be replaced.</p>
          <Field
            label="Backup passphrase"
            type="password"
            autoComplete="current-password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.currentTarget.value)}
            minLength={12}
            required
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void chooseBackup()}
            disabled={busy || passphrase.length < 12}
          >
            Choose encrypted backup
          </Button>
        </section>
      </div>
      <Dialog
        open={Boolean(candidate)}
        title="Replace current vault"
        onClose={() => setCandidate(undefined)}
      >
        <form className="form-stack" onSubmit={(event) => void confirmOverwrite(event)}>
          <div className="danger-zone">
            <strong>This replaces the vault in this browser.</strong>
            <p>Export the current vault first if you may need it later.</p>
          </div>
          <Field
            label="Type REPLACE to confirm"
            value={confirmation}
            onChange={(event) => setConfirmation(event.currentTarget.value)}
            autoComplete="off"
            required
          />
          <div className="button-row">
            <Button type="submit" variant="danger" disabled={busy}>
              Replace vault
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCandidate(undefined)}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
