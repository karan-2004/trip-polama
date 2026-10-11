# System Patterns — TrailBrain

## Split-brain architecture
One local data store, two independent brains:
- **LocalBrain** — deterministic, offline, framework-free pure functions (suggestions, settlement).
- **OnlineBrain** — open-model client with a deterministic fallback.

Both write to the same local store; the online brain is optional enrichment, never a hard dependency.

## Local-first sync
- IndexedDB (Dexie) is the source of truth on-device.
- Every record carries `updated_at` + `device_id`.
- Sync batches push/pull on reconnect; merge is last-write-wins per record.
- Auth uses a persisted refresh token so the app works offline after first login.

## Deterministic fallback everywhere
Any feature that touches a model or the network must keep working when it can't:
- On-device model unavailable → heuristics.
- Open model unreachable → templated offline plan.
- No signal → all local-brain features still work.

## Monorepo layout
- `apps/web` — UI + PWA shell.
- `packages/core` — pure, tested, framework-free logic + types.
- `packages/store` — Dexie schemas + sync engine.
- `packages/online-brain` — model client.
- `server/` — serverless proxy (holds keys, calls open models).

## Key decisions
- Chat-first: one persistent planner/manager conversation per trip. Schemas define
  model tools; transactions apply confirmed actions to the manual screens' store.
  Conversation execution/audit statuses prevent duplicate execution. Model context
  is freshly loaded and excludes structured location fields and image bytes.
- Photos: no device-location capture or tags. Embedded location-metadata stripping
  is deferred in Plan v2; do not equate hidden app tags with sanitized images.
- PWA over native (faster to ship; installable; GPS via browser).
- Supabase for auth + Postgres + Realtime + RLS.
- WebLLM for on-device inference (cached weights, WebGPU).
- WebRTC manual-signal for offline P2P; Supabase Realtime when online.
