import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '..');
const workflow = readFileSync(
  resolve(repositoryRoot, '.github/workflows/pages.yml'),
  'utf8',
).replace(/\r\n?/g, '\n');
const packageMetadata = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'));

function yamlBlock(source, key, indentation) {
  const lines = source.split('\n');
  const blockHeader = `${' '.repeat(indentation)}${key}:`;
  const start = lines.indexOf(blockHeader);
  if (start === -1) throw new Error(`Missing YAML block: ${key}`);

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

const triggers = yamlBlock(workflow, 'on', 0);
const buildJob = yamlBlock(workflow, 'build', 2);
const pagesJob = yamlBlock(workflow, 'pages', 2);
const pagesInputs = yamlBlock(pagesJob, 'with', 4);
const pagesSecrets = yamlBlock(pagesJob, 'secrets', 4);

describe('Pages deployment workflow contract', () => {
  it('keeps main production deploys and same-repository PR preview lifecycle events', () => {
    expect(triggers).toMatch(/^ {2}push:\s*\n {4}branches:\s*\n {6}- main$/m);
    for (const eventType of ['opened', 'synchronize', 'reopened', 'closed']) {
      expect(triggers).toMatch(new RegExp(`^ {6}- ${eventType}$`, 'm'));
    }
    expect(triggers).toMatch(/^ {2}workflow_dispatch:\s*$/m);
  });

  it('builds, verifies, and uploads one root artifact without Cloudflare credentials', () => {
    expect(buildJob).toContain("github.event.action != 'closed'");
    expect(buildJob).toMatch(
      /uses: DevSecNinja\/\.github\/actions\/harden-runner@c61e8107b080f72e25bfc41d3eef947dbfa66446 # v3\.0\.0/,
    );
    expect(buildJob).toMatch(
      /uses: actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7\.0\.1/,
    );
    expect(buildJob).toMatch(/^ {10}VITE_BASE_PATH: \/$/m);
    expect(buildJob).toMatch(/^ {10}EXPECTED_BASE_PATH: \/$/m);
    expect(buildJob).toMatch(/^ {10}name: root-dist$/m);
    expect(buildJob).toMatch(/^ {10}path: dist$/m);
    expect(buildJob).not.toContain('CLOUDFLARE_API_TOKEN');
    expect(buildJob).not.toContain('CLOUDFLARE_ACCOUNT_ID');
  });

  it('deploys the exact artifact to both production hosts and Cloudflare previews', () => {
    expect(pagesJob).toMatch(
      /uses: DevSecNinja\/\.github\/\.github\/workflows\/pages\.yml@c61e8107b080f72e25bfc41d3eef947dbfa66446 # v3\.0\.0/,
    );
    expect(pagesInputs).toMatch(/^ {6}wrangler-version: "4\.123\.0"$/m);
    expect(pagesInputs).toMatch(/^ {6}artifact-name: root-dist$/m);
    expect(pagesInputs).toMatch(/^ {6}artifact-path: dist$/m);
    expect(pagesInputs).toMatch(/^ {6}github-pages: true$/m);
    expect(pagesInputs).toMatch(
      /^ {6}cloudflare-production: \$\{\{\s*github\.event_name != 'pull_request'\s*\}\}$/m,
    );
    expect(pagesInputs).toMatch(/^ {6}cloudflare-preview: true$/m);
    expect(pagesInputs).toMatch(/^ {6}cloudflare-project-name: net-worth-calculator$/m);
    expect(pagesInputs).toMatch(/^ {6}cloudflare-production-branch: main$/m);
    expect(pagesInputs).not.toMatch(/^\s+(?:build|pre-deploy|pre-preview)-command:/m);
  });

  it('passes only the named Cloudflare secrets and least reusable-workflow permissions', () => {
    expect(pagesSecrets).toMatch(
      /^ {6}CLOUDFLARE_ACCOUNT_ID: \$\{\{\s*secrets\.CLOUDFLARE_ACCOUNT_ID\s*\}\}$/m,
    );
    expect(pagesSecrets).toMatch(
      /^ {6}CLOUDFLARE_API_TOKEN: \$\{\{\s*secrets\.CLOUDFLARE_API_TOKEN\s*\}\}$/m,
    );
    const permissions = yamlBlock(pagesJob, 'permissions', 4);
    expect(permissions.match(/^\s+[a-z-]+:\s+(?:read|write)(?:\s+#.*)?$/gm)).toHaveLength(6);
    expect(permissions).toContain('contents: read');
    expect(permissions).toContain('deployments: write');
    expect(permissions).toContain('id-token: write');
    expect(permissions).toContain('issues: write');
    expect(permissions).toContain('pages: write');
    expect(permissions).toContain('pull-requests: write');
  });

  it('does not add a Cloudflare runtime or server-side application surface', () => {
    const runtimePackages = Object.keys(packageMetadata.dependencies ?? {});
    expect(runtimePackages.some((name) => /cloudflare|wrangler|workers/i.test(name))).toBe(false);
    expect(existsSync(resolve(repositoryRoot, 'functions'))).toBe(false);
    expect(existsSync(resolve(repositoryRoot, 'public/_worker.js'))).toBe(false);
    expect(existsSync(resolve(repositoryRoot, 'wrangler.jsonc'))).toBe(false);
    expect(existsSync(resolve(repositoryRoot, 'wrangler.toml'))).toBe(false);
  });
});
