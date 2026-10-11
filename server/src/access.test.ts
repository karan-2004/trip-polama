import { describe, expect, it } from 'vitest';
import { accessCookie, accessSession, validPassword, RequestBudget } from './access';

describe('demo access controls', () => {
  const config = { password: 'a-long-demo-password', secret: 's'.repeat(40), secure: true };
  it('validates passwords and creates expiring secure HTTP-only cookies', () => {
    expect(validPassword(config.password, config.password)).toBe(true);
    expect(validPassword('wrong', config.password)).toBe(false);
    expect(validPassword(null, config.password)).toBe(false);
    const cookie = accessCookie(config, 1000000);
    expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('Secure'); expect(cookie).toContain('SameSite=Strict');
    expect(accessSession(cookie, config.secret, 1000000)).toBeTruthy();
    expect(accessSession(cookie, config.secret, 1000000 + 8 * 3600 * 1000)).toBeNull();
  });
  it('rejects tampered cookies and invalidates sessions after secret rotation', () => {
    const cookie = accessCookie(config);
    expect(accessSession(cookie.replace('trip_polama_access=', 'trip_polama_access=x'), config.secret)).toBeNull();
    expect(accessSession(cookie, 'other-secret')).toBeNull();
    expect(accessSession('trip_polama_access=not-a-token', config.secret)).toBeNull();
  });
  it('bounds requests and resets a window without trusting forwarded client IPs', () => {
    const limit = new RequestBudget(2, 1000);
    expect(limit.allow('session', 0)).toBe(true);
    expect(limit.allow('session', 1)).toBe(true);
    expect(limit.allow('session', 2)).toBe(false);
    expect(limit.allow('session', 1001)).toBe(true);
  });
});
