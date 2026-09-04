import { MAX_BACKUP_BYTES } from '@/domain/model';

const BACKUP_MIME = 'application/vnd.devsecninja.net-worth-backup+json';
export { MAX_BACKUP_BYTES };

type WritableFileHandle = {
  createWritable(): Promise<{
    write(data: Blob): Promise<void>;
    close(): Promise<void>;
  }>;
};

type ReadableFileHandle = {
  getFile(): Promise<File>;
};

type FilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<WritableFileHandle>;
  showOpenFilePicker?: (options: {
    multiple: false;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<ReadableFileHandle[]>;
};

function pickerOptions() {
  return [
    {
      description: 'Encrypted net worth backup',
      accept: { [BACKUP_MIME]: ['.nwvault'] },
    },
  ];
}

function isCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function saveBackupFile(
  contents: string,
  filename: string,
): Promise<'native' | 'download'> {
  const fileWindow = window as FilePickerWindow;
  const blob = new Blob([contents], { type: BACKUP_MIME });
  if (fileWindow.showSaveFilePicker) {
    try {
      const handle = await fileWindow.showSaveFilePicker({
        suggestedName: filename,
        types: pickerOptions(),
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'native';
    } catch (error) {
      if (isCancellation(error)) {
        throw new Error('Backup save was cancelled.', { cause: error });
      }
      throw error;
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.click();
  queueMicrotask(() => URL.revokeObjectURL(url));
  return 'download';
}

async function validateFile(file: File): Promise<string> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup is larger than the 10 MiB limit.');
  if (file.size === 0) throw new Error('Backup is empty.');
  return file.text();
}

export async function openBackupFile(): Promise<string | null> {
  const fileWindow = window as FilePickerWindow;
  if (fileWindow.showOpenFilePicker) {
    try {
      const [handle] = await fileWindow.showOpenFilePicker({
        multiple: false,
        types: pickerOptions(),
      });
      if (!handle) return null;
      return validateFile(await handle.getFile());
    } catch (error) {
      if (isCancellation(error)) return null;
      throw error;
    }
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.nwvault,application/json';
    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        void validateFile(file).then(resolve, reject);
      },
      { once: true },
    );
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}
