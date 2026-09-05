export function parseCloudflareHeaders(source) {
  const blocks = new Map();
  let currentPath;

  for (const rawLine of source.replace(/\r\n?/g, '\n').split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (rawLine === rawLine.trimStart()) {
      if (blocks.has(trimmed)) throw new Error(`Duplicate Cloudflare header path: ${trimmed}`);
      currentPath = trimmed;
      blocks.set(currentPath, new Map());
      continue;
    }

    if (!currentPath) throw new Error(`Cloudflare header appears before a path: ${trimmed}`);
    const separator = trimmed.indexOf(':');
    if (separator <= 0) throw new Error(`Invalid Cloudflare header line: ${trimmed}`);
    const name = trimmed.slice(0, separator).toLowerCase();
    const value = trimmed.slice(separator + 1).trim();
    const headers = blocks.get(currentPath);
    const values = headers.get(name) ?? [];
    values.push(value);
    headers.set(name, values);
  }

  return blocks;
}

export function requireCloudflareHeader(blocks, path, name, expectedValue) {
  const values = blocks.get(path)?.get(name.toLowerCase());
  if (!values?.includes(expectedValue)) {
    throw new Error(`${path} must set ${name}: ${expectedValue}`);
  }
}
