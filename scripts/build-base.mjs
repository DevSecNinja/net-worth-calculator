const defaultBasePath = '/net-worth-calculator/';

export function normalizeBasePath(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Expected base path must be a non-empty root-relative path.');
  }
  const hasControlCharacter = [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\?#]/.test(value) ||
    hasControlCharacter
  ) {
    throw new Error('Expected base path must be a safe root-relative path.');
  }

  const normalized = value.endsWith('/') ? value : `${value}/`;
  const segments = normalized.split('/').filter(Boolean);
  if (
    segments.some((segment) => segment === '.' || segment === '..') ||
    !/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(normalized)
  ) {
    throw new Error('Expected base path contains unsafe path segments.');
  }
  return normalized;
}

export function resolveExpectedBasePath(environment = process.env) {
  return normalizeBasePath(
    environment.EXPECTED_BASE_PATH ?? environment.VITE_BASE_PATH ?? defaultBasePath,
  );
}
