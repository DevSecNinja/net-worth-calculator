import { z } from 'zod';

import type { CipherEnvelopeV1 } from '@/domain/model';
import { cipherEnvelopeSchema } from '@/domain/validation';

export const CLOUD_SYNC_PROTOCOL_VERSION = 1 as const;
export const CLOUD_SYNC_RECORD_NAME = 'active-vault';
export const CLOUD_SYNC_RECORD_TYPE = 'EncryptedVault';
export const cloudSyncStorageKey = 'nwc-cloud-sync';
export const MAX_CLOUD_SYNC_BYTES = 900 * 1024;

const encoder = new TextEncoder();

const cloudSyncPayloadSchema = z
  .object({
    protocolVersion: z.literal(CLOUD_SYNC_PROTOCOL_VERSION),
    envelope: cipherEnvelopeSchema,
  })
  .strict();

const syncMetadataSchema = z
  .object({
    enabled: z.boolean(),
    accountDigest: z
      .string()
      .regex(/^[A-Za-z0-9_-]{43}$/)
      .optional(),
    baseline: z
      .object({
        changeTag: z.string().min(1),
        envelopeDigest: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        syncedAt: z.iso.datetime({ offset: true }),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((value) => !value.baseline || value.accountDigest, {
    message: 'A CloudKit baseline must be bound to an account.',
  });

export type CloudSyncPayload = z.infer<typeof cloudSyncPayloadSchema>;
export type CloudSyncBaseline = NonNullable<z.infer<typeof syncMetadataSchema>['baseline']>;
export type CloudSyncMetadata = z.infer<typeof syncMetadataSchema>;

export type RemoteVaultRecord = {
  changeTag: string;
  modifiedAt?: string;
  payload: CloudSyncPayload;
};

export type SyncDecision =
  | { action: 'none' }
  | { action: 'upload'; expectedChangeTag?: string }
  | { action: 'download'; remote: RemoteVaultRecord }
  | {
      action: 'conflict';
      kind: 'diverged' | 'local-deleted' | 'remote-deleted';
      remote?: RemoteVaultRecord;
    };

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function serializeCloudSyncPayload(envelope: CipherEnvelopeV1): string {
  const serialized = JSON.stringify({
    protocolVersion: CLOUD_SYNC_PROTOCOL_VERSION,
    envelope: cipherEnvelopeSchema.parse(envelope),
  });
  if (encoder.encode(serialized).byteLength > MAX_CLOUD_SYNC_BYTES) {
    throw new Error('The encrypted vault exceeds the supported cloud sync size.');
  }
  return serialized;
}

export function parseCloudSyncPayload(value: unknown): CloudSyncPayload {
  if (typeof value !== 'string') throw new Error('The CloudKit vault payload is not text.');
  if (encoder.encode(value).byteLength > MAX_CLOUD_SYNC_BYTES) {
    throw new Error('The encrypted CloudKit vault exceeds the supported size.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error('The CloudKit vault payload is not valid JSON.');
  }
  return cloudSyncPayloadSchema.parse(parsed);
}

export async function envelopeDigest(envelope: CipherEnvelopeV1): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(JSON.stringify(cipherEnvelopeSchema.parse(envelope))),
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function opaqueIdentifierDigest(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function decideCloudSync(
  local: CipherEnvelopeV1 | undefined,
  remote: RemoteVaultRecord | undefined,
  baseline: CloudSyncBaseline | undefined,
): Promise<SyncDecision> {
  if (!local && !remote) return { action: 'none' };
  if (!local && remote) {
    return baseline
      ? { action: 'conflict', kind: 'local-deleted', remote }
      : { action: 'download', remote };
  }
  if (local && !remote) {
    return baseline ? { action: 'conflict', kind: 'remote-deleted' } : { action: 'upload' };
  }

  const localDigest = await envelopeDigest(local!);
  const remoteDigest = await envelopeDigest(remote!.payload.envelope);
  if (localDigest === remoteDigest) return { action: 'none' };
  if (!baseline) return { action: 'conflict', kind: 'diverged', remote: remote! };

  const localChanged = localDigest !== baseline.envelopeDigest;
  const remoteChanged = remote!.changeTag !== baseline.changeTag;
  if (localChanged && remoteChanged) {
    return { action: 'conflict', kind: 'diverged', remote: remote! };
  }
  if (remoteChanged) return { action: 'download', remote: remote! };
  if (localChanged) return { action: 'upload', expectedChangeTag: baseline.changeTag };
  return { action: 'conflict', kind: 'diverged', remote: remote! };
}

export function loadCloudSyncMetadata(storage: Storage = localStorage): CloudSyncMetadata {
  let value: string | null;
  try {
    value = storage.getItem(cloudSyncStorageKey);
  } catch (error) {
    if (
      error instanceof DOMException &&
      ['QuotaExceededError', 'SecurityError'].includes(error.name)
    ) {
      return { enabled: false };
    }
    throw error;
  }
  if (!value) return { enabled: false };
  try {
    return syncMetadataSchema.parse(JSON.parse(value) as unknown);
  } catch {
    return { enabled: false };
  }
}

export function saveCloudSyncMetadata(
  metadata: CloudSyncMetadata,
  storage: Storage = localStorage,
): void {
  const value = JSON.stringify(syncMetadataSchema.parse(metadata));
  storage.setItem(cloudSyncStorageKey, value);
}

export function clearCloudSyncMetadata(storage: Storage = localStorage): void {
  storage.removeItem(cloudSyncStorageKey);
}

export function createCloudSyncBaseline(
  changeTag: string,
  envelopeDigestValue: string,
  syncedAt = new Date().toISOString(),
): CloudSyncBaseline {
  return syncMetadataSchema.shape.baseline.unwrap().parse({
    changeTag,
    envelopeDigest: envelopeDigestValue,
    syncedAt,
  });
}
