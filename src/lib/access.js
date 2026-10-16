// A browser-only convenience gate. It is not server-side authentication.
export const ACCESS_KEY = 'function-study:access:v1';
export const ACCESS_DIGEST = '63075cf5a34e6685ffb9be2e009b5ece6efae26232223575ac382fafa6ae335a';
export const REMEMBER_MS = 7 * 24 * 60 * 60 * 1000;

export function validAccess(raw, now = Date.now()) {
  try {
    const entry = JSON.parse(raw);
    return entry?.version === ACCESS_DIGEST && Number.isFinite(entry.expiresAt) && entry.expiresAt > now && entry.expiresAt <= now + REMEMBER_MS
      ? entry : null;
  } catch { return null; }
}

export async function matchesAccess(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('') === ACCESS_DIGEST;
}
