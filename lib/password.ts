// lib/password.ts
function toBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(b64: string) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function assertBrowserCrypto() {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('이 기능은 브라우저 환경에서만 사용할 수 있습니다.');
  }
}

export function generateSalt(byteLength = 16) {
  assertBrowserCrypto();
  const bytes = new Uint8Array(byteLength);
  window.crypto.getRandomValues(bytes);
  return toBase64(bytes);
}

export async function hashPassword(password: string, saltBase64: string) {
  assertBrowserCrypto();
  const enc = new TextEncoder();

  const saltBytes = fromBase64(saltBase64);
  const passBytes = enc.encode(password);

  const merged = new Uint8Array(saltBytes.length + passBytes.length);
  merged.set(saltBytes, 0);
  merged.set(passBytes, saltBytes.length);

  const digest = await window.crypto.subtle.digest('SHA-256', merged);
  return toBase64(new Uint8Array(digest));
}

export async function createPasswordBundle(password: string) {
  const salt = generateSalt();
  const hash = await hashPassword(password, salt);
  return { salt, hash };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const hash = await hashPassword(password, salt);
  return hash === expectedHash;
}