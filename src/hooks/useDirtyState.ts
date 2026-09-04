/* eslint-disable react-hooks/refs -- refs are read only by async user actions and channel events */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocale } from '@/features/locale/LocaleProvider';

type DirtyStateContextValue = {
  dirtyNames: string[];
  setDirty: (name: string, dirty: boolean) => void;
  collectDirtyNames: () => Promise<string[]>;
};

const DirtyStateContext = createContext<DirtyStateContextValue | undefined>(undefined);
const DIRTY_CHANNEL = 'nwc-dirty-state';

type DirtyMessage = {
  type: 'request' | 'state' | 'release';
  owner: string;
  dirty?: boolean;
};

export function DirtyStateProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirtySet] = useState(() => new Set<string>());
  const { t } = useLocale();
  const owner = useRef(crypto.randomUUID());
  const localDirty = useRef(false);
  const remoteDirty = useRef(new Set<string>());
  const channel = useRef<BroadcastChannel | undefined>(undefined);

  useEffect(() => {
    if (!('BroadcastChannel' in globalThis)) return;
    const current = new BroadcastChannel(DIRTY_CHANNEL);
    channel.current = current;
    const publishState = () => {
      current.postMessage({
        type: 'state',
        owner: owner.current,
        dirty: localDirty.current,
      } satisfies DirtyMessage);
    };
    current.onmessage = (event: MessageEvent<unknown>) => {
      const message = event.data;
      if (
        typeof message !== 'object' ||
        message === null ||
        !('type' in message) ||
        !('owner' in message) ||
        typeof message.type !== 'string' ||
        typeof message.owner !== 'string' ||
        message.owner === owner.current
      ) {
        return;
      }
      if (message.type === 'request') publishState();
      if (message.type === 'release') remoteDirty.current.delete(message.owner);
      if (message.type === 'state') {
        if ('dirty' in message && message.dirty === true) remoteDirty.current.add(message.owner);
        else remoteDirty.current.delete(message.owner);
      }
    };
    current.postMessage({ type: 'request', owner: owner.current } satisfies DirtyMessage);
    publishState();
    const release = () => {
      current.postMessage({ type: 'release', owner: owner.current } satisfies DirtyMessage);
    };
    window.addEventListener('pagehide', release);
    return () => {
      release();
      window.removeEventListener('pagehide', release);
      current.close();
      channel.current = undefined;
    };
  }, []);

  useEffect(() => {
    localDirty.current = dirty.size > 0;
    channel.current?.postMessage({
      type: 'state',
      owner: owner.current,
      dirty: localDirty.current,
    } satisfies DirtyMessage);
  }, [dirty]);

  const setDirty = useCallback((name: string, isDirty: boolean) => {
    setDirtySet((current) => {
      const next = new Set(current);
      if (isDirty) next.add(name);
      else next.delete(name);
      return next;
    });
  }, []);
  const collectDirtyNames = useCallback(async () => {
    channel.current?.postMessage({ type: 'request', owner: owner.current } satisfies DirtyMessage);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return [...[...dirty].sort(), ...(remoteDirty.current.size > 0 ? [t('dirty.remote')] : [])];
  }, [dirty, t]);
  const value = useMemo(
    () => ({ dirtyNames: [...dirty].sort(), setDirty, collectDirtyNames }),
    [collectDirtyNames, dirty, setDirty],
  );
  return createElement(DirtyStateContext.Provider, { value }, children);
}

export function useDirtyState(): DirtyStateContextValue {
  const value = useContext(DirtyStateContext);
  if (!value) throw new Error('useDirtyState must be used inside DirtyStateProvider.');
  return value;
}
