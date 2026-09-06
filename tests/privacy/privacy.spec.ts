import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { addAsset } from '../helpers/app';

type BrowserAudit = {
  events: string[];
  hooks: Record<string, boolean>;
};

test('keeps unique financial markers inside encrypted payload boundaries only', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const markers = {
    name: `PRIVATE-ACCOUNT-${crypto.randomUUID()}`,
    amount: '87654321.23',
    passphrase: `PRIVATE-PASSPHRASE-${crypto.randomUUID()}`,
    note: `PRIVATE-NOTE-${crypto.randomUUID()}`,
  };
  const observedRequests: string[] = [];
  const violations: string[] = [];
  const origin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? '43173'}`;

  await context.route('**/*', async (route) => {
    const requestOrigin = new URL(route.request().url()).origin;
    if (![origin, 'blob:', 'data:'].includes(requestOrigin)) {
      violations.push(`blocked-external:${route.request().url()}`);
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });

  page.on('request', (request) => {
    const serialized = JSON.stringify({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      body: request.postData(),
    });
    observedRequests.push(serialized);
    if (new URL(request.url()).origin !== origin) violations.push(`external:${request.url()}`);
    if (!['GET', 'HEAD'].includes(request.method())) violations.push(`method:${request.method()}`);
    if (Object.values(markers).some((marker) => serialized.includes(marker))) {
      violations.push(`request-marker:${request.url()}`);
    }
  });
  page.on('websocket', (socket) => violations.push(`websocket:${socket.url()}`));
  page.on('console', (message) => {
    const text = message.text();
    if (Object.values(markers).some((marker) => text.includes(marker))) {
      violations.push(`console:${text}`);
    }
  });

  await page.addInitScript(() => {
    const audit: BrowserAudit = {
      events: [],
      hooks: {
        fetch: false,
        xhr: false,
        beacon: false,
        websocket: false,
        broadcastChannel: false,
        serviceWorker: false,
        console: false,
        url: false,
      },
    };
    Reflect.set(window, '__privacyAudit', audit);
    const serialize = (value: unknown) => {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    };

    const nativeFetch = window.fetch.bind(window);
    window.fetch = (...arguments_) => {
      audit.events.push(`fetch:${serialize(arguments_)}`);
      return nativeFetch(...arguments_);
    };
    audit.hooks.fetch = true;

    const nativeOpen = XMLHttpRequest.prototype.open as (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      async: boolean,
      username?: string | null,
      password?: string | null,
    ) => void;
    const nativeSend: (
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
    ) => void = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ) {
      audit.events.push(`xhr-open:${method}:${String(url)}`);
      nativeOpen.call(this, method, url, async ?? true, username, password);
    };
    XMLHttpRequest.prototype.send = function (body) {
      audit.events.push(`xhr-send:${serialize(body)}`);
      nativeSend.call(this, body);
    };
    audit.hooks.xhr = true;

    const nativeBeacon = navigator.sendBeacon?.bind(navigator);
    if (nativeBeacon) {
      navigator.sendBeacon = (url, data) => {
        audit.events.push(`beacon:${String(url)}:${serialize(data)}`);
        return nativeBeacon(url, data);
      };
    }
    audit.hooks.beacon = true;

    if (window.WebSocket) {
      window.WebSocket = new Proxy(window.WebSocket, {
        construct(target, argumentsList) {
          audit.events.push(`websocket:${serialize(argumentsList)}`);
          return Reflect.construct(target, argumentsList) as WebSocket;
        },
      });
    }
    audit.hooks.websocket = true;

    if (window.BroadcastChannel) {
      const nativePost = BroadcastChannel.prototype.postMessage;
      BroadcastChannel.prototype.postMessage = function (message) {
        audit.events.push(`broadcast:${serialize(message)}`);
        return nativePost.call(this, message);
      };
    }
    audit.hooks.broadcastChannel = true;

    if (window.ServiceWorker) {
      const nativeWorkerPost = ServiceWorker.prototype.postMessage as (
        this: ServiceWorker,
        message: unknown,
        options?: StructuredSerializeOptions,
      ) => void;
      ServiceWorker.prototype.postMessage = function (message, transfer) {
        audit.events.push(`service-worker-send:${serialize(message)}`);
        nativeWorkerPost.call(
          this,
          message,
          Array.isArray(transfer) ? { transfer } : (transfer ?? undefined),
        );
      };
      navigator.serviceWorker.addEventListener('message', (event) => {
        audit.events.push(`service-worker-receive:${serialize(event.data)}`);
      });
    }
    audit.hooks.serviceWorker = true;

    for (const level of ['debug', 'info', 'log', 'warn', 'error'] as const) {
      const nativeLog = console[level].bind(console);
      console[level] = (...arguments_) => {
        audit.events.push(`console-${level}:${serialize(arguments_)}`);
        nativeLog(serialize(arguments_));
      };
    }
    audit.hooks.console = true;

    for (const method of ['pushState', 'replaceState'] as const) {
      const nativeHistory = history[method].bind(history);
      history[method] = (data: unknown, unused: string, url?: string | URL | null) => {
        audit.events.push(`url-${method}:${String(url ?? location.href)}:${serialize(data)}`);
        return nativeHistory(data, unused, url);
      };
    }
    window.addEventListener('hashchange', () => audit.events.push(`url-hash:${location.href}`));
    window.addEventListener('popstate', () => audit.events.push(`url-pop:${location.href}`));
    audit.hooks.url = true;

    Reflect.set(window, 'showSaveFilePicker', undefined);
    Reflect.set(window, 'showOpenFilePicker', undefined);
  });

  await page.goto('./');
  await page.getByLabel(/^passphrase$/i).fill(markers.passphrase);
  await page.getByLabel(/confirm passphrase/i).fill(markers.passphrase);
  await page.getByRole('button', { name: /create empty vault/i }).click();
  await addAsset(page, markers.name, markers.amount, 2026);
  await page.getByRole('button', { name: /edit/i }).click();
  await page.getByLabel(/notes/i).fill(markers.note);
  await page.getByRole('button', { name: /save asset/i }).click();

  await page.getByRole('link', { name: /backup/i }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /save encrypted backup/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^net-worth-backup-\d{4}-\d{2}-\d{2}\.nwvault$/);
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error('Playwright did not expose the encrypted backup path.');
  const backupContents = await readFile(downloadPath, 'utf8');

  const persistence = await page.evaluate(async () => {
    const webStorage = {
      local: { ...localStorage },
      session: { ...sessionStorage },
    };
    const cacheEntries: { cache: string; url: string; method: string; body: string }[] = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        cacheEntries.push({
          cache: cacheName,
          url: request.url,
          method: request.method,
          body: response ? await response.clone().text() : '',
        });
      }
    }
    const indexedDbRows: { database: string; store: string; value: unknown }[] = [];
    for (const { name } of await indexedDB.databases()) {
      if (!name) continue;
      const request = indexedDB.open(name);
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      for (const storeName of database.objectStoreNames) {
        const transaction = database.transaction(storeName, 'readonly');
        const values = await new Promise<unknown[]>((resolve, reject) => {
          const getAll = transaction.objectStore(storeName).getAll();
          getAll.onsuccess = () => resolve(getAll.result as unknown[]);
          getAll.onerror = () => reject(getAll.error);
        });
        indexedDbRows.push(...values.map((value) => ({ database: name, store: storeName, value })));
      }
      database.close();
    }
    return {
      audit: Reflect.get(window, '__privacyAudit') as BrowserAudit,
      webStorage,
      cacheEntries,
      indexedDbRows,
      url: location.href,
    };
  });

  expect(violations).toEqual([]);
  expect(observedRequests.length).toBeGreaterThan(0);
  expect(Object.values(persistence.audit.hooks).every(Boolean)).toBe(true);
  expect(persistence.indexedDbRows).toHaveLength(1);
  expect(persistence.cacheEntries.length).toBeGreaterThan(0);
  expect(persistence.cacheEntries.every(({ method }) => method === 'GET')).toBe(true);
  expect(persistence.cacheEntries.every(({ url }) => new URL(url).origin === origin)).toBe(true);
  expect(await context.cookies()).toEqual([]);

  const auditedSurfaces = [
    JSON.stringify(observedRequests),
    JSON.stringify(persistence.audit.events),
    JSON.stringify(persistence.webStorage),
    JSON.stringify(persistence.cacheEntries),
    JSON.stringify(persistence.indexedDbRows),
    persistence.url,
    backupContents,
  ];
  for (const marker of Object.values(markers)) {
    for (const surface of auditedSurfaces) expect(surface).not.toContain(marker);
  }

  const envelope = JSON.parse(JSON.stringify(persistence.indexedDbRows[0]?.value)) as Record<
    string,
    unknown
  >;
  expect(Object.keys(envelope).sort()).toEqual(
    ['cipher', 'ciphertext', 'format', 'formatVersion', 'kdf', 'vaultSchemaVersion'].sort(),
  );
  const backup = JSON.parse(backupContents) as Record<string, unknown>;
  expect(Object.keys(backup).sort()).toEqual(['exportedAt', 'format', 'formatVersion', 'payload']);
  expect(Object.keys(backup.payload as Record<string, unknown>).sort()).toEqual(
    ['cipher', 'ciphertext', 'format', 'formatVersion', 'kdf', 'vaultSchemaVersion'].sort(),
  );
});

test('locked reset performs no network mutation and leaves no confirmation marker', async ({
  page,
}) => {
  const confirmationMarker = `PRIVATE-RESET-${crypto.randomUUID()}`;
  const requests: string[] = [];
  const consoleMessages: string[] = [];
  page.on('request', (request) => {
    requests.push(
      JSON.stringify({
        url: request.url(),
        method: request.method(),
        body: request.postData(),
      }),
    );
  });
  page.on('console', (message) => consoleMessages.push(message.text()));

  await page.goto('./');
  const passphrase = `PRIVATE-PASSPHRASE-${crypto.randomUUID()}`;
  await page.getByLabel(/^passphrase$/i).fill(passphrase);
  await page.getByLabel(/confirm passphrase/i).fill(passphrase);
  await page.getByRole('button', { name: /create empty vault/i }).click();
  await page.getByRole('button', { name: /lock vault/i }).click();
  await page.getByRole('button', { name: /delete local vault and start over/i }).click();
  const dialog = page.getByRole('dialog', { name: /delete local vault and start over/i });
  const confirmation = dialog.getByLabel(/type DELETE/i);
  await confirmation.fill(confirmationMarker);
  await expect(dialog.getByRole('button', { name: /delete local vault forever/i })).toBeDisabled();
  await confirmation.fill('DELETE');
  await dialog.getByRole('button', { name: /delete local vault forever/i }).click();
  await expect(page.getByRole('heading', { name: /create your encrypted vault/i })).toBeVisible();

  const persistence = await page.evaluate(async () => {
    const cacheContents: string[] = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        cacheContents.push(`${request.url}:${response ? await response.clone().text() : ''}`);
      }
    }
    const request = indexedDB.open('net-worth-calculator');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise<unknown[]>((resolve, reject) => {
      const getAll = database.transaction('vault', 'readonly').objectStore('vault').getAll();
      getAll.onsuccess = () => resolve(getAll.result as unknown[]);
      getAll.onerror = () => reject(getAll.error);
    });
    database.close();
    return { cacheContents, localStorage: { ...localStorage }, rows, url: location.href };
  });

  expect(
    requests.every((request) => (JSON.parse(request) as { method: string }).method === 'GET'),
  ).toBe(true);
  expect(persistence.rows).toEqual([]);
  for (const surface of [
    JSON.stringify(requests),
    JSON.stringify(consoleMessages),
    JSON.stringify(persistence.cacheContents),
    JSON.stringify(persistence.localStorage),
    persistence.url,
  ]) {
    expect(surface).not.toContain(confirmationMarker);
    expect(surface).not.toContain(passphrase);
  }
});
