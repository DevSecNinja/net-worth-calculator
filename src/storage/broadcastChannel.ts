const unavailableChannelErrors = new Set(['NotSupportedError', 'SecurityError']);

export function openOptionalBroadcastChannel(name: string): BroadcastChannel | undefined {
  if (typeof globalThis.BroadcastChannel !== 'function') return undefined;

  try {
    return new BroadcastChannel(name);
  } catch (error) {
    if (error instanceof DOMException && unavailableChannelErrors.has(error.name)) return undefined;
    throw error;
  }
}
