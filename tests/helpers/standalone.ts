import { expect, type BrowserContext, type Page } from '@playwright/test';

export type SafeBrowserDiagnostic = {
  source: 'console' | 'pageerror' | 'requestfailed';
  category: 'module-load' | 'storage' | 'crypto' | 'service-worker' | 'unexpected';
  path?: string;
};

function diagnosticCategory(text: string): Exclude<SafeBrowserDiagnostic['category'], never> {
  if (/module script|dynamically imported module|chunk/i.test(text)) return 'module-load';
  if (/indexeddb|transaction|quota|storage/i.test(text)) return 'storage';
  if (/crypto|pbkdf2|aes-gcm|operationerror/i.test(text)) return 'crypto';
  if (
    /service worker|serviceworker|sw\.js|failed to load resource|could not connect|networkerror|network connection|load failed|access control checks|offline/i.test(
      text,
    )
  ) {
    return 'service-worker';
  }
  return 'unexpected';
}

export async function emulateInstalledStandalone(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'standalone', {
      configurable: true,
      get: () => true,
    });
    const nativeMatchMedia = window.matchMedia.bind(window);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => {
        const result = nativeMatchMedia(query);
        if (query === '(display-mode: standalone)') {
          Object.defineProperty(result, 'matches', { configurable: true, value: true });
        }
        return result;
      },
    });
  });
}

export function captureSafeBrowserDiagnostics(page: Page): SafeBrowserDiagnostic[] {
  const diagnostics: SafeBrowserDiagnostic[] = [];
  page.on('pageerror', (error) => {
    diagnostics.push({
      source: 'pageerror',
      category: diagnosticCategory(`${error.name}:${error.message}`),
    });
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    diagnostics.push({
      source: 'console',
      category: diagnosticCategory(message.text()),
    });
  });
  page.on('requestfailed', (request) => {
    if (request.resourceType() !== 'script') return;
    diagnostics.push({
      source: 'requestfailed',
      category: diagnosticCategory(request.failure()?.errorText ?? ''),
      path: new URL(request.url()).pathname,
    });
  });
  return diagnostics;
}

export async function expectStandaloneSignals(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Reflect.get(navigator, 'standalone') === true &&
          matchMedia('(display-mode: standalone)').matches,
      ),
    )
    .toBe(true);
}

export async function expectNoFatalBoundary(
  page: Page,
  diagnostics: SafeBrowserDiagnostic[],
): Promise<void> {
  await expect(page.getByText(/the app could not continue safely/i)).toHaveCount(0);
  expect(diagnostics.filter(({ category }) => category !== 'service-worker')).toEqual([]);
}

export async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await page.evaluate(async () => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
}

export async function expectNoPageOverflow(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      return dimensions.scrollWidth - dimensions.clientWidth;
    })
    .toBeLessThanOrEqual(1);
}

export async function inspectSensitivePersistence(
  page: Page,
  markers: string[],
): Promise<{
  cacheMarkerFound: boolean;
  envelopeKeys: string[];
  envelopeMarkerFound: boolean;
  rowCount: number;
  urlMarkerFound: boolean;
  webStorageMarkerFound: boolean;
}> {
  return page.evaluate(async (sensitiveMarkers) => {
    const containsMarker = (value: string) =>
      sensitiveMarkers.some((marker) => value.includes(marker));
    const cacheBodies: string[] = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        cacheBodies.push(`${request.url}:${response ? await response.clone().text() : ''}`);
      }
    }

    const request = indexedDB.open('net-worth-calculator');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('The test could not inspect IndexedDB.'));
    });
    const rows = await new Promise<unknown[]>((resolve, reject) => {
      const read = database.transaction('vault', 'readonly').objectStore('vault').getAll();
      read.onsuccess = () => resolve(read.result as unknown[]);
      read.onerror = () => reject(read.error ?? new Error('The test could not inspect the vault.'));
    });
    database.close();
    const envelope = rows[0];
    const serializedEnvelope = JSON.stringify(envelope);
    return {
      cacheMarkerFound: containsMarker(cacheBodies.join('\n')),
      envelopeKeys:
        typeof envelope === 'object' && envelope !== null ? Object.keys(envelope).sort() : [],
      envelopeMarkerFound: containsMarker(serializedEnvelope),
      rowCount: rows.length,
      urlMarkerFound: containsMarker(location.href),
      webStorageMarkerFound: containsMarker(
        JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
      ),
    };
  }, markers);
}
