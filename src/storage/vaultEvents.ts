import { openOptionalBroadcastChannel } from './broadcastChannel';
import { createId } from '@/domain/model';

const CHANNEL_NAME = 'nwc-vault-events';
const STORAGE_KEY = 'nwc-vault-event';
const VAULT_DELETED = 'vault-deleted';
const VAULT_CHANGED = 'vault-changed';

type VaultEvent = typeof VAULT_DELETED | typeof VAULT_CHANGED;
type VaultEventMessage = { event: VaultEvent; source: string };
const EVENT_SOURCE = createId();

function parseEventMessage(value: unknown): VaultEventMessage | undefined {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return undefined;
    }
  }
  if (!parsed || typeof parsed !== 'object') return undefined;
  const event = 'event' in parsed ? parsed.event : undefined;
  const source = 'source' in parsed ? parsed.source : undefined;
  if (
    (event !== VAULT_DELETED && event !== VAULT_CHANGED) ||
    typeof source !== 'string' ||
    !source
  ) {
    return undefined;
  }
  return { event, source };
}

function notifyVaultEvent(event: VaultEvent): void {
  const message = { event, source: EVENT_SOURCE } satisfies VaultEventMessage;
  const channel = openOptionalBroadcastChannel(CHANNEL_NAME);
  if (channel) {
    channel.postMessage(message);
    channel.close();
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
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

function subscribeToVaultEvent(expected: VaultEvent, listener: () => void): () => void {
  const channel = openOptionalBroadcastChannel(CHANNEL_NAME);
  if (channel) {
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const message = parseEventMessage(event.data);
      if (message?.event === expected && message.source !== EVENT_SOURCE) listener();
    };
  }

  const handleStorage = (event: StorageEvent) => {
    const message = parseEventMessage(event.newValue);
    if (
      event.key === STORAGE_KEY &&
      message?.event === expected &&
      message.source !== EVENT_SOURCE
    ) {
      listener();
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('storage', handleStorage);
    channel?.close();
  };
}

export function notifyVaultDeleted(): void {
  notifyVaultEvent(VAULT_DELETED);
}

export function notifyVaultChanged(): void {
  notifyVaultEvent(VAULT_CHANGED);
}

export function subscribeToVaultDeleted(listener: () => void): () => void {
  return subscribeToVaultEvent(VAULT_DELETED, listener);
}

export function subscribeToVaultChanged(listener: () => void): () => void {
  return subscribeToVaultEvent(VAULT_CHANGED, listener);
}

export const vaultEventsContract = {
  channelName: CHANNEL_NAME,
  storageKey: STORAGE_KEY,
  deletedEvent: VAULT_DELETED,
  changedEvent: VAULT_CHANGED,
  eventSource: EVENT_SOURCE,
} as const;
