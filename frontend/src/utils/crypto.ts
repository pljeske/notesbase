/**
 * Client-side AES-256-GCM encryption using the Web Crypto API.
 *
 * Keys are derived with PBKDF2 (100k iterations, SHA-256) and never leave the browser.
 * The server only ever stores opaque ciphertext.
 */

export interface EncryptedPayload {
  encrypted: true;
  ciphertext: string; // base64
  iv: string;         // base64, 12 bytes, unique per save
  salt: string;       // base64, 16 bytes, fixed per page
}

export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).encrypted === true &&
    typeof (value as Record<string, unknown>).ciphertext === 'string' &&
    typeof (value as Record<string, unknown>).iv === 'string' &&
    typeof (value as Record<string, unknown>).salt === 'string'
  );
}

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function decode(str: string): Uint8Array<ArrayBuffer> {
  const binary = atob(str);
  const out = new Uint8Array(binary.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password) as Uint8Array<ArrayBuffer>,
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256'},
    keyMaterial,
    {name: 'AES-GCM', length: 256},
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt with an already-derived key. Re-uses the existing salt so the key stays valid. */
export async function encryptWithKey(
  content: object,
  key: CryptoKey,
  salt: string,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(content));
  const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, plaintext);
  return {
    encrypted: true,
    ciphertext: encode(new Uint8Array(ciphertext)),
    iv: encode(iv),
    salt,
  };
}

/** Derive key + encrypt. Generates a fresh random salt when none is provided. */
export async function encryptContent(
  content: object,
  password: string,
  existingSalt?: string,
): Promise<{ payload: EncryptedPayload; key: CryptoKey }> {
  const saltBytes: Uint8Array<ArrayBuffer> = existingSalt
    ? decode(existingSalt)
    : (crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>);
  const key = await deriveKey(password, saltBytes);
  const payload = await encryptWithKey(content, key, encode(saltBytes));
  return {payload, key};
}

/** Derive key + decrypt. Throws DOMException on wrong password (AES-GCM auth failure). */
export async function decryptContent(
  payload: EncryptedPayload,
  password: string,
): Promise<{ data: object; key: CryptoKey }> {
  const salt = decode(payload.salt);
  const key = await deriveKey(password, salt);
  const data = await decryptWithKey(payload, key);
  return {data, key};
}

export async function decryptWithKey(payload: EncryptedPayload, key: CryptoKey): Promise<object> {
  const iv = decode(payload.iv);
  const ciphertext = decode(payload.ciphertext);
  const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv}, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as object;
}
