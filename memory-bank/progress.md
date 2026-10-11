# Progress — trip-polama

## Done
- Deployment branch: production frontend/API serving, health endpoint, signed demo
  access cookies, request budgets, sign-in UI and Render Blueprint/guide implemented.
- Rebrand: app/UI/PWA/package identity is `trip-polama`; scopes use `@trip-polama`.
  Persistent database and preference keys retained for saved-data compatibility.
- Current plan: `plans/v5-split-brain-routing.md`; v1-v4 preserved.
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
- Deployment branch: 105 regressions pass; typecheck/lint/PWA build pass. Actual
  npm start smoke verifies Render-style PORT/origin, health and frontend HTTP200,
  anonymous planner HTTP401, sign-in HTTP200 and Secure cookie. Synthetic secrets
  only; no paid inference or Render provisioning performed.
- trip-polama rename: 93 regression tests pass; typecheck/lint/production PWA build
  pass. Package links verified after checkout-folder rename. Legacy storage IDs
  and saved-preference behavior retained; live suites intentionally not rerun.
- Planner creation fix: 74 regression tests and three live Gemma cases pass;
  lint/typecheck/build pass. Name-only input now clarifies missing destination;
  full creation details produce a valid pending proposal. Malformed envelopes
  get one bounded correction; Markdown outer fences stripped without loosening
  validation. No trip writes performed by live smoke tests.
- Live online planner now passes on gemma4:31b (user-configured Ollama Cloud).
  Real destination research produces three Wikipedia sources/citations and no
  writes. Direct test ~4.7s; running gateway HTTP 200 ~3.5s. Vite proxy validated
  using malformed input (400, no additional inference). Synthetic trip context only.
- Current split build: 67 regression tests pass; 2 opt-in live manager tests pass.
  Lint/typecheck (including server) and production build pass. Wikipedia endpoint
  returned live results for a synthetic Manali query. Online larger-model calls
  remain mocked until provider settings are supplied.
- Split routing: separate local manager and online planner request paths, persisted
  replanning role, no hidden fallback and shared chat history. Gateway research
  validation/budgets tested with mocks. Real gateway returns 503 when unconfigured
  and 403 for an untrusted origin. Live local manager summary/expense pass (22-31s
  warm run); initial unrelated-action outputs rejected, now one-action replies.
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
- Render deployment not provisioned yet. Demo access is not individual account auth;
  limits reset per instance/restart. Real browser/TLS/cold-start verification pending.
- Latest expanded local-model run timed out intermittently and was interrupted;
  no all-green expanded live-suite claim. Deterministic reads are separate from inference.
- Earlier deepseek-v4.1-flash HTTP 402 resolved by user switching to gemma4:31b.
  Access is confirmed for this account/run, not a claim of unlimited free use.
- Online planner live research verified; broader itinerary/replanning and browser
  interaction tests still needed. Public auth/rate/cost hardening not implemented;
  gateway binds loopback. Local manager still takes seconds, not instant replies.
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
