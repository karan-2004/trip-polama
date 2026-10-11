import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTripServer, type ServerSettings } from './http';

let root: string;
let app: ReturnType<typeof createTripServer>;
let base: string;
const origin = 'https://trip-polama.example';
const password = 'a-long-demo-password';
const runner = vi.fn().mockResolvedValue({ answer: { reply: 'Test plan', actions: [] }, sources: [], model: 'test' });
let settings: ServerSettings;
async function start() {
  app = createTripServer(settings, runner);
  await new Promise<void>((done) => app.server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
}
async function signIn() {
  const response = await fetch(base + '/api/session', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
  expect(response.status).toBe(200);
  return response.headers.get('set-cookie')!.split(';')[0]!;
}
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'trip-polama-http-'));
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'index.html'), '<html>trip-polama</html>');
  await writeFile(join(root, 'sw.js'), '/* service worker */');
  await writeFile(join(root, 'manifest.webmanifest'), '{"name":"trip-polama"}');
  await writeFile(join(root, 'assets', 'app-test.js'), 'console.log("app");');
  settings = { production: true, origin, staticRoot: root,
    access: { password, secret: 's'.repeat(40), secure: true }, planner: { baseUrl: '', model: '', apiKey: '' } };
  runner.mockClear();
  await start();
});
afterEach(async () => {
  app.abortPending();
  app.server.closeAllConnections();
  await new Promise<void>((done) => app.server.close(() => done()));
  await rm(root, { recursive: true, force: true });
});

describe('production HTTP server', () => {
  it('serves health checks, frontend, deep-link HTML, assets and uncached service worker', async () => {
    expect(await (await fetch(base + '/healthz')).json()).toEqual({ status: 'ok' });
    expect(await (await fetch(base)).text()).toContain('trip-polama');
    expect((await fetch(base + '/trips/demo', { headers: { Accept: 'text/html' } })).status).toBe(200);
    const asset = await fetch(base + '/assets/app-test.js');
    expect(asset.headers.get('content-type')).toContain('javascript');
    expect(asset.headers.get('cache-control')).toContain('immutable');
    const worker = await fetch(base + '/sw.js');
    expect(worker.headers.get('cache-control')).toBe('no-cache');
    expect((await fetch(base + '/manifest.webmanifest')).headers.get('content-type')).toBe('application/manifest+json');
  });
  it('does not serve missing API/asset routes, hidden files or traversal targets as the SPA', async () => {
    for (const path of ['/api', '/api/missing', '/assets/missing.js', '/.env', '/%2e%2e%2fpackage.json']) {
      expect((await fetch(base + path, { headers: { Accept: 'text/html' } })).status).toBe(404);
    }
  });
  it('blocks anonymous, cross-origin and tampered-session planner calls before inference', async () => {
    const body = JSON.stringify({ messages: [{ role: 'user', content: 'Plan' }], trip: null });
    expect((await fetch(base + '/api/planner/chat', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body })).status).toBe(401);
    expect((await fetch(base + '/api/planner/chat', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body })).status).toBe(403);
    expect((await fetch(base + '/api/planner/chat', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: 'trip_polama_access=forged' }, body })).status).toBe(401);
    expect(runner).not.toHaveBeenCalled();
  });
  it('signs in, calls the planner with a cookie, and signs out without exposing credentials', async () => {
    expect(await (await fetch(base + '/api/session')).json()).toEqual({ requiresSignIn: true, signedIn: false });
    const cookie = await signIn();
    const response = await fetch(base + '/api/planner/chat', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie }, body: '{"messages":[{"role":"user","content":"Plan"}],"trip":null}' });
    expect(response.status).toBe(200); expect(runner).toHaveBeenCalledOnce();
    expect(await response.text()).not.toContain(password);
    const logout = await fetch(base + '/api/session', { method: 'DELETE', headers: { Origin: origin, Cookie: cookie } });
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(await (await fetch(base + '/api/session')).json()).toEqual({ requiresSignIn: true, signedIn: false });
  });
  it('applies a global planner budget and rejects oversized bodies without inference', async () => {
    app.server.closeAllConnections(); await new Promise<void>((done) => app.server.close(() => done()));
    settings.hourlyLimit = 1; await start();
    const cookie = await signIn();
    const headers = { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie };
    expect((await fetch(base + '/api/planner/chat', { method: 'POST', headers, body: '{}' })).status).toBe(200);
    expect((await fetch(base + '/api/planner/chat', { method: 'POST', headers, body: '{}' })).status).toBe(429);
    expect(runner).toHaveBeenCalledOnce();
    // Fresh server to isolate the payload limit from the hourly budget.
    app.server.closeAllConnections(); await new Promise<void>((done) => app.server.close(() => done()));
    settings.hourlyLimit = 30; await start();
    const nextCookie = await signIn();
    expect((await fetch(base + '/api/planner/chat', { method: 'POST', headers: { ...headers, Cookie: nextCookie }, body: JSON.stringify({ text: 'x'.repeat(65000) }) })).status).toBe(413);
    expect(runner).toHaveBeenCalledOnce();
  });
  it('fails closed when production authentication is missing or weak', () => {
    expect(() => createTripServer({ ...settings, access: undefined })).toThrow('Production requires');
    expect(() => createTripServer({ ...settings, access: { ...settings.access!, password: 'weak' } })).toThrow('Production requires');
    expect(() => createTripServer({ ...settings, origin: 'http://public.example' })).toThrow('HTTPS origin');
  });
});
