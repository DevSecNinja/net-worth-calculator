import type { CipherEnvelopeV1 } from '@/domain/model';
import { deriveVaultKey } from '@/storage/crypto';

const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export const legacyVault = {
  schemaVersion: 0 as const,
  id: '784f060e-63e5-4328-8a12-99c670468f93',
  revision: 4,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  currency: 'EUR',
  assets: [],
  liabilities: [],
};

export async function legacyVaultEnvelope(passphrase: string): Promise<CipherEnvelopeV1> {
  const material = await deriveVaultKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const metadata: Omit<CipherEnvelopeV1, 'ciphertext'> = {
    format: 'net-worth-vault',
    formatVersion: 1,
    vaultSchemaVersion: 0,
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: material.iterations,
      salt: base64Url(material.salt),
    },
    cipher: {
      name: 'AES-GCM',
      iv: base64Url(iv),
      tagLength: 128,
    },
  };
  const additionalData = encoder.encode(
    JSON.stringify({
      format: metadata.format,
      formatVersion: metadata.formatVersion,
      vaultSchemaVersion: metadata.vaultSchemaVersion,
      kdf: metadata.kdf,
      cipher: metadata.cipher,
    }),
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
    material.key,
    encoder.encode(JSON.stringify(legacyVault)),
  );
  return {
    ...metadata,
    ciphertext: base64Url(new Uint8Array(ciphertext)),
  };
}
