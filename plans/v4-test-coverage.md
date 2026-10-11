# trip-polama - Plan v4: Test Coverage and Documentation

**Version:** v4 | **Date:** 2026-10-11 | **Status:** Approved by user request

## Goal

trip-polama centers on a persistent conversation per trip. New/exploratory chats
are planners; created trips have managers. Manual tools share the same local data.
The no-rush build now includes maintained testing documentation and measured code
coverage, clearly separated from test counts and live-device verification.

## Decisions

| Area | Decision |
|---|---|
| Home | Chat-first workspace with trips and exploratory sessions alongside it |
| Planner | Chat exists before a trip; creation requires confirmation |
| Manager | Same chat survives creation and loads fresh state for each response |
| Actions | Strict allowlisted proposals; confirm or dismiss before execution |
| Scope | Selected session's linked trip only; no model-supplied trip IDs |
| Manual use | Maps, expenses, suggestions, people and photos remain accessible |
| Persistence | Dexie sessions/messages; atomic mutation, status and audit result |
| Model | Ollama adapter now; browser WebLLM remains planned |
| Backend | Supabase auth, sync and RLS remain planned |
| Styling | Light sky-blue/green CSS-token palette |
| Location | Device/map selection only; no coordinate entry/display |
| Photos | Image picker and real camera; no photo geolocation/tagging |
| Privacy | Embedded photo location-metadata stripping deferred |
| Testing docs | Maintain docs/testing.md alongside feature iterations |
| Measured coverage | Vitest reports statements, branches, functions and lines |
| Thresholds | Measure baseline first; agree thresholds before enforcing them |

## Architecture

```text
Home: trips + exploration | planner/manager conversation
                      -> fresh local context
                      -> selected open-model endpoint
                      -> strict response/action validation
                      -> pending proposal: confirm / dismiss
                      -> scoped transaction + audit status
                      -> refreshed chat and manual screens
Verification: behavioral tests + measured coverage + explicit browser/device gaps
```

## Stack and Structure

- Vite, React, TypeScript, vite-plugin-pwa and plain CSS nature tokens.
- apps/web: chat home, manual screens, camera/GPS/maps and model settings.
- packages/core: domain types, Zod action schemas, settlement and suggestions.
- packages/store: Dexie repositories and confirmed-action executor.
- packages/online-brain: Ollama chat plus existing planner adapter.
- server: future authenticated model proxy; no browser service keys.
- MapLibre/OpenFreeMap online maps; offline PMTiles downloads planned.
- Supabase auth/sync, WebLLM and WebRTC remain planned integrations.
- Vitest/jsdom/fake-indexeddb now; browser/device/Playwright tests still needed.
- docs/testing.md: planned behavioral coverage matrix and testing guide.
- coverage/: planned generated reports, ignored by Git and published as CI artifacts.

## Chat Lifecycle and Tools

1. Persist exploratory conversations before creating a trip.
2. Ask for missing details and propose creation; no mutation before confirmation.
3. Link the created trip to the same conversation and switch to manager mode.
4. Find or create one manager conversation for each existing trip.
5. Load current local state, including manual edits, for every model request.
6. Validate reply/action schemas; never execute arbitrary code or response text.
7. Tools cover trip creation/details, members, expenses, current-device waypoints,
   visited stops, device check-ins, next-stop calculations and manual navigation.
8. Photos/camera and remote destination selection require device/map interaction;
   no fabricated media or coordinates.
9. Commit mutations and audit status atomically; reject duplicate execution and
   cross-trip target IDs. Retain dismissed proposals without executing them.
10. Distinguish local completed-action results from model proposals.

## Boundaries and Privacy

- Network availability is not model readiness; no simulated replies on failure.
- Ollama is a separate service, not in-browser WebLLM.
- Structured coordinates, images and photo filenames are excluded from context;
  user-authored message text goes to the chosen endpoint as written.
- Remote endpoints receive trip/conversation data; selection must be explicit.
- No browsing, booking, weather API or autonomous sharing tool exists yet.
- Device check-ins do not represent another person's remote/live position.
- Local history/manual data persists offline; replies require a reachable model.
- Online map tiles and pins do not imply offline maps or verified walking routes.

## Deferred Photo Location-Metadata Stripping

Photos do not collect device location. Original uploaded bytes can still contain
GPS/location metadata; sanitization remains deferred, not implemented.

- Sanitize supported imports offline before persistence in a later iteration.
- Remove GPS/location EXIF and location-bearing XMP/IPTC fields.
- Evaluate JPEG/PNG first; preserve orientation, appearance and image quality.
- Verify sanitized output before claiming it is location-free. Report unsupported
  formats/failures explicitly instead of silently claiming success.
