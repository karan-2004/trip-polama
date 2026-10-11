# Progress — TrailBrain

## Done
- Current plan: `plans/v4-test-coverage.md`; v1/v2/v3 preserved.
- Repo governance installed: `plans/`, `.cursor/rules/`, `memory-bank/`, `.gitignore`, `AGENTS.md`, `README.md`.
- **Phase 0–1 complete:** monorepo, PWA shell, core brain logic + Dexie store + online-brain planner; verified green.
- **Local-brain UI (first working slice):**
  - App shell with offline + split-brain indicators.
  - Trip list + create-trip form.
  - Waypoints (map-selected or GPS location, add/list/mark visited).
  - Expenses with total/per-person summary and "who owes whom" transfers.
  - "Next up" offline suggestions (device location + weather/daylight/pace).
  - People check-ins (last-known location + pairwise separation).
  - Photo log.
  - Store additions: `getTripFull`, `setWaypointVisited`.

## Verified
- Real llama3.2:3b smoke test: exploration (no actions), complete creation and
  manager expense proposals all pass via the actual adapter. Synthetic data only;
  no mutations executed. CORS allows localhost:5173. Replies approximately 30-47s.
  Initial failures led to schema-constrained Ollama output, temperature 0 and a
  planner-only action schema. Broader/browser reliability remains unverified.
- Chat iteration: 50 tests pass, including planner-to-manager UI, persistence,
  confirmation-only writes, duplicate rejection, cross-trip isolation and manual
  tool access, v1 database migration and concurrent confirmations. Lint/typecheck
  and production build pass. Earlier connection blocker is resolved by the user's model setup.
- Maps iteration: 33 tests pass, including map selection without GPS, plotting,
  marker/map cleanup, suggestion focus and visited-stop refresh. Lint/typecheck
  and production build pass. WebGL rendering/live tiles still need browser testing.
- Photos location controls, automatic GPS capture, app tags and location display
  removed. 29 tests pass, including no geolocation request and no new location
  fields in saved photo records; lint/build pass.
- Actual camera preview/capture replaces unreliable file-input capture hint.
  27 tests pass, including permissions, JPEG capture, stream cleanup and late
  permission responses. Lint/typecheck/build pass; physical camera test pending.
- Photo picker/camera iteration: 23 tests pass, including Blob persistence after
  database close/reopen (fake-indexeddb), legacy photo-note reads, and input limits.
  Lint/typecheck/build pass. Physical mobile camera behavior remains untested.
- Place-name UI: optional current-fix reverse geocoding, persisted labels, no raw
  coordinate display. Lint/typecheck clean and 18 tests pass (3 new label tests).
  Live provider/GPS behavior has not been browser-tested.
- `npm run typecheck` / `lint` / `test` (15 tests) / `build` all green.
- Dev server serves the app (HTTP 200).

## Known issues
- Test coverage documentation/reporting is planned in v4, not implemented.
  Passing test counts are recorded; statement/branch/function/line percentages
  are not measured yet. Baseline review precedes threshold decisions.
- Ollama with llama3.2:3b is now reachable and smoke-tested. WebLLM, browsing,
  auth and sync remain pending. Live inference is slow here and can vary per prompt.
- Embedded photo location-metadata stripping is planned in v2, not implemented.
  Existing image bytes and historical photo location fields remain unchanged.
- `npm audit` reports 6 dev-toolchain vulnerabilities (vitest/vite/esbuild/tinypool) — deferred.
- Deviation from plan: used plain CSS instead of Tailwind (see `techContext.md`).
- Online MapLibre maps exist; offline PMTiles/download support is not implemented.
- Map rendering adds a large MapLibre bundle; code splitting is a future optimization.

## Next milestone
Phase 2 spike — WebLLM on-device model for richer suggestions (deterministic fallback already in place).
