import { deleteDB, openDB, type DBSchema } from 'idb';

import type { CipherEnvelopeV1 } from '@/domain/model';

const DATABASE_NAME = 'net-worth-calculator';
const STORE_NAME = 'vault';
const ACTIVE_KEY = 'active';

type VaultDatabase = DBSchema & {
  vault: {
    key: string;
    value: CipherEnvelopeV1;
  };
};

async function database() {
  return openDB<VaultDatabase>(DATABASE_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    },
  });
}

export async function readEnvelope(): Promise<CipherEnvelopeV1 | undefined> {
  return (await database()).get(STORE_NAME, ACTIVE_KEY);
}

export async function writeEnvelope(envelope: CipherEnvelopeV1): Promise<void> {
  const db = await database();
  const transaction = db.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
  await transaction.store.put(envelope, ACTIVE_KEY);
  await transaction.done;
}

export class EnvelopeConflictError extends Error {
  constructor() {
    super('The encrypted vault changed before this operation could commit.');
    this.name = 'EnvelopeConflictError';
  }
}

function sameEnvelope(
  left: CipherEnvelopeV1 | undefined,
  right: CipherEnvelopeV1 | undefined,
): boolean {
  if (!left || !right) return left === right;
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function compareAndSwapEnvelope(
  expected: CipherEnvelopeV1 | undefined,
  replacement: CipherEnvelopeV1,
): Promise<void> {
  const db = await database();
  const transaction = db.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
  const current = await transaction.store.get(ACTIVE_KEY);
  if (!sameEnvelope(current, expected)) {
    transaction.abort();
    await transaction.done.catch((error: unknown) => {
      if (!(error instanceof DOMException) || error.name !== 'AbortError') throw error;
    });
    throw new EnvelopeConflictError();
  }
  await transaction.store.put(replacement, ACTIVE_KEY);
  await transaction.done;
}

export async function deleteEnvelope(): Promise<void> {
  const db = await database();
  const transaction = db.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
  await transaction.store.delete(ACTIVE_KEY);
  await transaction.done;
}

export async function deleteVaultDatabase(): Promise<void> {
  await deleteDB(DATABASE_NAME);
}

export const databaseContract = {
  databaseName: DATABASE_NAME,
  storeName: STORE_NAME,
  activeKey: ACTIVE_KEY,
} as const;
