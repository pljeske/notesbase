/**
 * Client-side AES-256-GCM encryption using the Web Crypto API.
 *
 * Keys are derived with PBKDF2 (100k iterations, SHA-256) and never leave the browser.
 * The server only ever stores opaque ciphertext.
 *
 * New format: payload has no `salt` field — the per-user salt is stored server-side
 *   and the key is derived once at login from the user's account password.
 * Legacy format: payload includes a `salt` field — per-page password was used.
 *   These pages are migrated to the new format on the next save.
 */

export interface EncryptedPayload {
  encrypted: true;
  ciphertext: string; // base64
  iv: string;         // base64, 12 bytes, unique per save
  salt?: string;      // base64, present only in legacy per-page-password format
}

export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).encrypted === true &&
    typeof (value as Record<string, unknown>).ciphertext === 'string' &&
    typeof (value as Record<string, unknown>).iv === 'string'
  );
}

/** Returns true for old per-page-password payloads that carry their own salt. */
export function isLegacyPayload(payload: EncryptedPayload): boolean {
  return typeof payload.salt === 'string';
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

function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password) as Uint8Array<ArrayBuffer>,
    'PBKDF2',
    false,
    ['deriveKey'],
  ).then(keyMaterial =>
    crypto.subtle.deriveKey(
      {name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256'},
      keyMaterial,
      {name: 'AES-GCM', length: 256},
      false,
      ['encrypt', 'decrypt'],
    )
  );
}

/**
 * Derives the per-user encryption key from the account password and the
 * server-provided salt (hex string). Called once at login; result kept in memory.
 */
export function deriveUserKey(password: string, saltHex: string): Promise<CryptoKey> {
  const saltBytes = decode(
    btoa(String.fromCharCode(...saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16))))
  );
  return deriveKey(password, saltBytes);
}

/** Encrypt with an already-derived key. Pass `legacySalt` only when preserving legacy format. */
export async function encryptWithKey(
  content: object,
  key: CryptoKey,
  legacySalt?: string,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(content));
  const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, plaintext as Uint8Array<ArrayBuffer>);
  return {
    encrypted: true,
    ciphertext: encode(new Uint8Array(ciphertext)),
    iv: encode(iv),
    ...(legacySalt !== undefined ? {salt: legacySalt} : {}),
  };
}

/** Decrypt with an already-derived key. */
export async function decryptWithKey(payload: EncryptedPayload, key: CryptoKey): Promise<object> {
  const iv = decode(payload.iv);
  const ciphertext = decode(payload.ciphertext);
  const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv}, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as object;
}

/**
 * Derive key + decrypt for legacy per-page-password payloads.
 * Throws DOMException on wrong password (AES-GCM auth failure).
 */
export async function decryptLegacy(
  payload: EncryptedPayload,
  password: string,
): Promise<{ data: object; key: CryptoKey }> {
  const salt = decode(payload.salt!);
  const key = await deriveKey(password, salt);
  const data = await decryptWithKey(payload, key);
  return {data, key};
}
