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

import type { CipherEnvelopeV1, Vault } from '@/domain/model';
import { addSampleData, createEmptyVault, type SampleDataLocale } from '@/domain/fixtures';
import { detectVaultCapabilityIssue, type VaultCapabilityIssue } from '@/storage/capabilities';
import type { VaultKeyMaterial } from '@/storage/crypto';
import { VaultSessionLease } from '@/storage/sessionLease';
import { notifyVaultDeleted, subscribeToVaultDeleted } from '@/storage/vaultEvents';
import {
  captureLockedVault,
  changeVaultPassphrase,
  createVault as createPersistedVault,
  hasVault,
  LockedVaultChangedError,
  LockedVaultLeaseLostError,
  removeLockedVault,
  removeVault,
  replaceVaultEnvelope,
  saveVault,
  unlockVault,
} from '@/storage/vaultRepository';

type VaultStatus = 'loading' | 'absent' | 'locked' | 'unlocked';

export type ImportedVault = {
  envelope: CipherEnvelopeV1;
  vault: Vault;
  material: VaultKeyMaterial;
};

type VaultContextValue = {
  status: VaultStatus;
  vault?: Vault;
  busy: boolean;
  error?: string;
  capabilityIssue?: VaultCapabilityIssue;
  create: (
    passphrase: string,
    currency: string,
    sample: boolean,
    sampleLocale?: SampleDataLocale,
  ) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => void;
  mutate: (updater: (vault: Vault) => Vault) => Promise<void>;
  changePassphrase: (currentPassphrase: string, newPassphrase: string) => Promise<void>;
  deleteVault: () => Promise<void>;
  retryCapabilities: () => Promise<void>;
  prepareLockedVaultReset: () => Promise<boolean>;
  cancelLockedVaultReset: () => void;
  resetLockedVault: () => Promise<void>;
  replaceImportedVault: (imported: ImportedVault) => Promise<void>;
  clearError: () => void;
};

const VaultContext = createContext<VaultContextValue | undefined>(undefined);

export class VaultLeaseUnavailableError extends Error {
  constructor() {
    super('This vault is already unlocked in another tab.');
    this.name = 'VaultLeaseUnavailableError';
  }
}

class VaultCapabilityError extends Error {
  readonly issue: VaultCapabilityIssue;

  constructor(issue: VaultCapabilityIssue) {
    super('A required secure browser capability is unavailable.');
    this.name = 'VaultCapabilityError';
    this.issue = issue;
  }
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'The vault operation failed.';
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>('loading');
  const [vault, setVault] = useState<Vault>();
  const [material, setMaterial] = useState<VaultKeyMaterial>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [capabilityIssue, setCapabilityIssue] = useState<VaultCapabilityIssue>();
  const lease = useRef<VaultSessionLease | undefined>(undefined);
  const lockedResetTarget = useRef<CipherEnvelopeV1 | undefined>(undefined);
  const statusRef = useRef<VaultStatus>('loading');
  const generation = useRef(0);
  const mutationInFlight = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const lock = useCallback(() => {
    generation.current += 1;
    lease.current?.release();
    lease.current = undefined;
    setVault(undefined);
    setMaterial(undefined);
    lockedResetTarget.current = undefined;
    setBusy(false);
    setStatus('locked');
  }, []);

  useEffect(
    () =>
      subscribeToVaultDeleted(() => {
        if (statusRef.current !== 'locked') return;
        void hasVault()
          .then((exists) => {
            if (exists || statusRef.current !== 'locked') return;
            generation.current += 1;
            lockedResetTarget.current = undefined;
            setVault(undefined);
            setMaterial(undefined);
            setError(undefined);
            setBusy(false);
            setStatus('absent');
          })
          .catch((caught: unknown) => {
            setError(messageFrom(caught));
          });
      }),
    [],
  );

  useEffect(() => {
    let active = true;
    const lockForPageHide = () => {
      if (lease.current) lock();
    };
    window.addEventListener('pagehide', lockForPageHide);
    const initialCapabilityIssue = detectVaultCapabilityIssue();
    setCapabilityIssue(initialCapabilityIssue);
    if (initialCapabilityIssue) {
      setStatus('absent');
      return () => {
        active = false;
        generation.current += 1;
        lease.current?.release();
        window.removeEventListener('pagehide', lockForPageHide);
      };
    }
    void hasVault()
      .then((exists) => {
        if (active) setStatus(exists ? 'locked' : 'absent');
      })
      .catch(() => {
        if (active) {
          setCapabilityIssue('indexed-db');
          setStatus('absent');
        }
      });
    return () => {
      active = false;
      generation.current += 1;
      lease.current?.release();
      window.removeEventListener('pagehide', lockForPageHide);
    };
  }, [lock]);

