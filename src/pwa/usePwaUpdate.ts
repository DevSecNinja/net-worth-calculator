import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

export function usePwaUpdate() {
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
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
      void serviceWorkerRegistration
        .update()
        .then(() => {
          lastCheck.current = Date.now();
          if (serviceWorkerRegistration.waiting) setNeedRefresh(true);
        })
        .catch(() => {
          setRegistrationError('Service worker update check failed.');
        });
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
      const now = Date.now();
      if (
        !current ||
        !navigator.onLine ||
        (!force && now - lastCheck.current < UPDATE_INTERVAL_MS)
      ) {
        return;
      }
      lastCheck.current = now;
      await current.update();
      if (current.waiting) setNeedRefresh(true);
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
    needRefresh,
    offlineReady,
    registrationError,
    dismissRefresh: () => {
      setNeedRefresh(false);
    },
    dismissOfflineReady: () => setOfflineReady(false),
    activateUpdate: () => updateServiceWorker(true),
    checkForUpdate: () => checkForUpdate(true),
  };
}
