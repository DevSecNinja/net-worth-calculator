import type { CipherEnvelopeV1 } from '@/domain/model';

import {
  CLOUD_SYNC_RECORD_NAME,
  CLOUD_SYNC_RECORD_TYPE,
  parseCloudSyncPayload,
  serializeCloudSyncPayload,
  type RemoteVaultRecord,
} from './cloudSync';

const CLOUDKIT_SCRIPT_URL = 'https://cdn.apple-cloudkit.com/ck/2/cloudkit.js';
const CLOUDKIT_LOADED_EVENT = 'cloudkitloaded';

type CloudKitError = Error & {
  ckErrorCode?: string;
  serverErrorCode?: string;
  reason?: string;
};

type CloudKitRecord = {
  recordName: string;
  recordType?: string;
  recordChangeTag?: string;
  modified?: { timestamp?: number };
  fields?: Record<string, { value?: unknown }>;
};

type CloudKitResponse = {
  hasErrors?: boolean;
  errors?: CloudKitError[];
  records?: CloudKitRecord[];
};

type CloudKitDatabase = {
  fetchRecords: (records: string[]) => Promise<CloudKitResponse>;
  saveRecords: (records: CloudKitRecord[]) => Promise<CloudKitResponse>;
  newRecordsBatch: () => {
    delete: (record: { recordName: string; recordChangeTag: string }) => void;
    commit: () => Promise<CloudKitResponse>;
  };
};

type CloudKitContainer = {
  privateCloudDatabase: CloudKitDatabase;
  setUpAuth: () => Promise<object | null>;
  whenUserSignsIn: () => Promise<unknown>;
  whenUserSignsOut: () => Promise<void>;
  signOut: () => Promise<void>;
};

type CloudKitGlobal = {
  configure: (configuration: unknown) => void;
  getDefaultContainer: () => CloudKitContainer;
};

type CloudKitWindow = Window & { CloudKit?: CloudKitGlobal };

function cloudKitWindow(): CloudKitWindow {
  return window;
}

export type CloudKitConfiguration = {
  containerIdentifier: string;
  apiToken: string;
  environment: 'development' | 'production';
};

export type CloudSyncClient = {
  setUpAuth: () => Promise<string | undefined>;
  watchAuthentication: (
    onSignIn: (userRecordName: string) => void,
    onSignOut: () => void,
    onError: (error: Error) => void,
  ) => void;
  signOut: () => Promise<void>;
  fetchVault: () => Promise<RemoteVaultRecord | undefined>;
  saveVault: (envelope: CipherEnvelopeV1, expectedChangeTag?: string) => Promise<RemoteVaultRecord>;
  deleteVault: (expectedChangeTag: string) => Promise<void>;
};

export class CloudSyncAuthenticationError extends Error {
  constructor() {
    super('Sign in to iCloud before synchronizing the encrypted vault.');
    this.name = 'CloudSyncAuthenticationError';
  }
}

export class CloudSyncConflictError extends Error {
  constructor() {
    super('The encrypted CloudKit vault changed before this operation completed.');
    this.name = 'CloudSyncConflictError';
  }
}

export class CloudSyncNotFoundError extends Error {
  constructor() {
    super('The encrypted CloudKit vault no longer exists.');
    this.name = 'CloudSyncNotFoundError';
  }
}

function responseError(response: CloudKitResponse): CloudKitError | undefined {
  return response.hasErrors ? response.errors?.[0] : undefined;
}

function normalizedError(error: unknown): Error {
  const cloudError = error as CloudKitError;
  const code = cloudError.ckErrorCode ?? cloudError.serverErrorCode;
  if (['AUTHENTICATION_REQUIRED', 'AUTHENTICATION_FAILED', 'SIGN_IN_FAILED'].includes(code ?? '')) {
    return new CloudSyncAuthenticationError();
  }
  if (['CONFLICT', 'EXISTS'].includes(code ?? '')) return new CloudSyncConflictError();
  if (code === 'NOT_FOUND') return new CloudSyncNotFoundError();
  return error instanceof Error ? error : new Error('CloudKit synchronization failed.');
}

function requireSuccessfulResponse(response: CloudKitResponse): CloudKitResponse {
  const error = responseError(response);
  if (error) throw normalizedError(error);
  return response;
}

function parseRecord(record: CloudKitRecord): RemoteVaultRecord {
  const changeTag = record.recordChangeTag;
  if (!changeTag) throw new Error('CloudKit returned a vault without a change tag.');
  const value = record.fields?.['encryptedEnvelope']?.value;
  return {
    changeTag,
    ...(record.modified?.timestamp
      ? { modifiedAt: new Date(record.modified.timestamp).toISOString() }
      : {}),
    payload: parseCloudSyncPayload(value),
  };
}

function userRecordName(identity: unknown): string | undefined {
  if (!identity || typeof identity !== 'object') return undefined;
  const value = 'userRecordName' in identity ? identity.userRecordName : undefined;
  return typeof value === 'string' && value ? value : undefined;
}

let cloudKitPromise: Promise<CloudKitGlobal> | undefined;

