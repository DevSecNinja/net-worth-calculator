import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useAppStatus } from '@/components/ui/AppStatus';
import { useDirtyState } from '@/hooks/useDirtyState';
import { useLocale } from '@/features/locale/LocaleProvider';

import { useInstallPrompt } from './useInstallPrompt';
import { usePwaUpdate } from './usePwaUpdate';

export function PwaStatus() {
  const update = usePwaUpdate();
  const install = useInstallPrompt();
  const { collectDirtyNames } = useDirtyState();
  const { announce } = useAppStatus();
  const { t } = useLocale();
  const [online, setOnline] = useState(navigator.onLine);
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [updateBlockers, setUpdateBlockers] = useState<string[]>([]);
  const [activationError, setActivationError] = useState(false);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      announce(t('pwa.backOnline'));
    };
    const onOffline = () => {
      setOnline(false);
      announce(t('pwa.offlineAnnouncement'));
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [announce, t]);

  async function activateUpdate() {
    setActivationError(false);
    try {
      await update.activateUpdate();
    } catch {
      setActivationError(true);
      announce(t('pwa.updateFailed'));
    }
  }

  async function requestUpdate() {
    const blockers = await collectDirtyNames();
    if (blockers.length > 0) {
      setUpdateBlockers(blockers);
      setConfirmUpdate(true);
    } else {
      await activateUpdate();
    }
  }

  return (
    <>
      {!online ? (
        <div className="connection-status" role="status">
          {t('pwa.offline')}
        </div>
      ) : null}
      <div className="pwa-actions" role="region" aria-label={t('pwa.statusRegion')}>
        {install.canInstall ? (
          <Button type="button" variant="ghost" onClick={() => void install.install()}>
            {t('pwa.install')}
          </Button>
        ) : null}
        {update.offlineReady ? (
          <div className="toast" role="status">
            <span>{t('pwa.offlineReady')}</span>
            <Button type="button" variant="ghost" onClick={update.dismissOfflineReady}>
              {t('common.dismiss')}
            </Button>
          </div>
        ) : null}
        {update.needRefresh ? (
          <div className="toast" role="status">
            <span>{t('pwa.updateAvailable')}</span>
            <Button type="button" onClick={() => void requestUpdate()}>
              {t('pwa.updateNow')}
            </Button>
            <Button type="button" variant="ghost" onClick={update.dismissRefresh}>
              {t('pwa.later')}
            </Button>
          </div>
        ) : null}
        {update.registrationError ? (
          <p className="status-error" role="status">
            {t('pwa.registrationError')}
          </p>
        ) : null}
        {activationError ? (
          <p className="status-error" role="status">
            {t('pwa.updateFailed')}
          </p>
        ) : null}
      </div>
      <Dialog
        open={confirmUpdate}
        title={t('pwa.unsavedTitle')}
        onClose={() => setConfirmUpdate(false)}
      >
        <div className="form-stack">
          <p>{t('pwa.unsavedHelp')}</p>
          <ul>
            {updateBlockers.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <p>{t('pwa.unsavedResolution')}</p>
          <div className="button-row">
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setConfirmUpdate(false);
                void activateUpdate();
              }}
            >
              {t('pwa.discardUpdate')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmUpdate(false)}>
              {t('pwa.keepEditing')}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
