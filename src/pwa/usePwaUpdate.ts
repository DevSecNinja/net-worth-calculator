import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

async function updateRegistration(
  current: ServiceWorkerRegistration,
  lastCheck: React.MutableRefObject<number>,
  setNeedRefresh: (value: boolean) => void,
  force: boolean,
) {
  const now = Date.now();
  if (!navigator.onLine || (!force && now - lastCheck.current < UPDATE_INTERVAL_MS)) return;

  const controlledBeforeCheck = Boolean(navigator.serviceWorker?.controller);
  lastCheck.current = now;
  await current.update();
  if (current.waiting && controlledBeforeCheck) setNeedRefresh(true);
}

export function usePwaUpdate() {
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const controlledAtRegistration = useRef(false);
  const lastCheck = useRef(0);
  const [registrationError, setRegistrationError] = useState<string>();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, serviceWorkerRegistration) {
      if (!serviceWorkerRegistration) return;
      registration.current = serviceWorkerRegistration;
      controlledAtRegistration.current = Boolean(navigator.serviceWorker?.controller);
      void updateRegistration(serviceWorkerRegistration, lastCheck, setNeedRefresh, true).catch(
        () => {
          setRegistrationError('Service worker update check failed.');
        },
      );
    },
    onRegisterError(error) {
      setRegistrationError(
        error instanceof Error ? error.message : 'Service worker registration failed.',
      );
    },
  });

  const checkForUpdate = useCallback(
    async (force = false) => {
      const current = registration.current;
      if (!current) return;
      try {
        await updateRegistration(current, lastCheck, setNeedRefresh, force);
      } catch {
        setRegistrationError('Service worker update check failed.');
      }
    },
    [setNeedRefresh],
  );

  useEffect(() => {
    const interval = window.setInterval(() => void checkForUpdate(), UPDATE_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    };
    const onPageShow = () => void checkForUpdate();
    const onOnline = () => void checkForUpdate();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onOnline);
    };
  }, [checkForUpdate]);

  return {
    needRefresh: needRefresh && controlledAtRegistration.current,
    offlineReady,
    registrationError,
    dismissRefresh: () => {
      lastCheck.current = Math.max(lastCheck.current, Date.now());
      setNeedRefresh(false);
    },
    dismissOfflineReady: () => setOfflineReady(false),
    activateUpdate: () => updateServiceWorker(true),
    checkForUpdate: () => checkForUpdate(true),
  };
}