export function loadCloudKit(): Promise<CloudKitGlobal> {
  const browserWindow = cloudKitWindow();
  if (browserWindow.CloudKit) return Promise.resolve(browserWindow.CloudKit);
  if (cloudKitPromise) return cloudKitPromise;

  cloudKitPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CLOUDKIT_SCRIPT_URL}"]`,
    );
    const script = existing ?? document.createElement('script');
    const resolveCloudKit = () => {
      if (!browserWindow.CloudKit) return;
      cleanup();
      resolve(browserWindow.CloudKit);
    };
    const onError = () => {
      cleanup();
      script.remove();
      cloudKitPromise = undefined;
      reject(new Error('CloudKit JS could not be loaded.'));
    };
    const cleanup = () => {
      window.removeEventListener(CLOUDKIT_LOADED_EVENT, resolveCloudKit);
      script.removeEventListener('load', resolveCloudKit);
      script.removeEventListener('error', onError);
    };
    window.addEventListener(CLOUDKIT_LOADED_EVENT, resolveCloudKit, { once: true });
    script.addEventListener('load', resolveCloudKit, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.src = CLOUDKIT_SCRIPT_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      document.head.append(script);
    }
  });
  return cloudKitPromise;
}

export async function createCloudKitClient(
  configuration: CloudKitConfiguration,
): Promise<CloudSyncClient> {
  const cloudKit = await loadCloudKit();
  cloudKit.configure({
    containers: [
      {
        containerIdentifier: configuration.containerIdentifier,
        environment: configuration.environment,
        apiTokenAuth: {
          apiToken: configuration.apiToken,
          persist: false,
          signInButton: { id: 'cloudkit-sign-in', theme: 'black' },
          signOutButton: { id: 'cloudkit-sign-out', theme: 'black' },
        },
      },
    ],
  });
  const container = cloudKit.getDefaultContainer();
  const database = container.privateCloudDatabase;
  let authCallbacks:
    | {
        onSignIn: (userRecordName: string) => void;
        onSignOut: () => void;
        onError: (error: Error) => void;
      }
    | undefined;
  let authKnown = false;
  let signedIn = false;
  let watcherStarted = false;

  const armAuthenticationWatcher = (waitForSignOut: boolean) => {
    if (!authCallbacks) return;
    watcherStarted = true;
    const promise = waitForSignOut ? container.whenUserSignsOut() : container.whenUserSignsIn();
    void promise
      .then((identity) => {
        if (!authCallbacks) return;
        if (waitForSignOut) {
          signedIn = false;
          authCallbacks.onSignOut();
          armAuthenticationWatcher(false);
          return;
        }
        const recordName = userRecordName(identity);
        if (!recordName) throw new CloudSyncAuthenticationError();
        signedIn = true;
        authCallbacks.onSignIn(recordName);
        armAuthenticationWatcher(true);
      })
      .catch((error: unknown) => {
        watcherStarted = false;
        authCallbacks?.onError(normalizedError(error));
        void container
          .setUpAuth()
          .then((identity) => {
            authKnown = true;
            signedIn = Boolean(userRecordName(identity));
            if (authCallbacks && !watcherStarted) armAuthenticationWatcher(signedIn);
          })
          .catch((setupError: unknown) => authCallbacks?.onError(normalizedError(setupError)));
      });
  };

  return {
    async setUpAuth() {
      const recordName = userRecordName(await container.setUpAuth());
      authKnown = true;
      signedIn = Boolean(recordName);
      if (authCallbacks && !watcherStarted) armAuthenticationWatcher(signedIn);
      return recordName;
    },
    watchAuthentication(onSignIn, onSignOut, onError) {
      authCallbacks = { onSignIn, onSignOut, onError };
      if (authKnown && !watcherStarted) armAuthenticationWatcher(signedIn);
    },
    async signOut() {
      await container.signOut();
      await container.setUpAuth();
    },
    async fetchVault() {
      try {
        const response = requireSuccessfulResponse(
          await database.fetchRecords([CLOUD_SYNC_RECORD_NAME]),
        );
        const record = response.records?.[0];
        return record ? parseRecord(record) : undefined;
      } catch (error) {
        const normalized = normalizedError(error);
        if (normalized instanceof CloudSyncNotFoundError) return undefined;
        throw normalized;
      }
    },
    async saveVault(envelope, expectedChangeTag) {
      try {
        const response = requireSuccessfulResponse(
          await database.saveRecords([
            {
              recordName: CLOUD_SYNC_RECORD_NAME,
              recordType: CLOUD_SYNC_RECORD_TYPE,
              ...(expectedChangeTag ? { recordChangeTag: expectedChangeTag } : {}),
              fields: {
                encryptedEnvelope: { value: serializeCloudSyncPayload(envelope) },
              },
            },
          ]),
        );
        const record = response.records?.[0];
        if (!record) throw new Error('CloudKit did not return the saved encrypted vault.');
        return parseRecord(record);
      } catch (error) {
        throw normalizedError(error);
      }
    },
    async deleteVault(expectedChangeTag) {
      try {
        const batch = database.newRecordsBatch();
        batch.delete({
          recordName: CLOUD_SYNC_RECORD_NAME,
          recordChangeTag: expectedChangeTag,
        });
        requireSuccessfulResponse(await batch.commit());
      } catch (error) {
        throw normalizedError(error);
      }
    },
  };
}

export const cloudKitAdapterContract = {
  scriptUrl: CLOUDKIT_SCRIPT_URL,
  loadedEvent: CLOUDKIT_LOADED_EVENT,
} as const;
