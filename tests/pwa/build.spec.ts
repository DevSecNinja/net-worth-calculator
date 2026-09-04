import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

test('built output passes the release artifact contract and exposes exact build identity', async ({
  page,
}, workerInfo) => {
  test.skip(workerInfo.project.name !== 'chromium', 'Static artifact assertions run once.');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  execFileSync(process.execPath, ['scripts/verify-build.mjs'], {
    env: { ...process.env, EXPECTED_COMMIT_SHA: commit, VITE_RELEASE_BUILD: 'true' },
  });
  const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8')) as {
    id: string;
    start_url: string;
    scope: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };
  expect(manifest.id).toBe('/net-worth-calculator/');
  expect(manifest.start_url).toBe('/net-worth-calculator/');
  expect(manifest.scope).toBe('/net-worth-calculator/');
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ sizes: '192x192', purpose: 'maskable' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]),
  );
  const worker = await readFile('dist/sw.js', 'utf8');
  expect(worker).toContain('precacheAndRoute');
  expect(worker).not.toMatch(/indexedDB|net-worth-backup/);

  await page.goto('./');
  const sourceLink = page.getByRole('link', {
    name: new RegExp(`v0\\.1\\.0 \\(${commit.slice(0, 7)}\\)`),
  });
  await expect(sourceLink).toHaveAttribute(
    'href',
    `https://github.com/DevSecNinja/net-worth-calculator/commit/${commit}`,
  );
});
