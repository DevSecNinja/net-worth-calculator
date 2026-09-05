import { backupSizeErrorMessage, vaultSizeErrorMessage } from './sizeLimits';

describe('size limit messages', () => {
  it('derives the public limits from their byte constants', () => {
    expect(backupSizeErrorMessage()).toBe('Backup is larger than the 10 MiB limit.');
    expect(vaultSizeErrorMessage()).toBe(
      'The decrypted vault document is larger than the 7 MiB local size limit.',
    );
  });
});
