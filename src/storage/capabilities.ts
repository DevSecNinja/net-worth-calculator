export type VaultCapabilityIssue =
  'insecure-context' | 'web-crypto' | 'indexed-db' | 'local-storage';

const STORAGE_PROBE_KEY = 'nwc-capability-probe';

export function detectVaultCapabilityIssue(): VaultCapabilityIssue | undefined {
  if (globalThis.isSecureContext === false) return 'insecure-context';
  if (
    typeof globalThis.crypto?.getRandomValues !== 'function' ||
    typeof globalThis.crypto.subtle?.importKey !== 'function' ||
    typeof globalThis.crypto.subtle.deriveKey !== 'function' ||
    typeof globalThis.crypto.subtle.encrypt !== 'function' ||
    typeof globalThis.crypto.subtle.decrypt !== 'function'
  ) {
    return 'web-crypto';
  }
  if (typeof globalThis.indexedDB?.open !== 'function') return 'indexed-db';

  let available: boolean;
  try {
    localStorage.setItem(STORAGE_PROBE_KEY, '1');
    available = localStorage.getItem(STORAGE_PROBE_KEY) === '1';
  } catch {
    return 'local-storage';
  } finally {
    try {
      localStorage.removeItem(STORAGE_PROBE_KEY);
    } catch {
      available = false;
    }
  }
  return available ? undefined : 'local-storage';
}

export const vaultCapabilityContract = {
  storageProbeKey: STORAGE_PROBE_KEY,
} as const;
