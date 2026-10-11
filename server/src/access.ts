import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const COOKIE = 'trip_polama_access';
const LIFETIME = 8 * 60 * 60;
export interface DemoAccess { password: string; secret: string; secure: boolean }

export function validPassword(password: unknown, expected: string): boolean {
  if (typeof password !== 'string' || password.length > 512) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(password), digest(expected));
}

export function accessCookie(config: DemoAccess, now = Date.now()): string {
  const value = Buffer.from(JSON.stringify({ id: randomUUID(), expires: Math.floor(now / 1000) + LIFETIME })).toString('base64url');
  const signature = createHmac('sha256', config.secret).update(value).digest('base64url');
  return `${COOKIE}=${value}.${signature}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${LIFETIME}${config.secure ? '; Secure' : ''}`;
}

export function clearAccessCookie(secure: boolean): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function accessSession(cookie: string | undefined, secret: string, now = Date.now()): string | null {
  const token = cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!token || token.length > 2048) return null;
  const [value, signature, extra] = token.split('.');
  if (!value || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(value).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(value, 'base64url').toString()) as { id?: unknown; expires?: unknown };
    const seconds = Math.floor(now / 1000);
    if (typeof data.id !== 'string' || !data.id.length || data.id.length > 100 || typeof data.expires !== 'number'
      || !Number.isInteger(data.expires) || data.expires <= seconds || data.expires > seconds + LIFETIME) return null;
    return data.id;
  } catch { return null; }
}

/** In-memory, per-instance budgets. Provider-side spending caps are still required. */
export class RequestBudget {
  private entries = new Map<string, { count: number; expires: number }>();
  constructor(private maximum: number, private windowMs: number) {}
  allow(key: string, now = Date.now()): boolean {
    for (const [id, entry] of this.entries) if (entry.expires <= now) this.entries.delete(id);
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= 1000) return false;
      entry = { count: 0, expires: now + this.windowMs };
      this.entries.set(key, entry);
    }
    if (entry.count >= this.maximum) return false;
    entry.count++;
    return true;
  }
}
