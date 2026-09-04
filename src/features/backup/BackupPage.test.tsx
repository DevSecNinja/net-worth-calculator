import { MAX_BACKUP_BYTES, openBackupFile, saveBackupFile } from '@/storage/files';

describe('backup file capability fallbacks', () => {
  it('uses the native save picker when available', async () => {
    const write = vi.fn(async () => undefined);
    const close = vi.fn(async () => undefined);
    Object.assign(window, {
      showSaveFilePicker: vi.fn(async () => ({
        createWritable: async () => ({ write, close }),
      })),
    });
    await expect(saveBackupFile('{}', 'net-worth-backup-2026-09-03.nwvault')).resolves.toBe(
      'native',
    );
    expect(write).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    Reflect.deleteProperty(window, 'showSaveFilePicker');
  });

  it('uses a non-identifying download fallback', async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    await expect(saveBackupFile('{}', 'net-worth-backup-2026-09-03.nwvault')).resolves.toBe(
      'download',
    );
    expect(click).toHaveBeenCalledOnce();
  });

  it('returns null when the native open picker is cancelled', async () => {
    Object.assign(window, {
      showOpenFilePicker: vi.fn(async () => {
        throw new DOMException('cancelled', 'AbortError');
      }),
    });
    await expect(openBackupFile()).resolves.toBeNull();
    Reflect.deleteProperty(window, 'showOpenFilePicker');
  });

  it('reads a valid native file and rejects empty or oversized files', async () => {
    const showOpenFilePicker = vi.fn();
    Object.assign(window, { showOpenFilePicker });
    showOpenFilePicker.mockResolvedValueOnce([
      { getFile: async () => new File(['{"format":"test"}'], 'backup.nwvault') },
    ]);
    await expect(openBackupFile()).resolves.toBe('{"format":"test"}');

    showOpenFilePicker.mockResolvedValueOnce([
      { getFile: async () => new File([], 'empty.nwvault') },
    ]);
    await expect(openBackupFile()).rejects.toThrow('Backup is empty');

    showOpenFilePicker.mockResolvedValueOnce([
      {
        getFile: async () => new File([new Uint8Array(MAX_BACKUP_BYTES + 1)], 'oversized.nwvault'),
      },
    ]);
    await expect(openBackupFile()).rejects.toThrow('10 MiB');
    Reflect.deleteProperty(window, 'showOpenFilePicker');
  });

  it('reports native save cancellation without falling back silently', async () => {
    Object.assign(window, {
      showSaveFilePicker: vi.fn(async () => {
        throw new DOMException('cancelled', 'AbortError');
      }),
    });
    await expect(saveBackupFile('{}', 'backup.nwvault')).rejects.toThrow('cancelled');
    Reflect.deleteProperty(window, 'showSaveFilePicker');
  });

  it('propagates non-cancellation picker failures', async () => {
    Object.assign(window, {
      showSaveFilePicker: vi.fn(async () => {
        throw new Error('disk unavailable');
      }),
    });
    await expect(saveBackupFile('{}', 'backup.nwvault')).rejects.toThrow('disk unavailable');
    Reflect.deleteProperty(window, 'showSaveFilePicker');
  });

  it('resolves fallback file cancellation without hanging', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function click(
      this: HTMLInputElement,
    ) {
      this.dispatchEvent(new Event('cancel'));
    });
    await expect(openBackupFile()).resolves.toBeNull();
    expect(click).toHaveBeenCalledOnce();
  });
});
