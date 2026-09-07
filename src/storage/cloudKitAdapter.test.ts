import { createEmptyVault } from '@/domain/fixtures';

import { createCloudKitClient, loadCloudKit } from './cloudKitAdapter';
import { createEncryptedVault } from './crypto';

const response = (overrides: Record<string, unknown> = {}) => ({
  hasErrors: false,
  records: [],
  ...overrides,
});

function setCloudKit(value: unknown): void {
  Reflect.set(window, 'CloudKit', value);
}

function clearCloudKit(): void {
  Reflect.deleteProperty(window, 'CloudKit');
}

describe('CloudKit JS adapter', () => {
  it('does not add a remote script until explicitly loaded', async () => {
    expect(document.querySelector('script[src*="apple-cloudkit"]')).toBeNull();
    const pending = loadCloudKit();
    const script = document.querySelector<HTMLScriptElement>('script[src*="apple-cloudkit"]');
    expect(script).not.toBeNull();
    expect(script).toHaveAttribute('crossorigin', 'anonymous');

    const cloudKit = { configure: vi.fn(), getDefaultContainer: vi.fn() };
    setCloudKit(cloudKit);
    window.dispatchEvent(new Event('cloudkitloaded'));
    await expect(pending).resolves.toBe(cloudKit);
    clearCloudKit();
  });

  it('configures private-database authentication and sends only encrypted payloads', async () => {
    const envelope = (
      await createEncryptedVault(createEmptyVault('USD'), 'correct horse battery staple')
    ).envelope;
    const saved = {
      recordName: 'active-vault',
      recordType: 'EncryptedVault',
      recordChangeTag: 'tag-2',
      fields: {
        encryptedEnvelope: { value: JSON.stringify({ protocolVersion: 1, envelope }) },
      },
    };
    const database = {
      fetchRecords: vi.fn().mockResolvedValue(response({ records: [saved] })),
      saveRecords: vi.fn().mockResolvedValue(response({ records: [saved] })),
      newRecordsBatch: vi.fn(),
    };
    const container = {
      privateCloudDatabase: database,
      setUpAuth: vi.fn().mockResolvedValue({ userRecordName: 'private-user' }),
      whenUserSignsIn: vi.fn().mockReturnValue(new Promise(() => undefined)),
      whenUserSignsOut: vi.fn().mockReturnValue(new Promise(() => undefined)),
      signOut: vi.fn(),
    };
    const cloudKit = {
      configure: vi.fn(),
      getDefaultContainer: vi.fn(() => container),
    };
    setCloudKit(cloudKit);

    const client = await createCloudKitClient({
      containerIdentifier: 'iCloud.example',
      apiToken: 'public-browser-token',
      environment: 'development',
    });
    expect(JSON.stringify(cloudKit.configure.mock.calls[0]?.[0])).toContain(
      '"containerIdentifier":"iCloud.example"',
    );
    expect(JSON.stringify(cloudKit.configure.mock.calls[0]?.[0])).toContain(
      '"environment":"development"',
    );
    expect(JSON.stringify(cloudKit.configure.mock.calls[0]?.[0])).toContain('"persist":false');
    await expect(client.setUpAuth()).resolves.toBe('private-user');
    await client.saveVault(envelope, 'tag-1');

    const serializedCall = JSON.stringify(database.saveRecords.mock.calls);
    expect(serializedCall).not.toContain('correct horse battery staple');
    expect(serializedCall).toContain('"recordName":"active-vault"');
    expect(serializedCall).toContain('"recordChangeTag":"tag-1"');
    expect(serializedCall).toContain('\\"ciphertext\\"');
    await expect(client.fetchVault()).resolves.toEqual(
      expect.objectContaining({ changeTag: 'tag-2' }),
    );
    clearCloudKit();
  });

  it.each(['CONFLICT', 'EXISTS'])(
    'maps authentication, %s, and missing-record errors',
    async (writeErrorCode) => {
      const database = {
        fetchRecords: vi
          .fn()
          .mockResolvedValueOnce(
            response({ hasErrors: true, errors: [{ ckErrorCode: 'NOT_FOUND' }] }),
          )
          .mockResolvedValueOnce(
            response({ hasErrors: true, errors: [{ ckErrorCode: 'AUTHENTICATION_REQUIRED' }] }),
          ),
        saveRecords: vi.fn().mockResolvedValue(
          response({
            hasErrors: true,
            errors: [{ ckErrorCode: writeErrorCode }],
          }),
        ),
        newRecordsBatch: vi.fn(),
      };
      setCloudKit({
        configure: vi.fn(),
        getDefaultContainer: () => ({
          privateCloudDatabase: database,
          setUpAuth: vi.fn(),
          whenUserSignsIn: vi.fn(),
          whenUserSignsOut: vi.fn(),
          signOut: vi.fn(),
        }),
      });
      const client = await createCloudKitClient({
        containerIdentifier: 'iCloud.example',
        apiToken: 'token',
        environment: 'production',
      });

      await expect(client.fetchVault()).resolves.toBeUndefined();
      await expect(client.fetchVault()).rejects.toThrow('Sign in to iCloud');
      const envelope = (
        await createEncryptedVault(createEmptyVault('USD'), 'correct horse battery staple')
      ).envelope;
      await expect(client.saveVault(envelope, 'old')).rejects.toThrow('changed');
      clearCloudKit();
    },
  );

  it('deletes only the expected CloudKit record revision', async () => {
    const commit = vi.fn().mockResolvedValue(response());
    const deleteRecord = vi.fn();
    const database = {
      fetchRecords: vi.fn(),
      saveRecords: vi.fn(),
      newRecordsBatch: vi.fn(() => ({ delete: deleteRecord, commit })),
    };
    setCloudKit({
      configure: vi.fn(),
      getDefaultContainer: () => ({
        privateCloudDatabase: database,
        setUpAuth: vi.fn(),
        whenUserSignsIn: vi.fn(),
        whenUserSignsOut: vi.fn(),
        signOut: vi.fn(),
      }),
    });
    const client = await createCloudKitClient({
      containerIdentifier: 'iCloud.example',
      apiToken: 'token',
      environment: 'production',
    });

    await client.deleteVault('expected-tag');
    expect(deleteRecord).toHaveBeenCalledWith({
      recordName: 'active-vault',
      recordChangeTag: 'expected-tag',
    });
    expect(commit).toHaveBeenCalledOnce();
    clearCloudKit();
  });

  it('rearms authentication monitoring after a rejected sign-in', async () => {
    const whenUserSignsIn = vi
      .fn()
      .mockRejectedValueOnce({ ckErrorCode: 'SIGN_IN_FAILED' })
      .mockReturnValue(new Promise(() => undefined));
    const container = {
      privateCloudDatabase: {
        fetchRecords: vi.fn(),
        saveRecords: vi.fn(),
        newRecordsBatch: vi.fn(),
      },
      setUpAuth: vi.fn().mockResolvedValue(null),
      whenUserSignsIn,
      whenUserSignsOut: vi.fn(),
      signOut: vi.fn(),
    };
    setCloudKit({
      configure: vi.fn(),
      getDefaultContainer: () => container,
    });
    const client = await createCloudKitClient({
      containerIdentifier: 'iCloud.example',
      apiToken: 'token',
      environment: 'development',
    });
    const onError = vi.fn();
    client.watchAuthentication(vi.fn(), vi.fn(), onError);
    await client.setUpAuth();

    await vi.waitFor(() => expect(whenUserSignsIn).toHaveBeenCalledTimes(2));
    expect(onError).toHaveBeenCalledOnce();
    expect(container.setUpAuth).toHaveBeenCalledTimes(2);
    clearCloudKit();
  });
});
