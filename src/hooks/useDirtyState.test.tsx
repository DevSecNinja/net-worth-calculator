import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DirtyStateProvider, useDirtyState } from './useDirtyState';

class MockBroadcastChannel {
  static readonly instances = new Map<string, Set<MockBroadcastChannel>>();
  readonly name: string;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    const peers = MockBroadcastChannel.instances.get(name) ?? new Set();
    peers.add(this);
    MockBroadcastChannel.instances.set(name, peers);
  }

  postMessage(message: unknown) {
    for (const peer of MockBroadcastChannel.instances.get(this.name) ?? []) {
      if (peer === this) continue;
      queueMicrotask(() => peer.onmessage?.({ data: message } as MessageEvent<unknown>));
    }
  }

  close() {
    MockBroadcastChannel.instances.get(this.name)?.delete(this);
  }
}

function Probe({ name }: { name: string }) {
  const { setDirty, collectDirtyNames } = useDirtyState();
  const [result, setResult] = useState('');
  return (
    <section aria-label={name}>
      <button type="button" onClick={() => setDirty('Asset editor', true)}>
        Mark {name} dirty
      </button>
      <button
        type="button"
        onClick={() => void collectDirtyNames().then((names) => setResult(names.join(', ')))}
      >
        Check {name}
      </button>
      <output>{result}</output>
    </section>
  );
}

describe('DirtyStateProvider', () => {
  it('discovers unsaved edits in another tab before update approval', async () => {
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
    const user = userEvent.setup();
    render(
      <>
        <DirtyStateProvider>
          <Probe name="first tab" />
        </DirtyStateProvider>
        <DirtyStateProvider>
          <Probe name="second tab" />
        </DirtyStateProvider>
      </>,
    );
    await user.click(screen.getByRole('button', { name: /mark first tab dirty/i }));
    await user.click(screen.getByRole('button', { name: /check second tab/i }));
    expect(
      await screen.findByText('Unsaved edits in another tab', { selector: 'output' }),
    ).toBeVisible();
  });
});
