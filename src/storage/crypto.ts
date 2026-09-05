import type { CipherEnvelopeV1, Vault } from '@/domain/model';
import {
  ENVELOPE_FORMAT_VERSION,
  MAX_VAULT_PLAINTEXT_BYTES,
  VAULT_SCHEMA_VERSION,
} from '@/domain/model';
import { migrateVault } from '@/domain/migrations';
import { vaultSizeErrorMessage } from '@/domain/sizeLimits';
import { cipherEnvelopeSchema } from '@/domain/validation';

export const DEFAULT_KDF_ITERATIONS = 600_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export type VaultKeyMaterial = {
  key: CryptoKey;
  salt: Uint8Array<ArrayBuffer>;
  iterations: number;
};

export class VaultAuthenticationError extends Error {
  constructor() {
    super('The passphrase is incorrect or the vault cannot be authenticated.');
    this.name = 'VaultAuthenticationError';
  }
}

export class VaultSizeError extends Error {
  constructor() {
    super(vaultSizeErrorMessage());
    this.name = 'VaultSizeError';
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function authenticatedMetadata(
  envelope: Omit<CipherEnvelopeV1, 'ciphertext'>,
): Uint8Array<ArrayBuffer> {
  return encoder.encode(
    JSON.stringify({
      format: envelope.format,
      formatVersion: envelope.formatVersion,
      vaultSchemaVersion: envelope.vaultSchemaVersion,
      kdf: envelope.kdf,
      cipher: envelope.cipher,
    }),
  );
}

export async function deriveVaultKey(
  passphrase: string,
  salt = randomBytes(16),
  iterations = DEFAULT_KDF_ITERATIONS,
): Promise<VaultKeyMaterial> {
  if (passphrase.length < 12 || passphrase.length > 1024) {
    throw new Error('Passphrase must contain between 12 and 1,024 characters.');
  }
  const imported = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    imported,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return { key, salt, iterations };
}

export async function encryptVault(
  vault: Vault,
  material: VaultKeyMaterial,
): Promise<CipherEnvelopeV1> {
  const plaintext = encoder.encode(JSON.stringify(vault));
  if (plaintext.byteLength > MAX_VAULT_PLAINTEXT_BYTES) throw new VaultSizeError();
  const iv = randomBytes(12);
  const metadata: Omit<CipherEnvelopeV1, 'ciphertext'> = {
    format: 'net-worth-vault',
    formatVersion: ENVELOPE_FORMAT_VERSION,
    vaultSchemaVersion: VAULT_SCHEMA_VERSION,
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: material.iterations,
      salt: bytesToBase64Url(material.salt),
    },
    cipher: {
      name: 'AES-GCM',
      iv: bytesToBase64Url(iv),
      tagLength: 128,
    },
  };
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: authenticatedMetadata(metadata),
      tagLength: 128,
    },
    material.key,
    plaintext,
  );
  return cipherEnvelopeSchema.parse({
    ...metadata,
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
  });
}

export async function decryptVault(
  envelopeInput: CipherEnvelopeV1,
  material: VaultKeyMaterial,
): Promise<Vault> {
  const envelope = cipherEnvelopeSchema.parse(envelopeInput);
  const { ciphertext: _ciphertext, ...metadata } = envelope;
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64UrlToBytes(envelope.cipher.iv),
        additionalData: authenticatedMetadata(metadata),
        tagLength: envelope.cipher.tagLength,
      },
      material.key,
      base64UrlToBytes(envelope.ciphertext),
    );
    return migrateVault(JSON.parse(decoder.decode(plaintext)) as unknown);
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && ['OperationError', 'DataError'].includes(error.name))
    ) {
      throw new VaultAuthenticationError();
    }
    throw error;
  }
}

export async function createEncryptedVault(
  vault: Vault,
  passphrase: string,
): Promise<{ envelope: CipherEnvelopeV1; material: VaultKeyMaterial }> {
  const material = await deriveVaultKey(passphrase);
  return { envelope: await encryptVault(vault, material), material };
}

export async function unlockEncryptedVault(
  envelopeInput: CipherEnvelopeV1,
  passphrase: string,
): Promise<{ vault: Vault; material: VaultKeyMaterial }> {
  const envelope = cipherEnvelopeSchema.parse(envelopeInput);
  const material = await deriveVaultKey(
    passphrase,
    base64UrlToBytes(envelope.kdf.salt),
    envelope.kdf.iterations,
  );
  return { vault: await decryptVault(envelope, material), material };
}
