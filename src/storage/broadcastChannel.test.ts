import { openOptionalBroadcastChannel } from './broadcastChannel';

describe('openOptionalBroadcastChannel', () => {
  it('returns undefined when the API is absent', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    expect(openOptionalBroadcastChannel('test-channel')).toBeUndefined();
  });

  it('returns undefined when channel construction is security restricted', () => {
    vi.stubGlobal(
      'BroadcastChannel',
      class RestrictedBroadcastChannel {
        constructor() {
          throw new DOMException('Restricted for this context.', 'SecurityError');
        }
      },
    );
    expect(openOptionalBroadcastChannel('test-channel')).toBeUndefined();
  });

  it('does not hide unexpected constructor failures', () => {
    vi.stubGlobal(
      'BroadcastChannel',
      class BrokenBroadcastChannel {
        constructor() {
          throw new Error('Unexpected channel defect.');
        }
      },
    );
    expect(() => openOptionalBroadcastChannel('test-channel')).toThrow(
      'Unexpected channel defect.',
    );
  });
});
