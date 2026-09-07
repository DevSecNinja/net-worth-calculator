import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { CipherEnvelopeV1 } from '@/domain/model';
import { useVault } from '@/features/vault/useVault';
import {
  CloudSyncAuthenticationError,
  CloudSyncConflictError,
  createCloudKitClient,
  type CloudSyncClient,
} from '@/storage/cloudKitAdapter';
import {
  clearCloudSyncMetadata,
  createCloudSyncBaseline,
  decideCloudSync,
  envelopeDigest,
  loadCloudSyncMetadata,
  opaqueIdentifierDigest,
  saveCloudSyncMetadata,
  type RemoteVaultRecord,
} from '@/storage/cloudSync';
import { unlockEncryptedVault } from '@/storage/crypto';
import { VaultAuthenticationError } from '@/storage/crypto';
import { readEnvelope } from '@/storage/database';
import { VaultConflictError } from '@/storage/vaultRepository';
import { subscribeToVaultChanged } from '@/storage/vaultEvents';

type AuthenticationState = 'unavailable' | 'loading' | 'signed-out' | 'signed-in';
type SyncPhase = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict';
type SyncOperation = { accountDigest: string; generation: number };

type CloudSyncContextValue = {
  configured: boolean;
  enabled: boolean;
  authentication: AuthenticationState;
  phase: SyncPhase;
  lastSyncedAt?: string;
  remoteModifiedAt?: string;
  conflictHasLocal: boolean;
  conflictHasRemote: boolean;
  error?: string;
  enable: () => Promise<void>;
  prepareAuthentication: () => Promise<void>;
  syncNow: () => Promise<void>;
  resolveWithLocal: () => Promise<void>;
  resolveWithRemote: (passphrase: string) => Promise<void>;
  disable: (deleteRemote: boolean) => Promise<void>;
  signOut: () => Promise<void>;
};

const CloudSyncContext = createContext<CloudSyncContextValue | undefined>(undefined);

const configuration =
  __CLOUDKIT_CONTAINER_IDENTIFIER__ && __CLOUDKIT_API_TOKEN__
    ? {
        containerIdentifier: __CLOUDKIT_CONTAINER_IDENTIFIER__,
        apiToken: __CLOUDKIT_API_TOKEN__,
        environment: __CLOUDKIT_ENVIRONMENT__,
      }
    : undefined;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'CloudKit synchronization failed.';
}

