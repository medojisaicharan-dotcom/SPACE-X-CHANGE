import { IS_SUPABASE_MODE } from '@/lib/config';

// Demo-mode password hashing.
// In Supabase mode passwords are handled by Supabase Auth (bcrypt server-side).
// In local demo mode we never persist plain-text passwords: we store a salted
// SHA-256 digest so the browser demo does not leak credentials in plain text.
// This is not a substitute for a production authentication server.

const SALT = 'spacexchange.demo.salt.v1';

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${SALT}:${password}`);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Very old browsers only: deterministic fallback, still not plain text.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  const text = `${SALT}:${password}`;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  return `fallback-${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
}

export function createId(prefix = ''): string {
  // Postgres uses uuid primary keys. In Supabase mode we therefore return a
  // bare UUID and ignore the human-readable prefix used by demo-mode ids.
  if (globalThis.crypto?.randomUUID) {
    const id = globalThis.crypto.randomUUID();
    return IS_SUPABASE_MODE ? id : prefix ? `${prefix}_${id}` : id;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  if (IS_SUPABASE_MODE) {
    // Extremely old browsers without crypto.randomUUID. Produce a RFC-4122 v4
    // shaped value so Postgres still accepts it.
    const hex = `${Date.now().toString(16)}${rand}`.padEnd(32, '0').slice(0, 32);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  }
  return prefix ? `${prefix}_${Date.now().toString(36)}${rand}` : `${Date.now().toString(36)}${rand}`;
}
