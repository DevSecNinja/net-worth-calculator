import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { PASSPHRASE } from '../helpers/app';
import { startTestServer, type TestServer } from '../helpers/server';

const projectPorts = new Map([
  ['chromium', 4201],
  ['firefox', 4202],
  ['webkit', 4203],
  ['mobile-chromium', 4204],
  ['mobile-webkit', 4205],
]);
const versionN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const versionN1 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function buildVersion(sha: string, output: string) {
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('npm_execpath is required for the update build test.');
  execFileSync(
    process.execPath,
    [npmCli, 'run', 'build', '--', '--outDir', output, '--emptyOutDir'],
    {
      env: { ...process.env, VITE_COMMIT_SHA: sha },
      stdio: 'pipe',
    },
  );
}

test('performs a real explicit N to N+1 update without losing persisted or dirty state', async ({
  context,
  page,
}, workerInfo) => {
  test.setTimeout(240_000);
  const port = projectPorts.get(workerInfo.project.name);
  if (!port) throw new Error(`No update port configured for ${workerInfo.project.name}.`);
  const suffix = workerInfo.project.name.replaceAll(/[^a-z0-9]+/gi, '-');
  const firstDirectory = resolve(`test-results/pwa-${suffix}-version-n`);
  const secondDirectory = resolve(`test-results/pwa-${suffix}-version-n1`);
  buildVersion(versionN, firstDirectory);
  buildVersion(versionN1, secondDirectory);

  let server: TestServer | undefined = await startTestServer(firstDirectory, port);
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
    await expect(page.getByRole('heading', { name: 'Persisted update marker' })).toBeVisible();
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
    await page.getByRole('button', { name: /unlock vault/i }).click();
    await page.getByRole('link', { name: /^assets$/i }).click();
    await page.getByRole('button', { name: /edit/i }).click();
    await page.getByLabel(/asset name/i).fill('Unsaved update draft');
    const cleanPage = await context.newPage();
    await cleanPage.goto(`${base}#/about`);
    await cleanPage.evaluate(async () => navigator.serviceWorker.ready);

    const cacheBefore = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        urls.push(...(await (await caches.open(name)).keys()).map((request) => request.url));
      }
      return urls;
    });
    await expect(page.getByText(/v0.1.0 \(aaaaaaa\)/i)).toBeVisible();

    await server.stop();
    server = await startTestServer(secondDirectory, port);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });
    const updatePrompt = page.getByRole('status').filter({ hasText: /new version is available/i });
    await expect(updatePrompt).toBeVisible({ timeout: 45_000 });
    const cleanUpdatePrompt = cleanPage
      .getByRole('status')
      .filter({ hasText: /new version is available/i });
    await expect(cleanUpdatePrompt).toBeVisible({ timeout: 45_000 });
    await expect(updatePrompt).toHaveAttribute('role', 'status');
    await expect(page.getByText(/v0.1.0 \(aaaaaaa\)/i)).toBeVisible();

    await cleanPage.getByRole('button', { name: /update now/i }).click();
    await expect(cleanPage.getByRole('dialog', { name: /unsaved edits/i })).toContainText(
      'Unsaved edits in another tab',
    );
    await cleanPage.getByRole('button', { name: /keep editing/i }).click();
    await expect(page.getByText(/v0.1.0 \(aaaaaaa\)/i)).toBeVisible();
    await cleanPage.close();

    await expect(page.getByLabel(/asset name/i)).toHaveValue('Unsaved update draft');
    await page.getByRole('button', { name: /save asset/i }).click();
    await expect(page.getByRole('heading', { name: 'Unsaved update draft' })).toBeVisible();

    await page.getByRole('button', { name: /update now/i }).click();

    await expect(page.getByText(/v0.1.0 \(bbbbbbb\)/i)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await page.getByLabel(/^passphrase$/i).fill(PASSPHRASE);
    await page.getByRole('button', { name: /unlock vault/i }).click();
    await page.getByRole('link', { name: /^assets$/i }).click();
    await expect(page.getByRole('heading', { name: 'Unsaved update draft' })).toBeVisible();
    await expect(page.getByText(/\$9,999\.00/)).toBeVisible();

    await expect
      .poll(async () => {
        const cacheAfter = await page.evaluate(async () => {
          const urls: string[] = [];
          for (const name of await caches.keys()) {
            urls.push(...(await (await caches.open(name)).keys()).map((request) => request.url));
          }
          return urls;
        });
        const removedOldAssets = cacheBefore.filter(
          (url) => /\/assets\/.+-[\w-]{8,}\.(?:css|js)$/.test(url) && !cacheAfter.includes(url),
        );
        return {
          removed: removedOldAssets.length,
          hasNewBuild: cacheAfter.some(
            (url) => /\/assets\/index-[\w-]{8,}\.js$/.test(url) && !cacheBefore.includes(url),
          ),
        };
      })
      .toEqual({ removed: expect.any(Number), hasNewBuild: true });

    const finalCacheAudit = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        urls.push(...(await (await caches.open(name)).keys()).map((request) => request.url));
      }
      return urls;
    });
    expect(
      cacheBefore.some(
        (url) => /\/assets\/.+-[\w-]{8,}\.(?:css|js)$/.test(url) && !finalCacheAudit.includes(url),
      ),
    ).toBe(true);
  } finally {
    await server?.stop();
  }
});
