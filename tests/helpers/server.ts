import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';

export type TestServer = {
  origin: string;
  stop: () => Promise<void>;
};

async function waitUntilReady(url: string): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  await new Promise<void>((resolveStop, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out stopping test server.')), 10_000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolveStop();
    });
    child.kill('SIGTERM');
  });
}

export async function startTestServer(directory: string, port: number): Promise<TestServer> {
  const script = resolve('scripts/serve-dist.mjs');
  const child = spawn(
    process.execPath,
    [script, '--dir', resolve(directory), '--port', String(port)],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  const origin = `http://127.0.0.1:${port}`;
  await waitUntilReady(`${origin}/net-worth-calculator/`);
  return { origin, stop: () => stopChild(child) };
}
