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
const DIRTY_RESPONSE_TIMEOUT_MS = 1_000;

type DirtyMessage =
  | { type: 'request'; owner: string; requestId: string }
  | { type: 'state'; owner: string; dirty: boolean; requestId?: string; target?: string }
  | { type: 'release'; owner: string };

type PendingRequest = {
  expected: Set<string>;
  responded: Set<string>;
  resolve: (missing: Set<string>) => void;
  timeout: number;
};

export function DirtyStateProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirtySet] = useState(() => new Set<string>());
  const { t } = useLocale();
  const owner = useRef(crypto.randomUUID());
  const localDirty = useRef(false);
  const remoteDirty = useRef(new Set<string>());
  const peers = useRef(new Set<string>());
  const pendingRequests = useRef(new Map<string, PendingRequest>());
  const channel = useRef<BroadcastChannel | undefined>(undefined);

  useEffect(() => {
    if (!('BroadcastChannel' in globalThis)) return;
    const current = new BroadcastChannel(DIRTY_CHANNEL);
    const requests = pendingRequests.current;
    channel.current = current;
    const publishState = (requestId?: string, target?: string) => {
      current.postMessage({
        type: 'state',
        owner: owner.current,
        dirty: localDirty.current,
        ...(requestId && target ? { requestId, target } : {}),
      } satisfies DirtyMessage);
    };
    const completeRequestIfReady = (requestId: string) => {
      const pending = requests.get(requestId);
      if (!pending || [...pending.expected].some((peer) => !pending.responded.has(peer))) return;
      window.clearTimeout(pending.timeout);
      requests.delete(requestId);
      pending.resolve(new Set());
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
      peers.current.add(message.owner);
      if (message.type === 'request' && 'requestId' in message) {
        publishState(String(message.requestId), message.owner);
      }
      if (message.type === 'release') {
        peers.current.delete(message.owner);
        remoteDirty.current.delete(message.owner);
        for (const [requestId, pending] of requests) {
          pending.expected.delete(message.owner);
          completeRequestIfReady(requestId);
        }
      }
      if (message.type === 'state') {
        if ('dirty' in message && message.dirty === true) remoteDirty.current.add(message.owner);
        else remoteDirty.current.delete(message.owner);
        if (
          'requestId' in message &&
          typeof message.requestId === 'string' &&
          'target' in message &&
          message.target === owner.current
        ) {
          requests.get(message.requestId)?.responded.add(message.owner);
          completeRequestIfReady(message.requestId);
        }
      }
    };
    current.postMessage({
      type: 'request',
      owner: owner.current,
      requestId: crypto.randomUUID(),
    } satisfies DirtyMessage);
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
      for (const pending of requests.values()) {
        window.clearTimeout(pending.timeout);
        pending.resolve(new Set(pending.expected));
      }
      requests.clear();
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
    const current = channel.current;
    const expected = new Set(peers.current);
    let missing = new Set<string>();
    if (current && expected.size > 0) {
      const requestId = crypto.randomUUID();
      missing = await new Promise<Set<string>>((resolve) => {
        const timeout = window.setTimeout(() => {
          const pending = pendingRequests.current.get(requestId);
          pendingRequests.current.delete(requestId);
          resolve(
            new Set(
              pending
                ? [...pending.expected].filter((peer) => !pending.responded.has(peer))
                : expected,
            ),
          );
        }, DIRTY_RESPONSE_TIMEOUT_MS);
        pendingRequests.current.set(requestId, {
          expected,
          responded: new Set(),
          resolve,
          timeout,
        });
        current.postMessage({
          type: 'request',
          owner: owner.current,
          requestId,
        } satisfies DirtyMessage);
      });
    }
    const remoteMayBeDirty = remoteDirty.current.size > 0 || missing.size > 0;
    return [...[...dirty].sort(), ...(remoteMayBeDirty ? [t('dirty.remote')] : [])];
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
