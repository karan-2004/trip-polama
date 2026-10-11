# trip-polama — Plan v1: Initial Architecture

**Version:** v1 · **Date:** 2026-10-11 · **Status:** Approved

## Goal

Build an offline-first, split-brain trip planner/manager for outdoor trips as a
PWA, with open-source AI at its core. One local data store, two independent
"brains":

- **Local brain** (offline, no signal): expenses, offline map, "what next"
  suggestions, photo log, buddy location tracking. Pure on-device compute.
- **Online brain** (open model): trip planning using open-weight LLMs + online
  resources (forecast, POIs, permits).

The open model is what makes the split work: it runs fully on-device for the
local brain, so nothing (location, money, photos) ever leaves the phone in the
backcountry.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Timeline | No-rush full build (not bound by the Hacktoberfest Week 1 deadline) |
| Platform | PWA (React + TypeScript) |
| Backend | Supabase (Auth + Postgres + Realtime + RLS) |
| Sync | Full multi-device sync + accounts in v1 |
| On-device AI | WebLLM open model in v1 (with deterministic fallback) |
| Buddy tracking | Live P2P (WebRTC) + Supabase Realtime |
| Auth | Supabase Auth |
| Kickoff | Phase 0–1 first (repo, PWA shell, data model, store, CI) |

## Stack

- Vite + React + TypeScript, `vite-plugin-pwa`
- IndexedDB via Dexie.js (local-first store)
- MapLibre GL + PMTiles (offline vector map)
- Tailwind CSS
- Vitest (pure logic) + Playwright (E2E incl. offline)
- Supabase (Auth/Postgres/Realtime), Cloudflare Worker (LLM proxy)
- WebLLM (on-device model), WebRTC (P2P)

## Repo structure

```
trip-polama/
  package.json          # npm workspaces
  apps/web/             # Vite + React PWA
  packages/core/        # shared types + pure brain logic (framework-free, tested)
  packages/store/       # Dexie schemas + sync engine
  packages/online-brain/# open-model client (Ollama / OpenAI-compatible) + fallback
  server/               # Cloudflare Worker: LLM proxy + (later) sync
```

## Component design

1. **Data model** (`packages/core`): `Trip` → `Waypoint` (lat/lon, elevation,
   terrain-kind, visited), `Expense` (amount, category, paid_by, split), `Photo`
   (blob ref + note + location), `Member`, `MemberLocation` (last-known +
   timestamp). Every record carries `updated_at` + `device_id` for sync.

2. **Local brain** (`packages/core`, offline, deterministic):
   - `suggestNext(...)`: haversine + weather/visibility + daylight budget +
     elevation gain + pace → ranked waypoints with plain-language reasons.
   - `settleExpenses(...)`: totals + per-person shares.
   - Offline map: PMTiles + MapLibre; waypoints/buddies as GeoJSON overlays.
   - On-device WebLLM model enhances suggestions; deterministic heuristics are
     the always-on fallback (works on any device, no GPU needed).

3. **Online brain** (`packages/online-brain`): trip planning (itinerary/day,
   packing, budget). Chain: local Ollama → proxy (open model) → deterministic
   offline fallback.

4. **Sync engine** (`packages/store`): local-first; batch push/pull on reconnect;
   timestamp + device-id merge (last-write-wins per record). Auth via persisted
   refresh token so the app works offline after first login.

5. **Buddy tracking**: dual mode — Supabase Realtime presence when online;
   manual-signaling WebRTC DataChannel (host shows code/QR carrying the offer,
   peers paste it) for offline P2P over the same local network.

## Risks + mitigations

- **WebLLM** (high risk): needs WebGPU + 1–3 GB weights. Mitigation: small open
  model (Gemma-2-2B-IT / Llama-3.2-1B), cached in Cache Storage (one download,
  then offline); deterministic fallback always available.
- **Live P2P** (highest risk): WebRTC needs signaling; browsers lack mDNS/BLE
  discovery; PWA background GPS stops when the phone locks. Mitigation: manual
  signaling + Supabase Realtime dual mode; document limits honestly.

## Roadmap (risky pieces front-loaded as spikes)

| Phase | Deliverable | Exit criteria |
|---|---|---|
| 0 | Repo, Vite+PWA, tooling, CI | typecheck/lint/test green |
| 1 | Data model + Dexie store + SW precache | offline CRUD survives reload |
| 2 | Spike: WebLLM on-device model + fallback | suggestion works w/ and w/o GPU |
| 3 | Spike: WebRTC manual-signal P2P | two devices share a location offline |
| 4 | Supabase auth + sync engine + RLS | offline edits reconcile across two accounts |
| 5 | Local brain features: expenses, offline map, suggestions, photos, check-ins | all work in airplane mode |
| 6 | Online brain: LLM planning + proxy + fallback | plan w/ and w/o network |
| 7 | PWA polish + E2E offline tests + Lighthouse | install/offline passing |

## Testing

- Vitest: every pure function in `core` + `online-brain`.
- Playwright: offline-first flows (load, kill network, use features, reconnect,
  verify sync).

## Immediate next step (Phase 0–1)

1. Scaffold npm-workspaces monorepo + git.
2. `apps/web`: Vite + React + TS + `vite-plugin-pwa`.
3. `packages/core`: types + pure brain logic (settle, haversine/suggest) + tests.
4. `packages/store`: Dexie schemas + typed API.
5. Root ESLint/Prettier/tsconfig + GitHub Actions CI.
6. Verify typecheck/lint/test green.
