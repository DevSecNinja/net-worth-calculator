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
import { createId } from '@/domain/model';
import { useLocale } from '@/features/locale/LocaleProvider';
import { openOptionalBroadcastChannel } from '@/storage/broadcastChannel';

type DirtyStateContextValue = {
  dirtyNames: string[];
  setDirty: (name: string, dirty: boolean) => void;
  collectDirtyNames: () => Promise<string[]>;
};

const DirtyStateContext = createContext<DirtyStateContextValue | undefined>(undefined);
const DIRTY_CHANNEL = 'nwc-dirty-state';
const DIRTY_STORAGE_KEY = 'nwc-dirty-state-event';
const DIRTY_RESPONSE_TIMEOUT_MS = 1_000;
const storageAccessErrors = new Set(['QuotaExceededError', 'SecurityError']);

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

function tryCreateId(): string | undefined {
  try {
    return createId();
  } catch {
    return undefined;
  }
}

export function DirtyStateProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirtySet] = useState(() => new Set<string>());
  const { t } = useLocale();
  const owner = useRef<string | undefined>(undefined);
  const localDirty = useRef(false);
  const remoteDirty = useRef(new Set<string>());
  const peers = useRef(new Set<string>());
  const pendingRequests = useRef(new Map<string, PendingRequest>());
  const publish = useRef<((message: DirtyMessage) => void) | undefined>(undefined);
  const coordinationAvailable = useRef(false);
  const coordinationFailsClosed = useRef(false);

  useEffect(() => {
    const ownerId = tryCreateId();
    if (!ownerId) return;
    const initialRequestId = tryCreateId();
    if (!initialRequestId) return;
    owner.current = ownerId;
    const current = openOptionalBroadcastChannel(DIRTY_CHANNEL);
    const requests = pendingRequests.current;
    const publishMessage = (message: DirtyMessage) => {
      let delivered = false;
      if (current) {
        current.postMessage(message);
        delivered = true;
      }
      try {
        localStorage.setItem(DIRTY_STORAGE_KEY, JSON.stringify(message));
        localStorage.removeItem(DIRTY_STORAGE_KEY);
        delivered = true;
      } catch (error) {
        if (!(error instanceof DOMException) || !storageAccessErrors.has(error.name)) {
          throw error;
        }
      }
      coordinationAvailable.current = delivered;
      coordinationFailsClosed.current = !delivered;
    };
    publish.current = publishMessage;
    const publishState = (requestId?: string, target?: string) => {
      publishMessage({
        type: 'state',
        owner: ownerId,
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
    const handleMessage = (message: unknown) => {
      if (
        typeof message !== 'object' ||
        message === null ||
        !('type' in message) ||
        !('owner' in message) ||
        typeof message.type !== 'string' ||
        typeof message.owner !== 'string' ||
        message.owner === ownerId
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
          message.target === ownerId
        ) {
          requests.get(message.requestId)?.responded.add(message.owner);
          completeRequestIfReady(message.requestId);
        }
      }
    };
    if (current) {
      current.onmessage = (event: MessageEvent<unknown>) => handleMessage(event.data);
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DIRTY_STORAGE_KEY || !event.newValue) return;
      try {
        handleMessage(JSON.parse(event.newValue) as unknown);
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
    };
    window.addEventListener('storage', handleStorage);
    publishMessage({
      type: 'request',
      owner: ownerId,
      requestId: initialRequestId,
    } satisfies DirtyMessage);
    publishState();
    const release = () => {
      publishMessage({ type: 'release', owner: ownerId } satisfies DirtyMessage);
    };
    window.addEventListener('pagehide', release);
    return () => {
      release();
      window.removeEventListener('pagehide', release);
      window.removeEventListener('storage', handleStorage);
      current?.close();
      publish.current = undefined;
      coordinationAvailable.current = false;
      coordinationFailsClosed.current = false;
      owner.current = undefined;
      for (const pending of requests.values()) {
        window.clearTimeout(pending.timeout);
        pending.resolve(new Set(pending.expected));
      }
      requests.clear();
    };
  }, []);

  useEffect(() => {
    localDirty.current = dirty.size > 0;
    const ownerId = owner.current;
    if (!ownerId) return;
    publish.current?.({
      type: 'state',
      owner: ownerId,
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
    const publishMessage = publish.current;
    const ownerId = owner.current;
    if (!coordinationAvailable.current || !publishMessage || !ownerId) {
      return [
        ...[...dirty].sort(),
        ...(coordinationFailsClosed.current ? [t('dirty.remote')] : []),
      ];
    }
    const expected = new Set(peers.current);
    let missing = new Set<string>();
    if (expected.size > 0) {
      const requestId = tryCreateId();
      if (!requestId) {
        return [...[...dirty].sort(), t('dirty.remote')];
      }
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
        publishMessage({
          type: 'request',
          owner: ownerId,
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

export const dirtyStateContract = {
  channelName: DIRTY_CHANNEL,
  storageKey: DIRTY_STORAGE_KEY,
} as const;
