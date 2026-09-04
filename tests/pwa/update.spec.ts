import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { PASSPHRASE } from '../helpers/app';
import { startTestServer, type TestServer } from '../helpers/server';

function buildVersion(sha: string, output: string) {
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('npm_execpath is required for the update build test.');
  execFileSync(process.execPath, [npmCli, 'run', 'build', '--', '--outDir', output], {
    env: { ...process.env, VITE_COMMIT_SHA: sha },
    stdio: 'pipe',
  });
}

test('prompts across N to N+1, resolves dirty state, preserves vault, and cleans old precache', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Service worker lifecycle test runs once in Chromium.');
  test.setTimeout(180_000);
  const firstDirectory = resolve('test-results/pwa-version-n');
  const secondDirectory = resolve('test-results/pwa-version-n1');
  buildVersion('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', firstDirectory);
  buildVersion('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', secondDirectory);

  let server: TestServer | undefined = await startTestServer(firstDirectory, 4192);
  const base = `${server.origin}/net-worth-calculator/`;
  try {
    await page.goto(base);
    await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
    await page.getByLabel(/confirm passphrase/i).fill(PASSPHRASE);
    await page.getByRole('button', { name: /create empty vault/i }).click();
    await page.getByRole('link', { name: /^assets$/i }).click();
    await page.getByRole('button', { name: /add your first asset/i }).click();
    await page.getByLabel(/asset name/i).fill('Persisted update marker');
    await page.getByLabel(/^amount$/i).fill('9999');
    await page.getByRole('button', { name: /save asset/i }).click();
    await page.getByRole('button', { name: /add asset/i }).click();
    await page.getByLabel(/asset name/i).fill('Unsaved update draft');
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
    await page.getByRole('button', { name: /unlock vault/i }).click();
    await page.getByRole('link', { name: /^assets$/i }).click();
    await page.getByRole('button', { name: /add asset/i }).click();
    await page.getByLabel(/asset name/i).fill('Unsaved update draft');
    const cacheBefore = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        urls.push(...(await (await caches.open(name)).keys()).map((request) => request.url));
      }
      return urls;
    });
    await expect(page.getByText(/v0.1.0 \(aaaaaaa\)/i)).toBeVisible();

    await server.stop();
    server = await startTestServer(secondDirectory, 4192);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });
    await expect(page.getByText(/new version is available/i)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /later/i }).click();
    await expect(page.getByText(/v0.1.0 \(aaaaaaa\)/i)).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
    await expect(page.getByText(/new version is available/i)).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /update now/i }).click();
    await expect(page.getByRole('dialog', { name: /unsaved edits/i })).toContainText(
      'Asset editor',
    );
    await page.getByRole('button', { name: /keep editing/i }).click();
    await expect(page.getByLabel(/asset name/i)).toHaveValue('Unsaved update draft');
    await page.getByRole('button', { name: /update now/i }).click();
    await page.getByRole('button', { name: /discard drafts and update/i }).click();

    await expect(page.getByText(/v0.1.0 \(bbbbbbb\)/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
    await page.getByRole('button', { name: /unlock vault/i }).click();
    await page.getByRole('link', { name: /^assets$/i }).click();
    await expect(page.getByRole('heading', { name: 'Persisted update marker' })).toBeVisible();

    await expect
      .poll(async () => {
        const cacheAfter = await page.evaluate(async () => {
          const urls: string[] = [];
          for (const name of await caches.keys()) {
            urls.push(...(await (await caches.open(name)).keys()).map((request) => request.url));
          }
          return urls;
        });
        return cacheBefore.some((url) => !cacheAfter.includes(url));
      })
      .toBe(true);
  } finally {
    await server?.stop();
  }
});
