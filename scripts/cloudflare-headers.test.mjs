import { describe, expect, it } from 'vitest';

import { parseCloudflareHeaders, requireCloudflareHeader } from './cloudflare-headers.mjs';

describe('Cloudflare Pages header parsing', () => {
  it('keeps cache policies scoped to their declared path blocks', () => {
    const blocks = parseCloudflareHeaders(`
/*
  X-Content-Type-Options: nosniff

/
  Cache-Control: no-cache, no-store, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`);

    expect(() =>
      requireCloudflareHeader(blocks, '/', 'Cache-Control', 'no-cache, no-store, must-revalidate'),
    ).not.toThrow();
    expect(() =>
      requireCloudflareHeader(
        blocks,
        '/assets/*',
        'Cache-Control',
        'public, max-age=31536000, immutable',
      ),
    ).not.toThrow();
    expect(() =>
      requireCloudflareHeader(
        blocks,
        '/sw.js',
        'Cache-Control',
        'no-cache, no-store, must-revalidate',
      ),
    ).toThrow('/sw.js must set Cache-Control');
  });

  it('rejects malformed and duplicate path blocks', () => {
    expect(() => parseCloudflareHeaders('  Cache-Control: no-cache')).toThrow(
      'header appears before a path',
    );
    expect(() => parseCloudflareHeaders('/\n  Cache-Control no-cache')).toThrow(
      'Invalid Cloudflare header line',
    );
    expect(() => parseCloudflareHeaders('/\n  A: one\n/\n  A: two')).toThrow(
      'Duplicate Cloudflare header path',
    );
  });

  it('requires an exact CSP value instead of accepting extra scheme sources', () => {
    const blocks = parseCloudflareHeaders(`
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https:
`);
    expect(() =>
      requireCloudflareHeader(
        blocks,
        '/*',
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'",
      ),
    ).toThrow('/* must set Content-Security-Policy');
  });
});
