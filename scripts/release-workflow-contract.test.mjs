import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '..');
const releaseWorkflowPath = resolve(repositoryRoot, '.github/workflows/release-please.yml');
const tagPublisherPath = resolve(repositoryRoot, '.github/workflows/release.yml');

const releaseWorkflow = readFileSync(releaseWorkflowPath, 'utf8').replace(/\r\n?/g, '\n');
const releaseConfig = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'release-please-config.json'), 'utf8'),
);
const releaseManifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, '.release-please-manifest.json'), 'utf8'),
);
const packageMetadata = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'));

describe('Release Please consumer contract', () => {
  it('pins central v3 and passes mandatory App credentials', () => {
    expect(releaseWorkflow).toContain(
      'DevSecNinja/.github/.github/workflows/release-please.yml@c61e8107b080f72e25bfc41d3eef947dbfa66446 # v3.0.0',
    );
    expect(releaseWorkflow).toContain('app-id: ${{ vars.RELEASE_PLEASE_APP_ID }}');
    expect(releaseWorkflow).toContain(
      'app-private-key: ${{ secrets.RELEASE_PLEASE_APP_PRIVATE_KEY }}',
    );
  });

  it('delegates credential validation to the central workflow', () => {
    expect(releaseWorkflow).not.toMatch(/^\s{2}release-auth:/m);
    expect(releaseWorkflow).not.toContain('needs: release-auth');
    expect(releaseWorkflow).not.toContain('Require Release Please GitHub App credentials');
  });

  it('preserves least privilege and serialized release runs', () => {
    expect(releaseWorkflow).toMatch(/^permissions:\s*\n\s+contents:\s*read\s*$/m);
    expect(releaseWorkflow).toMatch(
      /^concurrency:\s*\n\s+group:\s*release-please\s*\n\s+cancel-in-progress:\s*false\s*$/m,
    );
    expect(releaseWorkflow).toContain('      contents: write');
    expect(releaseWorkflow).toContain('      pull-requests: write');
    expect(releaseWorkflow).not.toContain('issues: write');
  });

  it('publishes directly without a competing tag workflow', () => {
    expect(releaseConfig['skip-github-release']).toBe(false);
    expect(existsSync(tagPublisherPath)).toBe(false);
  });

  it('preserves the currently released version', () => {
    expect(packageMetadata.version).toBe('0.1.0');
    expect(releaseManifest['.']).toBe('0.1.0');
  });
});
