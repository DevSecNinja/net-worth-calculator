import { useEffect, useRef, useState } from 'react';

const registrationStub = Object.create(null) as ServiceWorkerRegistration;
export const registrationUpdate = vi.fn(async () => registrationStub);
export const activateServiceWorker = vi.fn(async () => undefined);
let registrationDelayMs = 0;

export function setPwaRegistrationDelay(delayMs: number) {
  registrationDelayMs = delayMs;
}

type RegisterOptions = {
  onRegisteredSW?: (url: string, registration: Pick<ServiceWorkerRegistration, 'update'>) => void;
};

export function useRegisterSW(options?: RegisterOptions) {
  const registered = useRef(false);
  useEffect(() => {
    if (registered.current) return;
    registered.current = true;
    const timeout = window.setTimeout(
      () => options?.onRegisteredSW?.('/sw.js', { update: registrationUpdate }),
      registrationDelayMs,
    );
    return () => window.clearTimeout(timeout);
  }, [options]);
  return {
    needRefresh: useState(false),
    offlineReady: useState(false),
    updateServiceWorker: activateServiceWorker,
  };
}