  const acquireLease = useCallback((): VaultSessionLease => {
    const candidate = new VaultSessionLease();
    if (!candidate.acquire()) {
      throw new VaultLeaseUnavailableError();
    }
    candidate.onLost(lock);
    lease.current = candidate;
    return candidate;
  }, [lock]);

  const isCurrentOperation = useCallback(
    (token: number, operationLease: VaultSessionLease) =>
      generation.current === token &&
      lease.current === operationLease &&
      operationLease.ownsLease(),
    [],
  );

  const create = useCallback(
    async (
      passphrase: string,
      currency: string,
      sample: boolean,
      sampleLocale: SampleDataLocale = 'en-US',
    ) => {
      const token = ++generation.current;
      setBusy(true);
      setError(undefined);
      let operationLease: VaultSessionLease | undefined;
      try {
        const currentIssue = detectVaultCapabilityIssue();
        setCapabilityIssue(currentIssue);
        if (currentIssue) {
          throw new VaultCapabilityError(currentIssue);
        }
        operationLease = acquireLease();
        let next = createEmptyVault(currency);
        if (sample) next = addSampleData(next, sampleLocale);
        const created = await createPersistedVault(next, passphrase);
        if (!isCurrentOperation(token, operationLease)) return;
        setVault(created.vault);
        setMaterial(created.material);
        setStatus('unlocked');
      } catch (caught) {
        operationLease?.release();
        if (lease.current === operationLease) lease.current = undefined;
        if (generation.current === token && !(caught instanceof VaultCapabilityError)) {
          setError(messageFrom(caught));
        }
        throw caught;
      } finally {
        if (generation.current === token) setBusy(false);
      }
    },
    [acquireLease, isCurrentOperation],
  );

  const unlock = useCallback(
    async (passphrase: string) => {
      const token = ++generation.current;
      setBusy(true);
      setError(undefined);
      let operationLease: VaultSessionLease | undefined;
      try {
        operationLease = acquireLease();
        const opened = await unlockVault(passphrase);
        if (!isCurrentOperation(token, operationLease)) return;
        setVault(opened.vault);
        setMaterial(opened.material);
        setStatus('unlocked');
      } catch (caught) {
        operationLease?.release();
        if (lease.current === operationLease) lease.current = undefined;
        if (generation.current === token) setError(messageFrom(caught));
        throw caught;
      } finally {
        if (generation.current === token) setBusy(false);
      }
    },
    [acquireLease, isCurrentOperation],
  );

  const mutate = useCallback(
    async (updater: (current: Vault) => Vault) => {
      if (!vault || !material) throw new Error('Unlock the vault before changing it.');
      if (mutationInFlight.current) {
        const conflict = new Error('Another vault change is still being saved.');
        setError(conflict.message);
        throw conflict;
      }
      const operationLease = lease.current;
      if (!operationLease?.ownsLease()) throw new Error('The writable vault session was lost.');
      mutationInFlight.current = true;
      const token = ++generation.current;
      setBusy(true);
      setError(undefined);
      try {
        const saved = await saveVault(updater(vault), material);
        if (!isCurrentOperation(token, operationLease)) return;
        setVault(saved);
      } catch (caught) {
        if (generation.current === token) setError(messageFrom(caught));
        throw caught;
      } finally {
        mutationInFlight.current = false;
        if (generation.current === token) setBusy(false);
      }
    },
    [isCurrentOperation, material, vault],
  );

  const changePassphrase = useCallback(
    async (currentPassphrase: string, newPassphrase: string) => {
      if (!vault || !material) throw new Error('Unlock the vault first.');
      const operationLease = lease.current;
      if (!operationLease?.ownsLease()) throw new Error('The writable vault session was lost.');
      const token = ++generation.current;
      setBusy(true);
      setError(undefined);
      try {
        const verified = await unlockVault(currentPassphrase);
        if (verified.vault.id !== vault.id || verified.vault.revision !== vault.revision) {
          throw new Error('The stored vault changed. Lock and unlock before trying again.');
        }
        const changed = await changeVaultPassphrase(vault, material, newPassphrase);
        if (!isCurrentOperation(token, operationLease)) return;
        setVault(changed.vault);
        setMaterial(changed.material);
      } catch (caught) {
        if (generation.current === token) setError(messageFrom(caught));
        throw caught;
      } finally {
        if (generation.current === token) setBusy(false);
      }
    },
    [isCurrentOperation, material, vault],
  );

