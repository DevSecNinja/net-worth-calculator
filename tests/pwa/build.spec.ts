import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { buildIdentity, buildLabel } from '../helpers/packageMetadata';

test('built output passes the release artifact contract and exposes exact build identity', async ({
  page,
}, workerInfo) => {
  test.skip(workerInfo.project.name !== 'chromium', 'Static artifact assertions run once.');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const verification = execFileSync(process.execPath, ['scripts/verify-build.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, EXPECTED_COMMIT_SHA: commit, VITE_RELEASE_BUILD: 'true' },
  });
  expect(verification).toContain(`${buildIdentity(commit)}.`);
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
  expect(worker).not.toMatch(/assets\/DashboardPage-[^"]+\.js/);
  const routes = await readFile('src/app/routes.tsx', 'utf8');
  expect(routes).toMatch(
    /import\s+\{\s*DashboardPage\s*\}\s+from\s+['"]@\/features\/dashboard\/DashboardPage['"]/,
  );
  expect(routes).not.toMatch(/import\([^)]*DashboardPage[^)]*\)/s);
  const document = await readFile('dist/index.html', 'utf8');
  expect(document).toMatch(/<meta name="mobile-web-app-capable" content="yes"\s*\/?>/);
  expect(document).toMatch(/<meta name="apple-mobile-web-app-capable" content="yes"\s*\/?>/);

  await page.goto('./');
  const sourceLink = page.getByRole('link', {
    name: buildLabel(commit),
  });
  await expect(sourceLink).toHaveText(buildLabel(commit));
  await expect(sourceLink).toHaveAttribute(
    'href',
    `https://github.com/DevSecNinja/net-worth-calculator/commit/${commit}`,
  );
});
