import { useState, type FormEvent } from 'react';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { Field } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { openBackupFile, saveBackupFile } from '@/storage/files';
import { useVault } from '@/features/vault/useVault';
import type { ImportedVault } from '@/features/vault/VaultProvider';
import { useLocale } from '@/features/locale/LocaleProvider';

import { backupFilename, createBackupJson, prepareBackupImport } from './backup';

export function BackupPage() {
  const { replaceImportedVault, busy, status: vaultStatus } = useVault();
  const [passphrase, setPassphrase] = useState('');
  const [candidate, setCandidate] = useState<ImportedVault>();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const replacesExistingVault = vaultStatus !== 'absent';
  const { t } = useLocale();

  async function exportBackup() {
    setError(undefined);
    try {
      const mode = await saveBackupFile(await createBackupJson(), backupFilename());
      setMessage(mode === 'native' ? t('backup.saved') : t('backup.downloaded'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Backup export failed.');
    }
  }

  async function chooseBackup() {
    setError(undefined);
    setMessage(undefined);
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
    if (replacesExistingVault && confirmation !== 'REPLACE') {
      setError('Type REPLACE exactly to confirm.');
      return;
    }
    try {
      await replaceImportedVault(candidate);
      setCandidate(undefined);
      setPassphrase('');
      setConfirmation('');
      setMessage(t('backup.restored'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Backup restore failed.');
    }
  }

  return (
    <main id="main-content" className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('backup.eyebrow')}</p>
          <h1>{t('backup.title')}</h1>
          <p>{t('backup.description')}</p>
        </div>
      </div>
      {message ? (
        <p className="status-banner" role="status">
          {message}
        </p>
      ) : null}
      <ErrorSummary errors={error ? [error] : []} />
      <div className="settings-grid">
        {vaultStatus === 'unlocked' ? (
          <section className="panel form-stack">
            <h2>{t('backup.saveTitle')}</h2>
            <p>{t('backup.saveHelp')}</p>
            <Button type="button" onClick={() => void exportBackup()} disabled={busy}>
              {t('backup.save')}
            </Button>
          </section>
        ) : (
          <section className="panel form-stack">
            <h2>{t('backup.restoreLocked')}</h2>
            <p>{t('backup.restoreLockedHelp')}</p>
          </section>
        )}
        <section className="panel form-stack">
          <h2>{t('backup.restoreTitle')}</h2>
          <p>{t('backup.restoreHelp')}</p>
          <Field
            label={t('backup.passphrase')}
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
            {t('backup.choose')}
          </Button>
        </section>
      </div>
      <Dialog
        open={Boolean(candidate)}
        title={replacesExistingVault ? t('backup.replaceTitle') : t('backup.restoreDialogTitle')}
        onClose={() => {
          setCandidate(undefined);
          setConfirmation('');
          setPassphrase('');
        }}
      >
        <form className="form-stack" onSubmit={(event) => void confirmOverwrite(event)}>
          {replacesExistingVault ? (
            <>
              <div className="danger-zone">
                <strong>{t('backup.replaceWarning')}</strong>
                <p>{t('backup.replaceHelp')}</p>
              </div>
              <Field
                label={t('backup.replacePrompt')}
                value={confirmation}
                onChange={(event) => setConfirmation(event.currentTarget.value)}
                autoComplete="off"
                required
              />
            </>
          ) : (
            <p>{t('backup.restoreCommit')}</p>
          )}
          <div className="button-row">
            <Button
              type="submit"
              variant={replacesExistingVault ? 'danger' : 'primary'}
              disabled={busy}
            >
              {replacesExistingVault ? t('backup.replace') : t('backup.restore')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCandidate(undefined);
                setConfirmation('');
                setPassphrase('');
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
