# trip-polama - Plan v7: Protected Render Demo

**Version:** v7 | **Date:** 2026-10-11 | **Status:** Approved deployment branch request

## Goal and Decisions

Keep the chat-first online planner/local manager architecture and deploy a protected
submission demo on Render. A single Node Web Service serves the PWA and planner
API under one HTTPS origin. Work stays on `deployment`, without altering master.

| Area | Decision |
|---|---|
| Hosting | Render Node Web Service, monorepo root, built frontend + API |
| Runtime | Node 20.19.2, production start script, Render PORT and 0.0.0.0 |
| Health | /healthz, no sign-in or model calls |
| Planner access | Shared demo password, signed expiring HTTP-only secure cookie |
| Secrets | Server environment only; fail closed if access secrets missing/weak |
| Limits | Login, session, global-hour and concurrency budgets; bounded tools/timeouts |
| User experience | Natural sign-in, no provider-key/configuration forms |
| Local manager | Separate local route; hosting does not provide device inference |
| Data | Browser-local trips/photos; no added cloud storage or automatic sync |
| Verification | Synthetic HTTP/access tests and local production smoke; no paid model calls needed |

## Product Architecture

The main interface is a persistent trip conversation. Exploration defaults to a
larger online planner; created trips default to local management. Research/Replan
switches explicitly without losing history. Manual tools share the same records.

- Planner uses bounded, allowlisted destination/place research and optional web
  search. Recommendations carry source URLs/times, never fabricated coordinates.
- Before creation, show named destination spots. A readable review lets the user
  select stops; trip/waypoints/action status commit atomically after confirmation.
- Manager uses saved data and deterministic calculations. Known short reads bypass
  inference; natural reads select a tool and facts come from the full records.
- Reads/calculations/navigation need no approval. Mutations require confirmation
  with human labels/values, not JSON. Guard trip scope and duplicate execution.
- Chat supports multi-photo previews and local atomic album/history batches; image
  bytes are not sent to either model and Photos never adds location tags.
- UI retains the light nature palette and no coordinate-entry/developer-setup UX.

## Implementation Layout

```text
Render HTTPS -> Node production server
                  /healthz                public readiness
                  /                       public built PWA/manual tools
                  /api/session            demo sign-in/status/sign-out
                  /api/planner/chat        signed access + limits -> online model/tools
Browser IndexedDB -> shared trip store, local read manager, images/history
Local Ollama -> natural manager inference when available; WebLLM remains planned
```

React/Vite/TypeScript frontend, Dexie local store, Zod tool contracts, Node/tsx
server and MapLibre/OpenFreeMap maps remain. Render Blueprint and docs list exact
commands, settings, secrets and testing. No actual deployment or credential changes
are implied by committing the branch; pushing/provisioning needs explicit action.

## Security and Deployment Boundaries

- Production cannot start without a built frontend, valid HTTPS origin, secure
  access cookie settings, >=16-character demo password and >=32-character session secret.
- Model keys and session secrets stay out of client variables, commits and logs.
- Authenticated access is required before paid inference; Origin checks additionally
  protect state-changing API routes, but do not replace authentication.
- Cookies expire after eight hours. Secret rotation invalidates tokens. Sign-out
  clears the browser cookie; this stateless demo does not provide per-user revocation.
- Login/session/global budgets are per-instance/in-memory and restart on deploy;
  provider-level spending caps remain necessary. This is not full account auth.
- Serve only build output, reject traversal/hidden files, avoid API-to-HTML rewrites,
  and revalidate HTML/service-worker/manifest updates.
- Health checks do not test provider access. Graceful shutdown cancels planner requests.
- IndexedDB is origin-specific; deployment does not migrate localhost data. Render
  does not host the developer's local model. Manual tools/quick reads remain available.

## Deferred Work Carried Forward

- Supabase identities/team authorization/sync and persistent distributed limits.
- Faster/device-local inference with WebLLM; wider natural-language retrieval testing.
- WebRTC coordination and offline PMTiles downloads.
- Additional current-resource adapters with source/freshness checks; no autonomous bookings.
- Offline photo location-metadata sanitization (EXIF/XMP/IPTC), preserving appearance
  and validating supported-format/GPS fixtures before export/sharing claims.
- docs/testing.md behavioral matrix and Vitest statement/branch/function/line reports,
  including untested source. Establish baseline/exclusions before threshold policy;
  CI artifacts later. Test counts remain distinct from measured coverage.
- Browser/device/install/offline E2E, quota/eviction behavior and real Render cold starts.

## Acceptance and Roadmap

1. Create deployment branch, add production serving/auth/limits/health and configuration.
2. Test cookie expiry/tampering, CSRF, unauthorized calls, payload/rate limits,
   frontend assets/deep links, path restrictions and fail-closed startup.
3. Build and smoke-test actual production start with synthetic secrets, no inference.
4. Commit on deployment. Only push/deploy when authorized, then provision using
   render.yaml or the manual guide and configure secrets in Render.
5. Verify live TLS, sign-in, planner sources/creation and browser-local media behavior.
6. Continue deferred reliability/security/features without misrepresenting demo scope.
