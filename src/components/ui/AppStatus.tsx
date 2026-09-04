import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type StatusContextValue = {
  announce: (message: string) => void;
};

const StatusContext = createContext<StatusContextValue | undefined>(undefined);

export function AppStatusProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const announce = useCallback((next: string) => setMessage(next), []);
  const value = useMemo(() => ({ announce }), [announce]);
  return (
    <StatusContext.Provider value={value}>
      {children}
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {message}
      </div>
    </StatusContext.Provider>
  );
}

export function useAppStatus(): StatusContextValue {
  const value = useContext(StatusContext);
  if (!value) throw new Error('useAppStatus must be used inside AppStatusProvider.');
  return value;
}
