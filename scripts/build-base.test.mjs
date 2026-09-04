import { describe, expect, it } from 'vitest';

import { normalizeBasePath, resolveExpectedBasePath } from './build-base.mjs';

describe('build base resolution', () => {
  it('prefers the explicit expected base and normalizes its trailing slash', () => {
    expect(
      resolveExpectedBasePath({
        EXPECTED_BASE_PATH: '/preview',
        VITE_BASE_PATH: '/ignored/',
      }),
    ).toBe('/preview/');
  });

  it('falls back through the Vite base to the project-site default', () => {
    expect(resolveExpectedBasePath({ VITE_BASE_PATH: '/' })).toBe('/');
    expect(resolveExpectedBasePath({})).toBe('/net-worth-calculator/');
  });

  it.each([
    '',
    'relative/path',
    '//example.com/path',
    'https://example.com/path',
    '/path?query=value',
    '/path#fragment',
    '/path\\child',
    '/path/../escape',
    '/path/%2e%2e/escape',
  ])('rejects unsafe or external base %j', (base) => {
    expect(() => normalizeBasePath(base)).toThrow(/base path/i);
  });
});
