# Progress — TrailBrain

## Done
- Architecture plan approved (`plans/v1-initial-architecture.md`).
- Repo governance installed: `plans/`, `.cursor/rules/`, `memory-bank/`, `.gitignore`, `AGENTS.md`.
- **Phase 0–1 complete:**
  - npm-workspaces monorepo (apps/web, packages/core, packages/store, packages/online-brain, server).
  - `apps/web`: Vite + React + TS + `vite-plugin-pwa` (SW precache + manifest).
  - `packages/core`: types + pure brain logic (haversine, settle/suggestTransfers, suggestNext) + Vitest tests.
  - `packages/store`: Dexie DB (5 tables) + typed repo (trips/waypoints/expenses/photos/memberLocations).
  - `packages/online-brain`: `planTrip` (Ollama / OpenAI-compatible) + deterministic `fallbackPlan`.
  - Root ESLint (flat config) + Prettier + Vitest + CI workflow.

## Verified
- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `npm test` — 15 tests passing.
- `npm run build` — Vite build + PWA SW generation succeed.

## Known issues
- None blocking. `npm audit` reports 6 vulnerabilities (transitive, from the PWA/workbox toolchain) — left for later triage.

## Next milestone
Phase 2 — spike: WebLLM on-device model for the local brain, with the deterministic fallback already in place.
