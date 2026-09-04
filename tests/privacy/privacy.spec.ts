import { expect, test } from '@playwright/test';

import { addAsset } from '../helpers/app';

test('financial data never leaves browser storage or the same-origin static GET boundary', async ({
  page,
  context,
}) => {
  const markers = {
    name: `PRIVATE-ACCOUNT-${crypto.randomUUID()}`,
    amount: '87654321.23',
    passphrase: 'private marker passphrase 123!',
    note: `PRIVATE-NOTE-${crypto.randomUUID()}`,
  };
  const observed: string[] = [];
  const violations: string[] = [];
  page.on('request', (request) => {
    const serialized = JSON.stringify({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      body: request.postData(),
    });
    observed.push(serialized);
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== 'http://127.0.0.1:4173') violations.push(`external:${request.url()}`);
    if (!['GET', 'HEAD'].includes(request.method())) violations.push(`method:${request.method()}`);
    if (Object.values(markers).some((marker) => serialized.includes(marker))) {
      violations.push(`marker:${request.url()}`);
    }
  });
  page.on('websocket', (socket) => violations.push(`websocket:${socket.url()}`));
  page.on('console', (message) => {
    const text = message.text();
    if (Object.values(markers).some((marker) => text.includes(marker))) {
      violations.push(`console:${text}`);
    }
  });

  await page.goto('./');
  await page.getByLabel(/^passphrase$/i).fill(markers.passphrase);
  await page.getByLabel(/confirm passphrase/i).fill(markers.passphrase);
  await page.getByRole('button', { name: /create empty vault/i }).click();
  await addAsset(page, markers.name, markers.amount, 2026);
  await page.getByRole('button', { name: /edit/i }).click();
  await page.getByLabel(/notes/i).fill(markers.note);
  await page.getByRole('button', { name: /save asset/i }).click();

  expect(violations).toEqual([]);
  expect(observed.length).toBeGreaterThan(0);
  expect(page.url()).not.toContain(markers.name);
  expect(page.url()).not.toContain(markers.amount);

  const persistence = await page.evaluate(async () => {
    const webStorage = {
      local: { ...localStorage },
      session: { ...sessionStorage },
    };
    const cacheEntries: { key: string; body: string }[] = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        cacheEntries.push({
          key: request.url,
          body: response ? await response.clone().text() : '',
        });
      }
    }
    const databaseNames = await indexedDB.databases();
    const indexedDbRows: unknown[] = [];
    for (const { name } of databaseNames) {
      if (!name) continue;
      const request = indexedDB.open(name);
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      for (const storeName of database.objectStoreNames) {
        const transaction = database.transaction(storeName, 'readonly');
        indexedDbRows.push(
          ...(await new Promise<unknown[]>((resolve, reject) => {
            const getAll = transaction.objectStore(storeName).getAll();
            getAll.onsuccess = () => resolve(getAll.result as unknown[]);
            getAll.onerror = () => reject(getAll.error);
          })),
        );
      }
      database.close();
    }
    return { webStorage, cacheEntries, indexedDbRows };
  });

  const allMarkers = Object.values(markers);
  const webStorageText = JSON.stringify(persistence.webStorage);
  const cacheText = JSON.stringify(persistence.cacheEntries);
  const indexedDbText = JSON.stringify(persistence.indexedDbRows);
  for (const marker of allMarkers) {
    expect(webStorageText).not.toContain(marker);
    expect(cacheText).not.toContain(marker);
    expect(indexedDbText).not.toContain(marker);
  }
  expect(persistence.indexedDbRows).toHaveLength(1);
  expect(persistence.cacheEntries.every(({ key }) => key.startsWith('http://127.0.0.1:4173'))).toBe(
    true,
  );
  expect(await context.cookies()).toEqual([]);
});
