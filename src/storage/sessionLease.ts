const LEASE_KEY = 'nwc-vault-lease';
const CHANNEL_NAME = 'nwc-vault-session';
const LEASE_DURATION_MS = 12_000;
const HEARTBEAT_MS = 4_000;

type LeaseRecord = {
  owner: string;
  expiresAt: number;
};

function parseLease(value: string | null): LeaseRecord | undefined {
  if (!value) return undefined;
  try {
    const candidate = JSON.parse(value) as unknown;
    if (
      typeof candidate === 'object' &&
      candidate !== null &&
      'owner' in candidate &&
      'expiresAt' in candidate &&
      typeof candidate.owner === 'string' &&
      typeof candidate.expiresAt === 'number'
    ) {
      return { owner: candidate.owner, expiresAt: candidate.expiresAt };
    }
  } catch {
    localStorage.removeItem(LEASE_KEY);
  }
  return undefined;
}

export class VaultSessionLease {
  readonly owner = crypto.randomUUID();
  private readonly releaseOnPageHide: boolean;
  private heartbeat: number | undefined;
  private channel: BroadcastChannel | undefined;
  private listeners = new Set<() => void>();

  constructor(releaseOnPageHide = true) {
    this.releaseOnPageHide = releaseOnPageHide;
  }

  acquire(): boolean {
    const current = parseLease(localStorage.getItem(LEASE_KEY));
    if (current && current.owner !== this.owner && current.expiresAt > Date.now()) return false;
    this.writeLease();
    const acquired = parseLease(localStorage.getItem(LEASE_KEY))?.owner === this.owner;
    if (acquired) {
      this.heartbeat = window.setInterval(() => {
        if (!this.renewLease()) this.loseOwnership();
      }, HEARTBEAT_MS);
      if ('BroadcastChannel' in globalThis) {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = () => this.checkOwnership();
      }
      window.addEventListener('storage', this.handleStorage);
      if (this.releaseOnPageHide) window.addEventListener('pagehide', this.handlePageHide);
    }
    return acquired;
  }

  release(): void {
    if (this.heartbeat !== undefined) window.clearInterval(this.heartbeat);
    this.heartbeat = undefined;
    window.removeEventListener('storage', this.handleStorage);
    if (this.releaseOnPageHide) window.removeEventListener('pagehide', this.handlePageHide);
    if (parseLease(localStorage.getItem(LEASE_KEY))?.owner === this.owner) {
      localStorage.removeItem(LEASE_KEY);
      this.notifyPeers();
    }
    this.channel?.close();
    this.channel = undefined;
  }

  onLost(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  ownsLease(): boolean {
    return parseLease(localStorage.getItem(LEASE_KEY))?.owner === this.owner;
  }

  private readonly handleStorage = (event: StorageEvent) => {
    if (event.key === LEASE_KEY) this.checkOwnership();
  };

  private readonly handlePageHide = () => {
    this.release();
  };

  private writeLease(): void {
    localStorage.setItem(
      LEASE_KEY,
      JSON.stringify({ owner: this.owner, expiresAt: Date.now() + LEASE_DURATION_MS }),
    );
    this.notifyPeers();
  }

  private renewLease(): boolean {
    if (!this.ownsLease()) return false;
    this.writeLease();
    return this.ownsLease();
  }

  private notifyPeers(): void {
    this.channel?.postMessage('lease-changed');
  }

  private checkOwnership(): void {
    if (!this.ownsLease()) this.loseOwnership();
  }

  private loseOwnership(): void {
    this.release();
    for (const listener of this.listeners) listener();
  }
}

export const sessionLeaseContract = {
  key: LEASE_KEY,
  durationMs: LEASE_DURATION_MS,
  heartbeatMs: HEARTBEAT_MS,
} as const;
