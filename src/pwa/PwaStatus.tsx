import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useAppStatus } from '@/components/ui/AppStatus';
import { useDirtyState } from '@/hooks/useDirtyState';

import { useInstallPrompt } from './useInstallPrompt';
import { usePwaUpdate } from './usePwaUpdate';

export function PwaStatus() {
  const update = usePwaUpdate();
  const install = useInstallPrompt();
  const { dirtyNames } = useDirtyState();
  const { announce } = useAppStatus();
  const [online, setOnline] = useState(navigator.onLine);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      announce('Back online.');
    };
    const onOffline = () => {
      setOnline(false);
      announce('You are offline. Saved vault features remain available.');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [announce]);

  useEffect(() => {
    if (update.offlineReady) announce('The app shell is ready for offline use.');
  }, [announce, update.offlineReady]);

  useEffect(() => {
    if (update.needRefresh && dirtyNames.length > 0) setConfirmUpdate(true);
  }, [dirtyNames.length, update.needRefresh]);

  function requestUpdate() {
    if (dirtyNames.length > 0) setConfirmUpdate(true);
    else void update.activateUpdate();
  }

  return (
    <>
      {!online ? (
        <div className="connection-status" role="status">
          Offline - encrypted local data remains available
        </div>
      ) : null}
      <div className="pwa-actions" role="region" aria-label="Application status">
        {install.canInstall ? (
          <Button type="button" variant="ghost" onClick={() => void install.install()}>
            Install app
          </Button>
        ) : null}
        {update.offlineReady ? (
          <div className="toast" role="status">
            <span>Ready for offline use.</span>
            <Button type="button" variant="ghost" onClick={update.dismissOfflineReady}>
              Dismiss
            </Button>
          </div>
        ) : null}
        {update.needRefresh ? (
          <div className="toast" role="status">
            <span>A new version is available.</span>
            <Button type="button" onClick={requestUpdate}>
              Update now
            </Button>
            <Button type="button" variant="ghost" onClick={update.dismissRefresh}>
              Later
            </Button>
          </div>
        ) : null}
        {update.registrationError ? (
          <p className="status-error" role="status">
            Offline setup failed. Online use still works.
          </p>
        ) : null}
      </div>
      <Dialog open={confirmUpdate} title="Unsaved edits" onClose={() => setConfirmUpdate(false)}>
        <div className="form-stack">
          <p>The following drafts have not been saved:</p>
          <ul>
            {dirtyNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <p>Save them first, or explicitly discard them and update.</p>
          <div className="button-row">
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setConfirmUpdate(false);
                void update.activateUpdate();
              }}
            >
              Discard drafts and update
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmUpdate(false)}>
              Keep editing
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
