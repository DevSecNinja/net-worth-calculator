import { notifyVaultDeleted, subscribeToVaultDeleted, vaultEventsContract } from './vaultEvents';

describe('vault deletion events', () => {
  it('publishes only a constant data-free event and removes the storage pulse', () => {
    const posted: unknown[] = [];
    const close = vi.fn();
    class TestBroadcastChannel {
      onmessage: ((event: MessageEvent<unknown>) => void) | null = null;

      postMessage(message: unknown) {
        posted.push(message);
      }

      close() {
        close();
      }
    }
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel);

    notifyVaultDeleted();

    expect(posted).toEqual([vaultEventsContract.deletedEvent]);
    expect(close).toHaveBeenCalledOnce();
    expect(localStorage.getItem(vaultEventsContract.storageKey)).toBeNull();
  });

  it('subscribes to broadcast and storage deletion signals and cleans up', () => {
    const channels: TestBroadcastChannel[] = [];
    class TestBroadcastChannel {
      onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
      close = vi.fn();

      constructor() {
        channels.push(this);
      }

      postMessage() {}
    }
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel);
    const listener = vi.fn();
    const unsubscribe = subscribeToVaultDeleted(listener);
    const channel = channels[0];

    channel?.onmessage?.(new MessageEvent('message', { data: vaultEventsContract.deletedEvent }));
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: vaultEventsContract.storageKey,
        newValue: vaultEventsContract.deletedEvent,
      }),
    );
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    expect(channel?.close).toHaveBeenCalledOnce();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: vaultEventsContract.storageKey,
        newValue: vaultEventsContract.deletedEvent,
      }),
    );
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('uses the storage signal when BroadcastChannel is security restricted', () => {
    vi.stubGlobal(
      'BroadcastChannel',
      class RestrictedBroadcastChannel {
        constructor() {
          throw new DOMException('Restricted for this context.', 'SecurityError');
        }
      },
    );
    const listener = vi.fn();
    const unsubscribe = subscribeToVaultDeleted(listener);

    expect(() => notifyVaultDeleted()).not.toThrow();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: vaultEventsContract.storageKey,
        newValue: vaultEventsContract.deletedEvent,
      }),
    );
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });
});
