import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageMetadata = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as { version: string };

export const packageVersion = packageMetadata.version;

export function buildIdentity(commitSha: string): string {
  return `${packageVersion}@${commitSha}`;
}

export function buildLabel(commitSha: string): string {
  return `v${packageVersion} (${commitSha.slice(0, 7)})`;
}
