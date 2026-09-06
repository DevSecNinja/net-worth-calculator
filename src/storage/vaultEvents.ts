const CHANNEL_NAME = 'nwc-vault-events';
const STORAGE_KEY = 'nwc-vault-event';
const VAULT_DELETED = 'vault-deleted';

type VaultEvent = typeof VAULT_DELETED;

export function notifyVaultDeleted(): void {
  if ('BroadcastChannel' in globalThis) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(VAULT_DELETED satisfies VaultEvent);
    channel.close();
  }

  try {
    localStorage.setItem(STORAGE_KEY, VAULT_DELETED);
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    if (
      !(error instanceof DOMException) ||
      !['QuotaExceededError', 'SecurityError'].includes(error.name)
    ) {
      throw error;
    }
  }
}

export function subscribeToVaultDeleted(listener: () => void): () => void {
  const channel = 'BroadcastChannel' in globalThis ? new BroadcastChannel(CHANNEL_NAME) : undefined;
  if (channel) {
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data === VAULT_DELETED) listener();
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue === VAULT_DELETED) listener();
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('storage', handleStorage);
    channel?.close();
  };
}

export const vaultEventsContract = {
  channelName: CHANNEL_NAME,
  storageKey: STORAGE_KEY,
  deletedEvent: VAULT_DELETED,
} as const;
