import { useEffect, useState, type FormEvent } from 'react';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { Field } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useLocale } from '@/features/locale/LocaleProvider';

import { useCloudSync } from './CloudSyncProvider';

export function CloudSyncSettings() {
  const {
    configured,
    enabled,
    authentication,
    phase,
    lastSyncedAt,
    remoteModifiedAt,
    conflictHasLocal,
    conflictHasRemote,
    error,
    enable,
    prepareAuthentication,
    syncNow,
    resolveWithLocal,
    resolveWithRemote,
    disable,
    signOut,
  } = useCloudSync();
  const { locale, t } = useLocale();
  const [remoteDialogOpen, setRemoteDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [operationError, setOperationError] = useState<string>();
  const busy = phase === 'syncing' || authentication === 'loading';

  useEffect(() => {
    if (enabled) void prepareAuthentication().catch(() => undefined);
  }, [enabled, prepareAuthentication]);

  const formattedLastSync = lastSyncedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(lastSyncedAt),
      )
    : undefined;
  const formattedRemoteChange = remoteModifiedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(remoteModifiedAt),
      )
    : t('sync.remoteUnknown');

  async function applyRemoteVault(event: FormEvent) {
    event.preventDefault();
    setOperationError(undefined);
    try {
      await resolveWithRemote(passphrase);
      setPassphrase('');
      setRemoteDialogOpen(false);
    } catch (caught) {
      setOperationError(caught instanceof Error ? caught.message : t('sync.operationFailed'));
    }
  }

  async function run(operation: () => Promise<void>): Promise<boolean> {
    setOperationError(undefined);
    try {
      await operation();
      return true;
    } catch (caught) {
      setOperationError(caught instanceof Error ? caught.message : t('sync.operationFailed'));
      return false;
    }
  }

  async function disableSync(deleteRemote: boolean) {
    if (await run(() => disable(deleteRemote))) setDisableDialogOpen(false);
  }

  const status =
    phase === 'conflict'
      ? t('sync.statusConflict')
      : phase === 'offline'
        ? t('sync.statusOffline')
        : phase === 'syncing'
          ? t('sync.statusSyncing')
          : authentication === 'signed-out'
            ? t('sync.statusSignedOut')
            : phase === 'synced'
              ? t('sync.statusSynced')
              : t('sync.statusReady');
  const conflictDescription =
    conflictHasLocal && conflictHasRemote
      ? t('sync.conflictHelp', { date: formattedRemoteChange })
      : conflictHasLocal
        ? t('sync.remoteDeleted')
        : t('sync.localDeleted');

  return (
    <>
      <section className="panel form-stack" aria-labelledby="cloud-sync-title">
        <div>
          <h2 id="cloud-sync-title">{t('sync.title')}</h2>
          <p>{t('sync.help')}</p>
        </div>
        {!configured ? (
          <p className="fine-print">{t('sync.notConfigured')}</p>
        ) : !enabled ? (
          <>
            <p>{t('sync.optIn')}</p>
            <Button type="button" onClick={() => void run(enable)}>
              {t('sync.enable')}
            </Button>
          </>
        ) : (
          <>
            <p className="sync-status" role="status" aria-live="polite">
              <strong>{t('sync.statusLabel')}</strong> {status}
              {formattedLastSync ? ` ${t('sync.lastSynced', { date: formattedLastSync })}` : ''}
            </p>
            <div id="cloudkit-sign-in" className="cloudkit-auth-button" />
            <div id="cloudkit-sign-out" className="cloudkit-auth-button" />
            {phase === 'conflict' ? (
              <div className="status-error form-stack" role="alert">
                <strong>{t('sync.conflictTitle')}</strong>
                <p>{conflictDescription}</p>
                <div className="button-row">
                  {conflictHasLocal ? (
                    <Button
                      type="button"
                      onClick={() => void run(resolveWithLocal)}
                      disabled={busy}
                    >
                      {t('sync.keepLocal')}
                    </Button>
                  ) : null}
                  {conflictHasRemote ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setRemoteDialogOpen(true)}
                      disabled={busy}
                    >
                      {t('sync.useRemote')}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
            <ErrorSummary errors={[operationError, error].filter(Boolean) as string[]} />
            <div className="button-row">
              <Button
                type="button"
                onClick={() => void run(syncNow)}
                disabled={busy || authentication !== 'signed-in'}
              >
                {phase === 'syncing' ? t('sync.syncing') : t('sync.syncNow')}
              </Button>
              {authentication === 'signed-in' ? (
                <Button type="button" variant="secondary" onClick={() => void run(signOut)}>
                  {t('sync.signOut')}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDisableDialogOpen(true)}
                disabled={busy}
              >
                {t('sync.disable')}
              </Button>
            </div>
            <p className="fine-print">{t('sync.encryptionHelp')}</p>
          </>
        )}
      </section>

      <Dialog
        open={remoteDialogOpen}
        title={t('sync.useRemoteTitle')}
        onClose={() => {
          setRemoteDialogOpen(false);
          setPassphrase('');
          setOperationError(undefined);
        }}
      >
        <form className="form-stack" onSubmit={(event) => void applyRemoteVault(event)}>
          <p>{t('sync.useRemoteHelp')}</p>
          <Field
            label={t('vault.passphrase')}
            name="cloud-sync-passphrase"
            type="password"
            autoComplete="current-password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.currentTarget.value)}
            minLength={12}
            required
          />
          <ErrorSummary errors={operationError ? [operationError] : []} />
          <div className="button-row">
            <Button type="submit" variant="danger" disabled={passphrase.length < 12}>
              {t('sync.replaceLocal')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setRemoteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={disableDialogOpen}
        title={t('sync.disableTitle')}
        onClose={() => setDisableDialogOpen(false)}
      >
        <div className="form-stack">
          <p>{t('sync.disableHelp')}</p>
          <ErrorSummary errors={operationError ? [operationError] : []} />
          <div className="button-row">
            <Button type="button" onClick={() => void disableSync(false)}>
              {t('sync.keepCloudCopy')}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => void disableSync(true)}
              disabled={authentication !== 'signed-in'}
            >
              {t('sync.deleteCloudCopy')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setDisableDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
