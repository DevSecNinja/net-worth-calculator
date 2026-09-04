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
});
