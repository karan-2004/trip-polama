# Active Context — TrailBrain

**Current focus:** Chat-first home, persistent planner/manager sessions and
confirmed actions share the local store with manual tools. Live Ollama testing next.

**State:** Monorepo, PWA shell, core logic, Dexie store, online-brain planner, and a
first working local-brain UI (trips, waypoints, expenses + settlement, suggestions,
people check-ins, photos) are all built and verified green.

**Next steps (in order):**
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

Current plan: `plans/v4-test-coverage.md` (v1/v2/v3 preserved). Photos no longer requests
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
