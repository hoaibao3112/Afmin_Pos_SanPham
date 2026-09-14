export const COOKIE_NAME = 'admin_session';

const DEFAULT_SECRET = 'cam-tuyen-house-super-secret-key-686868-admin-session-2026';
export const DEFAULT_PIN = '123123';

export function getAdminPin(): string {
  return process.env.ADMIN_PIN || DEFAULT_PIN;
}

export function verifyPin(inputPin: string): boolean {
  const actualPin = getAdminPin();
  if (!inputPin || inputPin.length !== actualPin.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < actualPin.length; i++) {
    mismatch |= inputPin.charCodeAt(i) ^ actualPin.charCodeAt(i);
  }
  return mismatch === 0;
}

export interface SessionPayload {
  role: string;
  accountId: string;
  exp: number;
  iat: number;
}

function toBase64Url(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET || DEFAULT_SECRET;
  const enc = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    'raw',
    enc,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionToken(accountId: string = 'acc_default'): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    role: 'admin',
    accountId,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 ngày
  };

  const enc = new TextEncoder();
  const h64 = toBase64Url(enc.encode(JSON.stringify(header)));
  const p64 = toBase64Url(enc.encode(JSON.stringify(payload)));
  const message = `${h64}.${p64}`;

  const key = await getHmacKey();
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const s64 = toBase64Url(new Uint8Array(signature));

  return `${message}.${s64}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [h64, p64, s64] = parts;
    const message = `${h64}.${p64}`;
    const enc = new TextEncoder();

    const key = await getHmacKey();
    const sigBytes = fromBase64Url(s64);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as BufferSource,
      enc.encode(message)
    );

    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(fromBase64Url(p64));
    const payload: SessionPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (_e) {
    return null;
  }
}
