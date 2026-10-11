import { createServer, type IncomingMessage } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { ZodError } from 'zod';
import { PlannerError, runOnlinePlanner, type PlannerSettings } from './planner';
import { validPassword, accessCookie, clearAccessCookie, accessSession, RequestBudget, type DemoAccess } from './access';

export interface ServerSettings {
  production: boolean;
  origin: string;
  staticRoot?: string;
  access?: DemoAccess;
  planner: PlannerSettings;
  hourlyLimit?: number;
}
type PlannerRunner = typeof runOnlinePlanner;
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

async function readJson(request: IncomingMessage, limit: number): Promise<unknown> {
  const length = Number(request.headers['content-length']);
  if (Number.isFinite(length) && length > limit) { request.resume(); throw new PlannerError('Request too large', 413, 'request_too_large'); }
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > limit) throw new PlannerError('Request too large', 413, 'request_too_large');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new PlannerError('Invalid JSON', 400, 'invalid_planning_context'); }
}

export function createTripServer(settings: ServerSettings, runner: PlannerRunner = runOnlinePlanner) {
  if (settings.production && (!settings.staticRoot || !settings.access || settings.access.password.length < 16
    || settings.access.secret.length < 32 || !settings.access.secure)) {
    throw new Error('Production requires a built frontend, secure demo access, a 16-character password and 32-character session secret.');
  }
  const originUrl = new URL(settings.origin);
  if (settings.production && originUrl.protocol !== 'https:') throw new Error('Production requires an HTTPS origin.');
  const origin = originUrl.origin;
  const loginBudget = new RequestBudget(10, 15 * 60 * 1000);
  const globalBudget = new RequestBudget(settings.hourlyLimit ?? 30, 60 * 60 * 1000);
  const sessionBudget = new RequestBudget(6, 60 * 1000);
  let inFlight = 0;
  const controllers = new Set<AbortController>();
  const server = createServer(async (request, response) => {
    const requestId = randomUUID();
    response.setHeader('X-Request-ID', requestId);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()');
    response.setHeader('Cache-Control', 'no-store');
    if (settings.production) response.setHeader('Strict-Transport-Security', 'max-age=31536000');
    const reply = (status: number, data: unknown) => {
      if (!response.destroyed) {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.writeHead(status); response.end(JSON.stringify(data));
      }
    };
    let path: string;
    try { path = decodeURIComponent(new URL(request.url || '/', 'http://internal').pathname); }
    catch { return reply(400, { error: 'Invalid path' }); }
    if (path === '/healthz' && request.method === 'GET') return reply(200, { status: 'ok' });
    const access = settings.access;
    const session = access ? accessSession(request.headers.cookie, access.secret) : 'local-development';
    if (path === '/api/session' && request.method === 'GET') {
      return reply(200, { requiresSignIn: !!access, signedIn: !!session });
    }
    const isSessionWrite = path === '/api/session' && ['POST', 'DELETE'].includes(request.method || '');
    const isPlanner = path === '/api/planner/chat' && request.method === 'POST';
    if (isSessionWrite || isPlanner) {
      if (request.headers.origin !== origin) return reply(403, { code: 'origin_rejected', error: 'Request not allowed', requestId });
      if (request.method !== 'DELETE' && !request.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'JSON required', requestId });
      if (isSessionWrite) {
        if (request.method === 'DELETE') {
          response.setHeader('Set-Cookie', clearAccessCookie(access?.secure ?? false));
          return reply(200, { signedIn: false });
        }
        if (!access) return reply(200, { signedIn: true });
        if (!loginBudget.allow('login')) { response.setHeader('Retry-After', '900'); return reply(429, { code: 'signin_limited', error: 'Try again later' }); }
        try {
          const input = await readJson(request, 2048) as { password?: unknown };
          if (!input || !validPassword(input.password, access.password)) return reply(401, { code: 'signin_rejected', error: 'Sign-in rejected' });
          response.setHeader('Set-Cookie', accessCookie(access));
          return reply(200, { signedIn: true });
        } catch (reason) { return reply(reason instanceof PlannerError ? reason.status : 400, { error: 'Invalid sign-in request' }); }
      }
      if (!session) return reply(401, { code: 'planner_unauthorized', error: 'Sign in to use online planning', requestId });
      if (inFlight >= 2 || !sessionBudget.allow(session) || !globalBudget.allow('planner')) {
        response.setHeader('Retry-After', '60');
        return reply(429, { code: 'planner_limited', error: 'Planner usage limit reached', requestId });
      }
      inFlight++;
      const controller = new AbortController();
      controllers.add(controller);
      const timeout = setTimeout(() => controller.abort(), 150000);
      response.on('close', () => controller.abort());
      try {
        const input = await readJson(request, 64000);
        const result = await runner(input, settings.planner, controller.signal);
        reply(200, result);
      } catch (reason) {
        const status = reason instanceof ZodError ? 400 : reason instanceof PlannerError ? reason.status : controller.signal.aborted ? 504 : 502;
        const code = reason instanceof ZodError ? 'invalid_planning_context' : reason instanceof PlannerError ? reason.code
          : controller.signal.aborted ? 'planner_cancelled' : 'planner_upstream_error';
        console.warn('[planner] request failed', { requestId, code, status });
        reply(status, { code, requestId, error: 'Planner request failed' });
      } finally { clearTimeout(timeout); controllers.delete(controller); inFlight--; }
      return;
    }
    if (path === '/api' || path.startsWith('/api/') || !settings.staticRoot || !['GET', 'HEAD'].includes(request.method || '')) return reply(404, { error: 'Not found' });
    if (path.includes('\0') || path.includes('\\') || path.split('/').some((segment) => segment.startsWith('.'))) return reply(404, { error: 'Not found' });
    const root = resolve(settings.staticRoot);
    let file = resolve(root, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(root + sep)) return reply(404, { error: 'Not found' });
    try {
      if (!(await stat(file)).isFile()) throw new Error('Not a file');
    } catch {
      if (extname(path) || !request.headers.accept?.includes('text/html')) return reply(404, { error: 'Not found' });
      file = resolve(root, 'index.html');
    }
    try {
      const content = await readFile(file);
      response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
      response.setHeader('Cache-Control', path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      if (path === '/sw.js') response.setHeader('Service-Worker-Allowed', '/');
      response.writeHead(200); response.end(request.method === 'HEAD' ? undefined : content);
    } catch { reply(404, { error: 'Not found' }); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 15000;
  return { server, abortPending: () => controllers.forEach((controller) => controller.abort()) };
}
