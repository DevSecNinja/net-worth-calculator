import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

test('built output has a base-aware manifest and generated revisioned service worker', async ({
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Static artifact assertions run once.');
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
});
