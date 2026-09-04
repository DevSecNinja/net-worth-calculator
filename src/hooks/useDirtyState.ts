import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type DirtyStateContextValue = {
  dirtyNames: string[];
  setDirty: (name: string, dirty: boolean) => void;
};

const DirtyStateContext = createContext<DirtyStateContextValue | undefined>(undefined);

export function DirtyStateProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirtySet] = useState(() => new Set<string>());
  const setDirty = useCallback((name: string, isDirty: boolean) => {
    setDirtySet((current) => {
      const next = new Set(current);
      if (isDirty) next.add(name);
      else next.delete(name);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ dirtyNames: [...dirty].sort(), setDirty }), [dirty, setDirty]);
  return createElement(DirtyStateContext.Provider, { value }, children);
}

export function useDirtyState(): DirtyStateContextValue {
  const value = useContext(DirtyStateContext);
  if (!value) throw new Error('useDirtyState must be used inside DirtyStateProvider.');
  return value;
}
