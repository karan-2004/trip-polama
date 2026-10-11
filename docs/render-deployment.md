# Render Deployment

Deploy the `deployment` branch as one Node Web Service. It serves the built PWA
and planner API on the same HTTPS origin. No Vite dev/preview process is used.

## Before Deploying

- Push the committed `deployment` branch to GitHub. Local commits alone do not
  make the branch available to Render.
- Keep real `.env` files, model keys, access passwords and session secrets out of Git.
- This is a protected submission demo, not the planned Supabase account system.
- Choose a random access password of at least 16 characters. Share it privately
  with reviewers, never in the public README or repository.
- Set spending/usage limits with your model provider as well as the app limits.

## Blueprint Setup

1. Open the Render Dashboard and connect your GitHub account.
2. Choose New -> Blueprint and select `karan-2004/trip-polama`.
3. Choose branch `deployment`. Render reads the repository's `render.yaml`.
4. Supply `PLANNER_API_KEY` and `DEMO_ACCESS_PASSWORD` when prompted.
5. Render generates `SESSION_SECRET`; do not copy it into frontend variables.
6. Create the service and wait for the build and health check to pass.
7. Open the assigned HTTPS URL. Sign in using the demo access password for online
   planning; manual trip tools remain available without sign-in.

The Blueprint uses the Free compute plan. Check Render's current idle/cold-start
limits; an always-on plan gives a more predictable live demonstration.

## Manual Web Service Setup

| Setting | Value |
|---|---|
| Repository | karan-2004/trip-polama |
| Branch | deployment |
| Language | Node |
| Root directory | Leave blank (monorepo root) |
| Build command | npm ci --include=dev && npm run build |
| Start command | npm start |
| Health check | /healthz |
| Node version | 20.19.2 |

`npm start` sets production mode and runs the server through the TypeScript
loader. Keep dev dependencies installed because the runtime currently uses tsx
and the workspace packages export TypeScript source.

## Environment and Secrets

| Variable | Purpose |
|---|---|
| NODE_ENV | production |
| NODE_VERSION | 20.19.2 |
| PLANNER_BASE_URL | https://ollama.com/v1 |
| PLANNER_MODEL | gemma4:31b (tested with the user's account) |
| PLANNER_API_KEY | Server-only model provider credential |
| DEMO_ACCESS_PASSWORD | Random demo password, at least 16 characters |
| SESSION_SECRET | Random server signing secret, at least 32 characters |
| PLANNER_MAX_REQUESTS_PER_HOUR | 30 by default, shared by all users on one instance |
| BRAVE_SEARCH_API_KEY | Optional server-only broader web search credential |
| PLANNER_ALLOWED_ORIGIN | Optional exact HTTPS origin, e.g. custom domain |

Render supplies `PORT` and `RENDER_EXTERNAL_URL`. The server binds `0.0.0.0` and
reads `PORT`. When `PLANNER_ALLOWED_ORIGIN` is unset it uses `RENDER_EXTERNAL_URL`.
Do not bulk-import the localhost origin from your development `.env`. For a
custom domain, explicitly set the exact HTTPS origin that users will visit.

Generate strong secrets locally using `openssl rand -hex 32`, or Render's secret
generator. Never paste actual values into issues, chat, source files or `VITE_*`.
No browser API-key fields or developer configuration instructions are displayed.

## Access and Request Controls

- Static UI and manual browser-local trip tools are public. Paid planner calls
  require demo sign-in in production.
- Access uses a signed, expiring HTTP-only cookie with Secure and SameSite=Strict.
  Password checks use constant-time digest comparison. Sign-out clears the cookie.
- Sessions expire after eight hours. Rotating `SESSION_SECRET` invalidates issued
  cookies; changing the shared password alone does not invalidate existing cookies.
- This is shared demo access, not individual identities, team permissions or sync.
- Login attempts are limited to ten per fifteen minutes per instance, globally.
- Planner calls are limited to six per minute per session, thirty per hour globally
  by default, and two concurrent calls. Origin checks are additional CSRF protection,
  not a substitute for authentication.
- Request bodies are bounded; model/tool loops retain their step/time limits.
- Limits are in memory and reset after restarts; multiple instances have independent
  budgets. Do not treat them as a durable account-wide cost cap. Also use provider caps.
- Diagnostics log only request references, error classification and status. They
  must not include passwords, cookies, chat text or raw model responses.

## Serving and Caching

- Frontend files come only from `apps/web/dist`; hidden files/path traversal are blocked.
- Missing API or asset requests return errors, not the SPA HTML page.
- Client-side HTML routes fall back to `index.html`. Hashed assets are immutable;
  HTML, manifest and service worker are revalidated so updates can propagate.
- API/session responses are not cached. `/healthz` requires no sign-in and makes
  no provider calls. It reports server health, not model availability.
- Render terminates HTTPS. Security headers preserve camera/geolocation use while
  denying framing and microphone access, which this app does not need.

## What Hosting Does Not Add

- Render does not run the Ollama instance on your computer. Visitors get manual
  tools and deterministic quick reads; natural-language local-manager inference
  still requires their own reachable local model. No silent cloud substitution.
- WebLLM, offline map downloads, account sync and photo metadata stripping remain planned.
- Browser IndexedDB is per origin/device. Localhost trips/photos do not automatically
  migrate to an onrender.com or custom domain. No server disk is needed for them.
- Images stay in the browser; neither sign-in nor deployment uploads them to Render.

## Verification Checklist

1. `/healthz` returns 200 without model usage.
2. Homepage, asset URLs, manifest and service worker load over HTTPS.
3. Without signing in, manual tools work and online planning asks for access.
4. Wrong passwords fail; correct demo access unlocks planning; sign-out clears access.
5. Name-only requests clarify missing details. Reviewed creation saves selected stops.
6. Source-backed online research works with your provider's actual account access.
7. Photos persist locally; camera/geolocation prompts work on a physical device.
8. The provider dashboard shows expected usage; request limits block further calls.
9. New pushes rebuild the linked branch, and service-worker refresh displays the new app.

Automated HTTP tests cover serving, path restrictions, auth cookies, CSRF origin
checks, request budgets, body limits and fail-closed startup. Production startup
is smoke-tested locally with synthetic access secrets and no paid inference.
Render provisioning, TLS, free-plan cold starts and physical-device checks still
need verification after the actual deployment.
