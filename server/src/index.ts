import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { PlannerError, runOnlinePlanner } from './planner';

// Development-only loopback gateway. Public deployment requires auth/rate limits.
let inFlight = 0;
const origin = process.env.PLANNER_ALLOWED_ORIGIN || 'http://localhost:5173';
const server = createServer(async (request, response) => {
  const requestId = randomUUID();
  response.setHeader('X-Request-ID', requestId);
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  const reply = (status: number, data: unknown) => { if (!response.destroyed) { response.writeHead(status); response.end(JSON.stringify(data)); } };
  if (request.url !== '/api/planner/chat' || request.method !== 'POST') return reply(404, { error: 'Not found' });
  if (request.headers.origin !== origin || !request.headers['content-type']?.startsWith('application/json')) return reply(403, { error: 'Origin or content type not allowed' });
  if (inFlight >= 2) return reply(429, { error: 'Planner busy; retry later' });
  inFlight++;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 150000);
  response.on('close', () => controller.abort());
  try {
    let body = '';
    for await (const chunk of request) {
      body += chunk.toString();
      if (Buffer.byteLength(body) > 64000) throw new PlannerError('Request too large', 413);
    }
    let input: unknown;
    try { input = JSON.parse(body); } catch { throw new PlannerError('Invalid JSON', 400); }
    const result = await runOnlinePlanner(input, {
      baseUrl: process.env.PLANNER_BASE_URL || '', model: process.env.PLANNER_MODEL || '',
      apiKey: process.env.PLANNER_API_KEY || '', searchKey: process.env.BRAVE_SEARCH_API_KEY,
    }, controller.signal);
    reply(200, result);
  } catch (reason) {
    const status = reason instanceof ZodError ? 400 : reason instanceof PlannerError ? reason.status : 502;
    const code = reason instanceof ZodError ? 'invalid_planning_context'
      : reason instanceof PlannerError ? reason.code : controller.signal.aborted ? 'planner_cancelled' : 'planner_upstream_error';
    // Log identifiers/classification only: never chat text, raw model output or credentials.
    console.warn('[planner] request failed', { requestId, code, status });
    reply(status, { code, requestId, error: reason instanceof PlannerError ? reason.message : 'Planner request failed.' });
  } finally { clearTimeout(timeout); inFlight--; }
});
server.listen(Number(process.env.PLANNER_PORT || 8787), '127.0.0.1', () => {
  console.info('trip-polama planner gateway listening on loopback. Configure PLANNER_* settings to enable the online model.');
});