- Require verification before future export/sharing. Decide legacy cleanup
  separately, without silently overwriting existing images.
- Test GPS-bearing, clean, corrupt and rotated-phone-photo fixtures.

## Planned Test Coverage Work

**Status: planned only. No measured percentages or thresholds exist yet.**

1. Create docs/testing.md with commands, environment requirements and a maintained
   matrix linking each feature/behavior to its test files, test level and gaps.
2. Document separate categories: unit logic, mocked component tests, IndexedDB
   integration, browser E2E, physical-device checks and live-model checks.
3. Configure a Vitest-compatible coverage provider and npm run test:coverage.
   Include all first-party executable TS/TSX in apps/web/src and packages/*/src,
   including untested source files. Document exclusions (tests, declarations,
   generated code and non-executable configuration), never hide difficult code.
4. Generate terminal summary, HTML and machine-readable/LCOV reports for statements,
   branches, functions and lines. Record the baseline with date, command and revision
   rather than presenting the passing-test count as a coverage percentage.
5. Review uncovered critical branches: action validation/confirmation/isolation,
   storage failures/migration, model failures, permissions, cancellation and cleanup.
   Add targeted tests for real gaps instead of chasing a percentage alone.
6. Agree overall and critical-module thresholds after baseline review. Do not claim
   or enforce arbitrary 100% coverage. Gate CI only once the policy is established.
7. Add coverage collection to CI and upload reports as artifacts. Reports stay out
   of source control; the matrix, exclusions and policy are versioned documentation.
8. Link the guide from README and agent instructions; update matrix and known gaps
   whenever features/tests change. Keep the memory bank's latest result current.

### Required Matrix Areas

- Chat planner/manager transitions, persistence and manual-tool parity.
- Schema validation, action confirmation/dismissal, concurrent duplicate prevention,
  membership rules, trip isolation and transaction rollback.
- Expense calculations, geographic calculations and suggestion ranking.
- Database migrations, image Blob persistence, storage error handling and reload.
- Camera permission/capture/cleanup, file validation and Photos location privacy.
- Device location permission/failure/staleness and place-name lookup failures.
- Map selection, focus, marker cleanup, real WebGL rendering and tile availability.
- Model response validation, transport failure/cancellation and live inference.
- PWA install/update/reload, offline behavior and mobile layout/accessibility.

### Known Verification Gaps

- Most camera/map/model component tests use mocks; they do not prove hardware,
  WebGL, browser permissions, live tiles or model behavior.
- IndexedDB emulator tests do not prove browser quota/eviction behavior.
- Live Ollama, real-device GPS/camera, browser offline E2E and installation checks
  remain pending. Auth/sync, WebLLM and P2P need tests when implemented.

### Acceptance Criteria

- A fresh checkout can generate coverage through the documented command.
- Reports include untested first-party source and all four metrics; scope/exclusions
  and baseline are documented. No claimed percentage without a generated report.
- Every implemented feature has test references or an explicit untested status.
- CI artifacts are available; any enforcement thresholds have a documented decision.
- Browser/device/live-model gaps remain visible regardless of unit coverage scores.

## Roadmap

| Stage | Deliverable | Acceptance |
|---|---|---|
| Foundation | Local store, deterministic tools, manual UI | Persistence and tests/build green |
| Chat-first core | Planner/manager and confirmed tools | Transition, isolation and manual parity |
| Test visibility | Testing guide, matrix, coverage baseline and CI artifacts | Reproducible reports; explicit gaps and exclusions |
| Model reliability | Live Ollama checks then WebLLM spike | Honest status and GPU/fallback behavior |
| Group support | WebRTC and Supabase auth/sync/RLS | Secure sync; foreground limits explicit |
| Offline maps | PMTiles download/cache management | Downloaded regions render offline |
| Online planning | Verified resource tools and model proxy | Provenance, permission and key boundaries |
| Photo privacy | Deferred metadata sanitizer | Verified fixtures; no false privacy promises |
| Release quality | Installation, device and offline E2E | Permission/camera/map/chat/reload flows tested |

## Current State

The chat shell, persistence, action executor and Ollama adapter exist. The latest
recorded run has 50 passing tests, but no measured coverage report. Coverage work
in this version is approved for planning, not implemented by this documentation
change. Live inference, device testing, auth/sync, WebLLM and offline maps remain
pending. New tools require schemas, execution logic, UI and regression tests together.
