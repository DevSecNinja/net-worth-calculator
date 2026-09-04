import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolvePreviewBase } from './serve-dist.mjs';

const directories = [];

function builtDirectory(startUrl) {
  const directory = mkdtempSync(join(tmpdir(), 'nwc-preview-'));
  directories.push(directory);
  writeFileSync(join(directory, 'manifest.webmanifest'), JSON.stringify({ start_url: startUrl }));
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('resolvePreviewBase', () => {
  it('derives Pages and root hosting paths from the built manifest', () => {
    expect(resolvePreviewBase(builtDirectory('/net-worth-calculator/'))).toBe(
      '/net-worth-calculator/',
    );
    expect(resolvePreviewBase(builtDirectory('/'))).toBe('/');
  });

  it('uses and normalizes an explicit base override', () => {
    expect(resolvePreviewBase(builtDirectory('/ignored/'), '/preview')).toBe('/preview/');
  });

  it('rejects a remote base URL', () => {
    expect(() => resolvePreviewBase(builtDirectory('/'), 'https://example.com/')).toThrow(
      /root-relative path/i,
    );
  });
});
