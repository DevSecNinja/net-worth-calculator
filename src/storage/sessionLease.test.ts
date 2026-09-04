import { VaultSessionLease } from './sessionLease';

describe('VaultSessionLease', () => {
  it('allows only one active writer and permits takeover after release', () => {
    const first = new VaultSessionLease();
    const second = new VaultSessionLease();
    expect(first.acquire()).toBe(true);
    expect(second.acquire()).toBe(false);
    first.release();
    expect(second.acquire()).toBe(true);
    second.release();
  });

  it('notifies a writer when ownership is lost', () => {
    vi.useFakeTimers();
    const first = new VaultSessionLease();
    expect(first.acquire()).toBe(true);
    const lost = vi.fn();
    first.onLost(lost);
    localStorage.setItem(
      'nwc-vault-lease',
      JSON.stringify({ owner: 'different-tab', expiresAt: Date.now() + 20_000 }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: 'nwc-vault-lease' }));
    expect(lost).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('does not let a resumed expired tab steal a replacement lease', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const suspended = new VaultSessionLease();
    const lost = vi.fn();
    suspended.onLost(lost);
    expect(suspended.acquire()).toBe(true);

    vi.setSystemTime(new Date('2026-01-01T00:00:13Z'));
    const replacement = new VaultSessionLease();
    expect(replacement.acquire()).toBe(true);
    expect(replacement.ownsLease()).toBe(true);

    vi.advanceTimersByTime(4_000);
    expect(lost).toHaveBeenCalledOnce();
    expect(suspended.ownsLease()).toBe(false);
    expect(replacement.ownsLease()).toBe(true);
    replacement.release();
    vi.useRealTimers();
  });

  it('releases synchronously on pagehide so reload can immediately reacquire', () => {
    const current = new VaultSessionLease();
    expect(current.acquire()).toBe(true);
    window.dispatchEvent(new PageTransitionEvent('pagehide'));
    expect(current.ownsLease()).toBe(false);

    const reloaded = new VaultSessionLease();
    expect(reloaded.acquire()).toBe(true);
    reloaded.release();
  });

  it('broadcasts an owned lease release before closing the channel', () => {
    const events: string[] = [];
    class TestBroadcastChannel {
      onmessage: (() => void) | null = null;

      postMessage(message: string) {
        events.push(`post:${message}`);
      }

      close() {
        events.push('close');
      }
    }
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel);
    const lease = new VaultSessionLease();

    expect(lease.acquire()).toBe(true);
    lease.release();

    expect(events).toEqual(['post:lease-changed', 'close']);
  });
});
