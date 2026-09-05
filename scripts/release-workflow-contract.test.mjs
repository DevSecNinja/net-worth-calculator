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

function yamlBlock(source, key, indentation) {
  const lines = source.split('\n');
  const blockHeader = `${' '.repeat(indentation)}${key}:`;
  const start = lines.indexOf(blockHeader);

  if (start === -1) {
    throw new Error(`Missing YAML block: ${key}`);
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && line.length - line.trimStart().length <= indentation) {
      end = index;
      break;
    }
  }

  return lines.slice(start + 1, end).join('\n');
}

const releaseJob = yamlBlock(releaseWorkflow, 'release-please', 2);
const releaseInputs = yamlBlock(releaseJob, 'with', 4);
const releaseSecrets = yamlBlock(releaseJob, 'secrets', 4);

describe('Release Please consumer contract', () => {
  it('pins central v3 and passes mandatory App credentials', () => {
    expect(releaseJob).toMatch(
      /^ {4}uses:\s*DevSecNinja\/\.github\/\.github\/workflows\/release-please\.yml@c61e8107b080f72e25bfc41d3eef947dbfa66446 # v3\.0\.0\s*$/m,
    );
    expect(releaseInputs).toMatch(
      /^ {6}app-id:\s*\$\{\{\s*vars\.RELEASE_PLEASE_APP_ID\s*\}\}\s*$/m,
    );
    expect(releaseSecrets).toMatch(
      /^ {6}app-private-key:\s*\$\{\{\s*secrets\.RELEASE_PLEASE_APP_PRIVATE_KEY\s*\}\}\s*$/m,
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
    expect(releaseJob).toMatch(/^ {6}contents:\s*write(?:\s+#.*)?$/m);
    expect(releaseJob).toMatch(/^ {6}pull-requests:\s*write(?:\s+#.*)?$/m);
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
