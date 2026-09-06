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

  try {
    localStorage.setItem(STORAGE_PROBE_KEY, '1');
    const available = localStorage.getItem(STORAGE_PROBE_KEY) === '1';
    localStorage.removeItem(STORAGE_PROBE_KEY);
    return available ? undefined : 'local-storage';
  } catch {
    return 'local-storage';
  }
}

export const vaultCapabilityContract = {
  storageProbeKey: STORAGE_PROBE_KEY,
} as const;
