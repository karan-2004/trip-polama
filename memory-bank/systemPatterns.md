# System Patterns — trip-polama

## Split-brain architecture
One local data store, two distinct model routes and shared validated tools:
- **Online planner**: larger LLM plus online research tools; source-backed planning
  and explicit replanning. Server-configured OpenAI-compatible provider; Wikipedia
  destination research and optional Brave search, with source links/timestamps.
- **Local manager**: lightweight local agent for chat-based reads/writes, summaries
  and quick responses; deterministic functions handle arithmetic and ranking.
- Manual controls share the same commands/data. Writes require confirmation;
  local reads need no mutation approval. No silent cloud escalation for management.
- Separate routes: online via /api/planner/chat, local via explicit Ollama manager.
  Session role persists; creation selects manager. No cross-agent error fallback.
- Manager uses compact recent history/context and one requested action per reply.
- Planner gateway is loopback development-only; public auth/deployment is pending.

## Local-first sync
- IndexedDB (Dexie) is the source of truth on-device.
- Every record carries `updated_at` + `device_id`.
- Sync batches push/pull on reconnect; merge is last-write-wins per record.
- Auth uses a persisted refresh token so the app works offline after first login.

## Deterministic fallback everywhere
Any feature that touches a model or the network must keep working when it can't:
- On-device model unavailable → heuristics.
- Online planner unreachable -> explicit unavailable state, cached plans/manual
  creation still usable. A template is not live researched planning.
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
