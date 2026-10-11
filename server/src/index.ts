import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createTripServer } from './http';

const production = process.env.NODE_ENV === 'production';
const staticRoot = fileURLToPath(new URL('../../apps/web/dist/', import.meta.url));
if (production && !existsSync(`${staticRoot}/index.html`)) throw new Error('Build the frontend before starting production.');
const origin = process.env.PLANNER_ALLOWED_ORIGIN || process.env.RENDER_EXTERNAL_URL
  || (production ? '' : 'http://localhost:5173');
if (!origin || (production && new URL(origin).protocol !== 'https:')) throw new Error('Production requires the deployed HTTPS origin.');
const password = process.env.DEMO_ACCESS_PASSWORD || '';
const secret = process.env.SESSION_SECRET || '';
const hourlyLimit = Number(process.env.PLANNER_MAX_REQUESTS_PER_HOUR || 30);
if (!Number.isInteger(hourlyLimit) || hourlyLimit < 1 || hourlyLimit > 1000) throw new Error('Invalid planner request limit.');
if ((password || secret) && (!password || !secret)) throw new Error('Configure both demo access password and session secret.');
const app = createTripServer({ production, origin, staticRoot: production ? staticRoot : undefined,
  access: password && secret ? { password, secret, secure: production } : undefined,
  hourlyLimit, planner: {
    baseUrl: process.env.PLANNER_BASE_URL || '', model: process.env.PLANNER_MODEL || '',
    apiKey: process.env.PLANNER_API_KEY || '', searchKey: process.env.BRAVE_SEARCH_API_KEY,
  },
});
const port = Number(process.env.PORT || process.env.PLANNER_PORT || 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid server port.');
app.server.listen(port, production ? '0.0.0.0' : '127.0.0.1', () => {
  console.info(`trip-polama ${production ? 'production server' : 'development gateway'} listening on port ${port}.`);
});
process.on('SIGTERM', () => {
  app.abortPending(); app.server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
});
