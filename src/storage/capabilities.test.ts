import { detectVaultCapabilityIssue, vaultCapabilityContract } from './capabilities';

describe('vault capability detection', () => {
  it('accepts the complete secure local platform', () => {
    expect(detectVaultCapabilityIssue()).toBeUndefined();
    expect(localStorage.getItem(vaultCapabilityContract.storageProbeKey)).toBeNull();
  });

  it('rejects an insecure context', () => {
    vi.stubGlobal('isSecureContext', false);
    expect(detectVaultCapabilityIssue()).toBe('insecure-context');
  });

  it('rejects missing Web Crypto primitives', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    expect(detectVaultCapabilityIssue()).toBe('web-crypto');
  });

  it('rejects missing IndexedDB', () => {
    vi.stubGlobal('indexedDB', undefined);
    expect(detectVaultCapabilityIssue()).toBe('indexed-db');
  });

  it('rejects security-restricted localStorage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Restricted for this context.', 'SecurityError');
    });
    expect(detectVaultCapabilityIssue()).toBe('local-storage');
  });

  it('blocks creation for unexpected localStorage failures', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Unexpected storage defect.');
    });
    expect(detectVaultCapabilityIssue()).toBe('local-storage');
  });

  it('cleans up the storage marker when the probe fails after writing it', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Restricted for this context.', 'SecurityError');
    });

    expect(detectVaultCapabilityIssue()).toBe('local-storage');
    getItem.mockRestore();
    expect(localStorage.getItem(vaultCapabilityContract.storageProbeKey)).toBeNull();
  });
});
