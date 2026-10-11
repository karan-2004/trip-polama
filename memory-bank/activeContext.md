# Active Context — trip-polama

**Current focus:** Chat-first home, persistent planner/manager sessions and
confirmed actions share the store with manual tools. Separate routes now implemented:
online planner gateway/research tools versus local read/write manager.

Deployment branch: one Node production service serves dist + API, binds Render
PORT/0.0.0.0, exposes /healthz, and fails closed without strong demo access secrets.
Planner calls require signed Secure/HttpOnly/SameSite cookies; manual UI stays public.
Login/session/global limits are per-instance/in-memory, not durable spend caps.
Render Blueprint + docs/render-deployment.md added; no live Render provisioning yet.
Deployment verification: 105 tests, typecheck/lint/build pass; actual production
start smoke passed health/frontend/sign-in and blocked anonymous planner calls.
No live model calls were made for deployment checks. Render provisioning awaits
an authorized push of the deployment branch and dashboard secret configuration.

Rebrand: canonical app name `trip-polama`, package scope `@trip-polama`, class
`TripPolamaDB`. Legacy database/preference keys stay unchanged to preserve data.
Checkout now lives at `/home/lightning/dev/trip-polama`; restart existing dev
processes after the folder/package rename. Rename verification: 93 regressions,
typecheck, lint and full PWA build pass; no live inference rerun for the rename.
Latest richer local-model run had intermittent 90s timeouts and was interrupted;
do not claim that expanded live suite passed. Deterministic quick reads remain valid.

Planner failure reproduced after name-only creation: model returned a function/
parameters envelope with incomplete fields. Fixed prompt/action examples, one
bounded output correction, and single-fence handling with strict schema validation.
Three live cases pass (clarification, full proposal, research); no mutations.
Safe error codes/reference IDs and content-free server logs added. Running gateway
needs a restart to load source changes; frontend retains plain-language errors.

Product UI correction: removed developer setup panels and model endpoint forms.
About your trip assistants explains roles, source checking and privacy in plain
language. Configuration stays in README/env settings; saved local preferences
still load. Persistent design rule prohibits variable names/commands/routes in UI.

**State:** Monorepo, PWA shell, core logic, Dexie store, online-brain planner, and a
first working local-brain UI (trips, waypoints, expenses + settlement, suggestions,
people check-ins, photos) are all built and verified green.

**Next steps (in order):**
0. Online planner configured and live-tested with gemma4:31b on Ollama Cloud.
   Next test richer itinerary/creation/replanning prompts in the browser.
  Full local tool-result follow-up loop and manager latency still need work.
0. Planned test visibility work: docs/testing.md matrix, Vitest coverage baseline,
   documented exclusions and CI artifacts. No provider/thresholds configured yet.
1. Live model smoke test complete: llama3.2:3b at localhost:11434. Next verify actual
   browser chat interaction and additional adversarial/ambiguous prompts.
2. WebLLM on-device model spike (deterministic fallback already exists).
3. WebRTC manual-signal P2P spike for offline buddy tracking.
4. Supabase auth + sync engine + RLS.
5. Offline map downloads/rendering (PMTiles).
6. Verified online planning tools and model proxy.
7. Photo metadata stripping, PWA polish and offline/device E2E.

**Blocked by:** no live model connection blocker now. User installed llama3.2:3b;
Ollama responds and allows http://localhost:5173 CORS. No model installation by agent.
User switched the online planner to gemma4:31b on Ollama Cloud. Direct live smoke
test passed (~4.7s); restarted HTTP gateway returns 200 with actual Wikipedia
research/citations (~3.5s). Vite localhost:5173 proxy forwards validation requests
to the gateway (400 on invalid payload, no extra model call). Earlier deepseek
HTTP 402 is resolved by the user's model change. No credentials logged.
BRAVE_SEARCH_API_KEY remains unset, so research is Wikipedia background only.
Development gateway remains loopback-only; production serving is protected and
binds all interfaces. Full deployed browser behavior is not verified yet.
Latest verification: 67 regressions plus 2 live local-manager smoke tests pass;
lint/typecheck/build pass. Live Wikipedia endpoint reachable with synthetic query.

Split implementation: persisted explicit Research/Replan role, manager handoff
after creation, separate request routes, stored role/model/source provenance.
No auto-fallback across agents. Planner sends minimized context and uses a bounded
OpenAI-compatible research loop (Wikipedia/optional Brave); keys stay server-side.
Local manager context is compact, permits at most one requested action. Two live
manager checks pass after rejecting unnecessary actions; warm times 22-31s,
first attempt slower. Online research now has both mock regressions and live
Gemma/Wikipedia checks; no trip mutations executed by the live tests.

Chat iteration: planner sessions persist before creation, then link to a trip;
existing trips reuse one manager chat. Strict schemas and scoped transactions
protect confirmed actions. History, dismissals and audit statuses survive reload.
Chat supports local Ollama setup; no fake replies when unavailable. Manual views
are linked from chat and lazy-loaded. Schema v3 adds sessions/messages and fixes
the compound member-location index needed by check-ins. Live adapter smoke tests
now pass after schema-constrained output and planner-only tool schema changes.
Initial prompt-only JSON had invalid outputs; wide tool schema caused premature
creation during exploration. Revised three-case run passes, 30-47s per reply.

Map iteration: Waypoints supports map click/center selection without GPS; Next up
shows current position and ranked stops, with focus buttons. Uses MapLibre and
OpenFreeMap online; offline downloads remain deferred. Suggestions derive from
updated trip state so visited stops disappear. Real WebGL/device testing pending.

Current plan on deployment: `plans/v7-render-deployment.md` (v1-v6 preserved). Photos no longer requests
GPS or saves/displays app location tags. Embedded GPS/location-metadata stripping
is deferred; uploaded image bytes remain unchanged. Old stored tags are preserved.

Photo iteration: filename entry replaced by image picker + live getUserMedia camera.
Capture hint was unreliable; camera now has live preview/capture/close controls,
permission errors, and track cleanup (including late permission responses).
Images stored as optional Blob fields on existing photo records; legacy photo
notes remain readable without an image. Preview URLs revoked on unmount/change.
10 MB limit, selection/storage error feedback; mobile camera testing pending.

Place-name iteration: no visible raw coordinates. Optional BigDataCloud lookup
for the current device fix; names persisted on new waypoints/check-ins/photo notes.
No lookup of historical/remote records. Offline unnamed records use honest labels.

Location iteration: manual coordinate inputs removed from waypoints, suggestions,
check-ins and photo notes. Shared geolocation capture + retry/accuracy UI added.
Policy lives in `.cursor/rules/location.mdc`. Browser-level validation pending.

**Last updated:** 2026-10-11