  const deleteVault = useCallback(async () => {
    if (!vault || !material) throw new Error('Unlock the vault before deleting it.');
    const operationLease = lease.current;
    if (!operationLease?.ownsLease()) throw new Error('The writable vault session was lost.');
    const token = ++generation.current;
    setBusy(true);
    setError(undefined);
    try {
      await removeVault(vault, material);
      notifyVaultDeleted();
      if (!isCurrentOperation(token, operationLease)) return;
      operationLease.release();
      lease.current = undefined;
      lockedResetTarget.current = undefined;
      setVault(undefined);
      setMaterial(undefined);
      setError(undefined);
      setStatus('absent');
    } catch (caught) {
      if (generation.current === token) setError(messageFrom(caught));
      throw caught;
    } finally {
      if (generation.current === token) setBusy(false);
    }
  }, [isCurrentOperation, material, vault]);

  const prepareLockedVaultReset = useCallback(async (): Promise<boolean> => {
    setError(undefined);
    try {
      const target = await captureLockedVault();
      if (statusRef.current !== 'locked') return false;
      if (!target) {
        lockedResetTarget.current = undefined;
        setStatus('absent');
        return false;
      }
      lockedResetTarget.current = target;
      return true;
    } catch (caught) {
      setError('The locked vault could not be prepared for deletion.');
      throw caught;
    }
  }, []);

  const cancelLockedVaultReset = useCallback(() => {
    lockedResetTarget.current = undefined;
  }, []);

  const resetLockedVault = useCallback(async () => {
    const target = lockedResetTarget.current;
    if (statusRef.current !== 'locked' || !target) throw new LockedVaultChangedError();

    const token = ++generation.current;
    setBusy(true);
    setError(undefined);
    const deletionLease = new VaultSessionLease(false);

    try {
      if (!deletionLease.acquire()) throw new VaultLeaseUnavailableError();
      await removeLockedVault(target, () => deletionLease.ownsLease());
      notifyVaultDeleted();
      lockedResetTarget.current = undefined;
      if (
        generation.current !== token ||
        statusRef.current !== 'locked' ||
        !deletionLease.ownsLease()
      ) {
        return;
      }
      setVault(undefined);
      setMaterial(undefined);
      setError(undefined);
      setStatus('absent');
    } catch (caught) {
      if (caught instanceof LockedVaultChangedError) lockedResetTarget.current = undefined;
      if (caught instanceof LockedVaultLeaseLostError) lockedResetTarget.current = undefined;
      throw caught;
    } finally {
      deletionLease.release();
      if (generation.current === token) setBusy(false);
    }
  }, []);

  const replaceImportedVault = useCallback(
    async (imported: ImportedVault) => {
      const token = ++generation.current;
      setBusy(true);
      setError(undefined);
      let operationLease = lease.current;
      let acquiredForRestore = false;
      try {
        if (!operationLease?.ownsLease()) {
          operationLease = acquireLease();
          acquiredForRestore = true;
        }
        await replaceVaultEnvelope(imported.envelope);
        if (!isCurrentOperation(token, operationLease)) return;
        setVault(imported.vault);
        setMaterial(imported.material);
        setStatus('unlocked');
      } catch (caught) {
        if (acquiredForRestore) {
          operationLease?.release();
          if (lease.current === operationLease) lease.current = undefined;
        }
        if (generation.current === token) setError(messageFrom(caught));
        throw caught;
      } finally {
        if (generation.current === token) setBusy(false);
      }
    },
    [acquireLease, isCurrentOperation],
  );

  const retryCapabilities = useCallback(async () => {
    setBusy(true);
    setError(undefined);
    try {
      const currentIssue = detectVaultCapabilityIssue();
      setCapabilityIssue(currentIssue);
      if (currentIssue) return;
      try {
        setStatus((await hasVault()) ? 'locked' : 'absent');
      } catch {
        setCapabilityIssue('indexed-db');
        setStatus('absent');
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const clearError = useCallback(() => setError(undefined), []);
  const value = useMemo(
    () => ({
      status,
      ...(vault ? { vault } : {}),
      busy,
      ...(error ? { error } : {}),
      ...(capabilityIssue ? { capabilityIssue } : {}),
      create,
      unlock,
      lock,
      mutate,
      changePassphrase,
      deleteVault,
      retryCapabilities,
      prepareLockedVaultReset,
      cancelLockedVaultReset,
      resetLockedVault,
      replaceImportedVault,
      clearError,
    }),
    [
      busy,
      capabilityIssue,
      changePassphrase,
      cancelLockedVaultReset,
      clearError,
      create,
      deleteVault,
      error,
      lock,
      mutate,
      prepareLockedVaultReset,
      retryCapabilities,
      replaceImportedVault,
      resetLockedVault,
      status,
      unlock,
      vault,
    ],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const value = useContext(VaultContext);
  if (!value) throw new Error('useVault must be used inside VaultProvider.');
  return value;
}
