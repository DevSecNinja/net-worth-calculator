import { useEffect, useRef, useState } from 'react';

const registrationStub = Object.create(null) as ServiceWorkerRegistration;
export const registrationUpdate = vi.fn(async () => registrationStub);
export const activateServiceWorker = vi.fn(async () => undefined);

type RegisterOptions = {
  onRegisteredSW?: (url: string, registration: Pick<ServiceWorkerRegistration, 'update'>) => void;
};

export function useRegisterSW(options?: RegisterOptions) {
  const registered = useRef(false);
  useEffect(() => {
    if (registered.current) return;
    registered.current = true;
    queueMicrotask(() => options?.onRegisteredSW?.('/sw.js', { update: registrationUpdate }));
  }, [options]);
  return {
    needRefresh: useState(false),
    offlineReady: useState(false),
    updateServiceWorker: activateServiceWorker,
  };
}