export function CloudSyncProvider({
  children,
  createClient = createCloudKitClient,
}: {
  children: ReactNode;
  createClient?: typeof createCloudKitClient;
}) {
  const { status: vaultStatus, vault, applySyncedEnvelope, replaceImportedVault } = useVault();
  const initialMetadata = useMemo(() => loadCloudSyncMetadata(), []);
  const [enabled, setEnabled] = useState(initialMetadata.enabled);
  const [authentication, setAuthentication] = useState<AuthenticationState>(
    configuration && initialMetadata.enabled
      ? 'loading'
      : configuration
        ? 'signed-out'
        : 'unavailable',
  );
  const [phase, setPhase] = useState<SyncPhase>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState(initialMetadata.baseline?.syncedAt);
  const [remoteModifiedAt, setRemoteModifiedAt] = useState<string>();
  const [error, setError] = useState<string>();
  const client = useRef<CloudSyncClient | undefined>(undefined);
  const clientPromise = useRef<Promise<CloudSyncClient> | undefined>(undefined);
  const authSetup = useRef<Promise<string | undefined> | undefined>(undefined);
  const accountDigest = useRef<string | undefined>(initialMetadata.accountDigest);
  const authGeneration = useRef(0);
  const pendingSync = useRef(false);
  const [conflict, setConflict] = useState<
    | {
        localExists: boolean;
        local?: CipherEnvelopeV1;
        remote?: RemoteVaultRecord;
      }
    | undefined
  >();
  const syncing = useRef(false);

  const currentOperation = useCallback((): SyncOperation => {
    if (!accountDigest.current) throw new Error('CloudKit account identity is unavailable.');
    return { accountDigest: accountDigest.current, generation: authGeneration.current };
  }, []);

  const isCurrentOperation = useCallback(
    (operation: SyncOperation) =>
      operation.generation === authGeneration.current &&
      operation.accountDigest === accountDigest.current,
    [],
  );

  const persistBaseline = useCallback(
    async (record: RemoteVaultRecord, envelope: CipherEnvelopeV1, operation: SyncOperation) => {
      if (!isCurrentOperation(operation)) throw new CloudSyncAuthenticationError();
      const syncedAt = new Date().toISOString();
      const baseline = createCloudSyncBaseline(
        record.changeTag,
        await envelopeDigest(envelope),
        syncedAt,
      );
      if (!isCurrentOperation(operation)) throw new CloudSyncAuthenticationError();
      saveCloudSyncMetadata({ enabled: true, accountDigest: operation.accountDigest, baseline });
      setLastSyncedAt(syncedAt);
      setRemoteModifiedAt(record.modifiedAt);
    },
    [isCurrentOperation],
  );

  const bindAccount = useCallback(
    async (userRecordName: string, expectedGeneration: number): Promise<boolean | undefined> => {
      const nextDigest = await opaqueIdentifierDigest(userRecordName);
      if (expectedGeneration !== authGeneration.current) return undefined;
      const metadata = loadCloudSyncMetadata();
      const changed = Boolean(accountDigest.current && accountDigest.current !== nextDigest);
      if (metadata.accountDigest !== nextDigest) {
        saveCloudSyncMetadata({ enabled: true, accountDigest: nextDigest });
        setLastSyncedAt(undefined);
      }
      accountDigest.current = nextDigest;
      return changed;
    },
    [],
  );

  const ensureClient = useCallback(async () => {
    if (!configuration) throw new Error('CloudKit sync is not configured for this deployment.');
    if (client.current) return client.current;
    if (!clientPromise.current) {
      clientPromise.current = createClient(configuration).catch((caught: unknown) => {
        clientPromise.current = undefined;
        throw caught;
      });
    }
    const created = await clientPromise.current;
    if (!client.current) {
      client.current = created;
      created.watchAuthentication(
        (userRecordName) => {
          const expectedGeneration = authGeneration.current;
          void bindAccount(userRecordName, expectedGeneration)
            .then((accountChanged) => {
              if (accountChanged === undefined || expectedGeneration !== authGeneration.current) {
                return;
              }
              if (accountChanged) authGeneration.current += 1;
              setAuthentication('signed-in');
              setError(undefined);
            })
            .catch((caught: unknown) => {
              setError(errorMessage(caught));
              setPhase('error');
            });
        },
        () => {
          authGeneration.current += 1;
          setAuthentication('signed-out');
          setPhase('idle');
        },
        (caught) => {
          authGeneration.current += 1;
          setAuthentication('signed-out');
          setError(errorMessage(caught));
          setPhase('error');
        },
      );
    }
    return created;
  }, [bindAccount, createClient]);

  const setUpAuthentication = useCallback(async () => {
    if (authSetup.current) return authSetup.current;
    const expectedGeneration = authGeneration.current;
    authSetup.current = ensureClient().then(async (currentClient) => {
      const userRecordName = await currentClient.setUpAuth();
      if (!userRecordName) return undefined;
      const accountChanged = await bindAccount(userRecordName, expectedGeneration);
      if (accountChanged === undefined) return undefined;
      if (accountChanged) {
        authGeneration.current += 1;
      }
      return userRecordName;
    });
    try {
      return await authSetup.current;
    } finally {
      authSetup.current = undefined;
    }
  }, [bindAccount, ensureClient]);

  const performSync = useCallback(
    async function synchronize() {
      if (syncing.current) {
        pendingSync.current = true;
        return;
      }
      syncing.current = true;
      const startingGeneration = authGeneration.current;
      try {
        if (!navigator.onLine) {
          setPhase('offline');
          return;
        }
        const operationGeneration = authGeneration.current;
        const currentClient = await ensureClient();
        if (operationGeneration !== authGeneration.current) return;
        const operation = currentOperation();
        setPhase('syncing');
        setError(undefined);
        const local = await readEnvelope();
        const remote = await currentClient.fetchVault();
        if (operationGeneration !== authGeneration.current) return;
        const baseline = loadCloudSyncMetadata().baseline;
        const decision = await decideCloudSync(local, remote, baseline);
        if (decision.action === 'conflict') {
          setConflict({
            localExists: Boolean(local),
            ...(local ? { local } : {}),
            ...(decision.remote ? { remote: decision.remote } : {}),
          });
          setRemoteModifiedAt(decision.remote?.modifiedAt);
          setPhase('conflict');
          return;
        }
        if (decision.action === 'upload') {
          const saved = await currentClient.saveVault(local!, decision.expectedChangeTag);
          if (!isCurrentOperation(operation)) return;
          await persistBaseline(saved, local!, operation);
        } else if (decision.action === 'download') {
          if (local && vaultStatus !== 'unlocked') {
            setConflict({ localExists: true, local, remote: decision.remote });
            setRemoteModifiedAt(decision.remote.modifiedAt);
            setPhase('conflict');
            return;
          }
          try {
            await applySyncedEnvelope(decision.remote.payload.envelope, local, () =>
              isCurrentOperation(operation),
            );
          } catch (caught) {
            if (
              local &&
              (caught instanceof VaultAuthenticationError || caught instanceof VaultConflictError)
            ) {
              setConflict({ localExists: true, local, remote: decision.remote });
              setRemoteModifiedAt(decision.remote.modifiedAt);
              setPhase('conflict');
              return;
            }
            throw caught;
          }
          await persistBaseline(decision.remote, decision.remote.payload.envelope, operation);
        } else if (local && remote) {
          await persistBaseline(remote, local, operation);
        }
        setConflict(undefined);
        setPhase('synced');
      } catch (caught) {
        if (caught instanceof CloudSyncAuthenticationError) {
          authGeneration.current += 1;
          setAuthentication('signed-out');
        }
        if (
          !(caught instanceof CloudSyncAuthenticationError) &&
          startingGeneration !== authGeneration.current
        ) {
          return;
        }
        if (caught instanceof CloudSyncConflictError) {
          const remote = await (await ensureClient()).fetchVault().catch(() => undefined);
          if (remote) {
            const local = await readEnvelope();
            setConflict({
              localExists: Boolean(local),
              ...(local ? { local } : {}),
              remote,
            });
            setRemoteModifiedAt(remote.modifiedAt);
            setPhase('conflict');
            return;
          }
        }
        setError(errorMessage(caught));
        setPhase('error');
        throw caught;
      } finally {
        syncing.current = false;
        if (pendingSync.current) {
          pendingSync.current = false;
          window.setTimeout(() => void synchronize().catch(() => undefined), 0);
        }
      }
    },
    [
      applySyncedEnvelope,
      currentOperation,
      ensureClient,
      isCurrentOperation,
      persistBaseline,
      vaultStatus,
    ],
  );

  const prepareAuthentication = useCallback(async () => {
    if (!enabled || !configuration) return;
    if (!navigator.onLine) {
      setAuthentication('signed-out');
      setPhase('offline');
      return;
    }
    setAuthentication('loading');
    setError(undefined);
    try {
      const userRecordName = await setUpAuthentication();
      setAuthentication(userRecordName ? 'signed-in' : 'signed-out');
    } catch (caught) {
      setAuthentication('signed-out');
      setError(errorMessage(caught));
      setPhase('error');
      throw caught;
    }
  }, [enabled, setUpAuthentication]);

  const enable = useCallback((): Promise<void> => {
    if (!configuration) throw new Error('CloudKit sync is not configured for this deployment.');
    saveCloudSyncMetadata({ enabled: true });
    setEnabled(true);
    setAuthentication('loading');
    return Promise.resolve();
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      setPhase('offline');
      return;
    }
    const userRecordName = await setUpAuthentication();
    setAuthentication(userRecordName ? 'signed-in' : 'signed-out');
    if (!userRecordName) return;
    await performSync();
  }, [performSync, setUpAuthentication]);

  const resolveWithLocal = useCallback(async () => {
    if (syncing.current) throw new Error('Another CloudKit operation is still running.');
    syncing.current = true;
    const currentConflict = conflict;
    const operation = currentOperation();
    setPhase('syncing');
    try {
      const local = await readEnvelope();
      if (!currentConflict?.localExists || !local) {
        throw new Error('No local CloudKit conflict is available.');
      }
      if (JSON.stringify(local) !== JSON.stringify(currentConflict.local)) {
        throw new CloudSyncConflictError();
      }
      const currentClient = await ensureClient();
      if (!currentConflict.remote && (await currentClient.fetchVault())) {
        throw new CloudSyncConflictError();
      }
      if (!isCurrentOperation(operation)) throw new CloudSyncAuthenticationError();
      const saved = await currentClient.saveVault(local, currentConflict.remote?.changeTag);
      if (!isCurrentOperation(operation)) throw new CloudSyncAuthenticationError();
      await persistBaseline(saved, local, operation);
      setConflict(undefined);
      setPhase('synced');
      if (JSON.stringify(await readEnvelope()) !== JSON.stringify(local)) {
        pendingSync.current = true;
      }
    } catch (caught) {
      setPhase('conflict');
      throw caught;
    } finally {
      syncing.current = false;
      if (pendingSync.current) {
        pendingSync.current = false;
        window.setTimeout(() => void performSync().catch(() => undefined), 0);
      }
    }
  }, [conflict, currentOperation, ensureClient, isCurrentOperation, performSync, persistBaseline]);

  const resolveWithRemote = useCallback(
    async (passphrase: string) => {
      if (syncing.current) throw new Error('Another CloudKit operation is still running.');
      syncing.current = true;
      const currentConflict = conflict;
      const operation = currentOperation();
      setPhase('syncing');
      try {
        if (!currentConflict?.remote) throw new Error('No remote CloudKit conflict is available.');
        const latestRemote = await (await ensureClient()).fetchVault();
        if (!latestRemote || latestRemote.changeTag !== currentConflict.remote.changeTag) {
          throw new CloudSyncConflictError();
        }
        if (!isCurrentOperation(operation)) throw new CloudSyncAuthenticationError();
        const unlocked = await unlockEncryptedVault(latestRemote.payload.envelope, passphrase);
        await replaceImportedVault(
          {
            envelope: latestRemote.payload.envelope,
            vault: unlocked.vault,
            material: unlocked.material,
          },
          currentConflict.local ?? null,
          () => isCurrentOperation(operation),
        );
        await persistBaseline(latestRemote, latestRemote.payload.envelope, operation);
        setConflict(undefined);
        setPhase('synced');
      } catch (caught) {
        setPhase('conflict');
        throw caught;
      } finally {
        syncing.current = false;
        if (pendingSync.current) {
          pendingSync.current = false;
          window.setTimeout(() => void performSync().catch(() => undefined), 0);
        }
      }
    },
    [
      conflict,
      currentOperation,
      ensureClient,
      isCurrentOperation,
      performSync,
      persistBaseline,
      replaceImportedVault,
    ],
  );

  const disable = useCallback(
    async (deleteRemote: boolean) => {
      if (syncing.current) throw new Error('Another CloudKit operation is still running.');
      syncing.current = true;
      setError(undefined);
      try {
        if (deleteRemote) {
          const currentClient = await ensureClient();
          const userRecordName = await setUpAuthentication();
          if (!userRecordName) {
            setAuthentication('signed-out');
            throw new Error('Sign in to iCloud before deleting the CloudKit vault.');
          }
          const operation = currentOperation();
          const remote = await currentClient.fetchVault();
          if (!isCurrentOperation(operation)) throw new CloudSyncAuthenticationError();
          if (remote) await currentClient.deleteVault(remote.changeTag);
          if (!isCurrentOperation(operation)) throw new CloudSyncAuthenticationError();
        }
        authGeneration.current += 1;
        clearCloudSyncMetadata();
        accountDigest.current = undefined;
        setConflict(undefined);
        setEnabled(false);
        setPhase('idle');
        setLastSyncedAt(undefined);
        setRemoteModifiedAt(undefined);
      } catch (caught) {
        setPhase('error');
        throw caught;
      } finally {
        syncing.current = false;
        pendingSync.current = false;
      }
    },
    [currentOperation, ensureClient, isCurrentOperation, setUpAuthentication],
  );

  const signOut = useCallback(async () => {
    if (!client.current) return;
    authGeneration.current += 1;
    await client.current.signOut();
    setAuthentication('signed-out');
    setPhase('idle');
  }, []);

  useEffect(() => {
    if (!enabled || !configuration) return;
    void prepareAuthentication().catch(() => undefined);
  }, [enabled, prepareAuthentication]);

  useEffect(() => {
    if (!enabled || authentication !== 'signed-in') return;
    const timeout = window.setTimeout(() => void performSync().catch(() => undefined), 500);
    return () => window.clearTimeout(timeout);
  }, [authentication, enabled, performSync, vault?.id, vault?.revision, vaultStatus]);

  useEffect(() => {
    if (!enabled) return;
    const synchronizeOnline = () => void syncNow().catch(() => undefined);
    window.addEventListener('online', synchronizeOnline);
    return () => window.removeEventListener('online', synchronizeOnline);
  }, [enabled, syncNow]);

  useEffect(
    () =>
      subscribeToVaultChanged(() => {
        if (enabled && authentication === 'signed-in') {
          void performSync().catch(() => undefined);
        }
      }),
    [authentication, enabled, performSync],
  );

  const value = useMemo(
    () => ({
      configured: Boolean(configuration),
      enabled,
      authentication,
      phase,
      ...(lastSyncedAt ? { lastSyncedAt } : {}),
      ...(remoteModifiedAt ? { remoteModifiedAt } : {}),
      conflictHasLocal: conflict?.localExists ?? false,
      conflictHasRemote: Boolean(conflict?.remote),
      ...(error ? { error } : {}),
      enable,
      prepareAuthentication,
      syncNow,
      resolveWithLocal,
      resolveWithRemote,
      disable,
      signOut,
    }),
    [
      authentication,
      conflict,
      disable,
      enable,
      enabled,
      error,
      lastSyncedAt,
      phase,
      prepareAuthentication,
      remoteModifiedAt,
      resolveWithLocal,
      resolveWithRemote,
      signOut,
      syncNow,
    ],
  );

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync(): CloudSyncContextValue {
  const value = useContext(CloudSyncContext);
  if (!value) throw new Error('useCloudSync must be used inside CloudSyncProvider.');
  return value;
}
